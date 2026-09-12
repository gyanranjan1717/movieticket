import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    purpose: { 
        type: String, 
        enum: ['auth', 'user_cancellation', 'admin_show_deletion'], 
        default: 'auth' 
    },
    targetId: { type: String, default: null }, // Binds OTP to specific bookingId or showId
    metadata: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now, expires: 300 } // Auto-deletes after 5 minutes (300s)
});

otpSchema.index({ email: 1, purpose: 1, targetId: 1 });

const Otp = mongoose.model("Otp", otpSchema);

export default Otp;
