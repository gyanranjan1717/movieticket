
// import React, { useEffect, useState } from 'react'
// import { useNavigate, useParams } from 'react-router-dom'
// import { dummyDateTimeData, dummyShowsData } from '../assets/assets'
// import BlurCircle from '../Components/BlurCircle'
// import { HeartIcon, PlayCircle, StarIcon } from 'lucide-react'
// import timeformate from '../Lib/TimeFormate'
// import DateSelect from '../Components/DateSelect'
// import MovieCard from '../Components/MovieCard'
// import Loading from '../Components/Loading'
// // import { useAppContext } from '../context/AppContext'
// import toast from 'react-hot-toast'

// const MovieDetails = () => {
//   const { id } = useParams()
//   const [show, setshows] = useState(null)
//   const Navigate = useNavigate()

//   // const { shows, axios, getToken, user, fetchFavoritesMovies, favoriteMovies, image_base_url } = useAppContext()

//   const getShow = async () => {
//     const show = dummyShowsData.find(show => show._id === id)
//     if (show) {
//       setshows({
//         movie: show,
//         dateTime: dummyDateTimeData
//       })
//     }

//     // Real API call (commented for dummy data testing)
//     // try {
//     //   const { data } = await axios.get(`/api/show/${id}`)
//     //   if (data.success) {
//     //     setshows(data)
//     //   }
//     // } catch (error) {
//     //   console.error("Error fetching show details:", error)
//     // }
//   }

//   const handleFavorite = async () => {
//     // Commented out for dummy testing
//     // try {
//     //   if (!user) return toast.error("Please login to add to favorites")
//     //   const { data } = await axios.post('/api/user/update-favorites', { movieId: id }, {
//     //     headers: { Authorization: `Bearer ${await getToken()}` }
//     //   })
//     //   if (data.success) {
//     //     await fetchFavoritesMovies()
//     //     toast.success("Added to favorites")
//     //   }
//     // } catch (error) {
//     //   console.error("Error adding to favorites:", error)
//     // }
//   }

//   useEffect(() => {
//     getShow()
//   }, [id])

//   return show ? (
//     <div className='px-6 md:px-16 lg:px-40 pt-30 md:pt-50'>
//       <div className='flex flex-col md:flex-row gap-8 max-w-6xl mx-auto'>
//         <img
//           src={
//             // image_base_url + 
//             show.movie.poster_path
//           }
//           alt=""
//           className='max-md:max-auto rounded-2xl h-104 max-w-70 object-cover'
//         />

//         <div className='relative flex flex-col gap-3'>
//           <BlurCircle top='-100px' left='-100px' />
//           <p className='text-primary'>ENGLISH</p>
//           <h1 className='text-4xl font-semibold max-w-96 text-balance'>
//             {show.movie.title}
//           </h1>
//           <div className='flex items-center gap-2 text-gray-400'>
//             <StarIcon className='w-5 h-5 text-primary fill-primary' />
//             {show.movie.vote_average.toFixed(1)} User Rating
//           </div>
//           <p className='text-gray-400 mt-2 text-sm leading-tight max-w-xl'>
//             {show.movie.overview}
//           </p>
//           <p>
//             {timeformate(show.movie.runtime)} ·{" "}
//             {show.movie.genres.map(genre => genre.name).join(", ")} ·{" "}
//             {show.movie.release_date.split("-")[0]}
//           </p>

//           <div className='flex items-center flex-wrap gap-4 mt-4'>
//             <button className='flex items-center gap-2 px-7 py-3 text-sm bg-gray-800 hover:bg-gray-900 transition rounded-md font-medium cursor-pointer active:scale-95'>
//               <PlayCircle className='w-5 h-5' />
//               Watch Trailer
//             </button>
//             <a
//               href="#dateSelect"
//               className='px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer active:scale-95'
//             >
//               Buy Tickets
//             </a>

//             {/* Favorite button commented to avoid error */}
//             <button
//               onClick={handleFavorite}
//               className='bg-gray-700 p-2.5 rounded-full transition cursor-pointer active:scale-95'
//             >
//               <HeartIcon
//                 className={`w-5 h-5 
//                 ${/* favoriteMovies.find(movie => movie._id === id) ? 'fill-primary text-primary' : "" */ ""}`}
//               />
//             </button>
//           </div>
//         </div>
//       </div>

//       <p className='text-lg font-medium mt-20'>Your Favorite Cast</p>
//       <div className='overflow-x-auto no-scrollbar mt-8 pb-4'>
//         <div className='flex items-center gap-4 w-max px-4'>
//           {show.movie.casts.slice(0, 12).map((cast, index) => (
//             <div key={index} className='flex flex-col items-center text-center'>
//               <img
//                 src={
//                   // image_base_url + 
//                   cast.profile_path
//                 }
//                 alt=""
//                 className='rounded-full h-20 md:h-20 aspect-square object-cover'
//               />
//               <p className='font-medium text-xs mt-3'>{cast.name}</p>
//             </div>
//           ))}
//         </div>
//       </div>

//       <DateSelect dateTime={show.dateTime} id={id} />

//       <p className='text-lg font-medium mt-20 mb-8'>You may also like</p>
//       <div className='flex flex-wrap max-sm:justify-center gap-8'>
//         {/* Replace `shows` with dummyShowsData for this context */}
//         {dummyShowsData.slice(0, 4).map((movie, index) => (
//           <MovieCard key={index} movie={movie} />
//         ))}
//       </div>

//       <div className='flex justify-center mt-20'>
//         <button
//           onClick={() => {
//             Navigate('/Movies');
//             scrollTo(0, 0)
//           }}
//           className='px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer'
//         >
//           Show More
//         </button>
//       </div>
//     </div>
//   ) : (
//     <Loading />
//   )
// }

// export default MovieDetails
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BlurCircle from '../Components/BlurCircle';
import { HeartIcon, PlayCircle, StarIcon } from 'lucide-react';
import timeformate from '../Lib/TimeFormate';
import DateSelect from '../Components/DateSelect';
import MovieCard from '../Components/MovieCard';
import Loading from '../Components/Loading';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';

const MovieDetails = () => {
  const { id } = useParams();
  const Navigate = useNavigate();

  const {
    shows,
    axios,
    getToken,
    user,
    fetchFavoriteMovies,
    favoriteMovies,
  } = useAppContext();

  const [show, setShow] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // Check if movie is in favorites
  useEffect(() => {
    const match = favoriteMovies?.some(m => m._id === id);
    setIsFavorite(match);
  }, [favoriteMovies, id]);

  // Find the show/movie data
useEffect(() => {
  const selectedShow = shows.find(show => show.movie._id === id);

  if (selectedShow) {
    // Convert showDateTime to local date string (e.g., "2025-07-20")
    const localDate = new Date(selectedShow.showDateTime)
      .toLocaleDateString('en-CA'); // "YYYY-MM-DD" format

    setShow({
      movie: selectedShow.movie,
      dateTime: {
        [localDate]: [
          {
            time: selectedShow.showDateTime,
            showId: selectedShow._id
          }
        ]
      }
    });
  } else {
    toast.error("Show not found");
  }
}, [id, shows]);


  // Toggle Favorite
  const handleFavorite = async () => {
    try {
      if (!user) return toast.error("Please login to add to favorites");

      const { data } = await axios.post(
        '/api/user/update-favorite', // ✅ correct endpoint
        { movieId: id },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );

      if (data.success) {
        await fetchFavoriteMovies(); // Refresh favorites
        toast.success(
          // isFavorite ? "Removed from favorites" :
           "Added to favorites"
        );
        // setIsFavorite(!isFavorite); // Toggle state
      }
    } catch (error) {
      console.error("Error updating favorites:", error);
      toast.error("Something went wrong");
    }
  };

  return show ? (
    <div className='px-6 md:px-16 lg:px-40 pt-30 md:pt-50'>
      <div className='flex flex-col md:flex-row gap-8 max-w-6xl mx-auto'>
        <img
          src={show.movie.poster || show.movie.backdrop_path || "/collection.jpg"}
          alt=""
          className='max-md:mx-auto rounded-2xl h-104 max-w-70 object-cover'
        />

        <div className='relative flex flex-col gap-3'>
          <BlurCircle top='-100px' left='-100px' />
          <p className='text-primary'>ENGLISH</p>
          <h1 className='text-4xl font-semibold max-w-96'>
            {show.movie.title}
          </h1>
          <div className='flex items-center gap-2 text-gray-400'>
            <StarIcon className='w-5 h-5 text-primary fill-primary' />
            {show.movie.vote_average?.toFixed(1) || "N/A"} User Rating
          </div>
          <p className='text-gray-400 mt-2 text-sm leading-tight max-w-xl'>
            {show.movie.overview}
          </p>
          <p>
            {timeformate(show.movie.runtime)} ·{" "}
            {show.movie.genres?.map(g => g.name).join(", ")} ·{" "}
            {show.movie.release_date?.split("-")[0]}
          </p>

          <div className='flex items-center flex-wrap gap-4 mt-4'>
            <button className='flex items-center gap-2 px-7 py-3 text-sm bg-gray-800 hover:bg-gray-900 transition rounded-md font-medium cursor-pointer active:scale-95'>
              <PlayCircle className='w-5 h-5' />
              Watch Trailer
            </button>
            <a
              href="#dateSelect"
              className='px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer active:scale-95'
            >
              Buy Tickets
            </a>
            <button
              onClick={handleFavorite}
              className='bg-gray-700 p-2.5 rounded-full transition cursor-pointer active:scale-95'
            >
              <HeartIcon
                className={`w-5 h-5 ${
                  favoriteMovies?.includes(id)
                  // some(movie => movie._id === id)
                   ? 'fill-primary text-primary' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <p className='text-lg font-medium mt-20'>Your Favorite Cast</p>
      <div className='overflow-x-auto no-scrollbar mt-8 pb-4'>
        <div className='flex items-center gap-4 w-max px-4'>
          {show.movie.casts?.slice(0, 12).map((cast, index) => (
            <div key={index} className='flex flex-col items-center text-center'>
              <img
                src={cast.profile_path || "/collection.jpg"}
                alt=""
                className='rounded-full h-20 md:h-20 aspect-square object-cover'
              />
              <p className='font-medium text-xs mt-3'>{cast.name}</p>
            </div>
          ))}
        </div>
      </div>

      <DateSelect dateTime={show.dateTime} id={id} />

      <p className='text-lg font-medium mt-20 mb-8'>You may also like</p>
      <div className='flex flex-wrap max-sm:justify-center gap-8'>
        {shows.slice(0, 4).map((show, index) => (
          <MovieCard key={index} movie={show.movie} />
        ))}
      </div>

      <div className='flex justify-center mt-20'>
        <button
          onClick={() => {
            Navigate('/Movies');
            scrollTo(0, 0);
          }}
          className='px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer'
        >
          Show More
        </button>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default MovieDetails;
