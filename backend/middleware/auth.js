import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "movieticket_super_secret_jwt_key_2026";

// Protect middleware to verify authenticated user JWT token
export const protectUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authorization token required" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user exists in MongoDB
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: "User account no longer exists" });
    }

    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    };

    next();
  } catch (error) {
    console.error("JWT Verification error:", error.message);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// Protect middleware to verify admin role
export const protectAdmin = async (req, res, next) => {
  try {
    await protectUser(req, res, async () => {
      if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access denied. Admin role required." });
      }
      next();
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Authorization error" });
  }
};