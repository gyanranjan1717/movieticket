import React, { useEffect, useState } from 'react';
import Loading from '../../Components/Loading';
import Title from '../../Components/Admin/Title';
import { dateFormate } from '../../Lib/dateFormate';
import { useAppContext } from '../../context/AppContext';
import { Ticket, RefreshCw, Download, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ListBooking = () => {
  const { axios, token } = useAppContext();
  const currency = import.meta.env.VITE_CURRENCY || '$';

  const [booking, setBooking] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const getAllBooking = async () => {
    setIsLoading(true);
    try {
      const activeToken = token || localStorage.getItem('token');
      if (!activeToken) {
        setIsLoading(false);
        return;
      }

      const { data } = await axios.get('/api/admin/all-bookings', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (data.success) {
        setBooking(data.bookings || []);
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getAllBooking();
  }, [token]);

  const handleExportCSV = async () => {
    try {
      const activeToken = token || localStorage.getItem('token');
      const response = await axios.get('/api/admin/export-bookings', {
        headers: { Authorization: `Bearer ${activeToken}` },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `showtime_bookings_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('📊 CSV export downloaded!');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking and free the occupied seats?")) return;
    try {
      const activeToken = token || localStorage.getItem('token');
      const { data } = await axios.post('/api/admin/cancel-booking', { bookingId }, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      if (data.success) {
        toast.success("Booking cancelled and seats freed!");
        getAllBooking();
      }
    } catch (error) {
      toast.error("Failed to cancel booking");
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <Title text1="List" text2="Bookings" />
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-lg active:scale-95"
          >
            <Download className="w-4 h-4" />
            Export CSV Analysis
          </button>
          <button
            onClick={getAllBooking}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {booking.length === 0 ? (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-12 text-center text-white my-6">
          <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Bookings Yet</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            When customers book tickets for movies, their reservations, seat numbers, and transaction details will show up here.
          </p>
        </div>
      ) : (
        <div className="max-w-6xl mt-6 overflow-x-auto bg-gray-900 border border-gray-800 rounded-2xl shadow-xl">
          <table className="w-full border-collapse text-left text-white">
            <thead>
              <tr className="bg-gray-800/80 border-b border-gray-700/60 text-xs uppercase tracking-wider text-gray-300">
                <th className="p-4 font-semibold pl-6">Customer</th>
                <th className="p-4 font-semibold">Movie</th>
                <th className="p-4 font-semibold">Show Time</th>
                <th className="p-4 font-semibold">Reserved Seats</th>
                <th className="p-4 font-semibold">Amount Paid</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm">
              {booking.map((item, index) => {
                const userName = item.user?.name || item.user?.email || "Guest User";
                const userEmail = item.user?.email || "";
                const movieTitle = item.show?.movie?.title || "Untitled";
                const showDateTime = item.show?.showDateTime
                  ? dateFormate(item.show.showDateTime)
                  : "N/A";
                const amount = item.amount || 0;
                const isPaid = item.isPaid !== false;

                return (
                  <tr
                    key={index}
                    className="hover:bg-gray-800/50 transition duration-150"
                  >
                    <td className="p-4 pl-6">
                      <div className="font-medium text-white">{userName}</div>
                      {userEmail && <div className="text-xs text-gray-400">{userEmail}</div>}
                    </td>
                    <td className="p-4 font-medium text-white">{movieTitle}</td>
                    <td className="p-4 text-gray-300">{showDateTime}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {item.bookedSeats?.map((s) => (
                          <span
                            key={s}
                            className="bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded text-xs font-semibold"
                          >
                            {s}
                          </span>
                        )) || "N/A"}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-emerald-400">
                      {currency}{amount}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isPaid
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {isPaid ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <button
                        onClick={() => handleCancelBooking(item._id)}
                        className="p-2 text-rose-400 hover:text-white hover:bg-rose-600/30 rounded-lg transition cursor-pointer border border-rose-500/30"
                        title="Cancel Booking & Free Seats"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

export default ListBooking;
