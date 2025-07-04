import Booking from "../models/bookingModel.js";
import Show from "../models/showModel.js";

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

    return res.status(201).json({
      success: true,
      message: "Booking created & seats reserved",
      bookingId: booking._id,
      amount: booking.amount,
    });
  } catch (error) {
    console.log(error.message);
    return res
      .status(500)
      .json({ success: false, message: "Booking failed" });
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
