import express from "express";
import { sendOtp, verifyOtp, googleAuth, getMe, sendAdminOtp, verifyAdminOtp } from "../controllers/authController.js";
import { protectUser } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  sendOtpSchema,
  verifyOtpSchema,
  googleAuthSchema,
  sendAdminOtpSchema,
  verifyAdminOtpSchema,
} from "../schemas/validationSchemas.js";

const authRouter = express.Router();

/**
 * @openapi
 * /api/auth/send-otp:
 *   post:
 *     summary: Send a 6-digit OTP code to the specified email address (Zod Validated)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: OTP code sent successfully to email
 *       400:
 *         description: Invalid email address
 */
authRouter.post("/send-otp", validate(sendOtpSchema), sendOtp);

/**
 * @openapi
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify 6-digit OTP code and issue JWT token (Zod Validated)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *     responses:
 *       200:
 *         description: Successful verification, returns JWT token and user profile
 *       400:
 *         description: Invalid or expired OTP code
 */
authRouter.post("/verify-otp", validate(verifyOtpSchema), verifyOtp);

/**
 * @openapi
 * /api/auth/send-admin-otp:
 *   post:
 *     summary: Verify Admin Secret Key and send OTP to Admin Email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - adminKey
 *             properties:
 *               email:
 *                 type: string
 *               adminKey:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin OTP sent successfully
 *       403:
 *         description: Invalid Admin Secret Key
 */
authRouter.post("/send-admin-otp", validate(sendAdminOtpSchema), sendAdminOtp);

/**
 * @openapi
 * /api/auth/verify-admin-otp:
 *   post:
 *     summary: Verify Admin OTP and grant Admin role with JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - adminKey
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *               adminKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin authenticated successfully
 *       403:
 *         description: Invalid Admin Secret Key
 */
authRouter.post("/verify-admin-otp", validate(verifyAdminOtpSchema), verifyAdminOtp);

/**
 * @openapi
 * /api/auth/google:
 *   post:
 *     summary: Sign in or Register using Google OAuth ID token credential (Zod Validated)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credential
 *             properties:
 *               credential:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful Google authentication
 */
authRouter.post("/google", validate(googleAuthSchema), googleAuth);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get currently authenticated user details
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile details including role and favorites
 */
authRouter.get("/me", protectUser, getMe);

export default authRouter;
