import React, { useState } from "react";
import { X, Film, Star, Calendar, Clock, Bell, Heart, Ticket, Info, Check, Sparkles } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

/**
 * Extracts a clean, working YouTube embed URL for any movie title or YouTube link.
 */
const getEmbedUrl = (trailerUrl, movieTitle) => {
  if (!trailerUrl || trailerUrl.includes("results?search_query") || trailerUrl.includes("dQw4w9WgXcQ")) {
    const query = encodeURIComponent(`${movieTitle || "movie"} official trailer`);
    return `https://www.youtube-nocookie.com/embed?listType=search&list=${query}&autoplay=1`;
  }

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trailerUrl.match(regExp);

  if (match && match[2].length === 11) {
    return `https://www.youtube-nocookie.com/embed/${match[2]}?autoplay=1&rel=0&enablejsapi=1`;
  }

  const query = encodeURIComponent(`${movieTitle || "movie"} official trailer`);
  return `https://www.youtube-nocookie.com/embed?listType=search&list=${query}&autoplay=1`;
};

const TrailerModal = ({ isOpen, onClose, trailerUrl, movieTitle, movie }) => {
  const navigate = useNavigate();
  const { user, axios, favoriteMovies, fetchFavoriteMovies, setIsAuthModalOpen } = useAppContext();
  const [isSubscribed, setIsSubscribed] = useState(false);

  if (!isOpen) return null;

  // Extract movie properties gracefully
  const title = movieTitle || movie?.title || "Movie";
  const finalTrailerUrl = trailerUrl || movie?.trailerUrl || "";
  const embedSrc = getEmbedUrl(finalTrailerUrl, title);

  const rating = movie?.vote_average ? movie.vote_average.toFixed(1) : "8.5";
  const releaseYear = movie?.release_date || movie?.releaseDate
    ? new Date(movie.release_date || movie.releaseDate).getFullYear()
    : "2026";
  const runtime = movie?.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : "2h 15m";
  const genres = Array.isArray(movie?.genres)
    ? movie.genres.join(" · ")
    : movie?.genres || "Action · Drama";
  const overview = movie?.overview || "An exciting cinematic release with stellar performances and high-octane storytelling.";
  const isBookable = movie?.isBookable || false;
  const isFav = favoriteMovies?.some((m) => m._id === movie?._id || m.title === title);

  // Toggle Remind Me
  const handleRemindMe = async () => {
    if (!user) {
      toast.error("Please login to set a movie reminder");
      setIsAuthModalOpen(true);
      return;
    }
    try {
      const { data } = await axios.post("/api/user/toggle-reminder", {
        movieId: movie?._id?.toString() || movie?.id?.toString() || "movie_remind",
        movieTitle: title,
      });
      if (data.success) {
        setIsSubscribed(data.subscribed);
        toast.success(data.message);
      }
    } catch (err) {
      toast.error("Failed to set reminder");
    }
  };

  // Toggle Favorite
  const handleFavorite = async () => {
    if (!user) {
      toast.error("Please login to save to favorites");
      setIsAuthModalOpen(true);
      return;
    }
    try {
      if (movie?._id) {
        await axios.post("/api/user/update-favorite", { movieId: movie._id });
        await fetchFavoriteMovies();
        toast.success(isFav ? "Removed from favorites" : "Added to favorites!");
      }
    } catch (err) {
      toast.error("Failed to update favorites");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-lg p-4 sm:p-6 animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 my-8 max-h-[90vh] flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/90 flex-shrink-0">
          <div className="flex items-center gap-2.5 truncate pr-4">
            <div className="p-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30">
              <Film className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-white truncate tracking-wide">
              {title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition cursor-pointer active:scale-95 flex-shrink-0"
            title="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="overflow-y-auto flex-1">
          {/* Video Player Frame */}
          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={embedSrc}
              title={`${title} Official Trailer`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          {/* Detailed Movie Information Section */}
          <div className="p-6 space-y-4 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white">
            
            {/* Status & Metadata Row */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                {isBookable ? (
                  <span className="px-3 py-1 bg-emerald-500 text-black font-extrabold text-xs rounded-full shadow-md flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5 fill-black" /> Tickets Available (${movie?.showPrice || 12})
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs rounded-full flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-amber-400" /> Catalog Reference / Preview
                  </span>
                )}

                <span className="flex items-center gap-1 bg-black/60 border border-white/10 px-2.5 py-0.5 rounded-md text-xs font-bold text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> {rating} User Rating
                </span>

                <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" /> {releaseYear}
                </span>

                <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                  <Clock className="w-3.5 h-3.5 text-gray-500" /> {runtime}
                </span>
              </div>

              <span className="text-xs font-semibold text-primary uppercase tracking-wider bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg">
                {genres}
              </span>
            </div>

            {/* Synopsis Overview */}
            <div className="pt-2">
              <h4 className="text-sm font-extrabold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Story Synopsis
              </h4>
              <p className="text-sm text-gray-300 leading-relaxed bg-gray-950/60 p-4 rounded-2xl border border-gray-800/80">
                {overview}
              </p>
            </div>

            {/* Action Bar inside Modal */}
            <div className="flex items-center gap-3 pt-3 flex-wrap">
              {isBookable && movie?._id ? (
                <button
                  onClick={() => {
                    onClose();
                    navigate(`/Movies/${movie._id}`);
                    window.scrollTo(0, 0);
                  }}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs sm:text-sm rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <Ticket className="w-4 h-4 fill-black" /> Book Tickets Now (${movie?.showPrice})
                </button>
              ) : (
                <button
                  onClick={handleRemindMe}
                  className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-extrabold transition cursor-pointer flex items-center justify-center gap-2 border active:scale-95 ${
                    isSubscribed
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-primary hover:bg-primary/90 text-white border-primary/50 shadow-lg shadow-primary/30"
                  }`}
                >
                  {isSubscribed ? (
                    <>
                      <Check className="w-4 h-4" /> Reminder Active!
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" /> Remind Me When Tickets Open
                    </>
                  )}
                </button>
              )}

              {movie?._id && (
                <button
                  onClick={handleFavorite}
                  className={`p-3 rounded-xl border transition cursor-pointer active:scale-95 flex items-center justify-center ${
                    isFav
                      ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700"
                  }`}
                  title="Toggle Favorite"
                >
                  <Heart className={`w-4 h-4 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 bg-gray-950 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400 flex-shrink-0">
          <span>🎬 ShowTime 4K Trailer & Movie Info Showcase</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white font-semibold cursor-pointer underline"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrailerModal;
