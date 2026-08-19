import React, { useState } from 'react';
import BlurCircle from './BlurCircle';
import { ChevronLeftIcon, ChevronRightIcon, Bell, Check, Film } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const DateSelect = ({ dateTime, id, movieTitle }) => {
  const Navigate = useNavigate();
  const { user, axios, setIsAuthModalOpen } = useAppContext();
  const [selected, setSelected] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const onBookHandler = () => {
    if (!selected) {
      return toast.error('Please select a date');
    }
    Navigate(`/movies/${id}/${selected}`);
    scrollTo(0, 0);
  };

  const handleRemindMe = async () => {
    if (!user) {
      toast.error('Please login to set a movie reminder');
      setIsAuthModalOpen(true);
      return;
    }
    try {
      const { data } = await axios.post('/api/user/toggle-reminder', {
        movieId: id ? id.toString() : 'movie_remind',
        movieTitle: movieTitle || 'Movie',
      });
      if (data.success) {
        setIsSubscribed(data.subscribed);
        toast.success(data.message);
      }
    } catch (err) {
      toast.error('Failed to set reminder');
    }
  };

  // If no screening showtimes are available for this movie (Catalog Reference Movie)
  if (!dateTime || Object.keys(dateTime).length === 0) {
    return (
      <div id='dateSelect' className='pt-12'>
        <div className='flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-gray-900/90 border border-gray-800 rounded-2xl relative overflow-hidden shadow-2xl'>
          <BlurCircle top='-50px' left='-50px' />
          <div>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold rounded-full mb-2 inline-block">
              📖 Catalog Reference Movie
            </span>
            <h3 className='text-xl font-bold text-white mt-1 flex items-center gap-2'>
              <Film className="w-5 h-5 text-amber-400" /> Screening Showtimes Opening Soon
            </h3>
            <p className='text-gray-400 text-sm mt-1 max-w-lg leading-relaxed'>
              This movie is currently in our global cinema catalog. Set a reminder now to receive an automated email notification as soon as tickets open!
            </p>
          </div>

          <button
            onClick={handleRemindMe}
            className={`px-6 py-3 rounded-xl font-extrabold text-sm transition cursor-pointer flex items-center gap-2 active:scale-95 shadow-lg flex-shrink-0 ${
              isSubscribed
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-primary hover:bg-primary/90 text-white shadow-primary/30'
            }`}
          >
            {isSubscribed ? <Check className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            {isSubscribed ? 'Reminder Active!' : 'Remind Me When Tickets Open'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id='dateSelect' className='pt-12'>
      <div className='flex flex-col md:flex-row items-center justify-between
        gap-10 relative p-8 bg-primary/10 border border-primary/20 rounded-2xl shadow-xl'>
        <BlurCircle top='-100px' left='-100px' />
        <BlurCircle top='100px' right='0px' />

        <div>
          <p className='text-lg font-bold text-white'>Choose Screening Date</p>
          <div className='flex items-center gap-6 text-sm mt-5'>
            <ChevronLeftIcon className="w-6 h-6 text-gray-400" />
            <span className='grid grid-cols-3 md:flex flex-wrap md:max-w-lg gap-4'>
              {Object.keys(dateTime).map((date) => (
                <button
                  key={date}
                  onClick={() => setSelected(date)}
                  className={`
                    flex flex-col items-center justify-center h-14 w-14 aspect-square rounded-xl cursor-pointer font-bold transition duration-200
                    ${selected === date
                      ? 'bg-primary text-white shadow-lg shadow-primary/40 scale-105'
                      : 'bg-gray-900 border border-primary/50 text-gray-300 hover:border-primary'}
                  `}
                >
                  <span className="text-base">{new Date(date).getDate()}</span>
                  <span className="text-[10px] uppercase font-semibold text-gray-400">{new Date(date).toLocaleDateString('en-US', { month: 'short' })}</span>
                </button>
              ))}
            </span>
            <ChevronRightIcon className="w-6 h-6 text-gray-400" />
          </div>
        </div>

        <button
          className='bg-primary text-white font-extrabold px-8 py-3.5 rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-lg shadow-primary/30 active:scale-95'
          onClick={onBookHandler}
        >
          Book Now
        </button>
      </div>
    </div>
  );
};

export default DateSelect;
