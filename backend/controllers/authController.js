import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import sendEmail from "../configs/nodeMailer.js";
import { sendSignupOtpEmail, sendWelcomeEmail } from "../services/emailService.js";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "movieticket_super_secret_jwt_key_2026";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Asynchronous non-blocking password hashing with bcrypt
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

// Verifies password against bcrypt or legacy PBKDF2 hash
const verifyPassword = async (password, storedHash) => {
  if (!storedHash) return false;

  // Backward compatibility for existing PBKDF2 hashes
  if (storedHash.includes(":")) {
    const [salt, originalHash] = storedHash.split(":");
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return hash === originalHash;
  }

  return await bcrypt.compare(password, storedHash);
};

// Generate JWT token helper
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// 1. Send OTP for User Signup / Registration
export const sendSignupOtp = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, message: "Valid email address is required" });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists. Please sign in instead."
      });
    }

    // Generate random 6-digit numeric OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Clean up any existing pending signup OTPs for this email
    await Otp.deleteMany({ email: cleanEmail, purpose: "signup" });

    // Save new OTP with 5 minute TTL (300 seconds)
    const displayName = (name && name.trim()) || cleanEmail.split("@")[0];
    await Otp.create({
      email: cleanEmail,
      otp: generatedOtp,
      purpose: "signup",
      metadata: { name: displayName }
    });

    // Send verification OTP email
    await sendSignupOtpEmail(cleanEmail, displayName, generatedOtp);

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${cleanEmail}. Check your Inbox, Updates, or Spam folder.`,
      ...(process.env.NODE_ENV !== "production" && { devOtp: generatedOtp }),
    });
  } catch (error) {
    console.error("Error in sendSignupOtp:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send registration verification code",
      error: error.message
    });
  }
};

// 2. Verify 6-digit OTP and Create User Profile
export const verifySignupOtp = async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, message: "Valid email address is required" });
    }
    if (!otp || String(otp).trim().length !== 6) {
      return res.status(400).json({ success: false, message: "A valid 6-digit verification code is required" });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find valid OTP record
    const otpRecord = await Otp.findOne({
      email: cleanEmail,
      otp: String(otp).trim(),
      purpose: "signup"
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code. Please request a new code."
      });
    }

    // Delete OTP record immediately to prevent reuse
    await Otp.deleteOne({ _id: otpRecord._id });

    // Double check that user wasn't created in the meantime
    let user = await User.findOne({ email: cleanEmail });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists. Please sign in."
      });
    }

    const defaultName = (name && name.trim()) || otpRecord.metadata?.name || cleanEmail.split("@")[0];
    const hashedPassword = await hashPassword(password);

    user = await User.create({
      _id: "usr_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      name: defaultName,
      email: cleanEmail,
      password: hashedPassword,
      image: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(defaultName)}`,
      role: "user",
      favorites: [],
    });

    // Send Welcome email non-blockingly
    sendWelcomeEmail(user.email, user.name).catch((err) => {
      console.warn("[Auth] Welcome email notice:", err.message);
    });

    const token = generateToken(user);
    return res.status(201).json({
      success: true,
      message: "Account verified and created successfully! Welcome to ShowTime.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        favorites: user.favorites,
      },
    });
  } catch (error) {
    console.error("Error in verifySignupOtp:", error);
    return res.status(500).json({
      success: false,
      message: "Verification and account creation failed",
      error: error.message
    });
  }
};

// Backward-compatible User Registration (Enforces OTP verification)
export const registerWithPassword = async (req, res) => {
  const { otp } = req.body;
  if (otp) {
    return verifySignupOtp(req, res);
  }
  return res.status(400).json({
    success: false,
    message: "Email verification required. Please request a verification code first.",
    requiresOtp: true,
  });
};

// Direct User Login with Password
export const loginWithPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with this email. Please sign up." });
    }

    if (!user.password) {
      // First time setting password for OTP/Google user
      user.password = await hashPassword(password);
      await user.save();
    } else {
      const isMatch = await verifyPassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Incorrect password. Please try again." });
      }

      // Automatically upgrade legacy PBKDF2 hash to bcrypt on successful login
      if (user.password.includes(":")) {
        user.password = await hashPassword(password);
        await user.save();
      }
    }

    const token = generateToken(user);
    return res.status(200).json({
      success: true,
      message: "Welcome back!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        favorites: user.favorites,
      },
    });
  } catch (error) {
    console.error("Error in loginWithPassword:", error);
    return res.status(500).json({ success: false, message: "Login failed", error: error.message });
  }
};

// Direct Admin Login with Secret Key
export const loginAdminDirect = async (req, res) => {
  try {
    const { email, adminKey, name, password } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, message: "Valid admin email is required" });
    }

    const expectedAdminKey = process.env.ADMIN_SECRET_KEY || "ShowTimeApp";
    if (!adminKey || adminKey.trim() !== expectedAdminKey.trim()) {
      return res.status(403).json({
        success: false,
        message: "Invalid Master Admin Secret Key. Access denied.",
      });
    }

    let user = await User.findOne({ email });
    if (!user) {
      const defaultName = name || email.split("@")[0];
      user = await User.create({
        _id: "adm_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        name: defaultName,
        email,
        password: password ? await hashPassword(password) : null,
        image: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(defaultName)}`,
        role: "admin",
        favorites: [],
      });
    } else {
      user.role = "admin";
      if (password && !user.password) user.password = await hashPassword(password);
      await user.save();
    }

    const token = generateToken(user);
    return res.status(200).json({
      success: true,
      message: "Admin authentication successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        favorites: user.favorites,
      },
    });
  } catch (error) {
    console.error("Error in loginAdminDirect:", error);
    return res.status(500).json({ success: false, message: "Admin authentication failed", error: error.message });
  }
};

// 1. Send OTP to User Email
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, message: "Valid email address is required" });
    }

    // Generate random 6-digit numeric OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing OTPs for this email
    await Otp.deleteMany({ email });

    // Save new OTP with 5 minute TTL
    await Otp.create({ email, otp: generatedOtp });

    // Send Email using NodeMailer (Brevo SMTP)
    const emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #F84565;">ShowTime Ticket Booking Verification</h2>
        <p>Your 6-digit verification code is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #F84565; padding: 10px 0;">
          ${generatedOtp}
        </div>
        <p>This code is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
        <br>
        <p>Enjoy your movies!<br>ShowTime Team</p>
      </div>
    `;

    await sendEmail(email, "Your ShowTime Login Verification Code", emailBody);

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${email}`,
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send verification email",
      error: error.message,
    });
  }
};

// 2. Verify OTP & Log In / Sign Up
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp, name } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP code are required" });
    }

    // Find OTP record
    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP code" });
    }

    // Delete OTP record after successful check
    await Otp.deleteOne({ _id: otpRecord._id });

    // Find or create User
    let user = await User.findOne({ email });

    if (!user) {
      const defaultName = name || email.split("@")[0];
      user = await User.create({
        _id: "usr_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        name: defaultName,
        email,
        image: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(defaultName)}`,
        role: "user",
        favorites: [],
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Authentication successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        favorites: user.favorites,
      },
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ success: false, message: "Verification failed", error: error.message });
  }
};

// 3. Google OAuth Sign-In
export const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: "Google ID token credential is required" });
    }

    let payload = null;

    // Verify token using google-auth-library if client ID is provided, else parse payload
    if (process.env.GOOGLE_CLIENT_ID) {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } else {
      // Fallback decoding for development testing
      const base64Payload = credential.split(".")[1];
      payload = JSON.parse(Buffer.from(base64Payload, "base64").toString("utf-8"));
    }

    const { email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ success: false, message: "Could not extract email from Google token" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        _id: "usr_g_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        name: name || email.split("@")[0],
        email,
        image: picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
        role: "user",
        favorites: [],
      });
    } else if (picture && user.image !== picture) {
      user.image = picture;
      await user.save();
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Google authentication successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        favorites: user.favorites,
      },
    });
  } catch (error) {
    console.error("Error in Google Auth:", error);
    return res.status(500).json({ success: false, message: "Google authentication failed", error: error.message });
  }
};

// 4. Get Current User Profile
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        favorites: user.favorites,
      },
    });
  } catch (error) {
    console.error("Error in getMe:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch user profile" });
  }
};

// 5. Send Admin Registration/Login OTP with Admin Key Verification
export const sendAdminOtp = async (req, res) => {
  try {
    const { email, adminKey, name } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, message: "Valid email address is required" });
    }

    const expectedAdminKey = process.env.ADMIN_SECRET_KEY || "ShowTimeApp";
    if (!adminKey || adminKey.trim() !== expectedAdminKey.trim()) {
      return res.status(403).json({
        success: false,
        message: "Invalid Admin API / Secret Key. You are not authorized to register as Admin.",
      });
    }

    // Generate random 6-digit numeric OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing OTPs for this email
    await Otp.deleteMany({ email });

    // Save new OTP with 5 minute TTL
    await Otp.create({ email, otp: generatedOtp });

    // Send Email to Admin using NodeMailer
    const emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 24px; background-color: #111827; color: #ffffff; border-radius: 12px; max-width: 500px;">
        <div style="background-color: #F84565; color: #fff; display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 12px;">
          ADMIN ACCESS PORTAL
        </div>
        <h2 style="color: #ffffff; margin-top: 0;">ShowTime Administrator Verification</h2>
        <p style="color: #9CA3AF; font-size: 14px;">An admin registration/login request was initiated for this email address.</p>
        <div style="background-color: #1F2937; border: 1px solid #374151; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
          <span style="font-size: 12px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px;">Admin Security Code</span>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #F84565; padding: 8px 0;">
            ${generatedOtp}
          </div>
        </div>
        <p style="color: #9CA3AF; font-size: 13px;">This code is valid for <strong>5 minutes</strong>. If you did not request admin access, please secure your credentials immediately.</p>
        <hr style="border: 0; border-top: 1px solid #374151; margin: 20px 0;" />
        <p style="color: #6B7280; font-size: 12px; margin: 0;">ShowTime Security System</p>
      </div>
    `;

    await sendEmail(email, "🔑 ShowTime Admin Verification Code", emailBody);

    return res.status(200).json({
      success: true,
      message: `Admin verification code sent to ${email}`,
    });
  } catch (error) {
    console.error("Error sending Admin OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send admin verification email",
      error: error.message,
    });
  }
};

// 6. Verify Admin OTP & Register/Login as Admin
export const verifyAdminOtp = async (req, res) => {
  try {
    const { email, otp, adminKey, name } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP code are required" });
    }

    const expectedAdminKey = process.env.ADMIN_SECRET_KEY || "ShowTimeApp";
    if (!adminKey || adminKey.trim() !== expectedAdminKey.trim()) {
      return res.status(403).json({
        success: false,
        message: "Invalid Admin API / Secret Key.",
      });
    }

    // Find OTP record
    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP code" });
    }

    // Delete OTP record after successful check
    await Otp.deleteOne({ _id: otpRecord._id });

    // Find or create User with Admin role
    let user = await User.findOne({ email });

    if (!user) {
      const defaultName = name || email.split("@")[0];
      user = await User.create({
        _id: "adm_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        name: defaultName,
        email,
        image: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(defaultName)}`,
        role: "admin",
        favorites: [],
      });
    } else {
      user.role = "admin";
      if (name && !user.name) user.name = name;
      await user.save();
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Admin authentication successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        favorites: user.favorites,
      },
    });
  } catch (error) {
    console.error("Error verifying Admin OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Admin verification failed",
      error: error.message,
    });
  }
};
