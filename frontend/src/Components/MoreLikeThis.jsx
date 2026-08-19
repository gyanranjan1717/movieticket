import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Plus, Check, Star, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const MoreLikeThis = ({ currentMovieId }) => {
  const navigate = useNavigate();
  const { axios, user, favoriteMovies, fetchFavoriteMovies, setIsAuthModalOpen } = useAppContext();

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    const fetchSimilar = async () => {
      if (!currentMovieId) return;
      try {
        setLoading(true);
        const { data } = await axios.get(`/api/recommendations/similar/${currentMovieId}`);
        if (data.success && data.recommendations) {
          setRecommendations(data.recommendations);
          setIsCached(!!data.cached);
        }
      } catch (error) {
        console.error("Error fetching similar movies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilar();
  }, [currentMovieId, axios]);

  const handleToggleFavorite = async (e, movieId) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Please login to save to favorites");
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const { data } = await axios.post('/api/user/update-favorite', { movieId });
      if (data.success) {
        await fetchFavoriteMovies();
        toast.success("Favorites updated!");
      }
    } catch (err) {
      toast.error("Failed to update favorites");
    }
  };

  if (loading) {
    return (
      <div className="mt-16 mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">More Like This</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 bg-gray-800/60 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="mt-16 mb-16">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white tracking-wide">More Like This</h2>
          {isCached && (
            <span className="flex items-center gap-1 text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
              <Zap className="w-3 h-3 fill-amber-400" /> Redis Fast Cache
            </span>
          )}
        </div>
      </div>

      {/* Netflix-style Movie Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {recommendations.slice(0, 6).map((movie) => {
          const isFav = favoriteMovies?.some((m) => m._id === movie._id);
          const poster = movie.backdrop || movie.poster || movie.poster_path || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80";
          const releaseYear = movie.release_date || movie.releaseDate
            ? new Date(movie.release_date || movie.releaseDate).getFullYear()
            : "2026";

          return (
            <div
              key={movie._id}
              onClick={() => {
                navigate(`/Movies/${movie._id}`);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="group relative bg-gray-900/90 border border-gray-800/80 rounded-xl overflow-hidden shadow-xl hover:shadow-2xl hover:border-gray-700 transition duration-300 flex flex-col justify-between cursor-pointer"
            >
              {/* Media Thumbnail */}
              <div className="relative h-44 w-full overflow-hidden bg-gray-950">
                <img
                  src={poster}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-80" />
                
                {/* Runtime Badge in top right */}
                {movie.runtime && (
                  <span className="absolute top-2 right-2 text-xs font-semibold text-white bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md">
                    {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 flex flex-col flex-1 justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-white text-base truncate group-hover:text-primary transition">
                      {movie.title}
                    </h3>
                    <button
                      onClick={(e) => handleToggleFavorite(e, movie._id)}
                      title={isFav ? "Remove from favorites" : "Add to favorites"}
                      className="p-1.5 rounded-full bg-gray-800/80 hover:bg-gray-700 text-white border border-gray-700 transition active:scale-95 flex-shrink-0"
                    >
                      {isFav ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Plus className="w-4 h-4 text-gray-300" />
                      )}
                    </button>
                  </div>

                  {/* Metadata Row: Green Match Percentage Tag */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                    <span className="text-emerald-400 font-bold text-sm bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                      {movie.matchPercentage || "88% match"}
                    </span>
                    <span className="border border-gray-700 text-gray-300 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                      U/A 13+
                    </span>
                    <span className="text-gray-400 font-medium">{releaseYear}</span>
                    <span className="flex items-center gap-0.5 text-amber-400 font-semibold ml-auto">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {movie.vote_average ? movie.vote_average.toFixed(1) : "8.5"}
                    </span>
                  </div>

                  {/* Overview snippet */}
                  <p className="text-xs text-gray-400 mt-3 line-clamp-2 leading-relaxed">
                    {movie.overview || "Legendary experience with unforgettable moments inside the theater screen."}
                  </p>
                </div>

                {/* Bottom Genre Badges */}
                <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
                  <span className="truncate">
                    {Array.isArray(movie.genres) ? movie.genres.slice(0, 2).join(" · ") : "Action"}
                  </span>
                  <span className="text-primary font-semibold group-hover:underline">
                    View Details →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MoreLikeThis;
