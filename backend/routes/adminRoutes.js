import express from "express";
import { protectAdmin } from "../middleware/auth.js";
import {
  cancelBookingAdmin,
  exportBookingsCSV,
  exportUsersCSV,
  flushRedisCache,
  getAllBookings,
  getAllShows,
  getAllUsers,
  getDashboardData,
  isAdmin
} from "../controllers/adminController.js";

const adminRouter = express.Router();

adminRouter.get("/is-admin", protectAdmin, isAdmin);
adminRouter.get("/dashboard", protectAdmin, getDashboardData);
adminRouter.get("/all-shows", protectAdmin, getAllShows);
adminRouter.get("/all-bookings", protectAdmin, getAllBookings);

// Data Analysis Export Endpoints (CSV)
adminRouter.get("/export-bookings", protectAdmin, exportBookingsCSV);
adminRouter.get("/export-users", protectAdmin, exportUsersCSV);

// Redis System & Cache Controls
adminRouter.post("/flush-cache", protectAdmin, flushRedisCache);

// User & Booking Management
adminRouter.get("/all-users", protectAdmin, getAllUsers);
adminRouter.post("/cancel-booking", protectAdmin, cancelBookingAdmin);

export default adminRouter;