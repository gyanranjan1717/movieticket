import express from "express";
import { addReview, getMovieReviews, likeReview, replyToReview } from "../controllers/reviewController.js";
import { protectUser } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createReviewSchema } from "../schemas/validationSchemas.js";

const reviewRouter = express.Router();

/**
 * @openapi
 * /api/reviews:
 *   post:
 *     summary: Add or update a movie review & rating (Zod Validated)
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - movieId
 *               - rating
 *               - comment
 *             properties:
 *               movieId:
 *                 type: string
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review submitted successfully
 *       400:
 *         description: Validation error
 */
reviewRouter.post("/", protectUser, validate(createReviewSchema), addReview);

/**
 * @openapi
 * /api/reviews/{movieId}:
 *   get:
 *     summary: Get all user reviews and average rating for a movie
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of movie reviews and overall average rating
 */
reviewRouter.get("/:movieId", getMovieReviews);

/**
 * @openapi
 * /api/reviews/{reviewId}/like:
 *   post:
 *     summary: Toggle like on a review comment
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 */
reviewRouter.post("/:reviewId/like", protectUser, likeReview);

/**
 * @openapi
 * /api/reviews/{reviewId}/reply:
 *   post:
 *     summary: Post a threaded reply to a review comment
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 */
reviewRouter.post("/:reviewId/reply", protectUser, replyToReview);

export default reviewRouter;
