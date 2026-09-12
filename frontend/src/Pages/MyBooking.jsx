import React, { useEffect, useState } from 'react';
import Loading from '../Components/Loading';
import BlurCircle from '../Components/BlurCircle';
import timeformate from '../Lib/TimeFormate';
import { dateFormate } from '../Lib/dateFormate';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Ticket, Film, LogIn, ArrowRight, CheckCircle2, AlertCircle, RotateCcw, XCircle, ShieldCheck, Lock, X } from 'lucide-react';

const MyBooking = () => {
  const currency = import.meta.env.VITE_CURRENCY || '$';
  const { axios, token, user, setIsAuthModalOpen } = useAppContext();

  const [booking, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [otpModalBooking, setOtpModalBooking] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const handleInitiateCancel = async (bookingId, movieTitle, amount) => {
    setCancellingId(bookingId);
    try {
      const activeToken = token || localStorage.getItem("token");
      const { data } = await axios.post(`/api/booking/request-cancel-otp/${bookingId}`, {}, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      if (data.success) {
        setOtpModalBooking({
          bookingId,
          movieTitle,
          amount,
          emailMasked: data.emailMasked
        });
        setOtpInput('');
        toast.success(data.message || "Verification code sent to your email!");
      } else {
        toast.error(data.message || "Failed to initiate cancellation");
      }
    } catch (error) {
      console.error("Error requesting cancellation OTP:", error);
      toast.error(error.response?.data?.message || "Could not request verification code");
    } finally {
      setCancellingId(null);
    }
  };

  const handleVerifyCancelOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otpInput.trim() || otpInput.trim().length < 6) {
      return toast.error("Please enter the complete 6-digit verification code");
    }

    setIsVerifyingOtp(true);
    try {
      const activeToken = token || localStorage.getItem("token");
      const { data } = await axios.post('/api/booking/confirm-cancel-otp', {
        bookingId: otpModalBooking.bookingId,
        otp: otpInput.trim()
      }, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      if (data.success) {
        toast.success(data.message || "Ticket successfully cancelled & refunded!");
        setOtpModalBooking(null);
        await getMybooking();
      } else {
        toast.error(data.message || "Verification failed");
      }
    } catch (error) {
      console.error("Error confirming cancellation with OTP:", error);
      toast.error(error.response?.data?.message || "Invalid or expired verification code");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const getMybooking = async () => {
    setIsLoading(true);
    try {
      const activeToken = token || localStorage.getItem("token");

      if (!activeToken) {
        setIsLoading(false);
        return;
      }

      const { data } = await axios.get('/api/user/bookings', {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (data.success) {
        setBookings(data.bookings || []);
      } else {
        toast.error(data.message || "Could not load bookings");
      }
    } catch (error) {
      console.error("Error in getMybooking:", error.response?.data || error.message);
      toast.error("Failed to fetch bookings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getMybooking();
  }, [token]);

  if (isLoading) {
    return <Loading />;
  }

  // If user is not logged in
  if (!token && !localStorage.getItem("token")) {
    return (
      <div className="relative px-6 md:px-16 lg:px-40 pt-28 pb-20 min-h-[80vh] flex items-center justify-center">
        <BlurCircle top="100px" left="100px" />
        <BlurCircle bottom="50px" right="100px" />
        <div className="max-w-md w-full bg-gray-900/80 border border-gray-800 rounded-3xl p-8 text-center text-white shadow-2xl backdrop-blur-sm">
          <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Sign in to View Bookings</h2>
          <p className="text-gray-400 text-sm mb-6">
            Log in to your account to view all your confirmed movie tickets, seats, and booking histories.
          </p>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <LogIn className="w-4 h-4" />
            Sign In / Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-28 pb-20 min-h-[80vh] text-white">
      <BlurCircle top="100px" left="100px" />
      <BlurCircle bottom="50px" right="200px" />

      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <p className="text-gray-400 text-sm mt-1">Manage and view your confirmed cinema reservations</p>
        </div>
        <Link
          to="/movies"
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium px-4 py-2.5 rounded-xl transition"
        >
          <Film className="w-4 h-4" />
          Explore More Movies
        </Link>
      </div>

      {booking.length === 0 ? (
        <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-12 text-center text-white my-6 max-w-2xl mx-auto backdrop-blur-sm">
          <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Bookings Found</h3>
          <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
            You haven't reserved any movie tickets yet. Pick a movie now and secure your favorite seats!
          </p>
          <Link
            to="/movies"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-medium px-6 py-3 rounded-xl transition shadow-lg"
          >
            Browse Movies Now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {booking.map((item, index) => {
            const movie = item?.show?.movie;
            const showDateTime = item?.show?.showDateTime;
            const isPaid = item.isPaid !== false;

            if (!movie || !showDateTime) {
              return null;
            }

            const posterUrl =
              movie.poster ||
              movie.poster_path ||
              movie.backdrop ||
              "https://www.movienewz.com/img/films/poster-holder.jpg";

            return (
              <div
                key={item._id || index}
                className="bg-gray-900/80 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 transition duration-200 shadow-xl backdrop-blur-sm flex flex-col md:flex-row items-center gap-6 justify-between"
              >
                {/* Left: Poster & Info */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 w-full md:w-auto">
                  <img
                    src={posterUrl}
                    alt={movie.title}
                    className="w-24 h-36 object-cover rounded-xl shadow-md flex-shrink-0"
                  />
                  <div className="flex flex-col justify-between py-1 text-center sm:text-left">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{movie.title}</h3>
                      <p className="text-gray-400 text-xs mb-2">
                        {movie.runtime ? timeformate(movie.runtime) : "Standard Duration"} • {movie.language || "English"}
                      </p>
                      <p className="text-primary font-medium text-sm">
                        {dateFormate(showDateTime)}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="text-xs text-gray-400 font-medium">Seats:</span>
                      {item.bookedSeats?.map((seat) => (
                        <span
                          key={seat}
                          className="bg-primary/20 text-primary border border-primary/40 px-2.5 py-0.5 rounded-md text-xs font-bold"
                        >
                          {seat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Payment & Status */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full md:w-auto border-t md:border-t-0 border-gray-800 pt-4 md:pt-0 gap-3">
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-gray-400 block">Total Paid</span>
                    <span className="text-2xl font-bold text-emerald-400">
                      {currency}{item.amount || 0}
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {item.status === 'cancelled' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        <XCircle className="w-3.5 h-3.5" />
                        Cancelled & Refunded
                      </span>
                    ) : isPaid ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmed
                        </span>
                        {new Date(showDateTime) > new Date() && (
                          <button
                            onClick={() => handleInitiateCancel(item._id, movie.title, item.amount)}
                            disabled={cancellingId === item._id}
                            className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                          >
                            <RotateCcw className="w-3 h-3" />
                            {cancellingId === item._id ? "Sending Code..." : "Cancel & Refund"}
                          </button>
                        )}
                      </>
                    ) : item.paymentLink ? (
                      <a
                        href={item.paymentLink}
                        className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 py-2 rounded-xl transition"
                      >
                        Complete Payment
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Layer 4: Two-Step Email OTP Verification Modal */}
      {otpModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-700/80 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setOtpModalBooking(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-center mb-1">Security Verification</h3>
            <p className="text-gray-400 text-xs text-center mb-5">
              To protect your tickets, we dispatched a 6-digit security code to your registered email {otpModalBooking.emailMasked ? `(${otpModalBooking.emailMasked})` : ""}.
            </p>

            <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3.5 mb-5 text-xs text-gray-300">
              <div className="flex justify-between mb-1">
                <span className="text-gray-400">Movie:</span>
                <span className="font-semibold text-white">{otpModalBooking.movieTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Refund Amount:</span>
                <span className="font-bold text-emerald-400">{currency}{otpModalBooking.amount}</span>
              </div>
            </div>

            <form onSubmit={handleVerifyCancelOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 text-center">
                  Enter 6-Digit Verification Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full bg-gray-950 border border-gray-700 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-amber-400 placeholder:text-gray-600 outline-none transition"
                  />
                  <Lock className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[11px] text-gray-500 text-center mt-2">
                  ⏰ Code expires in 5 minutes. Check your inbox and spam folder.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOtpModalBooking(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium py-3 rounded-xl transition cursor-pointer"
                >
                  Keep Ticket
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingOtp || otpInput.length < 6}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isVerifyingOtp ? "Verifying..." : "Confirm & Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBooking;
