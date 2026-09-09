import Booking from "../models/bookingModel.js";
import Show from "../models/showModel.js";
import stripe from "stripe";
import { inngest } from "../inngest/index.js";
import redis, { safeRedisDel, safeRedisSet } from "../configs/redis.js";

let stripeInstance = null;
const getStripeInstance = () => {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not defined in environment variables");
    }
    stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
};

export const checkSeatsAvailiability = async (showId, selectedSeats) => {
  try {
    const showData = await Show.findById(showId).lean();
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
          // Rollback locks acquired so far (safe release with userId)
          for (const key of lockedKeys) {
            await redis.eval(
              'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
              1,
              key,
              userId
            );
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

// Safe Redis lock release using Lua script to verify lock owner
export const releaseSeatLocks = async (showId, selectedSeats, userId) => {
  try {
    if (redis.status === "ready") {
      const releaseLua = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      for (const seat of selectedSeats) {
        const lockKey = `lock:show:${showId}:seat:${seat}`;
        if (userId) {
          await redis.eval(releaseLua, 1, lockKey, userId);
        } else {
          await safeRedisDel(lockKey);
        }
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
  let seatsOccupiedInDb = false;
  let bookingCreated = null;

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

    // 2. Single Database lookup for show details & availability check (Eliminating redundant query)
    const showData = await Show.findById(showId).populate("movie").lean();
    if (!showData) {
      await releaseSeatLocks(showId, selectedSeats, userId);
      return res.status(404).json({ success: false, message: "Show not found" });
    }

    const occupiedSeats = showData.occupiedSeats || {};
    const isAnySeatTaken = selectedSeats.some((seat) => occupiedSeats[seat]);
    if (isAnySeatTaken) {
      await releaseSeatLocks(showId, selectedSeats, userId);
      return res.status(400).json({
        success: false,
        message: "Selected seats are not available.",
      });
    }

    // 3. Atomic MongoDB reservation update (Prevents race conditions if locks expire)
    const atomicCondition = { _id: showId };
    selectedSeats.forEach((seat) => {
      atomicCondition[`occupiedSeats.${seat}`] = { $exists: false };
    });

    const seatUpdates = {};
    selectedSeats.forEach((seat) => {
      seatUpdates[`occupiedSeats.${seat}`] = userId;
    });

    const reservationResult = await Show.findOneAndUpdate(
      atomicCondition,
      { $set: seatUpdates },
      { new: true }
    );

    if (!reservationResult) {
      await releaseSeatLocks(showId, selectedSeats, userId);
      return res.status(400).json({
        success: false,
        message: "One or more seats were just booked by another customer. Please select different seats.",
      });
    }

    seatsOccupiedInDb = true;

    // 4. Create new booking record
    bookingCreated = await Booking.create({
      user: userId,
      show: showId,
      amount: showData.showPrice * selectedSeats.length,
      bookedSeats: selectedSeats,
    });

    // Invalidate cached active shows & user recommendation cache
    await safeRedisDel("cache:active_shows");
    await safeRedisDel(`cache:recommendations:${userId}`);

    // 5. Create Stripe checkout session
    const stripe = getStripeInstance();
    const line_items = [{
      price_data: {
        currency: "usd",
        product_data: {
          name: showData.movie?.title || "Movie Ticket",
        },
        unit_amount: Math.round(bookingCreated.amount * 100) // Precision cents
      },
      quantity: 1
    }];

    const session = await stripe.checkout.sessions.create({
      success_url: `${origin}/loading/MyBooking`,
      cancel_url: `${origin}/MyBooking`,
      line_items: line_items,
      mode: "payment",
      metadata: {
        bookingId: bookingCreated._id.toString(),
      },
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour expiration
    });

    bookingCreated.paymentLink = session.url;
    await bookingCreated.save();

    // 6. Safely release Redis distributed locks
    await releaseSeatLocks(showId, selectedSeats, userId);

    // 7. Trigger Inngest function to verify payment status after 10 mins
    try {
      await inngest.send({
        name: "app/checkpayment",
        data: {
          bookingId: bookingCreated._id.toString(),
        },
      });
    } catch (error) {
      console.log("Error in sending Inngest event:", error.message);
    }

    return res.status(201).json({
      success: true,
      message: "Booking created & seats reserved",
      bookingId: bookingCreated._id,
      amount: bookingCreated.amount,
      url: session.url
    });
  } catch (error) {
    const userId = req.user?.userId;
    if (locksAcquired && showIdForLock && selectedSeatsForLock.length > 0) {
      await releaseSeatLocks(showIdForLock, selectedSeatsForLock, userId);
    }

    // Rollback ghost booking and free occupied seats if downstream Stripe failed
    if (seatsOccupiedInDb && showIdForLock && selectedSeatsForLock.length > 0) {
      try {
        const seatUnsets = {};
        selectedSeatsForLock.forEach((seat) => {
          seatUnsets[`occupiedSeats.${seat}`] = 1;
        });
        await Show.findByIdAndUpdate(showIdForLock, { $unset: seatUnsets });
      } catch (rollbackErr) {
        console.error("Failed to rollback seats in MongoDB:", rollbackErr.message);
      }
    }

    if (bookingCreated) {
      try {
        await Booking.findByIdAndDelete(bookingCreated._id);
      } catch (delErr) {
        console.error("Failed to delete draft booking:", delErr.message);
      }
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
