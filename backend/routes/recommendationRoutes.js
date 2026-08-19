import express from "express";
import { getRecommendedMovies, getSimilarMovies } from "../controllers/recommendationController.js";
import { protectUser } from "../middleware/auth.js";

const recommendationRouter = express.Router();

/**
 * @openapi
 * /api/recommendations:
 *   get:
 *     summary: Get personalized movie recommendations
 *     tags: [Recommendations]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of recommended movies based on user preferences
 *       500:
 *         description: Server error
 */
recommendationRouter.get("/", protectUser, getRecommendedMovies);
recommendationRouter.get("/similar/:movieId", getSimilarMovies);

export default recommendationRouter;
