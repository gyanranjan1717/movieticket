import axios from "axios";
import https from "node:https";
import { safeRedisGet, safeRedisSet } from "../configs/redis.js";
import Movie from "../models/movieModel.js";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_API_KEY = process.env.TMDB_API_KEY || "b7137153ea0b11c6c469fb17a7e38dea";

const httpsAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: false,
});

const TRAILER_MAP = {
  "guardians of the galaxy": "https://www.youtube.com/watch?v=d96cjJhvlMA",
  "dune: part two": "https://www.youtube.com/watch?v=Way9Dexny3w",
  "dune": "https://www.youtube.com/watch?v=Way9Dexny3w",
  "oppenheimer": "https://www.youtube.com/watch?v=uYPbbksJxIg",
  "inception": "https://www.youtube.com/watch?v=YoHD9XEInc0",
  "avatar: the way of water": "https://www.youtube.com/watch?v=d9MyW72ELq0",
  "deadpool & wolverine": "https://www.youtube.com/watch?v=73_1biulk6s",
  "spider-man: across the spider-verse": "https://www.youtube.com/watch?v=cqGjhVJWtEg",
  "interstellar": "https://www.youtube.com/watch?v=zSWdZVtXT7E",
  "the dark knight": "https://www.youtube.com/watch?v=EXeTwQWrcwY",
  "gladiator ii": "https://www.youtube.com/watch?v=4rgYUipGJNo",
  "joker: folie à deux": "https://www.youtube.com/watch?v=_OKAwz22TYM",
  "alien: romulus": "https://www.youtube.com/watch?v=x0XDEhP4MQs",
  "inside out 2": "https://www.youtube.com/watch?v=LEjhY15eCx0",
};

const getTrailerForTitle = (title) => {
  if (!title) return "https://www.youtube.com/watch?v=YoHD9XEInc0";
  const key = title.toLowerCase().trim();
  for (const [name, url] of Object.entries(TRAILER_MAP)) {
    if (key.includes(name)) return url;
  }
  return `https://www.youtube.com/watch?v=YoHD9XEInc0`;
};

// Helper to format TMDB results with CDN proxy image paths
const formatTmdbMovies = (movies) => {
  return movies.map((m) => {
    const poster = m.poster_path
      ? `https://wsrv.nl/?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w500${m.poster_path}`)}&output=webp`
      : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80";

    const backdrop = m.backdrop_path
      ? `https://wsrv.nl/?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w1280${m.backdrop_path}`)}&output=webp`
      : poster;

    return {
      id: m.id,
      title: m.title || m.original_title,
      overview: m.overview,
      release_date: m.release_date || "2026-09-30",
      vote_average: Number((m.vote_average || 8.0).toFixed(1)),
      vote_count: m.vote_count || 0,
      poster_path: poster,
      backdrop_path: backdrop,
      trailerUrl: getTrailerForTitle(m.title || m.original_title),
      popularity: m.popularity,
    };
  });
};

/**
 * Get Upcoming Releases (TMDB + Redis)
 */
export const getUpcomingReleases = async (req, res) => {
  try {
    const cacheKey = "cache:tmdb_upcoming";
    const cached = await safeRedisGet(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, movies: JSON.parse(cached), cached: true });
    }

    try {
      const { data } = await axios.get(`${TMDB_BASE_URL}/movie/upcoming`, {
        params: { api_key: TMDB_API_KEY, language: "en-US", page: 1 },
        httpsAgent,
        timeout: 6000,
      });

      if (data.results && data.results.length > 0) {
        const formatted = formatTmdbMovies(data.results);
        await safeRedisSet(cacheKey, JSON.stringify(formatted), "EX", 43200); // 12h
        return res.status(200).json({ success: true, movies: formatted, cached: false });
      }
    } catch (err) {
      console.warn("TMDB upcoming fetch error, using local fallback:", err.message);
    }

    // Fallback: Database movies
    const dbMovies = await Movie.find().limit(8);
    const formattedDb = dbMovies.map((m) => ({
      id: m._id,
      title: m.title,
      overview: m.overview,
      release_date: m.releaseDate || "2026-09-30",
      vote_average: m.vote_average || 8.5,
      poster_path: m.poster,
      backdrop_path: m.backdrop || m.poster,
      genres: m.genres || ["Action", "Drama"],
      trailerUrl: m.trailerUrl || "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      status: "Upcoming"
    }));

    return res.status(200).json({ success: true, movies: formattedDb, fallback: true });
  } catch (error) {
    console.error("Error in getUpcomingReleases:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch upcoming releases" });
  }
};

/**
 * Get Now Playing / Trending In Theaters
 */
export const getNowPlaying = async (req, res) => {
  try {
    const cacheKey = "cache:tmdb_now_playing";
    const cached = await safeRedisGet(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, movies: JSON.parse(cached), cached: true });
    }

    // Try trending/movie/week (100% reachable without ECONNRESET)
    try {
      const { data } = await axios.get(`${TMDB_BASE_URL}/trending/movie/week`, {
        params: { api_key: TMDB_API_KEY, language: "en-US" },
        httpsAgent,
        timeout: 6000,
      });

      if (data.results && data.results.length > 0) {
        const formatted = formatTmdbMovies(data.results);
        await safeRedisSet(cacheKey, JSON.stringify(formatted), "EX", 43200);
        return res.status(200).json({ success: true, movies: formatted, cached: false });
      }
    } catch (err) {
      console.warn("TMDB trending error:", err.message);
    }

    // Fallback: DB movies
    const dbMovies = await Movie.find().sort({ createdAt: -1 }).limit(10);
    return res.status(200).json({
      success: true,
      movies: dbMovies.map((m) => ({
        id: m._id,
        title: m.title,
        overview: m.overview,
        release_date: m.releaseDate || "Now In Theaters",
        vote_average: m.vote_average || 8.8,
        poster_path: m.poster,
        backdrop_path: m.backdrop || m.poster,
        genres: m.genres || ["Action", "Sci-Fi"],
        trailerUrl: m.trailerUrl || "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        status: "Now Showing"
      }))
    });
  } catch (error) {
    console.error("Error in getNowPlaying:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch now playing movies" });
  }
};

/**
 * Get Top Rated Movies (TMDB + Redis)
 */
export const getTopRated = async (req, res) => {
  try {
    const cacheKey = "cache:tmdb_top_rated";
    const cached = await safeRedisGet(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, movies: JSON.parse(cached), cached: true });
    }

    try {
      const { data } = await axios.get(`${TMDB_BASE_URL}/movie/top_rated`, {
        params: { api_key: TMDB_API_KEY, language: "en-US", page: 1 },
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
        },
        timeout: 6000,
      });

      if (data.results && data.results.length > 0) {
        const formatted = formatTmdbMovies(data.results);
        await safeRedisSet(cacheKey, JSON.stringify(formatted), "EX", 43200);
        return res.status(200).json({ success: true, movies: formatted, cached: false });
      }
    } catch (err) {
      console.warn("TMDB top rated error:", err.message);
    }

    const dbMovies = await Movie.find().sort({ vote_average: -1 }).limit(10);
    return res.status(200).json({
      success: true,
      movies: dbMovies.map((m) => ({
        id: m._id,
        title: m.title,
        overview: m.overview,
        release_date: m.releaseDate || "Top Rated",
        vote_average: m.vote_average || 9.0,
        poster_path: m.poster,
        backdrop_path: m.backdrop || m.poster,
        genres: m.genres || ["Action", "Drama"],
        trailerUrl: m.trailerUrl || "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      })),
    });
  } catch (error) {
    console.error("Error in getTopRated:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch top rated movies" });
  }
};
