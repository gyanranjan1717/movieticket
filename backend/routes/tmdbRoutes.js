import express from "express";
import axios from "axios";

const router = express.Router();

// GET /api/tmdb/now-playing
router.get("/now-playing", async (req, res) => {
  try {
    const response = await axios.get("https://api.themoviedb.org/3/movie/now_playing", {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`
      }
    });

    res.json({ success: true, movies: response.data.results });
  } catch (error) {
    console.error("TMDB Proxy Error:", error.message);
    res.status(500).json({ success: false, message: "TMDB API call failed" });
  }
});

export default router;
