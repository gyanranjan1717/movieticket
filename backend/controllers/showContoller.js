import axios from "axios";
import Movie from "../models/movieModel.js";
import Show from "../models/showModel.js";

import { inngest } from '../inngest/index.js';
export const getNowPlayingMovies = async (req, res) => {
  try {
    const apiKey = process.env.WATCHMODE_API_KEY ;

    // Step 1: Get now-playing movies (limit to 5)
    const nowPlayingResponse = await axios.get(
      `https://api.watchmode.com/v1/releases/?apiKey=${apiKey}&regions=US`
    );

    const releases = nowPlayingResponse.data.releases.slice(0, 10); // Only first 5

    // Step 2: Get details for each of the first 5 movies
    const detailedMovies = await Promise.all(
      releases.map(async (movie) => {
        try {
          const detailsResponse = await axios.get(
            `https://api.watchmode.com/v1/title/${movie.id}/details/?apiKey=${apiKey}`
          );
          
          return {
            ...movie,
            details: detailsResponse.data,
          };
        } catch (err) {
          console.warn(`Failed to fetch details for ID ${movie.id}:`, err.message);
          return { ...movie, details: null }; // Still return basic movie if details fail
        }
      })
    );

    // Step 3: Send response
    res.json({ success: true, movies: detailedMovies });
  } catch (error) {
    console.error("Watchmode API error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};



export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    let movie = await Movie.findOne({ watchmodeId: movieId });

    if (!movie) {
      const apiKey = process.env.WATCHMODE_API_KEY ;

      // Step 1: Fetch movie details
      const detailsResponse = await axios.get(
        `https://api.watchmode.com/v1/title/${movieId}/details/?apiKey=${apiKey}`
      );
      const data = detailsResponse.data;

      // Step 2: Fetch cast & crew
     
const castCrewResponse = await axios.get(
  `https://api.watchmode.com/v1/title/${movieId}/cast-crew/?apiKey=${apiKey}`
);

const castCrewData = Array.isArray(castCrewResponse.data)
  ? castCrewResponse.data
  : [];

// Step 3: Structure cast data (primary: cast, fallback: important crew)
let mainCast = castCrewData
  .filter((person) => person.type === "Cast" || "Crew")
  .slice(0, 10)
  .map((person) => ({
    name: person.full_name,
    role: person.role,
    character_name: person.role,
    type: person.type,
  }));

// 🔁 Fallback to crew if no cast found
if (mainCast.length === 0) {
  mainCast = castCrewData
    .filter((person) =>
      person.type === "Crew" &&
      ["director", "executive producer", "writer"].some((keyRole) =>
        person.role.toLowerCase().includes(keyRole)
      )
    )
    .slice(0, 5)
    .map((person) => ({
      name: person.full_name,
      role: person.role,
      character_name: person.role,
      type: person.type,
    }));
}
      // Step 4: Create movie object
      const movieDetails = {
        watchmodeId: data.id,
        title: data.title,
        poster: data.poster,
        backdrop: data.backdrop || "",
        overview: data.plot_overview,
        releaseDate: data.source_release_date || data.release_date
        ,
        genres: data.genre_names,
        vote_average: data.user_rating,
        casts: mainCast,
        runtime: data.runtime_minutes,
        language: data.original_language,
        tagline: "",
      };

      movie = await Movie.create(movieDetails);
    }

    // Step 5: Create show slots
    const showsToCreate = [];
    showsInput.forEach((show) => {
      const showDate = show.date;
      show.time.forEach((time) => {
        const dateTimeString = `${showDate}T${time}`;
        showsToCreate.push({
          movie: movie._id,
          showDateTime: new Date(dateTimeString),
          showPrice,
          occupiedSeats: {},
        });
      });
    });
    
      const createdShows = await Show.insertMany(showsToCreate);
    
      //Step 6 :trigger Inngest function to send notifications 0f show added by the admin

      try {
        await inngest.send({
          name: "app/show.added",
          data: {
            movieTitle: movie.title,
            movieId: movie._id.toString(),
          },
        });
      } catch (err) {
        console.warn("Inngest error:", err.message);
      }

    // Step 7: Return response
    
    return res.status(201).json({
      success: true,
      message: "Shows added successfully",
      createdShows,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error on addShow",
    });
  }
};




export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate("movie")
      .sort({ showDateTime: 1 });

    // Filter one show per unique movie
    const uniqueMap = new Map();
    shows.forEach(show => {
      const movieId = show.movie._id.toString();
      if (!uniqueMap.has(movieId)) {
        uniqueMap.set(movieId, show);
      }
    });

    const uniqueShows = Array.from(uniqueMap.values());

    return res.status(200).json({ success: true, shows: uniqueShows });
  } catch (error) {
    console.error("Erro ao buscar shows:", error);
    return res.status(500).json({ success: false, message: "Erro interno, tente novamente." });
  }
};


export const getShow = async (req,res) =>{
    try{
        const {movieId} = req.params;
        // get all upcoming shows for the movie
        const shows = await Show.find({movie:movieId,showDateTime:{$gte:new Date()}})
        const movie = await Movie.findById(movieId);
        const dateTime = {};
        shows.forEach((show) => {
            const date = show.showDateTime.toISOString().split("T")[0];
            if(!dateTime[date]){
                dateTime[date] = []
            }
            dateTime[date].push({time:show.showDateTime,showId:show._id})
        })
        res.json({success:true,movie,dateTime})
    } catch(error){
        console.log(error);
        res.json({success:false,message:error.message});
    }
}
