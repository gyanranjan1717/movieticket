import React, { useState, useEffect } from "react";
import { Sparkles, Calendar, PlayCircle, Bell, Star, Film, Flame, Check } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import BlurCircle from "../Components/BlurCircle";
import TrailerModal from "../Components/TrailerModal";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Releases = () => {
  const { axios, shows, user, setIsAuthModalOpen } = useAppContext();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("upcoming");
  const [upcomingMovies, setUpcomingMovies] = useState([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [notifiedMovies, setNotifiedMovies] = useState({});

  useEffect(() => {
    const fetchReleases = async () => {
      setLoading(true);
      try {
        const [upcomingRes, nowPlayingRes] = await Promise.all([
          axios.get("/api/tmdb/upcoming"),
          axios.get("/api/tmdb/now-playing"),
        ]);

        if (upcomingRes.data?.success) {
          setUpcomingMovies(upcomingRes.data.movies || []);
        }
        if (nowPlayingRes.data?.success) {
          setNowPlayingMovies(nowPlayingRes.data.movies || []);
        }
      } catch (error) {
        console.error("Error fetching releases:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReleases();
  }, [axios]);

  useEffect(() => {
    const fetchUserReminders = async () => {
      if (!user) return;
      try {
        const { data } = await axios.get("/api/user/reminders");
        if (data.success && data.reminders) {
          const map = {};
          data.reminders.forEach((r) => {
            map[r.movieId] = true;
          });
          setNotifiedMovies(map);
        }
      } catch (err) {
        console.error("Error fetching user reminders:", err);
      }
    };

    fetchUserReminders();
  }, [user, axios]);

  const getDaysUntil = (releaseDate) => {
    if (!releaseDate) return null;
    const target = new Date(releaseDate);
    const today = new Date();
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleNotifyMe = async (movieId, title) => {
    if (!user) {
      toast.error("Please login to set a movie reminder");
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const { data } = await axios.post("/api/user/toggle-reminder", {
        movieId: movieId.toString(),
        movieTitle: title,
      });

      if (data.success) {
        setNotifiedMovies((prev) => ({
          ...prev,
          [movieId]: data.subscribed,
        }));
        toast.success(data.message);
      }
    } catch (error) {
      console.error("Error toggling reminder:", error);
      toast.error("Failed to set reminder");
    }
  };

  const currentList = activeTab === "upcoming" ? upcomingMovies : nowPlayingMovies;

  return (
    <div className="min-h-screen px-6 md:px-16 lg:px-36 pt-28 md:pt-36 pb-20 text-white relative">
      <BlurCircle top="50px" left="-100px" />
      <BlurCircle top="400px" right="-100px" />

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

      {/* Hero Header */}
      <div className="max-w-4xl mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" /> Movie Premiere Central
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          New & Upcoming <span className="text-primary">Releases</span>
        </h1>
        <p className="text-gray-400 mt-3 text-sm md:text-base max-w-2xl mx-auto">
          Explore upcoming blockbusters with release countdowns, watch official 4K trailers, and book tickets for current screenings.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center mb-12">
        <div className="flex items-center gap-2 p-1.5 bg-gray-900/80 border border-gray-800 rounded-2xl backdrop-blur-md shadow-xl">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === "upcoming"
                ? "bg-primary text-white shadow-lg shadow-primary/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Calendar className="w-4 h-4" /> Coming Soon ({upcomingMovies.length})
          </button>

          <button
            onClick={() => setActiveTab("now_playing")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === "now_playing"
                ? "bg-primary text-white shadow-lg shadow-primary/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Flame className="w-4 h-4" /> Now In Cinemas ({nowPlayingMovies.length})
          </button>
        </div>
      </div>

      {/* Movie Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="h-96 rounded-3xl bg-gray-900/60 border border-gray-800 animate-pulse" />
          ))}
        </div>
      ) : currentList.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/40 rounded-3xl border border-gray-800">
          <Film className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No releases found at this moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-7">
          {currentList.map((movie, idx) => {
            const daysLeft = getDaysUntil(movie.release_date);
            const isNotified = !!notifiedMovies[movie.id];

            return (
              <div
                key={movie.id || idx}
                className="group relative bg-gray-900/70 border border-gray-800 hover:border-primary/50 rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/10 flex flex-col justify-between"
              >
                {/* Poster & Badges */}
                <div className="relative aspect-[2/3] overflow-hidden bg-gray-950">
                  <img
                    src={movie.poster_path}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-80" />

                  {/* Countdown / Status Badge */}
                  <div className="absolute top-3 left-3">
                    {activeTab === "upcoming" && daysLeft !== null ? (
                      <span className="px-3 py-1 bg-amber-500/90 text-black text-[11px] font-extrabold rounded-full backdrop-blur-md shadow-md flex items-center gap-1">
                        ⏳ In {daysLeft} Days
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-emerald-500/90 text-black text-[11px] font-extrabold rounded-full backdrop-blur-md shadow-md flex items-center gap-1">
                        🎬 Now In Theaters
                      </span>
                    )}
                  </div>

                  {/* Rating Badge */}
                  {movie.vote_average && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-md">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold">{movie.vote_average}</span>
                    </div>
                  )}

                  {/* Play Trailer Floating Overlay Button */}
                  <button
                    onClick={() => setSelectedTrailer(movie)}
                    className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-primary/90 hover:bg-primary text-white flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 cursor-pointer"
                  >
                    <PlayCircle className="w-8 h-8" />
                  </button>
                </div>

                {/* Movie Info */}
                <div className="p-5 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="font-bold text-base text-white group-hover:text-primary transition line-clamp-1">
                      {movie.title}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      <span>
                        {movie.release_date
                          ? new Date(movie.release_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Coming Soon"}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 mt-2.5 line-clamp-2 leading-relaxed">
                      {movie.overview || "An exciting upcoming theatrical release with stellar cinematography and action."}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-5 pt-4 border-t border-gray-800/80 flex items-center gap-2">
                    {activeTab === "now_playing" ? (
                      <button
                        onClick={() => {
                          const matchedShow = shows.find(
                            (s) => s.movie._id === movie.id || s.movie.title === movie.title
                          );
                          if (matchedShow) {
                            navigate(`/movies/${matchedShow.movie._id}`);
                          } else {
                            navigate("/Movies");
                          }
                          scrollTo(0, 0);
                        }}
                        className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition cursor-pointer text-center shadow-lg shadow-primary/20"
                      >
                        Book Tickets
                      </button>
                    ) : (
                      <button
                        onClick={() => handleNotifyMe(movie.id, movie.title)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                          isNotified
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-gray-800 hover:bg-gray-700 text-white border-gray-700"
                        }`}
                      >
                        {isNotified ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Reminder Set
                          </>
                        ) : (
                          <>
                            <Bell className="w-3.5 h-3.5 text-primary" /> Remind Me
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedTrailer(movie)}
                      title="Watch Trailer"
                      className="p-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition border border-gray-700 cursor-pointer"
                    >
                      <PlayCircle className="w-4 h-4 text-primary" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Releases;
