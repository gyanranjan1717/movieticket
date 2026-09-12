import Booking from "../models/bookingModel.js";
import Show from "../models/showModel.js";
import Otp from "../models/Otp.js";
import AIAuditLog from "../models/AIAuditLog.js";
import User from "../models/User.js";
import stripe from "stripe";
import { inngest } from "../inngest/index.js";
import redis, { safeRedisDel, safeRedisSet } from "../configs/redis.js";
import { 
  sendBookingConfirmationEmailDirect, 
  sendCancellationRefundEmailDirect,
  sendCancellationOtpEmail 
} from "../services/emailService.js";

let stripeInstance = null;
export const getStripeInstance = () => {
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

    let session;
    if (process.env.NODE_ENV === 'test' && (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test_mock'))) {
      session = { url: `https://checkout.stripe.com/c/pay/cs_test_mock_${Date.now()}` };
    } else {
      session = await stripe.checkout.sessions.create({
        success_url: `${origin}/loading/MyBooking`,
        cancel_url: `${origin}/MyBooking`,
        line_items: line_items,
        mode: "payment",
        metadata: {
          bookingId: bookingCreated._id.toString(),
        },
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour expiration
      });
    }

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

export const getBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId).populate({
      path: "show",
      populate: { path: "movie" }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // If not marked paid yet, check Stripe checkout session if available
    if (!booking.isPaid && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = getStripeInstance();
        const sessionMatch = booking.paymentLink?.match(/cs_[a-zA-Z0-9_]+/);
        let stripeSession = null;
        if (sessionMatch) {
          stripeSession = await stripe.checkout.sessions.retrieve(sessionMatch[0]);
        } else {
          const sessions = await stripe.checkout.sessions.list({ limit: 10 });
          stripeSession = sessions.data.find(s => s.metadata?.bookingId === bookingId);
        }

        if (stripeSession && stripeSession.payment_status === "paid") {
          booking.isPaid = true;
          booking.status = "confirmed";
          booking.paymentLink = "";
          await booking.save();

          // Guaranteed direct ticket confirmation email delivery
          try {
            await sendBookingConfirmationEmailDirect(bookingId);
          } catch (mailErr) {
            console.warn("[BookingStatus] Direct ticket email notice:", mailErr.message);
          }

          try {
            await inngest.send({
              name: "app/show.booked",
              data: { bookingId }
            });
          } catch (e) {
            console.error("Inngest send error:", e.message);
          }
        }
      } catch (stripeErr) {
        console.warn("Stripe status verification warning:", stripeErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      isPaid: Boolean(booking.isPaid),
      booking: {
        bookingId: booking._id,
        isPaid: booking.isPaid,
        status: booking.status || (booking.isPaid ? 'confirmed' : 'pending'),
        amount: booking.amount,
        bookedSeats: booking.bookedSeats,
        movieTitle: booking.show?.movie?.title || "Movie",
        showDateTime: booking.show?.showDateTime
      }
    });
  } catch (error) {
    console.error("Error getting booking status:", error);
    return res.status(500).json({ success: false, message: "Failed to get booking status" });
  }
};

/**
 * CANCEL BOOKING & PROCESS REFUND
 */
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?.userId;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: "Booking ID is required" });
    }

    const booking = await Booking.findById(bookingId).populate({
      path: "show",
      populate: { path: "movie" }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Ensure only the booking owner or admin can cancel
    if (booking.user.toString() !== userId?.toString() && req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized to cancel this booking" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ success: false, message: "This booking is already cancelled." });
    }

    // Check if screening has already occurred
    if (booking.show?.showDateTime && new Date(booking.show.showDateTime) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel a booking for a past screening."
      });
    }

    let refundInfo = { amount: booking.amount, refundId: `ref_${Date.now()}` };

    // Process Stripe refund if payment was completed
    if (booking.isPaid && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = getStripeInstance();
        let paymentIntentId = null;

        const sessionMatch = booking.paymentLink?.match(/cs_[a-zA-Z0-9_]+/);
        if (sessionMatch) {
          const session = await stripe.checkout.sessions.retrieve(sessionMatch[0]);
          paymentIntentId = session.payment_intent;
        } else {
          const sessions = await stripe.checkout.sessions.list({ limit: 15 });
          const matchedSession = sessions.data.find(s => s.metadata?.bookingId === bookingId.toString());
          if (matchedSession) {
            paymentIntentId = matchedSession.payment_intent;
          }
        }

        if (paymentIntentId) {
          const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            reason: "requested_by_customer"
          });
          refundInfo.refundId = refund.id;
          refundInfo.amount = refund.amount ? refund.amount / 100 : booking.amount;
        }
      } catch (stripeErr) {
        console.warn("[CancelBooking] Stripe refund notice:", stripeErr.message);
      }
    }

    // Free occupied seats in MongoDB Show document & Redis locks
    if (booking.show && booking.bookedSeats?.length > 0) {
      const show = await Show.findById(booking.show._id || booking.show);
      if (show && show.occupiedSeats) {
        booking.bookedSeats.forEach(seat => {
          delete show.occupiedSeats[seat];
          safeRedisDel(`lock:show:${show._id}:seat:${seat}`);
        });
        show.markModified("occupiedSeats");
        await show.save();
      }
    }

    booking.status = "cancelled";
    booking.isPaid = false;
    await booking.save();

    await safeRedisDel("cache:active_shows");
    await safeRedisDel("cache:now_playing_movies");

    // Send Cancellation & Refund Email directly
    try {
      await sendCancellationRefundEmailDirect(bookingId, refundInfo);
    } catch (e) {
      console.warn("Cancellation email notice:", e.message);
    }

    return res.status(200).json({
      success: true,
      message: `Ticket successfully cancelled! $${refundInfo.amount} refund initiated and confirmation email dispatched.`,
      refund: refundInfo
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return res.status(500).json({ success: false, message: "Failed to cancel booking" });
  }
};

/**
 * STEP 1 (LAYER 4): REQUEST 6-DIGIT OTP TO CANCEL TICKET
 */
export const requestCancellationOtp = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?.userId;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: "Booking ID is required" });
    }

    const booking = await Booking.findById(bookingId).populate({
      path: "show",
      populate: { path: "movie" }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.user.toString() !== userId?.toString() && req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized to access this booking" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ success: false, message: "This booking has already been cancelled." });
    }

    if (booking.show?.showDateTime && new Date(booking.show.showDateTime) < new Date()) {
      return res.status(400).json({ success: false, message: "Cannot cancel ticket for a screening that has already ended." });
    }

    const user = await User.findById(userId).lean();
    if (!user || !user.email) {
      return res.status(400).json({ success: false, message: "User account email not found" });
    }

    const movieTitle = booking.show?.movie?.title || "Movie Ticket";
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Invalidate any previous OTP for this booking cancellation
    await Otp.deleteMany({
      email: user.email,
      purpose: "user_cancellation",
      targetId: bookingId
    });

    // Store new OTP bound to this specific booking with 5-minute TTL
    await Otp.create({
      email: user.email,
      otp,
      purpose: "user_cancellation",
      targetId: bookingId,
      metadata: {
        movieTitle,
        amount: booking.amount,
        seats: booking.bookedSeats
      }
    });

    // Send high-security verification email
    await sendCancellationOtpEmail(user.email, user.name, movieTitle, otp, booking.amount);

    // Record challenge issued in audit log
    await AIAuditLog.create({
      actorId: userId,
      actorRole: req.user?.role || "user",
      actorEmail: user.email,
      action: "cancel_booking_challenge_issued",
      targetType: "booking",
      targetId: bookingId,
      status: "challenge_issued",
      reason: `Verification OTP dispatched to ${user.email} for cancelling booking #${bookingId}`,
      metadata: { movieTitle, amount: booking.amount }
    });

    return res.status(200).json({
      success: true,
      challengeRequired: true,
      bookingId,
      message: `A 6-digit security code has been sent to ${user.email}. Enter the code to authorize your refund.`,
      emailMasked: user.email.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + "*".repeat(b.length))
    });
  } catch (error) {
    console.error("Error requesting cancellation OTP:", error);
    return res.status(500).json({ success: false, message: "Failed to issue cancellation verification code" });
  }
};

/**
 * STEP 2 (LAYER 4): VERIFY OTP & ATOMICALLY EXECUTE CANCELLATION & REFUND
 */
export const confirmCancellationWithOtp = async (req, res) => {
  try {
    const { bookingId, otp } = req.body;
    const userId = req.user?.userId;

    if (!bookingId || !otp) {
      return res.status(400).json({ success: false, message: "Both Booking ID and 6-digit verification code are required" });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: "User account not found" });
    }

    // Verify OTP matching email, purpose, and specific targetId
    const validOtp = await Otp.findOne({
      email: user.email,
      otp: otp.trim(),
      purpose: "user_cancellation",
      targetId: bookingId
    });

    if (!validOtp) {
      await AIAuditLog.create({
        actorId: userId,
        actorRole: req.user?.role || "user",
        actorEmail: user.email,
        action: "cancel_booking_otp_failed",
        targetType: "booking",
        targetId: bookingId,
        status: "failed",
        reason: "Invalid or expired cancellation OTP provided"
      });

      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code. Please check your email or request a new code."
      });
    }

    const booking = await Booking.findById(bookingId).populate({
      path: "show",
      populate: { path: "movie" }
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ success: false, message: "Booking has already been cancelled and refunded." });
    }

    // Invariant check: screening time
    if (booking.show?.showDateTime && new Date(booking.show.showDateTime) < new Date()) {
      return res.status(400).json({ success: false, message: "Cannot cancel ticket for a past screening." });
    }

    let refundInfo = { amount: booking.amount, refundId: `ref_${Date.now()}` };

    // Process Stripe refund if payment was completed
    if (booking.isPaid && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = getStripeInstance();
        let paymentIntentId = null;

        const sessionMatch = booking.paymentLink?.match(/cs_[a-zA-Z0-9_]+/);
        if (sessionMatch) {
          const session = await stripe.checkout.sessions.retrieve(sessionMatch[0]);
          paymentIntentId = session.payment_intent;
        } else {
          const sessions = await stripe.checkout.sessions.list({ limit: 15 });
          const matchedSession = sessions.data.find(s => s.metadata?.bookingId === bookingId.toString());
          if (matchedSession) {
            paymentIntentId = matchedSession.payment_intent;
          }
        }

        if (paymentIntentId) {
          const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            reason: "requested_by_customer"
          });
          refundInfo.refundId = refund.id;
          refundInfo.amount = refund.amount ? refund.amount / 100 : booking.amount;
        }
      } catch (stripeErr) {
        console.warn("[CancelBookingOTP] Stripe refund notice:", stripeErr.message);
      }
    }

    // Free occupied seats in MongoDB Show document & Redis locks
    if (booking.show && booking.bookedSeats?.length > 0) {
      const show = await Show.findById(booking.show._id || booking.show);
      if (show && show.occupiedSeats) {
        booking.bookedSeats.forEach(seat => {
          delete show.occupiedSeats[seat];
          safeRedisDel(`lock:show:${show._id}:seat:${seat}`);
        });
        show.markModified("occupiedSeats");
        await show.save();
      }
    }

    booking.status = "cancelled";
    booking.isPaid = false;
    await booking.save();

    // Consume the OTP
    await Otp.findByIdAndDelete(validOtp._id);

    await safeRedisDel("cache:active_shows");
    await safeRedisDel("cache:now_playing_movies");

    // Send confirmation receipt email
    try {
      await sendCancellationRefundEmailDirect(bookingId, refundInfo);
    } catch (e) {
      console.warn("Cancellation email notice:", e.message);
    }

    // Log confirmed audit event
    await AIAuditLog.create({
      actorId: userId,
      actorRole: req.user?.role || "user",
      actorEmail: user.email,
      action: "cancel_booking_confirmed",
      targetType: "booking",
      targetId: bookingId,
      status: "success",
      reason: "OTP verified successfully. Seats released and refund processed.",
      metadata: {
        movieTitle: booking.show?.movie?.title,
        seats: booking.bookedSeats,
        refundAmount: refundInfo.amount
      }
    });

    return res.status(200).json({
      success: true,
      message: `Verification successful! Ticket cancelled and $${refundInfo.amount} refund processed to your account.`,
      refund: refundInfo
    });
  } catch (error) {
    console.error("Error confirming cancellation with OTP:", error);
    return res.status(500).json({ success: false, message: "Failed to confirm cancellation" });
  }
};


