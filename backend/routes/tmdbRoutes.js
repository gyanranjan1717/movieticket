import express from "express";
import { getUpcomingReleases, getNowPlaying, getTopRated } from "../controllers/tmdbController.js";

const tmdbRouter = express.Router();

/**
 * @openapi
 * /api/tmdb/upcoming:
 *   get:
 *     summary: Get upcoming movie releases with posters and countdowns
 *     tags: [Releases]
 *     responses:
 *       200:
 *         description: List of upcoming movies
 */
tmdbRouter.get("/upcoming", getUpcomingReleases);

/**
 * @openapi
 * /api/tmdb/now-playing:
 *   get:
 *     summary: Get now playing movies in theaters
 *     tags: [Releases]
 *     responses:
 *       200:
 *         description: List of now playing movies
 */
tmdbRouter.get("/now-playing", getNowPlaying);
tmdbRouter.get("/top-rated", getTopRated);

export default tmdbRouter;
