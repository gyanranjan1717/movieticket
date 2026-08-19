import User from "../models/User.js";
import Booking from "../models/bookingModel.js";
import Movie from "../models/movieModel.js";
import MovieReminder from "../models/MovieReminder.js";
import { safeRedisDel } from "../configs/redis.js";

// API controller function to get logged-in user's bookings
export const getUserBookings = async (req, res) => {
    try {
        const userId = req.user.userId;
        const bookings = await Booking.find({ user: userId }).populate({
            path: "show",
            populate: { path: "movie" }
        }).sort({ createdAt: -1 });

        return res.status(200).json({ success: true, bookings });
    } catch (error) {
        console.error("Error fetching user bookings:", error);
        return res.status(500).json({ success: false, message: "Error loading bookings" });
    }
};

// API controller function to toggle favorite movie in MongoDB user schema
export const updateFavorite = async (req, res) => {
  try {
    const { movieId } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let favorites = user.favorites || [];
    const movieObjId = movieId.toString();

    // Toggle favorite
    const exists = favorites.some((fav) => fav.toString() === movieObjId);
    if (!exists) {
      favorites.push(movieId);
    } else {
      favorites = favorites.filter((fav) => fav.toString() !== movieObjId);
    }

    user.favorites = favorites;
    await user.save();

    // Invalidate user recommendations cache
    await safeRedisDel(`cache:recommendations:${userId}`);

    return res.status(200).json({
      success: true,
      message: "Favorites updated successfully",
      favorites: user.favorites,
    });
  } catch (error) {
    console.error("Error in updateFavorite:", error);
    return res.status(500).json({ success: false, message: "Error updating favorites" });
  }
};

// API controller function to get user favorites movies
export const getFavorites = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).populate("favorites");
        if (!user) {
          return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({ success: true, movies: user.favorites || [] });
    } catch (error) {
        console.error("Error fetching favorites:", error.message);
        return res.status(500).json({ success: false, message: "Error fetching favorites" });
    }
};

/**
 * TOGGLE MOVIE REMINDER (When user asks to be notified when showtimes are added)
 */
export const toggleMovieReminder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { movieId, movieTitle } = req.body;

    if (!movieId || !movieTitle) {
      return res.status(400).json({ success: false, message: "Movie ID and Title are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const existing = await MovieReminder.findOne({ user: userId, movieId: movieId.toString() });

    if (existing) {
      await MovieReminder.findByIdAndDelete(existing._id);
      return res.status(200).json({
        success: true,
        subscribed: false,
        message: `Removed reminder for "${movieTitle}"`,
      });
    }

    await MovieReminder.create({
      user: userId,
      userEmail: user.email,
      userName: user.name || "Movie Lover",
      movieTitle: movieTitle.trim(),
      movieId: movieId.toString(),
    });

    return res.status(200).json({
      success: true,
      subscribed: true,
      message: `Reminder set! We will email you at ${user.email} as soon as tickets open for "${movieTitle}".`,
    });
  } catch (error) {
    console.error("Error toggling reminder:", error);
    return res.status(500).json({ success: false, message: "Failed to set movie reminder" });
  }
};

/**
 * GET ALL MOVIE REMINDERS FOR CURRENT USER
 */
export const getUserReminders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const reminders = await MovieReminder.find({ user: userId });
    return res.status(200).json({ success: true, reminders });
  } catch (error) {
    console.error("Error fetching user reminders:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch reminders" });
  }
};