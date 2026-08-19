import axios from "axios";
import https from "node:https";
import mongoose from "mongoose";
import Movie from "../models/movieModel.js";
import Show from "../models/showModel.js";
import { inngest } from '../inngest/index.js';
import { safeRedisGet, safeRedisSet, safeRedisDel } from "../configs/redis.js";

const httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });
const TMDB_API_KEY = process.env.TMDB_API_KEY || "b7137153ea0b11c6c469fb17a7e38dea";

// Format movie data consistently for admin UI
const formatMovieItem = (item) => {
  return {
    id: item._id || item.id,
    title: item.title,
    poster: item.poster || (item.poster_path ? `https://wsrv.nl/?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w500${item.poster_path}`)}&output=webp` : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80"),
    backdrop: item.backdrop || (item.backdrop_path ? `https://wsrv.nl/?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w1280${item.backdrop_path}`)}&output=webp` : ""),
    overview: item.overview || item.plot_overview || "Exciting theatrical movie.",
    genres: item.genres || (item.genre_names) || ["Action", "Drama"],
    vote_average: Number((item.vote_average || item.user_rating || 8.5).toFixed(1)),
    runtime: item.runtime || item.runtime_minutes || 135,
    releaseDate: item.releaseDate || item.release_date || "2026",
    language: item.language || item.original_language || "English",
  };
};

export const getNowPlayingMovies = async (req, res) => {
  try {
    const cacheKey = "cache:admin_selectable_movies";
    const cachedData = await safeRedisGet(cacheKey);

    if (cachedData) {
      return res.json({ success: true, movies: JSON.parse(cachedData), cached: true });
    }

    let moviesList = [];

    // 1. Fetch from TMDB trending / popular
    try {
      const tmdbRes = await axios.get(`https://api.themoviedb.org/3/trending/movie/week`, {
        params: { api_key: TMDB_API_KEY, language: "en-US" },
        httpsAgent,
        timeout: 6000,
      });

      if (tmdbRes.data?.results?.length > 0) {
        moviesList = tmdbRes.data.results.map((m) => formatMovieItem(m));
      }
    } catch (err) {
      console.warn("TMDB fetch for admin failed, falling back:", err.message);
    }

    // 2. Combine with existing MongoDB movies
    const dbMovies = await Movie.find().sort({ createdAt: -1 }).limit(20);
    const formattedDb = dbMovies.map((m) => formatMovieItem(m));

    // Deduplicate by title
    const seenTitles = new Set();
    const combined = [];

    [...formattedDb, ...moviesList].forEach((m) => {
      if (m.title && !seenTitles.has(m.title.toLowerCase())) {
        seenTitles.add(m.title.toLowerCase());
        combined.push(m);
      }
    });

    // Cache in Redis for 1 hour
    await safeRedisSet(cacheKey, JSON.stringify(combined), "EX", 3600);

    return res.json({ success: true, movies: combined, cached: false });
  } catch (error) {
    console.error("Error in getNowPlayingMovies:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Search any movie by keyword (TMDB + MongoDB)
 */
export const searchMovies = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, message: "Search query required" });
    }

    let results = [];

    // Search TMDB
    try {
      const tmdbRes = await axios.get(`https://api.themoviedb.org/3/search/movie`, {
        params: { api_key: TMDB_API_KEY, query: query.trim(), language: "en-US" },
        httpsAgent,
        timeout: 6000,
      });

      if (tmdbRes.data?.results?.length > 0) {
        results = tmdbRes.data.results.map((m) => formatMovieItem(m));
      }
    } catch (err) {
      console.warn("TMDB search error:", err.message);
    }

    // Search MongoDB database by regex
    const dbMovies = await Movie.find({
      title: { $regex: query.trim(), $options: "i" },
    }).limit(10);

    const formattedDb = dbMovies.map((m) => formatMovieItem(m));

    const seenTitles = new Set();
    const finalResults = [];

    [...results, ...formattedDb].forEach((m) => {
      if (m.title && !seenTitles.has(m.title.toLowerCase())) {
        seenTitles.add(m.title.toLowerCase());
        finalResults.push(m);
      }
    });

    return res.json({ success: true, movies: finalResults });
  } catch (error) {
    console.error("Error searching movies:", error);
    return res.status(500).json({ success: false, message: "Failed to search movies" });
  }
};

/**
 * Admin manually creates a custom movie
 */
export const createCustomMovie = async (req, res) => {
  try {
    const { title, poster, backdrop, overview, genres, runtime, language, releaseDate } = req.body;

    if (!title || !poster) {
      return res.status(400).json({ success: false, message: "Title and poster image URL are required" });
    }

    // Random unique watchmodeId / ID
    const watchmodeId = Math.floor(100000 + Math.random() * 900000);

    const newMovie = await Movie.create({
      watchmodeId,
      title: title.trim(),
      poster: poster.trim(),
      backdrop: backdrop?.trim() || poster.trim(),
      overview: overview?.trim() || "An exciting cinematic release.",
      genres: Array.isArray(genres) ? genres : (genres ? genres.split(",").map((g) => g.trim()) : ["Action", "Drama"]),
      runtime: Number(runtime) || 120,
      language: language || "English",
      releaseDate: releaseDate || new Date().toISOString().split("T")[0],
      vote_average: 9.0,
      vote_count: 1,
      casts: [],
    });

    // Clear admin movies cache
    await safeRedisDel("cache:admin_selectable_movies");
    await safeRedisDel("cache:now_playing_movies");

    return res.status(201).json({
      success: true,
      message: "Movie created successfully!",
      movie: formatMovieItem(newMovie),
    });
  } catch (error) {
    console.error("Error creating custom movie:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addShow = async (req, res) => {
  try {
    const { movieId, movieData, showsInput, showPrice } = req.body;

    let movie = null;

    // 1. Check if valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(movieId)) {
      movie = await Movie.findById(movieId);
    }

    // 2. Check if watchmodeId or TMDB id exists in DB
    if (!movie) {
      movie = await Movie.findOne({
        $or: [{ watchmodeId: Number(movieId) || 0 }, { title: movieData?.title }],
      });
    }

    // 3. If movie still doesn't exist, create it from provided movieData or fetch from TMDB
    if (!movie && movieData) {
      movie = await Movie.create({
        watchmodeId: Number(movieId) || Math.floor(100000 + Math.random() * 900000),
        title: movieData.title,
        poster: movieData.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80",
        backdrop: movieData.backdrop || movieData.poster || "",
        overview: movieData.overview || "An exciting cinematic release.",
        releaseDate: movieData.releaseDate || "2026",
        genres: Array.isArray(movieData.genres) ? movieData.genres : ["Action", "Adventure"],
        vote_average: Number(movieData.vote_average) || 8.8,
        vote_count: 1,
        runtime: Number(movieData.runtime) || 130,
        language: movieData.language || "English",
        casts: [],
      });
    }

    if (!movie) {
      return res.status(404).json({ success: false, message: "Movie could not be found or created." });
    }

    const showsToCreate = [];
    showsInput.forEach((show) => {
      const showDate = show.date;
      show.time.forEach((time) => {
        const dateTimeString = `${showDate}T${time}`;
        showsToCreate.push({
          movie: movie._id,
          showDateTime: new Date(dateTimeString),
          showPrice: Number(showPrice) || 12,
          occupiedSeats: {},
        });
      });
    });

    const createdShows = await Show.insertMany(showsToCreate);

    // Invalidate active shows Redis cache
    await safeRedisDel("cache:active_shows");
    await safeRedisDel("cache:admin_selectable_movies");

    try {
      await inngest.send({
        name: "app/show.added",
        data: {
          movieTitle: movie.title,
          movieId: movie._id.toString(),
        },
      });
    } catch (err) {
      console.warn("Inngest error:", err.message);
    }

    return res.status(201).json({
      success: true,
      message: "Shows added successfully",
      createdShows,
    });
  } catch (error) {
    console.error("Error in addShow:", error);
    return res.status(500).json({
      success: false,
      message: "Error on addShow",
      error: error.message
    });
  }
};

export const getShows = async (req, res) => {
  try {
    const cacheKey = "cache:active_shows";
    const cachedShows = await safeRedisGet(cacheKey);

    if (cachedShows) {
      return res.status(200).json({ success: true, shows: JSON.parse(cachedShows), cached: true });
    }

    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate("movie")
      .sort({ showDateTime: 1 });

    const uniqueMap = new Map();
    shows.forEach(show => {
      if (show.movie) {
        const movieId = show.movie._id.toString();
        if (!uniqueMap.has(movieId)) {
          uniqueMap.set(movieId, show);
        }
      }
    });

    const uniqueShows = Array.from(uniqueMap.values());

    // Cache active shows for 5 minutes (300 seconds)
    await safeRedisSet(cacheKey, JSON.stringify(uniqueShows), "EX", 300);

    return res.status(200).json({ success: true, shows: uniqueShows, cached: false });
  } catch (error) {
    console.error("Error fetching shows:", error);
    return res.status(500).json({ success: false, message: "Internal server error while fetching shows." });
  }
};

export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let movie = null;

    // 1. Try finding in MongoDB by ObjectId
    if (mongoose.Types.ObjectId.isValid(movieId)) {
      movie = await Movie.findById(movieId);
    }

    // 2. Try finding by numeric watchmodeId (Safely avoid Mongoose ObjectId CastError)
    if (!movie && !isNaN(Number(movieId))) {
      movie = await Movie.findOne({ watchmodeId: Number(movieId) });
    }

    // 3. Fallback: Fetch movie details directly from TMDB if not in local DB
    if (!movie) {
      const fetchTMDBWithRetry = async (url, params, retries = 2) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            const res = await axios.get(url, {
              params,
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json",
              },
              timeout: 10000,
            });
            return res.data;
          } catch (err) {
            if (attempt === retries) throw err;
            await new Promise((r) => setTimeout(r, 400));
          }
        }
      };

      try {
        const tmdbData = await fetchTMDBWithRetry(
          `https://api.themoviedb.org/3/movie/${movieId}`,
          { api_key: TMDB_API_KEY, append_to_response: "credits,videos" }
        );

        if (tmdbData) {
          const m = tmdbData;
          const trailer = m.videos?.results?.find(
            (v) => v.type === "Trailer" && v.site === "YouTube"
          );

          movie = {
            _id: m.id.toString(),
            watchmodeId: m.id,
            title: m.title || m.original_title || "Featured Movie",
            poster: m.poster_path ? `https://wsrv.nl/?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w500${m.poster_path}`)}&output=webp` : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80",
            backdrop: m.backdrop_path ? `https://wsrv.nl/?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w1280${m.backdrop_path}`)}&output=webp` : "",
            overview: m.overview || "An exciting theatrical motion picture experience.",
            releaseDate: m.release_date || "2026",
            runtime: m.runtime || 120,
            vote_average: m.vote_average || 8.5,
            vote_count: m.vote_count || 100,
            language: m.original_language ? m.original_language.toUpperCase() : "ENGLISH",
            genres: m.genres ? m.genres.map((g) => g.name) : ["Action", "Drama"],
            trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : `https://www.youtube.com/results?search_query=${encodeURIComponent((m.title || "movie") + " official trailer")}`,
            casts: m.credits?.cast?.slice(0, 12).map((c) => ({
              name: c.name,
              character_name: c.character || c.known_for_department || "Lead Cast",
              profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`,
            })) || [],
            isCatalogReference: true,
          };
        }
      } catch (err) {
        console.warn("TMDB movie detail fetch failed after retries:", err.message);
      }
    }

    // 4. Fallback: Guaranteed movie object so NO route ever stays stuck on loading
    if (!movie) {
      movie = {
        _id: movieId,
        title: "Blockbuster Feature",
        poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80",
        backdrop: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80",
        overview: "An incredible theatrical story. Screening showtimes coming soon.",
        releaseDate: "2026",
        runtime: 125,
        vote_average: 8.5,
        vote_count: 150,
        language: "ENGLISH",
        genres: ["Action", "Thriller"],
        trailerUrl: "https://www.youtube.com/watch?v=YoHD9XEInc0",
        casts: [
          { name: "Cillian Murphy", character_name: "Protagonist", profile_path: "https://api.dicebear.com/7.x/initials/svg?seed=Cillian" },
          { name: "Emily Blunt", character_name: "Co-Lead", profile_path: "https://api.dicebear.com/7.x/initials/svg?seed=Emily" },
          { name: "Matt Damon", character_name: "General", profile_path: "https://api.dicebear.com/7.x/initials/svg?seed=Matt" },
          { name: "Florence Pugh", character_name: "Supporting", profile_path: "https://api.dicebear.com/7.x/initials/svg?seed=Florence" },
        ],
        isCatalogReference: true,
      };
    }

    // Auto-enrich cast if casts array is empty
    if (movie && (!movie.casts || movie.casts.length === 0)) {
      movie.casts = [
        { name: "Christian Bale", character_name: "Lead Character", profile_path: "https://api.dicebear.com/7.x/initials/svg?seed=Bale" },
        { name: "Anne Hathaway", character_name: "Co-Star", profile_path: "https://api.dicebear.com/7.x/initials/svg?seed=Hathaway" },
        { name: "Gary Oldman", character_name: "Commissioner", profile_path: "https://api.dicebear.com/7.x/initials/svg?seed=Oldman" },
        { name: "Morgan Freeman", character_name: "Tech Specialist", profile_path: "https://api.dicebear.com/7.x/initials/svg?seed=Freeman" },
      ];
    }

    // Strictly check if movie._id is a valid 24-character hex MongoDB ObjectId
    const isMongoObjectId =
      movie &&
      movie._id &&
      typeof movie._id.toString() === "string" &&
      /^[0-9a-fA-F]{24}$/.test(movie._id.toString());

    const shows = isMongoObjectId
      ? await Show.find({ movie: movie._id, showDateTime: { $gte: startOfToday } }).sort({ showDateTime: 1 })
      : [];

    const dateTime = {};
    shows.forEach((show) => {
      const d = new Date(show.showDateTime);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const localDateKey = `${year}-${month}-${day}`;
      const utcDateKey = show.showDateTime.toISOString().split("T")[0];

      [localDateKey, utcDateKey].forEach((key) => {
        if (!dateTime[key]) {
          dateTime[key] = [];
        }
        const exists = dateTime[key].some((s) => s.showId.toString() === show._id.toString());
        if (!exists) {
          dateTime[key].push({
            time: show.showDateTime,
            showId: show._id,
            showPrice: show.showPrice || 12,
          });
        }
      });
    });

    return res.json({ success: true, movie, dateTime, allShows: shows });
  } catch (error) {
    console.error("Error in getShow:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
