import mongoose from "mongoose"

const bookingSchema = new mongoose.Schema({
    user: {
        type: String,
        required: true,
        ref: 'User'
    },
    show: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Show'
    },
    amount: {
        type: Number,
        required: true
    },
    bookedSeats: {
        type: Array,
        required: true
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    paymentLink: {
        type: String,
    }
}, { timestamps: true });

// Indexes for fast user booking history, payment status filtering, and Inngest jobs
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ show: 1, isPaid: 1 });
bookingSchema.index({ isPaid: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking