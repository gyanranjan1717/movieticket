import Movie from "../models/movieModel.js";
import Booking from "../models/bookingModel.js";
import User from "../models/User.js";
import { safeRedisGet, safeRedisSet } from "../configs/redis.js";

/**
 * Helper to calculate realistic match percentage (e.g., 65% - 98%)
 */
const calculateMatchPercentage = (overlapScore, maxPossible = 10) => {
  const base = 50;
  const boost = Math.min(48, Math.round((overlapScore / (maxPossible || 1)) * 48));
  return Math.min(98, Math.max(45, base + boost));
};

/**
 * Get personalized movie recommendations based on user booking history and favorites
 * Content-based filtering with Redis Caching (Key: cache:recommendations:<userId>, TTL: 1 hour)
 */
export const getRecommendedMovies = async (req, res) => {
  try {
    const userId = req.user.userId;
    const cacheKey = `cache:recommendations:${userId}`;

    // 0. Check Redis Cache for user-specific recommendations
    const cached = await safeRedisGet(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        recommendations: JSON.parse(cached),
        cached: true,
        strategy: "redis-cached",
        message: "Loaded recommendations from Redis cache"
      });
    }

    // 1. Fetch user bookings
    const userBookings = await Booking.find({ user: userId }).populate({
      path: "show",
      populate: { path: "movie" }
    });

    // 2. Fetch user MongoDB favorites
    const user = await User.findById(userId).populate("favorites");
    const favoriteMovies = user?.favorites || [];

    // Extract watched movies & favorited movies
    const watchedMovies = userBookings.map((b) => b.show?.movie).filter(Boolean);
    const interactedMovies = [...watchedMovies, ...favoriteMovies];

    // Fallback: If user has no interaction history, return top rated movies
    if (interactedMovies.length === 0) {
      const topMovies = await Movie.find().sort({ vote_average: -1 }).limit(6);
      const formattedTop = topMovies.map((m, idx) => ({
        ...m.toObject(),
        matchScore: 90 - idx * 4,
        matchPercentage: `${90 - idx * 4}% match`
      }));
      await safeRedisSet(cacheKey, JSON.stringify(formattedTop), "EX", 3600); // Cache for 1h
      return res.status(200).json({
        success: true,
        recommendations: formattedTop,
        cached: false,
        strategy: "popular-top-rated",
        message: "Recommended top-rated movies for new user"
      });
    }

    // 3. Build user preference profile (Genre scores & Cast scores)
    const genreScore = {};
    const castScore = {};
    const interactedIds = new Set(interactedMovies.map((m) => m._id.toString()));

    interactedMovies.forEach((movie) => {
      movie.genres?.forEach((genre) => {
        genreScore[genre] = (genreScore[genre] || 0) + 1;
      });

      movie.casts?.forEach((cast) => {
        if (cast.name) {
          castScore[cast.name] = (castScore[cast.name] || 0) + 1;
        }
      });
    });

    // 4. Candidate Retrieval & Scoring
    const candidates = await Movie.find({ _id: { $nin: Array.from(interactedIds) } });

    const scoredCandidates = candidates.map((movie) => {
      let rawScore = 0;

      // Genre overlap boost (Weight: 3)
      movie.genres?.forEach((genre) => {
        if (genreScore[genre]) {
          rawScore += genreScore[genre] * 3;
        }
      });

      // Cast overlap boost (Weight: 4)
      movie.casts?.forEach((cast) => {
        if (cast.name && castScore[cast.name]) {
          rawScore += castScore[cast.name] * 4;
        }
      });

      // Rating quality boost (Weight: 0.5)
      rawScore += (movie.vote_average || 0) * 0.5;

      const matchScore = calculateMatchPercentage(rawScore, 15);

      return {
        ...movie.toObject(),
        matchScore,
        matchPercentage: `${matchScore}% match`
      };
    });

    // 5. Rank candidates by matchScore descending
    scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);
    let recommendations = scoredCandidates.slice(0, 6);

    // If candidate pool is too small, fill with top-rated unseen movies
    if (recommendations.length < 6) {
      const existingRecIds = new Set([
        ...Array.from(interactedIds),
        ...recommendations.map((m) => m._id.toString())
      ]);
      const fillers = await Movie.find({ _id: { $nin: Array.from(existingRecIds) } })
        .sort({ vote_average: -1 })
        .limit(6 - recommendations.length);

      const formattedFillers = fillers.map((m, idx) => ({
        ...m.toObject(),
        matchScore: 78 - idx * 3,
        matchPercentage: `${78 - idx * 3}% match`
      }));

      recommendations = [...recommendations, ...formattedFillers];
    }

    // Save generated recommendations to Redis cache for 1 hour (3600 seconds)
    await safeRedisSet(cacheKey, JSON.stringify(recommendations), "EX", 3600);

    return res.status(200).json({
      success: true,
      recommendations,
      cached: false,
      strategy: "content-based-filtering",
      totalCandidatesScored: candidates.length
    });
  } catch (error) {
    console.error("Recommendation engine error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate movie recommendations",
      error: error.message
    });
  }
};

/**
 * Get Similar Movies for a specific movie ("More Like This")
 * Uses Genre & Cast Overlap scoring + Redis Caching (Key: cache:recommendations:similar:<movieId>)
 */
export const getSimilarMovies = async (req, res) => {
  try {
    const { movieId } = req.params;
    const cacheKey = `cache:recommendations:similar:${movieId}`;

    // 0. Check Redis cache
    const cached = await safeRedisGet(cacheKey);
    if (cached) {
      return res.status(200).json({
        success: true,
        recommendations: JSON.parse(cached),
        cached: true,
        strategy: "redis-cached"
      });
    }

    const isMongoObjectId = typeof movieId === "string" && /^[0-9a-fA-F]{24}$/.test(movieId);
    let targetMovie = null;

    if (isMongoObjectId) {
      targetMovie = await Movie.findById(movieId);
    }

    // Prepare target movie sets
    const targetGenres = new Set(targetMovie?.genres || ["Action", "Adventure", "Drama"]);
    const targetCastNames = new Set((targetMovie?.casts || []).map((c) => c.name).filter(Boolean));

    // Fetch candidates from DB
    const candidates = isMongoObjectId
      ? await Movie.find({ _id: { $ne: movieId } })
      : await Movie.find();

    // Calculate overlap match scores
    const scoredCandidates = candidates.map((movie) => {
      let genreOverlap = 0;
      let castOverlap = 0;

      movie.genres?.forEach((g) => {
        if (targetGenres.has(g)) genreOverlap += 1;
      });

      movie.casts?.forEach((c) => {
        if (c.name && targetCastNames.has(c.name)) castOverlap += 1;
      });

      const rawScore = genreOverlap * 35 + castOverlap * 30 + (movie.vote_average || 7.0) * 3;
      const matchScore = calculateMatchPercentage(rawScore, 100);

      return {
        ...movie.toObject(),
        matchScore,
        matchPercentage: `${matchScore}% match`
      };
    });

    // 4. Sort by matchScore descending
    scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);
    let recommendations = scoredCandidates.slice(0, 6);

    // Fallback if fewer than 4 candidates
    if (recommendations.length < 4) {
      const topMovies = await Movie.find().sort({ vote_average: -1 }).limit(6);
      recommendations = topMovies.map((m, i) => ({
        ...m.toObject(),
        matchScore: 92 - i * 3,
        matchPercentage: `${92 - i * 3}% match`
      }));
    }

    // 5. Save in Redis for 1 hour
    await safeRedisSet(cacheKey, JSON.stringify(recommendations), "EX", 3600);

    return res.status(200).json({
      success: true,
      recommendations,
      cached: false,
      strategy: "genre-cast-overlap"
    });
  } catch (error) {
    console.error("Error in getSimilarMovies:", error);
    try {
      const topMovies = await Movie.find().limit(6);
      const fallbackRecs = topMovies.map((m, i) => ({
        ...m.toObject(),
        matchScore: 89 - i * 3,
        matchPercentage: `${89 - i * 3}% match`
      }));
      return res.status(200).json({ success: true, recommendations: fallbackRecs });
    } catch (e) {
      return res.status(200).json({ success: true, recommendations: [] });
    }
  }
};
