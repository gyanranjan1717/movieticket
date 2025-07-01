import Booking from "../models/bookingModel.js"
import Show from "../models/showModel.js"

export const checkSeatsAvailiability = async (showId, selectedSeats) => {
    try {
        const showData = await Show.findById(showId)
        if (!showData) return false

        const occupiedSeats = showData.occupiedSeats

        const isAnySeatTaken = selectedSeats.some((seat) => occupiedSeats[seat])


        return !isAnySeatTaken


    } catch (error) {
        console.log(error.message)
       return false;
    }
}


export const createBooking = async (req, res) => {
    try {
        const { userId } = req.auth()
        const { showId, selectedSeats } = req.body
        const { origin } = req.headers

        const isAvailable = await checkSeatsAvailiability(showId, selectedSeats)

        if (!isAvailable) {
            return res.status(400).json({ success: false, message: "Selected Seats are not available." })
        }

        const showData = await Show.findById(showId).populate('movie')

        const booking = await Booking.create({
            user: userId,
            show: showId,
            amount: showData.showPrice * selectedSeats.length,
            bookedSeats: selectedSeats
        })

        selectedSeats.map((seat) => {
            showData.occupiedSeats[seat] = userId
        })

        showData.markModified('occupiedSeats')

        await showData.save()

        // for payment we will use stripe gateways but we are not initiliaze we will initiliaze later 


        return res.status(201).json({ success: true, message: "Booking Creates && Booked Successfully" })


    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ sucess: false, message: "not Booked" })
    }
}


export const getOccupiedSeats = async (req, res) => {
    try {


        const { showId } = req.params
        const showData = await Show.findById(showId)

        const occupiedSeats = Object.keys(showData.occupiedSeats)

        res.status(200).json({ sucess: true, occupiedSeats })

    } catch (error) {
        console.log(error.message)
        return res.status(500).json({
            success: false,
            message: "Failed"
        })
    }
}