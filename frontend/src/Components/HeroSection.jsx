import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Ticket, Star, Calendar, Clock, Sparkles, ChevronRight, Heart } from 'lucide-react';
import TrailerModal from './TrailerModal';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const FEATURED_HERO_MOVIES = [
  {
    id: "hero_dune2",
    title: "Dune: Part Two",
    studio: "MARVEL & WARNER BROS",
    rating: 8.9,
    year: "2026",
    duration: "2h 46m",
    genres: ["Sci-Fi", "Action", "Adventure"],
    overview: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family in a mythical journey across Arrakis.",
    backdrop: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80",
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
    trailerUrl: "https://www.youtube.com/watch?v=Way9Dexny3w",
    price: 14.50,
  },
  {
    id: "hero_guardians",
    title: "Guardians of the Galaxy",
    studio: "MARVEL STUDIOS",
    rating: 8.8,
    year: "2026",
    duration: "2h 10m",
    genres: ["Action", "Adventure", "Sci-Fi"],
    overview: "A group of intergalactic criminals must pull together to stop a fanatical warrior with plans to purge the universe.",
    backdrop: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=80",
    poster: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
    trailerUrl: "https://www.youtube.com/watch?v=d96cjJhvlMA",
    price: 12.00,
  },
  {
    id: "hero_deadpool",
    title: "Deadpool & Wolverine",
    studio: "MARVEL STUDIOS",
    rating: 9.1,
    year: "2026",
    duration: "2h 08m",
    genres: ["Action", "Comedy", "Sci-Fi"],
    overview: "Wolverine is recovering from his injuries when he crosses paths with the loudmouth Deadpool. They team up to defeat a common enemy.",
    backdrop: "https://images.unsplash.com/photo-1563089145-599997674d42?w=1600&auto=format&fit=crop&q=80",
    poster: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80",
    trailerUrl: "https://www.youtube.com/watch?v=73_1biulk6s",
    price: 15.00,
  },
  {
    id: "hero_oppenheimer",
    title: "Oppenheimer",
    studio: "UNIVERSAL PICTURES",
    rating: 9.0,
    year: "2026",
    duration: "3h 00m",
    genres: ["Biography", "Drama", "History"],
    overview: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.",
    backdrop: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1600&auto=format&fit=crop&q=80",
    poster: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&auto=format&fit=crop&q=80",
    trailerUrl: "https://www.youtube.com/watch?v=uYPbbksJxIg",
    price: 13.50,
  }
];

const HeroSection = () => {
  const navigate = useNavigate();
  const { shows, user, favoriteMovies, fetchFavoriteMovies, setIsAuthModalOpen, axios } = useAppContext();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTrailer, setSelectedTrailer] = useState(null);

  // Auto slide hero carousel every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % FEATURED_HERO_MOVIES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const currentMovie = FEATURED_HERO_MOVIES[currentIndex];

  const handleFavoriteToggle = async () => {
    if (!user) {
      toast.error("Please login to save to favorites");
      setIsAuthModalOpen(true);
      return;
    }
    try {
      // Find matching show or fallback
      const matchedShow = shows[0];
      if (matchedShow) {
        await axios.post('/api/user/update-favorite', { movieId: matchedShow.movie._id });
        await fetchFavoriteMovies();
        toast.success("Favorites updated!");
      } else {
        toast.success("Added to Watchlist!");
      }
    } catch (err) {
      toast.error("Failed to update favorites");
    }
  };

  return (
    <div className="relative w-full h-[95vh] overflow-hidden bg-black text-white select-none">
      {/* Trailer & Full Movie Info Modal */}
      {selectedTrailer && (
        <TrailerModal
          isOpen={!!selectedTrailer}
          onClose={() => setSelectedTrailer(null)}
          movie={selectedTrailer}
          movieTitle={selectedTrailer.title}
          trailerUrl={selectedTrailer.trailerUrl}
        />
      )}

      {/* Background Image Carousel with Smooth Fade */}
      {FEATURED_HERO_MOVIES.map((movie, index) => (
        <div
          key={movie.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? "opacity-100 scale-105" : "opacity-0 scale-100 pointer-events-none"
          }`}
          style={{ transition: "opacity 1000ms ease-in-out, transform 8000ms ease-out" }}
        >
          <img
            src={movie.backdrop}
            alt={movie.title}
            className="w-full h-full object-cover object-center filter brightness-[0.65]"
          />
          {/* Multi-layered Cinematic Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/60 to-transparent w-full md:w-3/4" />
        </div>
      ))}

      {/* Main Content Area */}
      <div className="relative z-20 h-full max-w-7xl mx-auto px-6 md:px-16 flex flex-col justify-center pt-20">
        <div className="max-w-2xl animate-fadeIn space-y-4">
          
          {/* Animated Premiere Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/20 border border-primary/40 backdrop-blur-md text-primary text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" /> #1 TRENDING IN IMAX 3D
          </div>

          {/* Studio Tag */}
          <p className="text-xs md:text-sm font-extrabold tracking-widest text-amber-400 uppercase">
            {currentMovie.studio} PRESENTATION
          </p>

          {/* Dynamic Movie Title */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-none drop-shadow-2xl font-sans">
            {currentMovie.title}
          </h1>

          {/* Pill Metadata Bar */}
          <div className="flex items-center gap-3 text-xs md:text-sm font-semibold text-gray-300 flex-wrap pt-1">
            <span className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-md backdrop-blur-md">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {currentMovie.rating} Rating
            </span>

            <span className="flex items-center gap-1 bg-gray-800/80 border border-gray-700 px-2.5 py-0.5 rounded-md">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {currentMovie.year}
            </span>

            <span className="flex items-center gap-1 bg-gray-800/80 border border-gray-700 px-2.5 py-0.5 rounded-md">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {currentMovie.duration}
            </span>

            <span className="text-gray-400 font-mono text-xs">
              {currentMovie.genres.join(" · ")}
            </span>
          </div>

          {/* Overview text */}
          <p className="text-gray-300 text-sm md:text-base leading-relaxed line-clamp-3 max-w-xl font-normal pt-2">
            {currentMovie.overview}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 pt-6 flex-wrap">
            <button
              onClick={() => {
                const matchedShow = shows.find((s) => s.movie?.title === currentMovie.title);
                if (matchedShow) {
                  navigate(`/Movies/${matchedShow.movie._id}`);
                } else {
                  navigate('/Movies');
                }
              }}
              className="flex items-center gap-2.5 px-8 py-3.5 bg-primary hover:bg-primary/90 text-white font-extrabold text-sm rounded-xl transition duration-300 transform active:scale-95 shadow-xl shadow-primary/30 cursor-pointer"
            >
              <Ticket className="w-5 h-5 fill-white" />
              Book Tickets Now
            </button>

            <button
              onClick={() => setSelectedTrailer(currentMovie)}
              className="flex items-center gap-2.5 px-7 py-3.5 bg-gray-900/80 hover:bg-gray-800 text-white font-bold text-sm rounded-xl transition duration-300 border border-gray-700/80 backdrop-blur-md cursor-pointer active:scale-95 shadow-lg"
            >
              <PlayCircle className="w-5 h-5 text-primary" />
              Watch 4K Trailer
            </button>

            <button
              onClick={handleFavoriteToggle}
              className="p-3.5 bg-gray-900/80 hover:bg-gray-800 text-gray-300 hover:text-rose-500 rounded-xl transition border border-gray-700/80 backdrop-blur-md cursor-pointer active:scale-95"
              title="Add to Watchlist"
            >
              <Heart className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>

      {/* Bottom Right Carousel Thumbnails */}
      <div className="absolute bottom-8 right-6 md:right-16 z-30 hidden sm:flex items-center gap-3 bg-gray-950/70 border border-gray-800/80 backdrop-blur-lg p-2 rounded-2xl shadow-2xl">
        {FEATURED_HERO_MOVIES.map((movie, index) => (
          <div
            key={movie.id}
            onClick={() => setCurrentIndex(index)}
            className={`relative h-14 w-24 rounded-xl overflow-hidden cursor-pointer transition duration-300 border-2 ${
              index === currentIndex
                ? "border-primary scale-105 shadow-lg shadow-primary/30"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <img src={movie.backdrop} alt={movie.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30" />
            <span className="absolute bottom-1 left-1.5 text-[9px] font-bold text-white truncate max-w-[80px]">
              {movie.title}
            </span>
          </div>
        ))}
      </div>

      {/* Slide Indicators for Mobile */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex sm:hidden items-center gap-2">
        {FEATURED_HERO_MOVIES.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentIndex ? "w-6 bg-primary" : "w-2 bg-gray-600 opacity-50"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSection;