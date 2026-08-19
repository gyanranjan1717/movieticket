import React, { useEffect, useState, useRef } from "react";
import { ArrowLeft, ArrowRight, Star, Ticket, PlayCircle, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BlurCircle from "./BlurCircle";
import { useAppContext } from "../context/AppContext";
import TrailerModal from "./TrailerModal";

export default function MovieSlider() {
  const navigate = useNavigate();
  const { shows, axios } = useAppContext();

  const [sliderMovies, setSliderMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const indexRef = useRef(currentIndex);

  // Fetch TMDB trending movies to enrich slider list
  useEffect(() => {
    const loadSliderData = async () => {
      let apiList = [];
      try {
        const { data } = await axios.get("/api/tmdb/now-playing");
        if (data.success && data.movies) {
          apiList = data.movies;
        }
      } catch (err) {
        console.error("Slider TMDB fetch error:", err);
      }

      // Merge DB shows with TMDB trending
      const dbMovies = shows.map((s) => ({
        _id: s.movie?._id || s._id,
        title: s.movie?.title || "Untitled",
        backdrop_path: s.movie?.backdrop || s.movie?.poster,
        vote_average: s.movie?.vote_average || 8.8,
        genres: Array.isArray(s.movie?.genres) ? s.movie.genres.join(" · ") : "Action · Sci-Fi",
        year: s.movie?.releaseDate ? s.movie.releaseDate.split("-")[0] : "2026",
        overview: s.movie?.overview || "Experience state of the art IMAX audio and 4K cinema projection.",
        trailerUrl: s.movie?.trailerUrl || "https://www.youtube.com/watch?v=Way9Dexny3w",
        isBookable: true,
        showPrice: s.showPrice || 12,
      }));

      const apiFormatted = apiList.map((m) => ({
        _id: m.id || m._id,
        title: m.title,
        backdrop_path: m.backdrop_path || m.poster_path,
        vote_average: m.vote_average || 8.2,
        genres: "Action · Blockbuster",
        year: m.release_date ? m.release_date.split("-")[0] : "2026",
        overview: m.overview || "Global theatrical release streaming in theaters worldwide.",
        trailerUrl: m.trailerUrl || `https://www.youtube.com/watch?v=YoHD9XEInc0`,
        isBookable: false,
      }));

      const combined = [...dbMovies, ...apiFormatted];

      // Deduplicate by title
      const uniqueMap = new Map();
      combined.forEach((item) => {
        if (item.title && !uniqueMap.has(item.title.toLowerCase())) {
          uniqueMap.set(item.title.toLowerCase(), item);
        }
      });

      setSliderMovies(Array.from(uniqueMap.values()).slice(0, 8));
    };

    loadSliderData();
  }, [shows, axios]);

  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight" && indexRef.current < sliderMovies.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else if (e.key === "ArrowLeft" && indexRef.current > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sliderMovies.length]);

  // Auto carousel rotation
  useEffect(() => {
    if (!sliderMovies.length) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === sliderMovies.length - 1 ? 0 : prev + 1));
    }, 4500);
    return () => clearInterval(interval);
  }, [sliderMovies.length]);

  if (!sliderMovies.length) return null;

  return (
    <div className="w-full py-20 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white relative overflow-hidden select-none">
      <BlurCircle top="50px" left="0px" />
      <BlurCircle bottom="50px" right="0px" />

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

      {/* Section Title */}
      <div className="max-w-7xl mx-auto px-6 md:px-16 mb-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/20 text-primary border border-primary/30">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Trending Spotlight</h2>
            <p className="text-xs text-gray-400 mt-0.5">Top picks in theaters this week</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => currentIndex > 0 && setCurrentIndex((prev) => prev - 1)}
            className="p-3 bg-gray-800/80 hover:bg-gray-700 text-white rounded-xl border border-gray-700 transition cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => currentIndex < sliderMovies.length - 1 && setCurrentIndex((prev) => prev + 1)}
            className="p-3 bg-gray-800/80 hover:bg-gray-700 text-white rounded-xl border border-gray-700 transition cursor-pointer active:scale-95"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 3D Depth Card Carousel Wrapper */}
      <div className="relative w-full max-w-7xl mx-auto px-4 overflow-hidden">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${currentIndex * 85}%)` }}
        >
          {sliderMovies.map((movie, index) => {
            const isActive = index === currentIndex;

            return (
              <div
                key={movie._id || index}
                className={`w-[85%] sm:w-[75%] md:w-[65%] mx-3 flex-shrink-0 rounded-3xl overflow-hidden transition-all duration-700 transform ${
                  isActive ? "scale-100 opacity-100 shadow-2xl border-2 border-primary/50" : "scale-95 opacity-60 border border-gray-800"
                }`}
              >
                <div className="relative w-full h-[60vh] sm:h-[65vh] rounded-3xl overflow-hidden bg-gray-950">
                  <img
                    src={movie.backdrop_path}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />

                  {/* Top Left Tag */}
                  <div className="absolute top-4 left-4">
                    {movie.isBookable ? (
                      <span className="px-3.5 py-1 bg-emerald-500 text-black font-extrabold text-xs rounded-full shadow-lg">
                        🎟️ Book Tickets (${movie.showPrice})
                      </span>
                    ) : (
                      <span className="px-3.5 py-1 bg-amber-500/90 text-black font-extrabold text-xs rounded-full shadow-lg">
                        🎬 Now In Cinemas
                      </span>
                    )}
                  </div>

                  {/* Rating Tag */}
                  <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/70 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-white">{movie.vote_average.toFixed(1)}</span>
                  </div>

                  {/* Overlay Info */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
                    <h3 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 drop-shadow-md">
                      {movie.title}
                    </h3>
                    
                    <p className="text-xs sm:text-sm text-gray-300 font-semibold mb-2">
                      🎬 {movie.genres} · 📅 {movie.year}
                    </p>

                    <p className="text-xs sm:text-sm text-gray-300 max-w-xl line-clamp-2 leading-relaxed mb-6">
                      {movie.overview}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                      {movie.isBookable ? (
                        <button
                          onClick={() => {
                            navigate(`/Movies/${movie._id}`);
                            window.scrollTo(0, 0);
                          }}
                          className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary/30 transition cursor-pointer flex items-center gap-2"
                        >
                          <Ticket className="w-4 h-4" /> Book Tickets
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            navigate('/Movies');
                            window.scrollTo(0, 0);
                          }}
                          className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary/30 transition cursor-pointer flex items-center gap-2"
                        >
                          Explore Screenings
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedTrailer(movie)}
                        className="px-5 py-2.5 bg-gray-900/80 hover:bg-gray-800 text-white font-bold text-xs rounded-xl border border-gray-700 transition cursor-pointer backdrop-blur-md flex items-center gap-1.5"
                      >
                        <PlayCircle className="w-4 h-4 text-primary" /> Watch Trailer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Carousel Indicators */}
        <div className="flex justify-center items-center gap-2 mt-6">
          {sliderMovies.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex ? "w-8 bg-primary shadow-lg shadow-primary/50" : "w-2 bg-gray-700"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
