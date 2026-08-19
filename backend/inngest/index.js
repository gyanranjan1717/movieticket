import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/bookingModel.js";
import Show from "../models/showModel.js";
import path from "path";
import sendEmail from "../configs/nodeMailer.js";
import dotenv from "dotenv";
dotenv.config();
import { DateTime } from "luxon";
// import pkg from 'react';
// const { use } = pkg

// import { send } from "process";

// Create a client to send and receive events
// export const inngest = new Inngest({ id: "movie-ticket-booking" });
export const inngest = new Inngest({
  id: "movie-ticket-booking",
  eventKey: process.env.INNGEST_EVENT_KEY, // safer
});


// inngest function to save user data 
const syncUserCreation = inngest.createFunction(
    {id:'sync-user-from-clerk'},
    {event:'clerk/user.created'},
    async ({event})=>{
        const {id,first_name,last_name,email_addresses,image_url} = event.data
        const userData = {
            _id:id,
            email:email_addresses[0].email_address,
            name:first_name+' ' + last_name,
            image:image_url
        }
        await User.create(userData)
    }
)

//delte
const syncUserDeletion = inngest.createFunction(
    {id:'sync-user-with-clerk'},
    {event:'clerk/user.deleted'},
    async ({event})=>{
        const {id} = event.data
        
        await User.findByIdAndDelete(id);
    }
)


//update
const syncUserUpdation = inngest.createFunction(
    {id:'update-user-from-clerk'},
    {event:'clerk/user.updated'},
    async ({event})=>{
        const {id,first_name,last_name,email_addresses,image_url} = event.data
        const userData = {
            _id:id,
            email:email_addresses[0].email_address,
            name:first_name+' ' + last_name,
            image:image_url
        }
        await User.findByIdAndUpdate(id,userData);
    }
)

// inngest function to cancel booking and release seats of show after 10 minutes of booking created if payment is not made 

const releaseSeatsAndDeleteBooking = inngest.createFunction(
    {id:'release-seats-and-delete-booking'},
    {event:'app/checkpayment'},
    async({event,step}) => {
        const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
        await step.sleepUntil('wait-for-10-minutes', tenMinutesLater);

        await step.run('check-payment-status',async () => {
            const bookingId = event.data.bookingId;
            const booking = await Booking.findById(bookingId);
            
            // IF PAyment is not made, release seats and delete booking
            if (!booking.isPaid) {
                const show = await Show.findById(booking.show);
                booking.bookedSeats.forEach(seat => {
                        delete show.occupiedSeats[seat];
                });
                show.markModified('occupiedSeats');
                await show.save();
                await Booking.findByIdAndDelete(booking._id);
            }   
        
        })
    }

);

//Inngest function to send email to user after booking is created
//  const sendBookingConfirmationEmail = inngest.createFunction(
//     {id:"send-booking-confirmation-email"},
//     {event:"app/show.booked"},
//     async ({event, step}) => {
//         const {bookingId} = event.data;

//         const booking = await Booking.findById(bookingId).populate({
//             path: 'show',
//             populate: {
//                 path: 'movie',
//                 model: 'Movie'
//             }
//         }).populate('user');
        
//          await sendEmail({
//             to:booking.user.email,
//             subject:`Booking Confirmation for ${booking.show.movie.title}`,
//             body:`
//             <div style="font-family: Arial,sans-serif;line-height: 1.6;">
//             <h2> Hi ${booking.user.name},</h2>
//             <p>
//             your booking for <srong style="color:#F84565;>"${booking.show.movie.title} is confirmed.</strong></p>
//             <p>
//             <p>

//             <strong>Date:</strong> ${new Date(booking.show.showDateTime).toLocaleDateString('en-US',{timeZone:'Asia/Kolkata'})}<br>
            
//             <strong>Time:</strong> ${new Date(booking.show.showDateTime).toLocaleTimeString('en-US',{timeZone:'Asia/Kolkata'})}<br>
            
//             </p>
//              <p>Enjoy the Show!</p>
//              <p>Thanks for booking woth us!<br>-ShowTime Team</p>
        
//             </div
//             `
//          })


//     }
//  )

import MovieReminder from "../models/MovieReminder.js";

// Inngest function to send rich HTML ticket confirmation email after booking
const sendBookingConfirmationEmail = inngest.createFunction(
  { id: "send-booking-confirmation-email" },
  { event: "app/show.booked" },
  async ({ event, step }) => {
    const { bookingId } = event.data;

    const booking = await Booking.findById(bookingId)
      .populate({
        path: "show",
        populate: {
          path: "movie",
          model: "Movie",
        },
      })
      .populate("user");

    if (!booking || !booking.user || !booking.show) return;

    // Format Date & Time using luxon
    const showDateTime = DateTime.fromISO(new Date(booking.show.showDateTime).toISOString(), {
      zone: "Asia/Kolkata",
    });

    const formattedDate = showDateTime.toLocaleString(DateTime.DATE_MED);
    const formattedTime = showDateTime.toLocaleString(DateTime.TIME_SIMPLE);
    const seatsText = (booking.bookedSeats || []).join(", ") || "General Admission";
    const posterUrl = booking.show.movie?.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80";

    // Send rich HTML ticket email
    await sendEmail(
      booking.user.email,
      `🎟️ Your Movie Ticket: ${booking.show.movie.title}`,
      `
        <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #ffffff; padding: 30px; border-radius: 16px; max-w: 600px; margin: 0 auto; border: 1px solid #1f2937;">
          <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #1f2937;">
            <h1 style="color: #e11d48; margin: 0; font-size: 28px;">ShowTime Cinema</h1>
            <p style="color: #9ca3af; font-size: 13px; margin-top: 5px;">Official Mobile E-Ticket</p>
          </div>

          <div style="margin-top: 25px; display: flex; gap: 20px;">
            <img src="${posterUrl}" alt="${booking.show.movie.title}" style="width: 120px; height: 170px; object-fit: cover; border-radius: 12px; border: 1px solid #374151;" />
            <div style="flex: 1;">
              <h2 style="color: #ffffff; margin: 0 0 10px 0; font-size: 22px;">${booking.show.movie.title}</h2>
              <p style="margin: 4px 0; color: #d1d5db; font-size: 14px;"><strong>📅 Date:</strong> ${formattedDate}</p>
              <p style="margin: 4px 0; color: #d1d5db; font-size: 14px;"><strong>⏰ Time:</strong> ${formattedTime}</p>
              <p style="margin: 4px 0; color: #10b981; font-size: 14px;"><strong>🎟️ Reserved Seats:</strong> <span style="background-color: #064e3b; color: #34d399; padding: 3px 8px; border-radius: 6px; font-weight: bold;">${seatsText}</span></p>
              <p style="margin: 4px 0; color: #d1d5db; font-size: 14px;"><strong>💰 Paid:</strong> $${booking.amount || 0}</p>
            </div>
          </div>

          <div style="margin-top: 25px; padding: 15px; background-color: #111827; border-radius: 12px; text-align: center; border: 1px dashed #374151;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">BOOKING ID</p>
            <p style="margin: 5px 0 0 0; color: #f59e0b; font-family: monospace; font-size: 18px; font-weight: bold; letter-spacing: 2px;">#${booking._id.toString().toUpperCase()}</p>
            <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 11px;">Show this email or booking ID at theater entrance gate.</p>
          </div>

          <div style="margin-top: 25px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #1f2937; padding-top: 15px;">
            <p>Enjoy your movie experience at <strong>ShowTime Cinema</strong>!</p>
          </div>
        </div>
      `
    );
  }
);

// Inngest Scheduled Job: 1 Hour Before Movie Starting Reminder
const send1HourShowReminders = inngest.createFunction(
  { id: "send-1hour-show-reminders" },
  { cron: "*/15 * * * *" }, // Runs every 15 minutes to check upcoming shows
  async ({ step }) => {
    const reminderTasks = await step.run(
      "prepare-1hour-reminder-tasks",
      async () => {
        const now = new Date();
        // Window: 45 minutes to 75 minutes from now (~1 hour before show starts)
        const windowStart = new Date(now.getTime() + 45 * 60 * 1000);
        const windowEnd = new Date(now.getTime() + 75 * 60 * 1000);

        const shows = await Show.find({
          showDateTime: { $gte: windowStart, $lte: windowEnd },
        }).populate("movie");

        const tasks = [];

        for (const show of shows) {
          if (!show.movie) continue;

          // Find paid bookings for this show
          const bookings = await Booking.find({ show: show._id, isPaid: true }).populate("user");

          for (const b of bookings) {
            if (!b.user || !b.user.email) continue;
            tasks.push({
              userEmail: b.user.email,
              userName: b.user.name || "Movie Lover",
              movieTitle: show.movie.title,
              poster: show.movie.poster,
              showTime: show.showDateTime,
              seats: (b.bookedSeats || []).join(", ") || "General",
            });
          }
        }
        return tasks;
      }
    );

    if (reminderTasks.length === 0) {
      return { sent: 0, message: "No 1-hour reminders to send right now" };
    }

    const results = await step.run("send-1hour-reminders-emails", async () => {
      return await Promise.allSettled(
        reminderTasks.map((task) => {
          const formattedTime = new Date(task.showTime).toLocaleTimeString("en-US", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
          });

          return sendEmail(
            task.userEmail,
            `⏳ 1 Hour Reminder: Your movie "${task.movieTitle}" starts soon!`,
            `
              <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #ffffff; padding: 25px; border-radius: 16px; max-w: 550px; margin: 0 auto; border: 1px solid #1f2937;">
                <h2 style="color: #f59e0b; margin-top: 0;">⏳ Your Movie Starts in 1 Hour!</h2>
                <p>Hi <strong>${task.userName}</strong>,</p>
                <p>This is your 1-hour starting reminder for <strong style="color: #e11d48;">"${task.movieTitle}"</strong>.</p>
                
                <div style="background-color: #111827; padding: 15px; border-radius: 12px; margin: 15px 0; border: 1px solid #374151;">
                  <p style="margin: 4px 0; color: #d1d5db;"><strong>⏰ Show Starts:</strong> ${formattedTime}</p>
                  <p style="margin: 4px 0; color: #10b981;"><strong>🎟️ Your Seats:</strong> ${task.seats}</p>
                  <p style="margin: 4px 0; color: #9ca3af;"><strong>📍 Venue:</strong> ShowTime Cinema Screen 1</p>
                </div>

                <p style="color: #d1d5db;">Please arrive 15 minutes early to grab popcorn and get seated!</p>
                <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">See you inside the theater! 🍿<br>- ShowTime Team</p>
              </div>
            `
          );
        })
      );
    });

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return { sent, message: `Sent ${sent} 1-hour reminders` };
  }
);

// Inngest Function: Send Notification when Showtimes are added for a movie ("Remind Me" Subscribers)
const sendNewShowNotification = inngest.createFunction(
  { id: "send-new-show-notifications" },
  { event: "app/show.added" },
  async ({ event, step }) => {
    const { movieTitle, movieId } = event.data;

    // 1. Fetch targeted users who clicked "Remind Me" for this movie
    const reminders = await step.run("fetch-movie-reminders", async () => {
      return await MovieReminder.find({
        $or: [{ movieId: movieId }, { movieTitle: new RegExp(movieTitle, "i") }],
      });
    });

    if (reminders.length === 0) {
      return { message: "No subscribers to notify for this movie" };
    }

    const results = await step.run("send-remind-me-emails", async () => {
      return await Promise.allSettled(
        reminders.map((sub) =>
          sendEmail(
            sub.userEmail,
            `🎟️ Tickets OPEN: ${movieTitle} is now available for booking!`,
            `
              <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #ffffff; padding: 25px; border-radius: 16px; max-w: 550px; margin: 0 auto; border: 1px solid #1f2937;">
                <h2 style="color: #10b981; margin-top: 0;">🎉 Great News! Tickets are OPEN!</h2>
                <p>Hi <strong>${sub.userName}</strong>,</p>
                <p>You asked us to remind you when showtimes were added for <strong style="color: #e11d48;">"${movieTitle}"</strong>.</p>
                
                <div style="background-color: #111827; padding: 15px; border-radius: 12px; margin: 15px 0; text-align: center; border: 1px solid #374151;">
                  <h3 style="color: #ffffff; margin: 0 0 10px 0;">"${movieTitle}" Screenings Available Now</h3>
                  <p style="color: #9ca3af; font-size: 13px; margin: 0 0 15px 0;">Reserve your preferred seats before they fill up!</p>
                  <a href="http://localhost:5173/Movies" style="background-color: #e11d48; color: #ffffff; padding: 10px 22px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Book Tickets Now</a>
                </div>

                <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">Thanks for using ShowTime Cinema Reminders! 🍿</p>
              </div>
            `
          )
        )
      );
    });

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return { sent, message: `Sent ${sent} "Remind Me" notifications for ${movieTitle}` };
  }
);

// Export all Inngest functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
  send1HourShowReminders,
  sendNewShowNotification,
];
