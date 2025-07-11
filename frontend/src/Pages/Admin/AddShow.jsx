import React, { useEffect, useState } from 'react';
import { dummyDateTimeData, dummyShowsData } from '../../assets/assets';
import Loading from '../../Components/Loading';
import Title from '../../Components/Admin/Title';
import { CheckIcon, DeleteIcon, StarIcon } from 'lucide-react';
import { KConvertor } from '../../Lib/KConvertor';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const AddShow = () => {
  const { axios, getToken, user } = useAppContext();

  // const image_base_url = import.meta.env.VITE_TMDB_IMAGE_BASE_URL;
  const currency = import.meta.env.VITE_CURRENCY;

  const [nowPlayingMovies, setNowPlayingMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null); // spelling fixed
  const [dateTimeSelection, setDateTimeSelection] = useState({});
  const [dateTimeInput, setDateTimeInput] = useState('');
  const [showPrice, setShowPrice] = useState('');
  const [addingShow, setAddingShow] = useState(false);

  const fetchNowPlayingMovies = async () => {
   
    try {
      const token = await getToken();
      if (!token) return toast.error('Login expired. Please sign in again.');

      const { data } = await axios.get('/api/show/now-playing', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setNowPlayingMovies(data.movies);
      } else {
        toast.error(data.message || 'Failed to load movies');
      }
    } catch (error) {
      console.error('Error fetching movies:', error.message);
      toast.error('Something went wrong while loading movies.');
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
        toast.error('Missing required fields');
        setAddingShow(false);
        return;
      }

      const showsInput = Object.entries(dateTimeSelection).map(([date, time]) => ({
        date,
        time,
      }));

      const payload = {
        movieId: selectedMovie,
        showsInput,
        showPrice: Number(showPrice),
      };

      const token = await getToken();
      if (!token) return toast.error('Login expired. Please sign in again.');

      const { data } = await axios.post('/api/show/add', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        toast.success(data.message);
        setSelectedMovie(null);
        setDateTimeSelection({});
        setShowPrice('');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Submission Error:', error);
      toast.error('An error occurred. Please try again.');
    }
    setAddingShow(false);
  };

  useEffect(() => {
    if (user) {
      fetchNowPlayingMovies();
    }
  }, [user]);

  return nowPlayingMovies.length > 0 ? (
    <>
      <Title text1="ADD" text2="Shows" />
      <p className="mt-10 text-lg font-medium">Now Playing Movies</p>

      <div className="overflow-x-auto pb-4">
        <div className="group flex flex-wrap gap-4 mt-4 w-max">
          {nowPlayingMovies.map((movie) => {
            const posterUrl = movie.details?.posterLarge
              || movie.details?.poster
              || movie.poster_url
              || "https://www.movienewz.com/img/films/poster-holder.jpg";  // Ensure poster URL is set correctly
              
           return ( <div
              key={movie.id}
              onClick={() => setSelectedMovie(movie.id)}
              className={`relative max-w-40 cursor-pointer
              group-hover:not-hover:opacity-40 hover:-translate-y-1 transition duration-300`}
            >
              <div className="w-[185px] h-[275px] shadow-md relative rounded-lg overflow-hidden">
                <img
                  src={posterUrl}
                  alt={movie.title}
                  className="w-full h-full object-cover brightness-90"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />

        <div className="text-sm flex items-center justify-between
                  p-2 bg-black/70 w-full absolute bottom-0 left-0"
                >
                  <p className="flex items-center gap-1 text-gray-400">
                    <StarIcon className="w-4 h-4 text-primary fill-primary" />
                    {movie.vote_average !== undefined && movie.vote_average !== null
                      ? Number(movie.vote_average).toFixed(1)
                      : 'N/A'}
                  </p>
                  {/* <p className='text-gray-300'>
                    {KConvertor(movie.vote_count || 0)} Votes
                  </p> */}
                </div>
              </div>
                    
              {selectedMovie === movie.id && (
                <div className="absolute top-2 right-2 flex items-center justify-center bg-primary h-6 w-6 rounded">
                  <CheckIcon className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
              )}

              <p className="font-medium truncate">{movie.title}</p>
              <p className="text-gray-400 text-sm">{movie.release_date}</p>
            </div>
           );
})}
        </div>
      </div>
     
      {/* Show Price Input */}
      <div className="mt-8">
        <label className="block text-sm font-medium mb-2">Show Price</label>
        <div className="inline-flex items-center gap-2 border border-gray-600 px-3 py-2 rounded-md">
          <p className="text-gray-400 text-sm">{currency}</p>
          <input
            min={0}
            type="number"
            value={showPrice}
            onChange={(e) => setShowPrice(e.target.value)}
            placeholder="Enter Show Price"
            className="outline-none"
          />
        </div>
      </div>

      {/* Date and Time Selection */}
      <div className="mt-6">
        <label className="block text-sm font-medium mb-2">Select Date and Time</label>
        <div className="inline-flex gap-5 border border-gray-600 p-1 pl-3 rounded-lg">
          <input
            type="datetime-local"
            value={dateTimeInput}
            onChange={(e) => setDateTimeInput(e.target.value)}
          />
          <button
            onClick={handleDateTimeAdd}
            className="bg-primary/80 text-white px-3 py-2 text-sm rounded-lg hover:bg-primary cursor-pointer"
          >
            Add Time
          </button>
        </div>
      </div>

      {/* Display Selected Times */}
      {Object.keys(dateTimeSelection).length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2">Selected Date-Time</h2>
          <ul className="space-y-3">
            {Object.entries(dateTimeSelection).map(([date, times]) => (
              <li key={date}>
                <div className="font-medium">{date}</div>
                <div className="flex flex-wrap gap-2 mt-1 text-sm">
                  {times.map((time) => (
                    <div
                      key={time}
                      className="border border-primary px-2 flex items-center rounded"
                    >
                      <span>{time}</span>
                      <DeleteIcon
                        onClick={() => handleRemoveTime(date, time)}
                        width={15}
                        className="ml-2 text-red-500 hover:text-red-700 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={addingShow}
        className="bg-primary text-white px-8 py-2 mt-6 rounded hover:bg-primary/90 transition-all cursor-pointer"
      >
        Add Show
      </button>
    </>
  ) : (
    <Loading />
  );
};

export default AddShow;
