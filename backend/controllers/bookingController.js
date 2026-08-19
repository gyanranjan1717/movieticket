import Booking from "../models/bookingModel.js";
import Show from "../models/showModel.js";
import stripe from "stripe";
import { inngest } from "../inngest/index.js";
import redis, { safeRedisDel, safeRedisSet } from "../configs/redis.js";

// Helper to get Stripe instance dynamically or lazily
const getStripeInstance = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not defined in environment variables");
  }
  return new stripe(process.env.STRIPE_SECRET_KEY);
};

export const checkSeatsAvailiability = async (showId, selectedSeats) => {
  try {
    const showData = await Show.findById(showId);
    if (!showData) return false;

    const occupiedSeats = showData.occupiedSeats || {};
    const isAnySeatTaken = selectedSeats.some((seat) => occupiedSeats[seat]);
    return !isAnySeatTaken;
  } catch (error) {
    console.log(error.message);
    return false;
  }
};

// Distributed lock for seats using Redis
export const acquireSeatLocks = async (showId, selectedSeats, userId) => {
  const lockTTL = 15000; // 15 seconds lock window
  const lockedKeys = [];

  try {
    if (redis.status === "ready") {
      for (const seat of selectedSeats) {
        const lockKey = `lock:show:${showId}:seat:${seat}`;
        const acquired = await safeRedisSet(lockKey, userId, "PX", lockTTL, "NX");
        
        if (!acquired) {
          // Rollback locks acquired so far
          for (const key of lockedKeys) {
            await safeRedisDel(key);
          }
          return false;
        }
        lockedKeys.push(lockKey);
      }
    }
    return true;
  } catch (error) {
    console.warn("Redis seat lock warning:", error.message);
    return true; // Fallback to DB check if Redis unavailable
  }
};

export const releaseSeatLocks = async (showId, selectedSeats) => {
  try {
    if (redis.status === "ready") {
      for (const seat of selectedSeats) {
        await safeRedisDel(`lock:show:${showId}:seat:${seat}`);
      }
    }
  } catch (error) {
    console.warn("Redis release locks warning:", error.message);
  }
};

export const createBooking = async (req, res) => {
  let locksAcquired = false;
  let showIdForLock = null;
  let selectedSeatsForLock = [];

  try {
    const userId = req.user.userId;
    const { showId, selectedSeats } = req.body;
    const { origin } = req.headers;

    showIdForLock = showId;
    selectedSeatsForLock = selectedSeats;

    // 1. Acquire Redis distributed lock for selected seats
    locksAcquired = await acquireSeatLocks(showId, selectedSeats, userId);

    if (!locksAcquired) {
      return res.status(400).json({
        success: false,
        message: "Selected seats are currently being booked by another user. Please try again.",
      });
    }

    // 2. Database seat availability check
    const isAvailable = await checkSeatsAvailiability(showId, selectedSeats);
    
    if (!isAvailable) {
      await releaseSeatLocks(showId, selectedSeats);
      return res.status(400).json({
        success: false,
        message: "Selected seats are not available.",
      });
    }

    // 3. Show details lookup
    const showData = await Show.findById(showId).populate("movie");
    if (!showData) {
      await releaseSeatLocks(showId, selectedSeats);
      return res.status(404).json({ success: false, message: "Show not found" });
    }

    // 4. Create new booking record
    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: showData.showPrice * selectedSeats.length,
      bookedSeats: selectedSeats,
    });

    // 5. Update occupied seats in MongoDB
    selectedSeats.forEach((seat) => {
      showData.occupiedSeats[seat] = userId;
    });

    showData.markModified("occupiedSeats");
    await showData.save();

    // Invalidate cached active shows & user recommendation cache
    await safeRedisDel("cache:active_shows");
    await safeRedisDel(`cache:recommendations:${userId}`);

    // 6. Create Stripe checkout session (Fix currency precision with Math.round)
    const stripeInstance = getStripeInstance();
    const line_items = [{
      price_data: {
        currency: "usd",
        product_data: {
          name: showData.movie.title,
        },
        unit_amount: Math.round(booking.amount * 100) // Corrected precision (cents)
      },
      quantity: 1
    }];

    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/MyBooking`,
      cancel_url: `${origin}/MyBooking`,
      line_items: line_items,
      mode: "payment",
      metadata: {
        bookingId: booking._id.toString(),
      },
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour expiration
    });

    booking.paymentLink = session.url;
    await booking.save();

    // 7. Release Redis distributed locks after reservation saved
    await releaseSeatLocks(showId, selectedSeats);

    // 8. Trigger Inngest function to verify payment status after 10 mins
    try {
      await inngest.send({
        name: "app/checkpayment",
        data: {
          bookingId: booking._id.toString(),
        },
      });
    } catch (error) {
      console.log("Error in sending Inngest event:", error.message);
    }

    return res.status(201).json({
      success: true,
      message: "Booking created & seats reserved",
      bookingId: booking._id,
      amount: booking.amount,
      url: session.url
    });
  } catch (error) {
    if (locksAcquired && showIdForLock && selectedSeatsForLock) {
      await releaseSeatLocks(showIdForLock, selectedSeatsForLock);
    }
    console.log("Booking error:", error.message);
    return res.status(500).json({ success: false, message: "Booking failed", error: error.message });
  }
};

export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    const showData = await Show.findById(showId);

    if (!showData) {
      return res.status(404).json({
        success: false,
        message: "Show not found",
      });
    }

    const occupiedSeats = Object.keys(showData.occupiedSeats || {});

    res.status(200).json({ success: true, occupiedSeats });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch occupied seats",
    });
  }
};
