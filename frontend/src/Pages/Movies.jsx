import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import BlurCircle from "../Components/BlurCircle";
import TrailerModal from "../Components/TrailerModal";
import { Ticket, Film, Search, Star, PlayCircle, Sparkles, Info, Flame, Trophy, Rocket, Smile, Zap, Heart } from "lucide-react";
import timeformate from "../Lib/TimeFormate";

export const CATEGORY_FILTERS = [
  { id: "all", label: "All Collections", icon: Film, badge: "All" },
  { id: "bookable", label: "Bookable Showtimes", icon: Ticket, badge: "Live Seats", highlight: true },
  { id: "trending", label: "Trending Now", icon: Flame, badge: "Hot" },
  { id: "top_rated", label: "Top Rated Blockbusters", icon: Trophy, badge: "8.5+ ⭐" },
  { id: "upcoming", label: "Upcoming Attractions", icon: Rocket, badge: "Soon" },
  { id: "action", label: "Action & Sci-Fi", icon: Zap, badge: "Sci-Fi" },
  { id: "comedy", label: "Comedy & Standup", icon: Smile, badge: "Fun" },
  { id: "drama", label: "Drama & Romance", icon: Heart, badge: "Emotion" },
];

const Movies = () => {
  const { shows, axios } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [apiMovies, setApiMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrailer, setSelectedTrailer] = useState(null);

  // Fetch TMDB API Movies (Now Playing, Upcoming, Top Rated)
  useEffect(() => {
    const fetchApiMovies = async () => {
      setLoading(true);
      try {
        const [nowPlayingRes, upcomingRes, topRatedRes] = await Promise.all([
          axios.get("/api/tmdb/now-playing"),
          axios.get("/api/tmdb/upcoming"),
          axios.get("/api/tmdb/top-rated"),
        ]);

        const nowPlaying = (nowPlayingRes.data?.movies || []).map((m) => ({ ...m, categoryType: "trending" }));
        const upcoming = (upcomingRes.data?.movies || []).map((m) => ({ ...m, categoryType: "upcoming" }));
        const topRated = (topRatedRes.data?.movies || []).map((m) => ({ ...m, categoryType: "top_rated" }));

        const combined = [...nowPlaying, ...upcoming, ...topRated];

        // Deduplicate by title
        const uniqueMap = new Map();
        combined.forEach((m) => {
          if (m.title && !uniqueMap.has(m.title.toLowerCase())) {
            uniqueMap.set(m.title.toLowerCase(), m);
          }
        });

        setApiMovies(Array.from(uniqueMap.values()));
      } catch (err) {
        console.error("Error fetching API reference movies:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApiMovies();
  }, [axios]);

  // Extract database bookable movies
  const bookableMovies = shows.map((s) => ({
    _id: s.movie?._id || s._id,
    title: s.movie?.title || "Untitled",
    poster: s.movie?.poster || s.movie?.backdrop,
    backdrop: s.movie?.backdrop || s.movie?.poster,
    vote_average: s.movie?.vote_average || 8.5,
    releaseDate: s.movie?.releaseDate || "Now Showing",
    runtime: s.movie?.runtime || 120,
    genres: s.movie?.genres || ["Action", "Drama"],
    overview: s.movie?.overview || "Active theatrical screening available for instant ticket booking.",
    trailerUrl: s.movie?.trailerUrl || `https://www.youtube.com/watch?v=dQw4w9WgXcQ`,
    isBookable: true,
    showPrice: s.showPrice || 12,
    showId: s._id,
    categoryType: "bookable",
  }));

  const bookableTitles = new Set(bookableMovies.map((b) => b.title.toLowerCase()));

  // Reference catalog movies
  const referenceMovies = apiMovies
    .filter((m) => !bookableTitles.has((m.title || "").toLowerCase()))
    .map((m) => ({
      _id: m.id || m._id,
      title: m.title,
      poster: m.poster_path || m.poster,
      backdrop: m.backdrop_path || m.backdrop,
      vote_average: m.vote_average || 8.0,
      releaseDate: m.release_date || "2026",
      runtime: 115,
      genres: m.genres || ["Action", "Drama", "Sci-Fi"],
      overview: m.overview || "Global catalog movie reference. Screening showtimes coming soon.",
      trailerUrl: m.trailerUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(m.title + " official trailer")}`,
      isBookable: false,
      categoryType: m.categoryType || "trending",
    }));

  const allMovies = [...bookableMovies, ...referenceMovies];

  // Category Filtering Engine
  const filteredMovies = allMovies.filter((movie) => {
    let matchesCategory = true;
    const movieGenres = Array.isArray(movie.genres)
      ? movie.genres.map((g) => (typeof g === "string" ? g.toLowerCase() : g.name?.toLowerCase() || ""))
      : [];

    if (activeCategory === "bookable") {
      matchesCategory = movie.isBookable;
    } else if (activeCategory === "trending") {
      matchesCategory = movie.categoryType === "trending" || movie.vote_average >= 7.8;
    } else if (activeCategory === "top_rated") {
      matchesCategory = movie.vote_average >= 8.2;
    } else if (activeCategory === "upcoming") {
      matchesCategory = movie.categoryType === "upcoming" || movie.releaseDate.includes("2026");
    } else if (activeCategory === "action") {
      matchesCategory = movieGenres.some((g) => g.includes("action") || g.includes("sci-fi") || g.includes("adventure"));
    } else if (activeCategory === "comedy") {
      matchesCategory = movieGenres.some((g) => g.includes("comedy") || g.includes("animation") || g.includes("family"));
    } else if (activeCategory === "drama") {
      matchesCategory = movieGenres.some((g) => g.includes("drama") || g.includes("romance") || g.includes("thriller"));
    }

    const matchesSearch =
      movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movieGenres.some((g) => g.includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white relative overflow-hidden pt-28 md:pt-36">
      <BlurCircle top="100px" left="-100px" />
      <BlurCircle top="500px" right="-100px" />

      <div className="px-6 md:px-16 lg:px-36 pb-24">
        {/* Trailer Modal */}
        {selectedTrailer && (
          <TrailerModal
            isOpen={!!selectedTrailer}
            onClose={() => setSelectedTrailer(null)}
            movie={selectedTrailer}
            movieTitle={selectedTrailer.title}
            trailerUrl={selectedTrailer.trailerUrl}
          />
        )}

        {/* Hero Header */}
        <div className="max-w-4xl mx-auto text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" /> District Movie Categorization & Multi-API Feeds
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            Explore <span className="text-primary">Entertainment World</span>
          </h1>
          <p className="text-gray-400 mt-3 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Discover active theatrical screening showtimes for <span className="text-emerald-400 font-bold">Instant Booking</span>, alongside top-rated TMDB blockbusters, trending releases, and comedy events.
          </p>

          {/* Visual Legend Indicator */}
          <div className="flex items-center justify-center gap-6 mt-6 flex-wrap text-xs font-medium">
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/50 px-3.5 py-1.5 rounded-full shadow-lg shadow-emerald-500/10">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-300 font-bold">🎟️ Green Card: Book Seats Now (Live Database Screening)</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 px-3.5 py-1.5 rounded-full">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-gray-300">📖 Dark Card: Catalog Reference / Trailer Preview</span>
            </div>
          </div>
        </div>

        {/* Controls: Search Bar & District Category Filter Pills */}
        <div className="mb-10 space-y-6">
          {/* Search Bar */}
          <div className="relative max-w-md mx-auto">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="Search by title, genre (Action, Comedy, Sci-Fi)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900/90 border border-gray-800 focus:border-primary text-white text-sm pl-11 pr-4 py-3 rounded-2xl outline-none transition shadow-xl backdrop-blur-md"
            />
          </div>

          {/* District Category Filter Pills */}
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-2 justify-start sm:justify-center flex-wrap">
            {CATEGORY_FILTERS.map((cat) => {
              const Icon = cat.icon;
              const isSelected = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer border active:scale-95 ${
                    isSelected
                      ? cat.highlight
                        ? "bg-emerald-600 text-white border-emerald-400 shadow-xl shadow-emerald-600/30 scale-105"
                        : "bg-primary text-white border-primary shadow-xl shadow-primary/30 scale-105"
                      : "bg-gray-900/80 text-gray-400 hover:text-white border-gray-800 hover:border-gray-700"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? "text-white fill-white/20" : "text-gray-400"}`} />
                  <span>{cat.label}</span>
                  <span
                    className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded-md ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {cat.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Movies Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div key={n} className="h-80 rounded-3xl bg-gray-900/60 animate-pulse border border-gray-800" />
            ))}
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="text-center py-20 bg-gray-900/40 rounded-3xl border border-gray-800">
            <Film className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-300">No movies found in this category</h3>
            <p className="text-xs text-gray-500 mt-1">Try selecting "All Collections" or searching another genre.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredMovies.map((movie) => {
              const isBookable = movie.isBookable;

              return (
                <div
                  key={movie._id}
                  className={`group relative rounded-3xl overflow-hidden border transition-all duration-300 flex flex-col justify-between hover:-translate-y-2 cursor-pointer ${
                    isBookable
                      ? "bg-gradient-to-b from-gray-900 via-gray-900 to-emerald-950/40 border-emerald-500/50 hover:border-emerald-400 shadow-xl shadow-emerald-950/30"
                      : "bg-gray-900/80 border-gray-800 hover:border-gray-700 shadow-lg"
                  }`}
                  onClick={() => {
                    navigate(`/movies/${movie._id}`);
                    scrollTo(0, 0);
                  }}
                >
                  {/* Poster Image & Overlay */}
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-950">
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-80" />

                    {/* Bookable vs Catalog Badge */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1">
                      {isBookable ? (
                        <span className="px-2.5 py-1 bg-emerald-600 text-white font-extrabold text-[10px] rounded-full shadow-lg flex items-center gap-1">
                          <Ticket className="w-3 h-3 fill-white" /> Book Seats
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-black/70 backdrop-blur-md text-amber-300 font-extrabold text-[10px] rounded-full border border-amber-400/30">
                          📖 Catalog
                        </span>
                      )}

                      {/* Vote Rating Badge */}
                      <span className="px-2 py-1 bg-black/80 backdrop-blur-md text-amber-400 font-black text-[11px] rounded-xl flex items-center gap-1 border border-amber-400/30">
                        <Star className="w-3 h-3 fill-amber-400" /> {movie.vote_average}
                      </span>
                    </div>

                    {/* Play Trailer Button on Hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTrailer(movie);
                      }}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 bg-black/40 backdrop-blur-xs"
                      title="Watch Official Trailer"
                    >
                      <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition duration-300 border-2 border-white/40">
                        <PlayCircle className="w-8 h-8 fill-white/20" />
                      </div>
                    </button>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-white group-hover:text-primary transition line-clamp-1">
                        {movie.title}
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">
                        {Array.isArray(movie.genres) ? movie.genres.join(", ") : movie.genres}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">
                        {movie.releaseDate || "Now Showing"}
                      </span>

                      {isBookable ? (
                        <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1">
                          ${movie.showPrice || 12} · Book <Ticket className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-1 group-hover:text-white transition">
                          View Info <Info className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Movies;
