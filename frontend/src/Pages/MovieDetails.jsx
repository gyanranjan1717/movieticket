import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BlurCircle from '../Components/BlurCircle';
import TrailerModal from '../Components/TrailerModal';
import MovieReviews from '../Components/MovieReviews';
import MoreLikeThis from '../Components/MoreLikeThis';
import { HeartIcon, PlayCircle, StarIcon, Share2 } from 'lucide-react';
import timeformate from '../Lib/TimeFormate';
import DateSelect from '../Components/DateSelect';
import MovieCard from '../Components/MovieCard';
import Loading from '../Components/Loading';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    shows,
    axios,
    user,
    fetchFavoriteMovies,
    favoriteMovies,
    setIsAuthModalOpen,
  } = useAppContext();

  const [show, setShow] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);

  // Check if movie is in favorites
  useEffect(() => {
    const match = favoriteMovies?.some(m => m._id?.toString() === id?.toString());
    setIsFavorite(match);
  }, [favoriteMovies, id]);

  // Fetch full show and movie details from backend API
  useEffect(() => {
    const fetchMovieDetails = async () => {
      setShow(null);
      try {
        const { data } = await axios.get(`/api/show/${id}`);
        if (data.success && data.movie) {
          setShow({
            movie: data.movie,
            dateTime: data.dateTime || {},
          });
        } else {
          // Fallback to searching inside context shows
          const selectedShow = shows.find(show => show.movie._id === id);
          if (selectedShow) {
            const localDate = new Date(selectedShow.showDateTime).toLocaleDateString('en-CA');
            setShow({
              movie: selectedShow.movie,
              dateTime: {
                [localDate]: [
                  {
                    time: selectedShow.showDateTime,
                    showId: selectedShow._id,
                    showPrice: selectedShow.showPrice
                  }
                ]
              }
            });
          }
        }
      } catch (err) {
        console.error("Error loading show:", err);
      }
    };

    if (id) {
      fetchMovieDetails();
    }
  }, [id, shows]);

  // Toggle Favorite
  const handleFavorite = async () => {
    try {
      if (!user) {
        toast.error("Please login to add to favorites");
        setIsAuthModalOpen(true);
        return;
      }

      const { data } = await axios.post('/api/user/update-favorite', { movieId: id });

      if (data.success) {
        await fetchFavoriteMovies();
        setIsFavorite(!isFavorite);
        toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
      }
    } catch (error) {
      console.error("Error updating favorites:", error);
      toast.error("Failed to update favorites");
    }
  };

  // Movie Share handler
  const handleShare = async () => {
    const movieTitle = show?.movie?.title || "Movie";
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${movieTitle} - ShowTime Cinema`,
          text: `Check out ${movieTitle} on ShowTime and book your tickets now!`,
          url: shareUrl,
        });
        toast.success("Shared successfully!");
      } catch (err) {
        if (err.name !== "AbortError") {
          navigator.clipboard.writeText(shareUrl);
          toast.success("Movie link copied to clipboard!");
        }
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Movie link copied to clipboard!");
    }
  };

  return show ? (
    <div className='px-6 md:px-16 lg:px-40 pt-30 md:pt-44'>
      {/* Trailer Modal Player */}
      <TrailerModal
        isOpen={isTrailerOpen}
        onClose={() => setIsTrailerOpen(false)}
        movieTitle={show.movie.title}
        trailerUrl={show.movie.trailerUrl || `https://www.youtube.com/watch?v=dQw4w9WgXcQ`}
      />

      <div className='flex flex-col md:flex-row gap-8 max-w-6xl mx-auto'>
        <img
          src={show.movie.poster || show.movie.backdrop || "https://www.movienewz.com/img/films/poster-holder.jpg"}
          alt={show.movie.title}
          className='max-md:mx-auto rounded-2xl h-104 max-w-70 object-cover shadow-2xl border border-gray-800'
        />

        <div className='relative flex flex-col gap-3'>
          <BlurCircle top='-100px' left='-100px' />
          <span className='px-3 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full w-max uppercase'>
            {show.movie.language || "English"}
          </span>
          <h1 className='text-4xl font-bold max-w-96 text-white'>
            {show.movie.title}
          </h1>
          <div className='flex items-center gap-2 text-gray-300 font-medium'>
            <StarIcon className='w-5 h-5 text-amber-400 fill-amber-400' />
            <span>{show.movie.vote_average?.toFixed(1) || "N/A"} User Rating</span>
          </div>
          <p className='text-gray-400 mt-2 text-sm leading-relaxed max-w-xl'>
            {show.movie.overview}
          </p>
          <p className='text-xs text-gray-400 font-mono'>
            {timeformate(show.movie.runtime)} ·{" "}
            {Array.isArray(show.movie.genres) ? show.movie.genres.join(", ") : show.movie.genres} ·{" "}
            {show.movie.releaseDate?.split("-")[0]}
          </p>

          <div className='flex items-center flex-wrap gap-4 mt-6'>
            <button
              onClick={() => setIsTrailerOpen(true)}
              className='flex items-center gap-2 px-7 py-3 text-sm bg-gray-800 hover:bg-gray-700 text-white transition rounded-xl font-medium cursor-pointer active:scale-95 shadow-lg'
            >
              <PlayCircle className='w-5 h-5 text-primary' />
              Watch Trailer
            </button>
            {Object.keys(show.dateTime || {}).length > 0 ? (
              <a
                href="#dateSelect"
                className='px-8 py-3 text-sm bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold transition rounded-xl cursor-pointer active:scale-95 shadow-lg shadow-emerald-500/20'
              >
                Buy Tickets
              </a>
            ) : (
              <a
                href="#dateSelect"
                className='px-8 py-3 text-sm bg-primary hover:bg-primary/90 text-white transition rounded-xl font-semibold cursor-pointer active:scale-95 shadow-lg shadow-primary/30'
              >
                Set Reminder
              </a>
            )}
            <button
              onClick={handleFavorite}
              title="Add to Favorites"
              className='bg-gray-800 hover:bg-gray-700 p-3 rounded-xl transition cursor-pointer active:scale-95 border border-gray-700'
            >
              <HeartIcon
                className={`w-5 h-5 ${
                  favoriteMovies?.some((movie) => movie._id?.toString() === id?.toString())
                    ? 'fill-rose-500 text-rose-500'
                    : 'text-gray-400'
                }`}
              />
            </button>
            <button
              onClick={handleShare}
              title="Share Movie"
              className='bg-gray-800 hover:bg-gray-700 p-3 rounded-xl transition cursor-pointer active:scale-95 border border-gray-700 text-gray-300 hover:text-white flex items-center gap-1.5 text-xs font-semibold'
            >
              <Share2 className='w-5 h-5 text-primary' />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cast Section */}
      <p className='text-xl font-bold mt-16 text-white'>Top Cast</p>
      <div className='overflow-x-auto no-scrollbar mt-6 pb-4'>
        <div className='flex items-center gap-6 w-max px-2'>
          {show.movie.casts?.slice(0, 12).map((cast, index) => (
            <div key={index} className='flex flex-col items-center text-center w-20'>
              <img
                src={cast.profile_path || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cast.name)}`}
                alt={cast.name}
                className='rounded-full h-16 w-16 object-cover border border-gray-700 shadow-md'
              />
              <p className='font-medium text-xs mt-2 text-gray-300 truncate w-full'>{cast.name}</p>
              <p className='text-[10px] text-gray-500 truncate w-full'>{cast.character_name || cast.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Date and Showtime Selection */}
      <div id="dateSelect" className="mt-10">
        <DateSelect dateTime={show.dateTime} id={id} movieTitle={show.movie.title} />
      </div>

      {/* Movie Ratings & Reviews Component */}
      <MovieReviews
        movieId={id}
        onRatingUpdated={(newRating, totalCount) => {
          setShow((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              movie: {
                ...prev.movie,
                vote_average: newRating,
                vote_count: totalCount,
              },
            };
          });
        }}
      />

      {/* Netflix-Style "More Like This" Recommendations with % match and Redis Caching */}
      <MoreLikeThis currentMovieId={id} />

      <div className='flex justify-center mt-12 mb-20'>
        <button
          onClick={() => {
            navigate('/Movies');
            scrollTo(0, 0);
          }}
          className='px-10 py-3 text-sm bg-gray-800 hover:bg-gray-700 text-white transition rounded-xl font-medium cursor-pointer border border-gray-700'
        >
          Explore More Movies
        </button>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default MovieDetails;
