import React, { useEffect, useState } from 'react';
import Loading from '../../Components/Loading';
import Title from '../../Components/Admin/Title';
import { CheckIcon, Trash2, StarIcon, PlusCircle, Search, X, Film, Sparkles } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const AddShow = () => {
  const { axios, token } = useAppContext();
  const currency = import.meta.env.VITE_CURRENCY || '$';

  const [moviesList, setMoviesList] = useState([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null); // Selected movie object
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Custom Movie Modal State
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customPoster, setCustomPoster] = useState('');
  const [customBackdrop, setCustomBackdrop] = useState('');
  const [customOverview, setCustomOverview] = useState('');
  const [customGenres, setCustomGenres] = useState('Action, Sci-Fi');
  const [customRuntime, setCustomRuntime] = useState('130');
  const [creatingCustomMovie, setCreatingCustomMovie] = useState(false);

  // Show schedule state
  const [dateTimeSelection, setDateTimeSelection] = useState({});
  const [dateTimeInput, setDateTimeInput] = useState('');
  const [showPrice, setShowPrice] = useState('12');
  const [addingShow, setAddingShow] = useState(false);

  const fetchMoviesCatalog = async () => {
    setLoadingMovies(true);
    try {
      const activeToken = token || localStorage.getItem('token');
      const { data } = await axios.get('/api/show/now-playing', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      if (data.success) {
        setMoviesList(data.movies || []);
      } else {
        toast.error(data.message || 'Failed to load movies');
      }
    } catch (error) {
      console.error('Error fetching movies:', error.message);
      toast.error('Something went wrong while loading movies.');
    } finally {
      setLoadingMovies(false);
    }
  };

  const handleSearchMovies = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) {
      return fetchMoviesCatalog();
    }

    setSearching(true);
    try {
      const activeToken = token || localStorage.getItem('token');
      const { data } = await axios.get(`/api/show/search-movies?query=${encodeURIComponent(searchQuery.trim())}`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      if (data.success) {
        setMoviesList(data.movies || []);
        if (data.movies?.length === 0) {
          toast('No matching movies found.');
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search movies');
    } finally {
      setSearching(false);
    }
  };

  const handleCreateCustomMovie = async (e) => {
    e.preventDefault();
    if (!customTitle.trim() || !customPoster.trim()) {
      return toast.error('Movie Title and Poster URL are required');
    }

    setCreatingCustomMovie(true);
    try {
      const activeToken = token || localStorage.getItem('token');
      const { data } = await axios.post(
        '/api/show/create-custom-movie',
        {
          title: customTitle.trim(),
          poster: customPoster.trim(),
          backdrop: customBackdrop.trim() || customPoster.trim(),
          overview: customOverview.trim() || 'Exciting theatrical premiere.',
          genres: customGenres.split(',').map((g) => g.trim()),
          runtime: Number(customRuntime) || 120,
        },
        { headers: { Authorization: `Bearer ${activeToken}` } }
      );

      if (data.success && data.movie) {
        toast.success('Movie created successfully!');
        setMoviesList((prev) => [data.movie, ...prev]);
        setSelectedMovie(data.movie);
        setIsCustomModalOpen(false);

        // Reset form
        setCustomTitle('');
        setCustomPoster('');
        setCustomBackdrop('');
        setCustomOverview('');
      } else {
        toast.error(data.message || 'Failed to create movie');
      }
    } catch (error) {
      console.error('Error creating movie:', error);
      toast.error(error.response?.data?.message || 'Failed to create movie');
    } finally {
      setCreatingCustomMovie(false);
    }
  };

  const handleDateTimeAdd = () => {
    if (!dateTimeInput) return;
    const [date, time] = dateTimeInput.split('T');
    if (!date || !time) return;

    setDateTimeSelection((prev) => {
      const times = prev[date] || [];
      if (!times.includes(time)) {
        return { ...prev, [date]: [...times, time] };
      }
      return prev;
    });
  };

  const handleRemoveTime = (date, time) => {
    setDateTimeSelection((prev) => {
      const filteredTimes = prev[date].filter((t) => t !== time);
      if (filteredTimes.length === 0) {
        const { [date]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [date]: filteredTimes,
      };
    });
  };

  const handleSubmit = async () => {
    try {
      setAddingShow(true);

      if (!selectedMovie || Object.keys(dateTimeSelection).length === 0 || !showPrice) {
        toast.error('Please select a movie, add at least one showtime, and set a price');
        setAddingShow(false);
        return;
      }

      const showsInput = Object.entries(dateTimeSelection).map(([date, time]) => ({
        date,
        time,
      }));

      const payload = {
        movieId: selectedMovie.id,
        movieData: selectedMovie,
        showsInput,
        showPrice: Number(showPrice),
      };

      const activeToken = token || localStorage.getItem('token');
      const { data } = await axios.post('/api/show/add', payload, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      if (data.success) {
        toast.success(data.message || 'Show scheduled successfully!');
        setSelectedMovie(null);
        setDateTimeSelection({});
        setShowPrice('12');
        setDateTimeInput('');
      } else {
        toast.error(data.message || 'Failed to add show');
      }
    } catch (error) {
      console.error('Submission Error:', error);
      toast.error(error.response?.data?.message || 'An error occurred while scheduling show.');
    } finally {
      setAddingShow(false);
    }
  };

  useEffect(() => {
    fetchMoviesCatalog();
  }, [token]);

  if (loadingMovies) {
    return <Loading />;
  }

  return (
    <div className="pb-16 text-white max-w-6xl">
      <Title text1="SCHEDULE" text2="Shows" />

      {/* Action Bar: Search & Add Custom Movie */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8 bg-gray-900/60 p-4 rounded-2xl border border-gray-800">
        <form onSubmit={handleSearchMovies} className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movie from TMDB or database..."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer border border-gray-700"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        <button
          onClick={() => setIsCustomModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-primary/20"
        >
          <PlusCircle className="w-4 h-4" /> Add Custom Movie
        </button>
      </div>

      {/* Custom Movie Modal */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 md:p-8 max-w-lg w-full relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsCustomModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-2">
              <Film className="w-4 h-4" /> Custom Entry
            </div>
            <h2 className="text-xl font-bold text-white mb-4">Add a New Movie to Catalog</h2>

            <form onSubmit={handleCreateCustomMovie} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Movie Title *</label>
                <input
                  type="text"
                  required
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Interstellar 2"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Poster Image URL *</label>
                <input
                  type="url"
                  required
                  value={customPoster}
                  onChange={(e) => setCustomPoster(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Backdrop Image URL (Optional)</label>
                <input
                  type="url"
                  value={customBackdrop}
                  onChange={(e) => setCustomBackdrop(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Genres (comma separated)</label>
                  <input
                    type="text"
                    value={customGenres}
                    onChange={(e) => setCustomGenres(e.target.value)}
                    placeholder="Action, Sci-Fi, Drama"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Runtime (minutes)</label>
                  <input
                    type="number"
                    value={customRuntime}
                    onChange={(e) => setCustomRuntime(e.target.value)}
                    placeholder="135"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Plot Overview</label>
                <textarea
                  rows={3}
                  value={customOverview}
                  onChange={(e) => setCustomOverview(e.target.value)}
                  placeholder="Summary of the movie story..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="submit"
                disabled={creatingCustomMovie}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition cursor-pointer disabled:opacity-50 mt-2"
              >
                {creatingCustomMovie ? 'Saving Movie...' : 'Save & Select Movie'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Select Movie Grid */}
      <p className="mt-8 text-sm font-bold text-gray-300">
        Step 1: Select a Movie ({moviesList.length} Available)
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
        {moviesList.map((movie) => {
          const isSelected = selectedMovie?.id === movie.id || selectedMovie?.title === movie.title;

          return (
            <div
              key={movie.id}
              onClick={() => setSelectedMovie(movie)}
              className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border bg-gray-900/80 flex flex-col justify-between ${
                isSelected
                  ? 'border-primary ring-2 ring-primary shadow-xl shadow-primary/30 scale-102'
                  : 'border-gray-800 hover:border-gray-700 hover:-translate-y-1'
              }`}
            >
              <div className="relative aspect-[2/3] overflow-hidden">
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-80" />

                {isSelected && (
                  <div className="absolute top-2 right-2 bg-primary text-white p-1 rounded-full shadow-lg">
                    <CheckIcon className="w-3.5 h-3.5" strokeWidth={3} />
                  </div>
                )}

                <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded-md text-[10px]">
                  <StarIcon className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{movie.vote_average || '8.5'}</span>
                </div>
              </div>

              <div className="p-2.5">
                <p className="font-bold text-xs truncate text-white">{movie.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{movie.releaseDate || '2026'}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 2: Show Pricing & Time Configuration */}
      <div className="mt-12 bg-gray-900/60 p-6 md:p-8 rounded-3xl border border-gray-800">
        <p className="text-sm font-bold text-gray-300 mb-4">Step 2: Configure Pricing & Timings</p>

        {selectedMovie && (
          <div className="mb-6 p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-4">
            <img
              src={selectedMovie.poster}
              alt={selectedMovie.title}
              className="w-12 h-16 rounded-xl object-cover border border-primary/30"
            />
            <div>
              <span className="text-[10px] uppercase font-bold text-primary">Selected Movie</span>
              <h3 className="text-base font-bold text-white">{selectedMovie.title}</h3>
              <p className="text-xs text-gray-400">{selectedMovie.runtime} mins · {selectedMovie.language || 'English'}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Price */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">Base Ticket Price</label>
            <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 px-3.5 py-2.5 rounded-xl">
              <span className="text-primary font-bold text-sm">{currency}</span>
              <input
                type="number"
                min={1}
                value={showPrice}
                onChange={(e) => setShowPrice(e.target.value)}
                placeholder="12"
                className="w-full bg-transparent text-sm text-white outline-none"
              />
            </div>
          </div>

          {/* Date and Time Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">Add Show Date & Time</label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={dateTimeInput}
                onChange={(e) => setDateTimeInput(e.target.value)}
                className="flex-1 bg-gray-950 border border-gray-800 px-3 py-2 text-xs text-white rounded-xl outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleDateTimeAdd}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer border border-gray-700"
              >
                + Add Time
              </button>
            </div>
          </div>
        </div>

        {/* Selected Timings Pills */}
        {Object.keys(dateTimeSelection).length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-800">
            <h4 className="text-xs font-semibold text-gray-400 mb-3">Scheduled Slots</h4>
            <div className="space-y-3">
              {Object.entries(dateTimeSelection).map(([date, times]) => (
                <div key={date} className="bg-gray-950/60 p-3 rounded-2xl border border-gray-800/80">
                  <span className="text-xs font-bold text-white block mb-2">{date}</span>
                  <div className="flex flex-wrap gap-2">
                    {times.map((time) => (
                      <div
                        key={time}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/20 text-primary border border-primary/30 text-xs font-semibold"
                      >
                        <span>{time}</span>
                        <Trash2
                          onClick={() => handleRemoveTime(date, time)}
                          className="w-3.5 h-3.5 text-rose-400 hover:text-rose-600 cursor-pointer transition"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={addingShow || !selectedMovie}
          className="w-full sm:w-auto px-10 py-3 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl transition cursor-pointer disabled:opacity-50 mt-8 shadow-lg shadow-primary/30"
        >
          {addingShow ? 'Publishing Shows...' : 'Publish Shows To Cinema'}
        </button>
      </div>
    </div>
  );
};

export default AddShow;
