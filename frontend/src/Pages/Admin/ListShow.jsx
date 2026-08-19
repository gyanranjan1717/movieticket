import React, { useEffect, useState } from 'react';
import Loading from '../../Components/Loading';
import Title from '../../Components/Admin/Title';
import { dateFormate } from '../../Lib/dateFormate';
import { useAppContext } from '../../context/AppContext';
import { Film, PlusCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const ListShow = () => {
  const { axios, token } = useAppContext();

  const currency = import.meta.env.VITE_CURRENCY || '$';
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAllShows = async () => {
    setLoading(true);
    try {
      const activeToken = token || localStorage.getItem('token');
      if (!activeToken) {
        setLoading(false);
        return;
      }

      const { data } = await axios.get('/api/admin/all-shows', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      if (data.success) {
        setShows(data.shows || []);
      }
    } catch (err) {
      console.error("Error fetching shows:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllShows();
  }, [token]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <Title text1="List" text2="Shows" />
        <div className="flex items-center gap-3">
          <button
            onClick={getAllShows}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Link
            to="/admin/AddShow"
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-xl transition shadow-lg cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Add New Show
          </Link>
        </div>
      </div>

      {shows.length === 0 ? (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-12 text-center text-white my-6">
          <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Shows Created Yet</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
            You haven't scheduled any movie shows yet. Head over to Add Shows to select a movie and create screening slots.
          </p>
          <Link
            to="/admin/AddShow"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-medium px-6 py-2.5 rounded-xl transition"
          >
            <PlusCircle className="w-4 h-4" />
            Create Your First Show
          </Link>
        </div>
      ) : (
        <div className="max-w-5xl mt-6 overflow-x-auto bg-gray-900 border border-gray-800 rounded-2xl shadow-xl">
          <table className="w-full border-collapse text-left text-white">
            <thead>
              <tr className="bg-gray-800/80 border-b border-gray-700/60 text-xs uppercase tracking-wider text-gray-300">
                <th className="p-4 font-semibold pl-6">Movie Name</th>
                <th className="p-4 font-semibold">Show Time</th>
                <th className="p-4 font-semibold">Booked Seats</th>
                <th className="p-4 font-semibold">Ticket Price</th>
                <th className="p-4 font-semibold">Estimated Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm">
              {shows.map((show, index) => {
                const movieTitle = show.movie?.title || 'Untitled';
                const showTime = dateFormate(show.showDateTime);
                const totalBookings = Object.keys(show.occupiedSeats || {}).length;
                const price = show.showPrice || 0;
                const earnings = totalBookings * price;

                return (
                  <tr
                    key={index}
                    className="hover:bg-gray-800/50 transition duration-150"
                  >
                    <td className="p-4 pl-6 font-medium text-white flex items-center gap-3">
                      {show.movie?.poster && (
                        <img
                          src={show.movie.poster}
                          alt={movieTitle}
                          className="w-10 h-14 object-cover rounded-md"
                        />
                      )}
                      <span>{movieTitle}</span>
                    </td>
                    <td className="p-4 text-gray-300">{showTime}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                        {totalBookings} Seats
                      </span>
                    </td>
                    <td className="p-4 text-gray-300">{currency}{price}</td>
                    <td className="p-4 font-semibold text-emerald-400">
                      {currency}{earnings}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ListShow;
