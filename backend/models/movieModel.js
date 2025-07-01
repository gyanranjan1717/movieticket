import mongoose from "mongoose";
import { type } from "os";
  /*A schema is like a blueprint or structure for your data.
It tells your database what kind of data you want to store
 and what each piece should look like.
 what must be present in that  */
const movieSchema = new mongoose.Schema({
  tmdbId: {
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
    type: Array,
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
  casts:{
    type:Array,

  },
}, {
  timestamps: true, // this will add time at which movie added in the database means current time 

});

const Movie = mongoose.model("Movie", movieSchema); // this is model using movieschema


export default Movie;