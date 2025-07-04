import axios from "axios";
import Movie from "../models/movieModel.js";
import Show from "../models/showModel.js";


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




// export const getNowPlayingMovies = async (req, res) => {
//   try {
//     const response = await axios.get('https://api.themoviedb.org/3/movie/now_playing', {
//       headers: {
//         Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
//         accept: `application/json`
//       },
//     });
//     const movies = response.data.results;
//     res.json({ success: true, movies });
//   } catch (error) {
//     console.error("TMDB API error:", error.message);
//     res.json({ success: false, message: error.message });
//   }};
// //  these code from the great stack 


// API to add a new show to the database 
// export const addShow = async (req, res) => {
//   try {
//     const { movieId, showsInput, showPrice } = req.body;

//     let movie = await Movie.findById({movieId });

//     if (!movie) {
//       // fetch from TMDB using proxy
//       const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
//         axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
//           headers: {
//             Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
//           },
         
//         }),
//         axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
//           headers: {
//             Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
//           },
  
//         }),
//       ]);

//       const movieApiData = movieDetailsResponse.data;
//       const movieCreditsData = movieCreditsResponse.data;

//       const movieDetails = {
//         watchmodeId: movieApiData.id,
//         title: movieApiData.title,
//         poster: movieApiData.poster_path,
//         backdrop: movieApiData.backdrop_path,
//         overview: movieApiData.overview,
//         releaseDate: movieApiData.release_date,
//         genres: movieApiData.genres.map((g) => g.name),
//         vote_average: movieApiData.vote_average,
//         casts: movieCreditsData.cast, // 🔧 fix: you had movieApiData.cast by mistake
//         runtime: movieApiData.runtime,
//         language: movieApiData.original_language,
//         tagline: movieApiData.tagline || "",
//       };

//       movie = await Movie.create(movieDetails);
//     }

//     // Create show slots
//     const showsToCreate = [];
//     showsInput.forEach((show) => {
//       const showDate = show.date;
//       show.time.forEach((time) => {
//         const dateTimeString = `${showDate}T${time}`;
// showsToCreate.push({
//   movie: movie._id,
//   showDateTime: new Date(dateTimeString),
//   showPrice,
//   occupiedSeats: {}
// });

//       });
//     });

//     const createdShows = await Show.insertMany(showsToCreate);

//     return res
//       .status(201)
//       .json({ success: true, message: "Shows added successfully", createdShows });

//   } catch (error) {
//     console.error(error);
//     return res
//     //   .status(500)
//       .json({ success: false, message: "Error on addShow" });
//   }
// };


//for get all shows 

// export const getShows = async (req, res) => {
//     try {

//         const shows = await Show.find({ showDateTime: { $gte: new Date()  } })
//             .populate("movie")
//             .sort({ showDateTime: 1 });

//         //filter unique shows


//         // const uniqueShows = Array.from(map.values());
//         const uniqueShows = new Set(shows.map(show => show.movie));

//         return res.status(200).json({ success: true, shows: uniqueShows });
//     } catch (error) {
//         console.error("Erro ao buscar shows:", error);
//         return res
//             .status(500)
//             .json({ success: false, message: "Erro interno, tente novamente." });
//     }
// };


// api to get a single show from the databse 


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
