import express from "express";
import { 
  createBooking, 
  getOccupiedSeats, 
  getBookingStatus, 
  cancelBooking,
  requestCancellationOtp,
  confirmCancellationWithOtp
} from "../controllers/bookingController.js";
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

/**
 * @openapi
 * /api/booking/status/{bookingId}:
 *   get:
 *     summary: Check payment and reservation status of a booking
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Current payment and booking status
 */
bookingRouter.get('/status/:bookingId', getBookingStatus);

/**
 * @openapi
 * /api/booking/cancel/{bookingId}:
 *   post:
 *     summary: Cancel booking, release seats, issue Stripe refund, and send email
 *     tags: [Bookings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking cancelled and refund processed
 */
bookingRouter.post('/cancel/:bookingId', protectUser, cancelBooking);

/**
 * @openapi
 * /api/booking/request-cancel-otp/{bookingId}:
 *   post:
 *     summary: Request 6-digit OTP to verify ticket cancellation
 *     tags: [Bookings]
 *     security:
 *       - BearerAuth: []
 */
bookingRouter.post('/request-cancel-otp/:bookingId', protectUser, requestCancellationOtp);

/**
 * @openapi
 * /api/booking/confirm-cancel-otp:
 *   post:
 *     summary: Verify 6-digit OTP and atomically execute cancellation & refund
 *     tags: [Bookings]
 *     security:
 *       - BearerAuth: []
 */
bookingRouter.post('/confirm-cancel-otp', protectUser, confirmCancellationWithOtp);

export default bookingRouter;