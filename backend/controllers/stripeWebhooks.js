import stripe from 'stripe'
import Booking from '../models/bookingModel.js'
import { inngest } from '../inngest/index.js';




export const stripeWebhooks = async (req, res) => {

    const stripeInstance = new  stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    let event;

    try{

        // event = stripeInstance.webhooks.constructEvent(req.body,sig.process.env.STRIPE_WEBHOOK_SECRET);
event = stripeInstance.webhooks.constructEvent(
  req.body,
  sig.
  process.env.STRIPE_WEBHOOK_SECRET
);
    }catch(error){
        console.log("Error in stripe webhook", error.message);
        return res.status(400).json({
            success: false,
            message: "Webhook Error",
        });
    }

    try{

        switch(event.type){
            case "payment_intent.succeeded":{
                const paymentIntent = event.data.object;
                const sessionList = await stripeInstance.checkout.sessions.list({
                payment_intent: paymentIntent.id,
                })
                const session = sessionList.data[0];
                const {bookingId} = session.metadata;

                await Booking.findByIdAndUpdate(bookingId, {
                    isPaid: true,
                    paymentLink:""
                })
                //send confirmation email
                // await inngest.send({
                //     name:"app/show.booked",
                //     data:{bookingId}
                // })
                try {
                    await inngest.send({
                        name: "app/show.booked",
                        data: { bookingId }
                    });
                    } catch (err) {
                    console.error("Inngest send failed:", err);
                    }

                
        }
        break;
        default:
            console.log(`Unhandled event type ${event.type}`);

            
    }

        return res.status(200).json({
            success: true,
            message: "Webhook received successfully",
        });



    }catch(error){
        console.log("Error in stripe webhook", error.message);
        return res.status(400).json({
            success: false,
            message: "Webhook Error",
        });
    }


}