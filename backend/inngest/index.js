import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/bookingModel.js";
import Show from "../models/showModel.js";
import path from "path";
import sendEmail from "../configs/nodeMailer.js";
import dotenv from "dotenv";
dotenv.config();
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
 const sendBookingConfirmationEmail = inngest.createFunction(
    {id:"send-booking-confirmation-email"},
    {event:"app/show.booked"},
    async ({event, step}) => {
        const {bookingId} = event.data;

        const booking = await Booking.findById(bookingId).populate({
            path: 'show',
            populate: {
                path: 'movie',
                model: 'Movie'
            }
        }).populate('user');
        
         await sendEmail({
            to:booking.user.email,
            subject:`Booking Confirmation for ${booking.show.movie.title}`,
            body:`
            <div style="font-family: Arial,sans-serif;line-height: 1.6;">
            <h2> Hi ${booking.user.name},</h2>
            <p>
            your booking for <srong style="color:#F84565;>"${booking.show.movie.title} is confirmed.</strong></p>
            <p>
            <p>
            <strong>Date:</strong> ${new Date(booking.show.showDateTime).toLocaleDateString('en-US',{timeZone:'Asia/Kolkata '})}<br>
            <strong>Time:</strong> ${new Date(booking.show.showDateTime).toLocaleTimeString('en-US',{timeZone:'Asia/Kolkata '})}<br>
            </p>
             <p>Enjoy the Show!</p>
             <p>Thanks for booking woth us!<br>-ShowTime Team</p>
        
            </div
            `
         })


    }
 )

// inngest function to send reminder
const sendShowReminders = inngest.createFunction(
    {id:"send-show-reminders"},
    {cron:"0*/8*** * * *"}, // Every 8 hours
    async ({step}) =>{
        const now = new Date();
        const in8Hours = new Date(now.getTime() + 8*60*60*1000); // 8 hours later
        const windowStart = new Date(in8Hours.getTime() - 10*60*1000); // 1 hour window before the show
        
        // prepare reminder tasks 
        const reminderTasks = await step.run(
            "prepare-reminder-tasks",
            async () => {
                const shows = await Show.find({
                    showDateTime: {
                        $gte: windowStart,
                        $lte: in8Hours
                    }
                }).populate('movie');

                const tasks = []

                for(const show of shows){
                    if(!show.movie || !show.occupiedSeats) continue;
                    const userIds = [...new set(Object.values(show.occupiedSeats))];
                    
                    if(userIds.length === 0) continue;

                    const users = await User.find({
                        _id:{$in:userIds}
                    }).select("name email");

                    for(const user of users){
                        tasks.push({
                            userEmail: user.email,
                            userName: user.name,
                            movieTitle: show.movie.title,
                            showTime:show.showTime
                        });
                    }
                    
                }

                return tasks;
            }
        )
        
        if(reminderTasks.length === 0) {
            console.log("No reminders to send");
            return {sent:0,message:"No reminders to send"};
        }

        const results = await step.run('send-all-reminders', async () => {
            
            return await promise.allsettled(
                reminderTasks.map(task => sendEmail({
                    to:task.userEmail,
                    subject:`Reminder:your movie "${task.movieTitle}" is coming up soon!`,
                    body:`
                    <div style="font-family: Arial,sans-serif;padding: 20px;">
            <h2> Hi ${task.userName},</h2>
            <p>This is a quick reminder that your movie:<>
            <strong style="color:#F84565;">"${task.movieTitle}"</strong> is coming up soon!</p>
            <p> is scheduled for <strong>${new Date(task.showTime).toLocaleDateString('en-US',{timeZone:'Asia/Kolkata '})}</strong> at <strong>${new Date(task.showTime).toLocaleTimeString('en-US',{timeZone:'Asia/Kolkata '})}</strong>.</p>
            <p>It starts in approximately <strong>8 hours </strong>.</p>
            <br>
            <p>Enjoy the show! <br> ShowTime Team</p>
            </div
                    `
                })))


        })

        const sent = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.length - sent;
        return {
            sent,
            failed,
            message: `Sent ${sent} reminders, ${failed} failed`
        }


    
    }
)


//send new show notification to all users
const sendNewShowNotification = inngest.createFunction(
    {id:"send-new-show-notifications"},
    {event:"app/show.added"},
    async({event}) =>{
        const {movieTitle} = event.data;
        const users = await User.find({});

        for(const user of users){
            const userEmail = user.email;
            const userName = user.name;
            
            const subject = `New Show Alert: ${movieTitle}`;
            const body = `
            <div style="font-family: Arial,sans-serif; padding: 20px;">
            <h2> Hi ${userName},</h2>
            <p> we have just added a new show to our library:</p>
            <h3 style="color:#F84565;">"${movieTitle}"</h3>
            <p>Check it out now and book your tickets!</p>
            <br>
            <p>Thanks for being a part of our community!<br> ShowTime Team</p>
            </div>
            `;
            await sendEmail({
            to:userEmail,
            subject,
            body
        })

        }
        return {message: `Notification sent to ${users.length} users`};
       
    }
)


// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
    releaseSeatsAndDeleteBooking,
    sendBookingConfirmationEmail,
    sendShowReminders,
    sendNewShowNotification
];
