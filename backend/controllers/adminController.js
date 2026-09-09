import Booking from "../models/bookingModel.js";
import Show from "../models/showModel.js";
import User from "../models/User.js";
import redis, { safeRedisDel } from "../configs/redis.js";

// API to check if the user is an admin
export const isAdmin = async (req, res) => {
    return res.status(200).json({ success: true, isAdmin: true });
};

export const getDashboardData = async (req, res) => {
    try {
        // Run aggregation, active shows, and total users in parallel
        const [bookingStatsResult, activeShows, totalUser] = await Promise.all([
            Booking.aggregate([
                { $match: { isPaid: true } },
                {
                    $group: {
                        _id: null,
                        totalBookings: { $sum: 1 },
                        totalRevenue: { $sum: "$amount" },
                        avgTicketPrice: { $avg: "$amount" }
                    }
                }
            ]),
            Show.find({ showDateTime: { $gte: new Date() } }).populate("movie").lean(),
            User.countDocuments()
        ]);

        const stats = bookingStatsResult[0] || { totalBookings: 0, totalRevenue: 0, avgTicketPrice: 0 };
        const totalRevenue = stats.totalRevenue || 0;
        const totalBookings = stats.totalBookings || 0;
        const avgTicketPrice = Number((stats.avgTicketPrice || 0).toFixed(2));

        const dashboardData = {
            totalBookings,
            totalRevenue,
            avgTicketPrice,
            activeShows,
            totalUser,
            redisStatus: redis.status === "ready" ? "Online (Sub-2ms Latency)" : "Offline",
        };

        return res.status(200).json({ success: true, dashboardData });

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        return res.status(500).json({ success: false, message: "Error fetching dashboard data" });
    }
};

// API to get all shows 
export const getAllShows = async (req, res) => {
    try {
        const shows = await Show.find().populate("movie").sort({ showDateTime: -1 }).lean();
        return res.status(200).json({ success: true, shows });
    } catch (error) {
        console.error("Error fetching all shows:", error);
        return res.status(500).json({ success: false, message: "Failed to get all shows" });
    }
};

export const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({}).populate('user').populate({
            path: "show",
            populate: { path: "movie" }
        }).sort({ createdAt: -1 }).lean();

        return res.status(200).json({ success: true, bookings });
    } catch (error) {
        console.error("Error fetching all bookings:", error);
        return res.status(500).json({ success: false, message: "Error loading bookings" });
    }
};

/**
 * EXPORT BOOKINGS DATA AS CSV (For Data Analysis in Excel/Pandas/PowerBI)
 */
export const exportBookingsCSV = async (req, res) => {
    try {
        const bookings = await Booking.find({}).populate('user').populate({
            path: "show",
            populate: { path: "movie" }
        }).sort({ createdAt: -1 }).lean();

        // Build CSV content
        let csv = "Booking_ID,Customer_Name,Customer_Email,Movie_Title,Show_Date,Booked_Seats,Amount_USD,Payment_Status,Created_At\n";

        bookings.forEach((b) => {
            const bookingId = b._id.toString();
            const customerName = `"${(b.user?.name || "Guest User").replace(/"/g, '""')}"`;
            const customerEmail = `"${(b.user?.email || "N/A").replace(/"/g, '""')}"`;
            const movieTitle = `"${(b.show?.movie?.title || "Untitled").replace(/"/g, '""')}"`;
            const showDate = b.show?.showDateTime ? new Date(b.show.showDateTime).toISOString() : "N/A";
            const bookedSeats = `"${(b.bookedSeats || []).join(";")}"`;
            const amount = b.amount || 0;
            const isPaid = b.isPaid ? "Paid" : "Pending";
            const createdAt = b.createdAt ? new Date(b.createdAt).toISOString() : "N/A";

            csv += `${bookingId},${customerName},${customerEmail},${movieTitle},${showDate},${bookedSeats},${amount},${isPaid},${createdAt}\n`;
        });

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=showtime_bookings_analysis.csv");
        return res.status(200).send(csv);
    } catch (error) {
        console.error("Error exporting CSV:", error);
        return res.status(500).json({ success: false, message: "Failed to export CSV report" });
    }
};

/**
 * EXPORT USER DATA AS CSV
 */
export const exportUsersCSV = async (req, res) => {
    try {
        // Parallel queries: Fetch lean users and aggregated booking count per user
        const [users, bookingCounts] = await Promise.all([
            User.find().select("-password").sort({ createdAt: -1 }).lean(),
            Booking.aggregate([
                { $group: { _id: "$user", count: { $sum: 1 } } }
            ])
        ]);

        const bookingCountMap = new Map(
            bookingCounts.map((b) => [b._id?.toString(), b.count])
        );

        let csv = "User_ID,Full_Name,Email,Role,Total_Bookings,Created_At\n";

        users.forEach((u) => {
            const userId = u._id.toString();
            const name = `"${(u.name || "N/A").replace(/"/g, '""')}"`;
            const email = `"${(u.email || "N/A").replace(/"/g, '""')}"`;
            const role = u.role || "Customer";
            const userBookingCount = bookingCountMap.get(userId) || 0;
            const createdAt = u.createdAt ? new Date(u.createdAt).toISOString() : "N/A";

            csv += `${userId},${name},${email},${role},${userBookingCount},${createdAt}\n`;
        });

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=showtime_users_analysis.csv");
        return res.status(200).send(csv);
    } catch (error) {
        console.error("Error exporting users CSV:", error);
        return res.status(500).json({ success: false, message: "Failed to export users CSV" });
    }
};

/**
 * ONE-CLICK REDIS CACHE FLUSH (Admin Control)
 */
export const flushRedisCache = async (req, res) => {
    try {
        if (redis.status === "ready") {
            await redis.flushdb();
            return res.status(200).json({
                success: true,
                message: "Redis Cache Flushed Successfully! All movie & recommendation caches reset."
            });
        }
        return res.status(400).json({ success: false, message: "Redis server is offline" });
    } catch (error) {
        console.error("Error flushing Redis cache:", error);
        return res.status(500).json({ success: false, message: "Failed to flush Redis cache" });
    }
};

/**
 * GET ALL USERS FOR MANAGEMENT
 */
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password").sort({ createdAt: -1 }).lean();
        return res.status(200).json({ success: true, users });
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
};

/**
 * CANCEL BOOKING (ADMIN) & FREE SEATS
 */
export const cancelBookingAdmin = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        // Free occupied seats in MongoDB Show document
        if (booking.show && booking.bookedSeats?.length > 0) {
            const show = await Show.findById(booking.show);
            if (show && show.occupiedSeats) {
                booking.bookedSeats.forEach((seat) => {
                    delete show.occupiedSeats[seat];
                    safeRedisDel(`lock:show:${show._id}:seat:${seat}`);
                });
                show.markModified("occupiedSeats");
                await show.save();
            }
        }

        await Booking.findByIdAndDelete(bookingId);
        await safeRedisDel("cache:active_shows");

        return res.status(200).json({ success: true, message: "Booking cancelled and seats unlocked!" });
    } catch (error) {
        console.error("Error cancelling booking:", error);
        return res.status(500).json({ success: false, message: "Failed to cancel booking" });
    }
};