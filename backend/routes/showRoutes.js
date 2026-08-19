import express from 'express';
import {
    addShow, 
    getNowPlayingMovies, 
    getShow, 
    getShows,
    searchMovies,
    createCustomMovie
} from '../controllers/showController.js';
import { protectAdmin } from '../middleware/auth.js';

const showRouter = express.Router();

showRouter.get("/now-playing", getNowPlayingMovies);
showRouter.get("/search-movies", searchMovies);
showRouter.post("/create-custom-movie", protectAdmin, createCustomMovie);
showRouter.post("/add", protectAdmin, addShow);

/**
 * @openapi
 * /api/show/all:
 *   get:
 *     summary: Get all upcoming shows grouped by movie
 *     tags: [Shows]
 *     responses:
 *       200:
 *         description: Unique list of shows
 */
showRouter.get("/all", getShows);

/**
 * @openapi
 * /api/show/{movieId}:
 *   get:
 *     summary: Get show dates and times for a specific movie
 *     tags: [Shows]
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Movie showtimes breakdown
 */
showRouter.get("/:movieId", getShow);

export default showRouter;
