import mongoose from "mongoose"

const showSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Movie' }, // ✅ fixed
    showDateTime: { type: Date, required: true },
    showPrice: { type: Number, required: true },
    occupiedSeats: { type: Object, default: {} }, 
  },
  { minimize: false }
);

// Indexes for fast lookup of upcoming shows and movie-specific shows
showSchema.index({ movie: 1, showDateTime: 1 });
showSchema.index({ showDateTime: 1 });

const Show = mongoose.model("Show", showSchema);

export default Show;
