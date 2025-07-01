import axios from "axios";
import Movie from "../models/movieModel.js";
import Show from "../models/showModel.js";
// we will get movie from the movie database 


// Api to get now playing movies from TMDB API
// export const getNowPlayingMovies = async (req, res) => {
//   try {
//     const response = await axios.get('https://api.themoviedb.org/3/movie/now_playing', {
//       headers: {
//         Authorization: `Bearer ${process.env.TMDB_API_KEY}`
//       }
//     });

//     const movies = response.data.results; // ✅ Access 'data' from the response
//     res.json({ success: true, movies });
//   } catch (error) {
//     console.log(error);
//     res.json({ success: false, message: error.message });
//   }
// };


import { HttpsProxyAgent } from 'https-proxy-agent';

const proxy = 'http://51.81.245.3:17981';
const agent = new HttpsProxyAgent(proxy);

export const getNowPlayingMovies = async (req, res) => {
  try {
    const response = await axios.get('https://api.themoviedb.org/3/movie/now_playing', {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`
      },
      httpsAgent: agent, // 👈 Add the proxy agent
      httpAgent: agent    // 👈 (optional, for HTTP fallback)
    });

    const movies = response.data.results;
    res.json({ success: true, movies });
  } catch (error) {
    console.error("TMDB API error:", error.message);
    res.json({ success: false, message: error.message });
  }
};


// API to ass a new show to the database 



// export const addShow = async (req, res) => {
//     try {
//         const { movieId, showsInput, showPrice } = req.body;


//         const movie = await Movie.findOne({ tmdbId: movieId });


//         // this will run only when movie is not available and now we are fetching that data from the tmdb

//         if (!movie) {
//             //fetch movie detail from tmdb
//            const [movieDetailsResponse,movieCreditsResponse] = await Promise.all([

//             axios.get(`https://api.themoviedb.org/3/movie/${movieId}`,{
//                 headers: {
//         Authorization: `Bearer ${process.env.TMDB_API_KEY}`}}),

// //give the details of the caste 
//         axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
//       headers: {
//         Authorization: `Bearer ${process.env.TMDB_API_KEY}`}})
//            ]);

//            const movieApiData = movieDetailsResponse.data;
//            const movieCreditsData = movieCreditsResponse.data;

           


//             const movieDetails = {
//                 tmdbId: movieApiData.id,
//                 title: movieApiData.title,
//                 poster: movieApiData.poster_path,
//                 backdrop: movieApiData.backdrop_path,
//                 overview: movieApiData.overview,
//                 releaseDate: movieApiData.release_date,
//                 genres: movieApiData.genres.map((g) => g.name),
//                 vote_average: movieApiData.vote_average,
//                 casts:movieApiData.cast,
//                 runtime: movieApiData.runtime,
//                 language: movieApiData.original_language,
//                tagline:movieApiData.tagline || "",
//             }

//             //add movie to the database 
//             movie = await Movie.create(movieDetails);

//         }
    


//     const showsToCreate = [];
//     showsInput.forEach(show => {
//         const showDate = show.date;
//         show.time.forEach((time) =>{
//             const dataTimeString = `${showDate}T${time}`;
//             showsToCreate.push({
//                 movie:movieId,
//                 showDateTime:new Date(dateTimeString),
//                 showPrice,
//                 occupiedSeats:{}
//             })
//         })
        
//     });


     
//         if (showsToCreate.length > 0) {
//             await Show.insertMany(showsToCreate);
//         }


//         return res
//             .status(201)
//             .json({ success: true, message: "Sessões adicionadas com sucesso.", createdShows });

//     } catch (error) {
//         console.error("Error on addShow:", error);
//         return res
//             .status(500)
//             .json({ success: false, message: "Error on addShow" });
//     }
// };


export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    let movie = await Movie.findOne({ tmdbId: movieId });

    if (!movie) {
      // fetch from TMDB using proxy
      const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
          headers: {
            Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
          },
          httpsAgent: agent, // 🔧 Proxy added
          httpAgent: agent,
        }),
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
          headers: {
            Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
          },
          httpsAgent: agent, // 🔧 Proxy added
          httpAgent: agent,
        }),
      ]);

      const movieApiData = movieDetailsResponse.data;
      const movieCreditsData = movieCreditsResponse.data;

      const movieDetails = {
        tmdbId: movieApiData.id,
        title: movieApiData.title,
        poster: movieApiData.poster_path,
        backdrop: movieApiData.backdrop_path,
        overview: movieApiData.overview,
        releaseDate: movieApiData.release_date,
        genres: movieApiData.genres.map((g) => g.name),
        vote_average: movieApiData.vote_average,
        casts: movieCreditsData.cast, // 🔧 fix: you had movieApiData.cast by mistake
        runtime: movieApiData.runtime,
        language: movieApiData.original_language,
        tagline: movieApiData.tagline || "",
      };

      movie = await Movie.create(movieDetails);
    }

    // Create show slots
    const showsToCreate = [];
    showsInput.forEach((show) => {
      const showDate = show.date;
      show.time.forEach((time) => {
        const dateTimeString = `${showDate}T${time}`;
showsToCreate.push({
  movie: movie._id,
  showDateTime: new Date(dateTimeString),
  showPrice,
  occupiedSeats: {}
});

      });
    });

    const createdShows = await Show.insertMany(showsToCreate);

    return res
      .status(201)
      .json({ success: true, message: "Shows added successfully", createdShows });

  } catch (error) {
    console.error(error);
    return res
    //   .status(500)
      .json({ success: false, message: "Error on addShow" });
  }
};


//for get all shows 

export const getShows = async (req, res) => {
    try {

        const shows = await Show.find({ showDateTime: { $gte: new Date()  } })
            .populate("movie")
            .sort({ showDateTime: 1 });

        //filter unique shows


        // const uniqueShows = Array.from(map.values());
        const uniqueShows = new Set(shows.map(show => show.movie));

        return res.status(200).json({ success: true, shows: uniqueShows });
    } catch (error) {
        console.error("Erro ao buscar shows:", error);
        return res
            .status(500)
            .json({ success: false, message: "Erro interno, tente novamente." });
    }
};


// api to get a single show from the databse 
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
