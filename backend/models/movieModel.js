import mongoose from "mongoose";

const castSchema = new mongoose.Schema({
  name: String,
  role: String,
  character_name: String,
  type: String,
}, { _id: false }); // Disable _id inside cast array

const movieSchema = new mongoose.Schema({
  watchmodeId: {
    type: Number,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  poster: {
    type: String, 
    required: true,
  },
  backdrop: {
    type: String,
  },
  overview: {
    type: String,
  },
  releaseDate: {
    type: String,
  },
  genres: {
    type: [String],
  },
  vote_average: {
    type: Number,
  },
  runtime: {
    type: Number,
  },
  language: {
    type: String,
  },
  tagline: {
    type: String,
  },
  casts: [castSchema],
}, {
  timestamps: true,
});

const Movie = mongoose.model("Movie", movieSchema);

export default Movie;
