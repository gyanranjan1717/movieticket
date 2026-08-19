import express from "express";
import { getFavorites, getUserBookings, getUserReminders, toggleMovieReminder, updateFavorite } from "../controllers/userController.js";
import { protectUser } from "../middleware/auth.js";

const userRouter = express.Router();

/**
 * @openapi
 * /api/user/bookings:
 *   get:
 *     summary: Get currently authenticated user's booking history
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of user bookings with populated show and movie data
 *       401:
 *         description: Unauthorized
 */
userRouter.get("/bookings", protectUser, getUserBookings);

/**
 * @openapi
 * /api/user/update-favorite:
 *   post:
 *     summary: Toggle movie in user's favorites list
 *     tags: [User]
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
 *             properties:
 *               movieId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated array of favorite movie IDs
 *       401:
 *         description: Unauthorized
 */
userRouter.post("/update-favorite", protectUser, updateFavorite);

/**
 * @openapi
 * /api/user/favorites:
 *   get:
 *     summary: Get list of favorited movie objects for user
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of movie details favorited by the user
 *       401:
 *         description: Unauthorized
 */
userRouter.get("/favorites", protectUser, getFavorites);

// Remind Me endpoints
userRouter.post("/toggle-reminder", protectUser, toggleMovieReminder);
userRouter.get("/reminders", protectUser, getUserReminders);

export default userRouter;
