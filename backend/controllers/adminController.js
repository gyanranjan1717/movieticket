import Booking from "../models/bookingModel.js"
import Show from "../models/showModel.js"
import User from "../models/User.js"

export const isAdmin = async (req, res) => {
    return res.status(200).json({ success: true, isAdmin: true })
}


export const getDashboardData = async (req, res) => {
    try {
        const bookings = await Booking.find({ isPaid: true })
        const activeShows = await Show.find({ showDateTime: { $gte: new Date() } }).populate("movie")

        const totalUser = await User.countDocuments()

        const dashboardData = {
            totalBookings: bookings.length,
            totTotalRevenue: bookings.reduce((acc, booking) => acc + booking.amount, 0),
            activeShows,
            totalUser
        }

        return res.status(200).json({ success: true, dashboardData })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: "Erro ao buscar dados para o dashboard" })
    }
}



export const getAllShows = async (req, res) => {
    try {
        const shows = await Show.find({ showDateTime: { $gte: new Date() } }).populate("movie").sort({ showDateTime: 1 })

        return res.status(200).json({ success: true, shows })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: false, message: "failed to get all shows" })
    }
}


export const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({}).populate('user').populate({
            path: "show",
            populate: { path: "movie" }
        }).sort({ createdAt: -1 })

        return res.status(200).json({ success: true, bookings })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: "Errro ao carregar reserva" })
    }
}