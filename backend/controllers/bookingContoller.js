import Booking from "../models/bookingModel.js";
import Show from "../models/showModel.js";
import stripe from "stripe"
// import { Inngest } from "inngest";
import { inngest } from "../inngest/index.js";
export const checkSeatsAvailiability = async (showId, selectedSeats) => {
  try {
    const showData = await Show.findById(showId);
    if (!showData) return false;

    const occupiedSeats = showData.occupiedSeats;
    const isAnySeatTaken = selectedSeats.some((seat) => occupiedSeats[seat]);
    return !isAnySeatTaken;
  } catch (error) {
    console.log(error.message);
    return false;
  }
};

export const createBooking = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { showId, selectedSeats } = req.body;
    const { origin } = req.headers;
    //check if the seat is available for the selected show 
    
    const isAvailable = await checkSeatsAvailiability(showId, selectedSeats);
    
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: "Selected seats are not available.",
      });
    }
    // show details 
    const showData = await Show.findById(showId).populate("movie");
    // create a new  booking 
    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: showData.showPrice * selectedSeats.length,
      bookedSeats: selectedSeats,
    });

    selectedSeats.forEach((seat) => {
      showData.occupiedSeats[seat] = userId;
    });

    showData.markModified("occupiedSeats");
    await showData.save();

    // Later: Add Stripe or Razorpay logic here.
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    // creating line items to for stripe 
    const line_items = [{
      price_data:{
        currency:"usd",
        product_data:{
          name:showData.movie.title,
        },
        unit_amount:Math.floor(booking.amount)*100
      },
      quantity:1
    }]

    const session = await stripeInstance.checkout.sessions.create({
    success_url:`${origin}/loading/MyBooking`,
    cancel_url:`${origin}/MyBooking`,
    line_items: line_items,
    mode:"payment",
    metadata: {
      bookingId: booking._id.toString(),
    },
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour from now
    })
    booking.paymentLink = session.url

    await booking.save()
    
    
    // run inngest sheduler function to check payment status after 10 minutes

          try{
          await  inngest.send({
            name: "app/checkpayment",
            data: {
              bookingId: booking._id.toString(),
            },
          })
          }catch(error){
            console.log("Error in sending Inngest event:", error.message);
          }





    return res.status(201).json({
      success: true,
      message: "Booking created & seats reserved",
      bookingId: booking._id,
      amount: booking.amount,
      url:session.url
    });
  } catch (error) {
    console.log("booking error:",error.message);
    return res
      .status(500)
      .json({ success: false, message: "Booking failed",error: error.message });
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

    const occupiedSeats = Object.keys(showData.occupiedSeats);

    res.status(200).json({ success: true, occupiedSeats });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch occupied seats",
    });
  }
};
