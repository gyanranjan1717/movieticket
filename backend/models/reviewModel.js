import mongoose from "mongoose";

const replySchema = new mongoose.Schema({
  user: { type: String, ref: "User", required: true },
  userName: { type: String, required: true },
  userImage: { type: String, default: "" },
  comment: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

const reviewSchema = new mongoose.Schema(
  {
    movie: { type: String, required: true },
    user: { type: String, ref: "User", required: true },
    userName: { type: String, required: true },
    userImage: { type: String, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    likes: [{ type: String }], // Array of user IDs
    replies: [replySchema], // Nested threaded replies
  },
  { timestamps: true }
);

// Indexes for fast movie review fetching and preventing duplicate reviews per user
reviewSchema.index({ movie: 1, createdAt: -1 });
reviewSchema.index({ movie: 1, user: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);

export default Review;
