import stripe from 'stripe'
import Booking from '../models/bookingModel.js'
import { inngest } from '../inngest/index.js';

export const stripeWebhooks = async (request, response) => {

    const stripeInstance = new  stripe(process.env.STRIPE_SECRET_KEY);
    const sig = request.headers['stripe-signature'];
    
    let event;

    try{

    event = stripeInstance.webhooks.constructEvent(
        request.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET);

    }catch(error){
        console.log("Error in stripe webhook", error.message);
        return response.status(400).send(
           `WebHook Error: ${error.message}`
        );
    }
 // to check the event 
    try{

        switch(event.type){
            case "payment_intent.succeeded":
                // case "checkout.session.completed":
                {

                const paymentIntent = event.data.object;
                const sessionList = await stripeInstance.checkout.sessions.list({
                payment_intent: paymentIntent.id,
                })
                const session = sessionList.data[0];
                // const session = event.data.object; // new line 
                const {bookingId} = session.metadata;
                
                
                // change the property in mongodb 
                await Booking.findByIdAndUpdate(bookingId, {
                    isPaid: true,
                    paymentLink:""
                })
               

                //send confirmation email
                
                try {
                    await inngest.send({
                        name: "app/show.booked",
                        data: { bookingId }
                    });
                    } catch (err) {
                    console.error("Inngest send failed:", err);
                    }

                 break;
        }
       // if we get any other things in place of payment_intent.succeeded
        default:
            console.log(`Unhandled event type ${event.type}`);
            
            
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