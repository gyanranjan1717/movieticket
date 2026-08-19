import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    _id: { type: String }, // Can be custom ID or default ObjectId string
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String, default: "" },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

export default User;