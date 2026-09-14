import stripe from 'stripe'
import Booking from '../models/bookingModel.js'
import { inngest } from '../inngest/index.js';
import { sendBookingConfirmationEmailDirect } from '../services/emailService.js';

let stripeInstance = null;
const getStripe = () => {
  if (!stripeInstance) {
    stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
};

export const stripeWebhooks = async (request, response) => {
    const stripeClient = getStripe();
    const sig = request.headers['stripe-signature'];
    
    let event;

    try {
        event = stripeClient.webhooks.constructEvent(
            request.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch(error) {
        console.log("Error in stripe webhook constructEvent:", error.message);
        return response.status(400).send(`WebHook Error: ${error.message}`);
    }

    try {
        switch(event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;
                const bookingId = session.metadata?.bookingId;

                if (bookingId) {
                    await Booking.findByIdAndUpdate(bookingId, {
                        isPaid: true,
                        paymentLink: ""
                    });

                    // Direct guaranteed email delivery
                    try {
                        await sendBookingConfirmationEmailDirect(bookingId);
                    } catch (mailErr) {
                        console.warn("[StripeWebhook] Direct email dispatch error:", mailErr.message);
                    }

                    try {
                        await inngest.send({
                            name: "app/show.booked",
                            data: { bookingId }
                        });
                    } catch (err) {
                        console.error("Inngest send failed:", err.message);
                    }
                }
                break;
            }

            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object;
                const sessionList = await stripeClient.checkout.sessions.list({
                    payment_intent: paymentIntent.id,
                });
                const session = sessionList.data[0];
                const bookingId = session?.metadata?.bookingId;

                if (bookingId) {
                    await Booking.findByIdAndUpdate(bookingId, {
                        isPaid: true,
                        paymentLink: ""
                    });

                    // Direct guaranteed email delivery
                    try {
                        await sendBookingConfirmationEmailDirect(bookingId);
                    } catch (mailErr) {
                        console.warn("[StripeWebhook] Direct email dispatch error:", mailErr.message);
                    }

                    try {
                        await inngest.send({
                            name: "app/show.booked",
                            data: { bookingId }
                        });
                    } catch (err) {
                        console.error("Inngest send failed:", err.message);
                    }
                }
                break;
            }

            default:
                console.log(`Unhandled stripe event type: ${event.type}`);
        }

        return response.status(200).json({
            received: true,
            message: "Webhook received successfully",
        });

        }catch(error){
            console.log("Error in stripe webhook", error.message);
            return response.status(400).json({
                success: false,
                message: "Webhook Error",
            });
    }


}