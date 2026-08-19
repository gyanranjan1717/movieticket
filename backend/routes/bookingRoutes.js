import express from "express";
import { createBooking, getOccupiedSeats } from "../controllers/bookingController.js";
import { protectUser } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createBookingSchema } from "../schemas/validationSchemas.js";

const bookingRouter = express.Router();

/**
 * @openapi
 * /api/booking/create:
 *   post:
 *     summary: Reserve seats and create Stripe payment checkout (Redis Locked & Zod Validated)
 *     tags: [Bookings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - showId
 *               - selectedSeats
 *             properties:
 *               showId:
 *                 type: string
 *               selectedSeats:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Booking created successfully with Stripe checkout session URL
 *       400:
 *         description: Seat conflict or validation error
 */
bookingRouter.post('/create', protectUser, validate(createBookingSchema), createBooking);

/**
 * @openapi
 * /api/booking/seats/{showId}:
 *   get:
 *     summary: Get list of occupied seats for a show
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: showId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of seat IDs currently occupied
 */
bookingRouter.get('/seats/:showId', getOccupiedSeats);

export default bookingRouter;