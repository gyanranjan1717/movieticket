import sendEmail from "../configs/nodeMailer.js";
import Booking from "../models/bookingModel.js";
import { DateTime } from "luxon";

/**
 * Send rich HTML movie ticket confirmation email directly
 */
export const sendBookingConfirmationEmailDirect = async (bookingId) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate({
        path: "show",
        populate: {
          path: "movie",
          model: "Movie"
        }
      })
      .populate("user");

    if (!booking || !booking.user || !booking.show) {
      console.warn(`[EmailService] Cannot send confirmation: booking, user, or show missing for ${bookingId}`);
      return false;
    }

    const movie = booking.show.movie;
    const movieTitle = movie?.title || "Movie Presentation";
    const posterUrl = movie?.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80";

    const showDateTime = DateTime.fromISO(new Date(booking.show.showDateTime).toISOString(), {
      zone: "Asia/Kolkata",
    });

    const formattedDate = showDateTime.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY);
    const formattedTime = showDateTime.toLocaleString(DateTime.TIME_SIMPLE);
    const seatsText = (booking.bookedSeats || []).join(", ") || "General Admission";
    const recipientEmail = booking.user.email;
    const recipientName = booking.user.name || "Movie Lover";

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #ffffff; padding: 30px 20px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #1f2937;">
        <!-- Header -->
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #1f2937;">
          <h1 style="color: #f43f5e; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">ShowTime Cinema</h1>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 6px;">Official E-Ticket & Reservation Receipt</p>
        </div>

        <!-- Greeting -->
        <div style="margin-top: 20px;">
          <p style="font-size: 15px; color: #e5e7eb; margin: 0;">Hi <strong>${recipientName}</strong>,</p>
          <p style="font-size: 14px; color: #9ca3af; margin: 6px 0 0 0;">Your ticket booking is confirmed! Here are your screening details:</p>
        </div>

        <!-- Movie & Screening Card -->
        <div style="margin-top: 20px; background-color: #111827; border-radius: 14px; padding: 18px; border: 1px solid #374151; display: flex; gap: 18px;">
          <img src="${posterUrl}" alt="${movieTitle}" style="width: 100px; height: 145px; object-fit: cover; border-radius: 10px; border: 1px solid #4b5563; flex-shrink: 0;" />
          <div style="flex: 1;">
            <h2 style="color: #ffffff; margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">${movieTitle}</h2>
            <p style="margin: 3px 0; color: #d1d5db; font-size: 13px;"><strong>📅 Date:</strong> ${formattedDate}</p>
            <p style="margin: 3px 0; color: #d1d5db; font-size: 13px;"><strong>⏰ Time:</strong> <span style="color: #fbbf24; font-weight: bold;">${formattedTime}</span></p>
            <p style="margin: 3px 0; color: #d1d5db; font-size: 13px;"><strong>🎟️ Seats:</strong> <span style="background-color: #064e3b; color: #34d399; padding: 2px 7px; border-radius: 6px; font-weight: bold; font-family: monospace;">${seatsText}</span></p>
            <p style="margin: 3px 0; color: #d1d5db; font-size: 13px;"><strong>💵 Amount:</strong> <span style="color: #34d399; font-weight: bold;">$${booking.amount || 0}</span></p>
          </div>
        </div>

        <!-- Booking ID Barcode Banner -->
        <div style="margin-top: 20px; padding: 16px; background: linear-gradient(135deg, #18181b, #09090b); border-radius: 12px; text-align: center; border: 1px dashed #f59e0b;">
          <p style="margin: 0; color: #9ca3af; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">E-Ticket Reference ID</p>
          <p style="margin: 5px 0 0 0; color: #f59e0b; font-family: monospace; font-size: 20px; font-weight: 900; letter-spacing: 2px;">#${booking._id.toString().toUpperCase()}</p>
          <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px;">Present this ticket or Booking ID at the theater entrance. Enjoy the movie! 🍿🎬</p>
        </div>

        <!-- Footer -->
        <div style="margin-top: 25px; text-align: center; border-top: 1px solid #1f2937; padding-top: 16px;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">ShowTime Movie Booking Platform • Need help? Contact support@showtime.com</p>
        </div>
      </div>
    `;

    await sendEmail(recipientEmail, `🎟️ Your ShowTime Ticket: ${movieTitle}`, htmlBody);
    console.log(`[EmailService] Ticket confirmation email successfully sent to ${recipientEmail} for booking ${bookingId}`);
    return true;
  } catch (err) {
    console.error(`[EmailService] Failed to send ticket confirmation email for ${bookingId}:`, err.message);
    return false;
  }
};

/**
 * Send rich HTML cancellation and refund confirmation email directly
 */
export const sendCancellationRefundEmailDirect = async (bookingId, refundDetails = {}) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate({
        path: "show",
        populate: {
          path: "movie",
          model: "Movie"
        }
      })
      .populate("user");

    if (!booking || !booking.user) {
      console.warn(`[EmailService] Cannot send cancellation email: booking or user missing for ${bookingId}`);
      return false;
    }

    const movieTitle = booking.show?.movie?.title || "Movie Screening";
    const recipientEmail = booking.user.email;
    const recipientName = booking.user.name || "Movie Lover";
    const refundedAmount = refundDetails.amount || booking.amount || 0;
    const refundId = refundDetails.refundId || `ref_${Date.now()}`;
    const seatsFreed = (booking.bookedSeats || []).join(", ") || "Reserved Seats";

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #ffffff; padding: 30px 20px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #1f2937;">
        <!-- Header -->
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #1f2937;">
          <h1 style="color: #f43f5e; margin: 0; font-size: 28px; font-weight: 800;">ShowTime Cinema</h1>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 6px;">Cancellation & Refund Notice</p>
        </div>

        <!-- Content -->
        <div style="margin-top: 20px;">
          <p style="font-size: 15px; color: #e5e7eb; margin: 0;">Hi <strong>${recipientName}</strong>,</p>
          <p style="font-size: 14px; color: #9ca3af; margin: 8px 0 0 0;">Your ticket booking for <strong>"${movieTitle}"</strong> has been successfully cancelled, and your refund has been processed.</p>
        </div>

        <!-- Refund Summary Box -->
        <div style="margin-top: 20px; background-color: #111827; border-radius: 14px; padding: 20px; border: 1px solid #374151;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">
            <span style="color: #9ca3af;">Booking Reference:</span>
            <span style="color: #ffffff; font-family: monospace; font-weight: bold;">#${booking._id.toString().toUpperCase()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">
            <span style="color: #9ca3af;">Movie:</span>
            <span style="color: #ffffff; font-weight: bold;">${movieTitle}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">
            <span style="color: #9ca3af;">Seats Released:</span>
            <span style="color: #f59e0b; font-weight: bold;">${seatsFreed}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; border-bottom: 1px solid #1f2937; padding-bottom: 8px;">
            <span style="color: #9ca3af;">Refund Status:</span>
            <span style="color: #34d399; font-weight: bold;">Processed to Original Payment Method</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 16px; margin-top: 6px;">
            <span style="color: #e5e7eb; font-weight: bold;">Total Refunded:</span>
            <span style="color: #34d399; font-weight: 800; font-size: 18px;">$${refundedAmount}</span>
          </div>
        </div>

        <div style="margin-top: 20px; padding: 12px 16px; background-color: #18181b; border-radius: 10px; font-size: 12px; color: #9ca3af; border-left: 4px solid #3b82f6;">
          Refund Reference ID: <strong style="color: #93c5fd; font-family: monospace;">${refundId}</strong><br/>
          Depending on your card issuer, the funds typically reflect in your account within 3–5 business days.
        </div>

        <!-- Footer -->
        <div style="margin-top: 25px; text-align: center; border-top: 1px solid #1f2937; padding-top: 16px;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">We hope to welcome you back to ShowTime soon! 🍿</p>
        </div>
      </div>
    `;

    await sendEmail(recipientEmail, `✅ Refund Confirmed: ShowTime Ticket #${booking._id.toString().slice(-6).toUpperCase()}`, htmlBody);
    console.log(`[EmailService] Cancellation & refund email sent to ${recipientEmail} for booking ${bookingId}`);
    return true;
  } catch (err) {
    console.error(`[EmailService] Failed to send cancellation email for ${bookingId}:`, err.message);
    return false;
  }
};

/**
 * Send movie release reminder confirmation email
 */
export const sendMovieReminderConfirmationEmail = async (userEmail, movieTitle) => {
  try {
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #ffffff; padding: 30px 20px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #1f2937;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #1f2937;">
          <h1 style="color: #f43f5e; margin: 0; font-size: 28px; font-weight: 800;">ShowTime Cinema</h1>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 6px;">Premiere Alert Confirmation</p>
        </div>

        <div style="margin-top: 20px;">
          <h2 style="color: #38bdf8; font-size: 20px; margin: 0 0 10px 0;">🔔 Reminder Alert Set!</h2>
          <p style="font-size: 14px; color: #e5e7eb; line-height: 1.6;">
            We have registered your ticket reminder for <strong style="color: #fbbf24;">"${movieTitle}"</strong>.
          </p>
          <p style="font-size: 14px; color: #9ca3af; line-height: 1.6;">
            The moment showtimes are scheduled and bookings open in theaters, our automated cinema alert system will email you immediately so you can grab the best seats in the house!
          </p>
        </div>

        <div style="margin-top: 25px; text-align: center; border-top: 1px solid #1f2937; padding-top: 16px;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">Thanks for using ShowTime Cinema Alerts! 🍿</p>
        </div>
      </div>
    `;

    await sendEmail(userEmail, `🔔 Ticket Reminder Confirmed: ${movieTitle}`, htmlBody);
    console.log(`[EmailService] Reminder confirmation email sent to ${userEmail} for "${movieTitle}"`);
    return true;
  } catch (err) {
    console.error(`[EmailService] Failed to send reminder email for ${movieTitle}:`, err.message);
    return false;
  }
};

/**
 * Send Two-Step Verification OTP for User Ticket Cancellation & Refund
 */
export const sendCancellationOtpEmail = async (userEmail, userName, movieTitle, otp, refundAmount = 0) => {
  try {
    console.log(`\n========================================`);
    console.log(`🔐 [SECURITY CHALLENGE] User Ticket Cancellation OTP`);
    console.log(`Recipient: ${userEmail} (${userName})`);
    console.log(`Movie: "${movieTitle}" | Refund Amount: $${refundAmount}`);
    console.log(`6-Digit OTP: >>> ${otp} <<< (Expires in 5 minutes)`);
    console.log(`========================================\n`);

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #ffffff; padding: 30px 20px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #1f2937;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #1f2937;">
          <h1 style="color: #f43f5e; margin: 0; font-size: 28px; font-weight: 800;">ShowTime Security</h1>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 6px;">Ticket Cancellation & Refund Authorization</p>
        </div>

        <div style="margin-top: 20px;">
          <p style="font-size: 15px; color: #e5e7eb; margin: 0;">Hi <strong>${userName || "Movie Lover"}</strong>,</p>
          <p style="font-size: 14px; color: #9ca3af; margin: 8px 0 0 0; line-height: 1.5;">
            We received a request to cancel your booking for <strong style="color: #ffffff;">"${movieTitle}"</strong> and process a full refund of <strong style="color: #34d399;">$${refundAmount}</strong>.
          </p>
        </div>

        <!-- OTP Highlight Box -->
        <div style="margin-top: 25px; background: linear-gradient(135deg, #18181b, #09090b); border: 2px dashed #f43f5e; border-radius: 14px; padding: 24px 16px; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Your Verification Code</p>
          <p style="margin: 10px 0; color: #fbbf24; font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px;">${otp}</p>
          <p style="margin: 0; color: #ef4444; font-size: 12px; font-weight: 600;">⏰ Valid for 5 minutes. Never share this code with anyone.</p>
        </div>

        <div style="margin-top: 20px; background-color: #111827; border-radius: 10px; padding: 14px; border: 1px solid #1f2937;">
          <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
            💡 <em>If you requested this cancellation via CineBot or our web platform, enter this 6-digit code to finalize your cancellation and release your seats. If you did not initiate this request, your tickets remain secure and no action is required.</em>
          </p>
        </div>

        <div style="margin-top: 25px; text-align: center; border-top: 1px solid #1f2937; padding-top: 16px;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">ShowTime Cinema Security • support@showtime.com</p>
        </div>
      </div>
    `;

    await sendEmail(userEmail, `🔐 ShowTime Verification Code: ${otp} (Cancel Ticket)`, htmlBody);
    return true;
  } catch (err) {
    console.error(`[EmailService] Failed to send cancellation OTP email to ${userEmail}:`, err.message);
    return false;
  }
};

/**
 * Send Two-Step Verification OTP for Admin Show Deletion
 */
export const sendAdminShowDeletionOtpEmail = async (adminEmail, adminName, movieTitle, showDetails = {}, otp) => {
  try {
    console.log(`\n========================================`);
    console.log(`🚨 [ADMIN SECURITY ALERT] Show Deletion Authorization OTP`);
    console.log(`Admin: ${adminEmail} (${adminName})`);
    console.log(`Show: "${movieTitle}" | Details: ${JSON.stringify(showDetails)}`);
    console.log(`6-Digit Admin OTP: >>> ${otp} <<< (Expires in 5 minutes)`);
    console.log(`========================================\n`);

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #ffffff; padding: 30px 20px; border-radius: 16px; max-width: 600px; margin: 0 auto; border: 1px solid #ef4444;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #1f2937;">
          <h1 style="color: #ef4444; margin: 0; font-size: 26px; font-weight: 800;">🚨 ShowTime Admin Security Alert</h1>
          <p style="color: #fca5a5; font-size: 13px; margin-top: 6px;">Theatrical Schedule Deletion Authorization</p>
        </div>

        <div style="margin-top: 20px;">
          <p style="font-size: 15px; color: #e5e7eb; margin: 0;">Administrator <strong>${adminName || "Admin"}</strong>,</p>
          <p style="font-size: 14px; color: #9ca3af; margin: 8px 0 0 0; line-height: 1.5;">
            An administrative request was submitted to delete the following showtime:
          </p>
          <ul style="color: #d1d5db; font-size: 13px; line-height: 1.8; margin-top: 8px;">
            <li><strong>Movie:</strong> ${movieTitle}</li>
            <li><strong>Show ID:</strong> #${showDetails.showId || 'N/A'}</li>
            <li><strong>Showtime:</strong> ${showDetails.showDateTime ? new Date(showDetails.showDateTime).toLocaleString() : 'N/A'}</li>
            <li><strong>Occupied Seats:</strong> 0 (Verified Empty)</li>
          </ul>
        </div>

        <!-- Admin OTP Highlight Box -->
        <div style="margin-top: 25px; background: linear-gradient(135deg, #1c1917, #0c0a09); border: 2px dashed #f59e0b; border-radius: 14px; padding: 24px 16px; text-align: center;">
          <p style="margin: 0; color: #f59e0b; font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Admin Authorization Code</p>
          <p style="margin: 10px 0; color: #ffffff; font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px;">${otp}</p>
          <p style="margin: 0; color: #ef4444; font-size: 12px; font-weight: 600;">⏰ Code expires in 5 minutes. Authorizes schedule deletion.</p>
        </div>

        <div style="margin-top: 25px; text-align: center; border-top: 1px solid #1f2937; padding-top: 16px;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">ShowTime Infrastructure Defense System • Unauthorized actions are logged and audited.</p>
        </div>
      </div>
    `;

    await sendEmail(adminEmail, `🚨 Admin Action Required: Show Deletion Code (${otp})`, htmlBody);
    return true;
  } catch (err) {
    console.error(`[EmailService] Failed to send admin show deletion OTP email to ${adminEmail}:`, err.message);
    return false;
  }
};

