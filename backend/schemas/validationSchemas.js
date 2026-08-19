import { z } from "zod";

// Auth Schemas
export const sendOtpSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
  name: z.string().optional(),
});

export const googleAuthSchema = z.object({
  credential: z.string().min(10, "Google ID token credential is required"),
});

export const sendAdminOtpSchema = z.object({
  email: z.string().email("Invalid email format"),
  adminKey: z.string().min(1, "Admin API/Secret key is required"),
  name: z.string().optional(),
});

export const verifyAdminOtpSchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
  adminKey: z.string().min(1, "Admin API/Secret key is required"),
  name: z.string().optional(),
});

// Booking Schemas
export const createBookingSchema = z.object({
  showId: z.string().min(1, "Show ID is required"),
  selectedSeats: z.array(z.string()).min(1, "At least one seat must be selected"),
});

// Show Schemas
export const addShowSchema = z.object({
  movieId: z.number().or(z.string()),
  showsInput: z.array(
    z.object({
      date: z.string(),
      time: z.array(z.string()),
    })
  ).min(1, "At least one show slot is required"),
  showPrice: z.number().positive("Show price must be greater than 0"),
});

// Review Schemas
export const createReviewSchema = z.object({
  movieId: z.string().min(1, "Movie ID is required"),
  rating: z.number().min(1, "Minimum rating is 1").max(5, "Maximum rating is 5"),
  comment: z.string().min(3, "Comment must be at least 3 characters").max(500, "Comment cannot exceed 500 characters"),
});
