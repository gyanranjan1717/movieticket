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

const Review = mongoose.model("Review", reviewSchema);

export default Review;
