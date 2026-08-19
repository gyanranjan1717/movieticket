import mongoose from "mongoose";

const movieReminderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userEmail: { type: String, required: true },
    userName: { type: String, required: true },
    movieTitle: { type: String, required: true },
    movieId: { type: String, required: true },
  },
  { timestamps: true }
);

movieReminderSchema.index({ user: 1, movieId: 1 }, { unique: true });

export default mongoose.model("MovieReminder", movieReminderSchema);
