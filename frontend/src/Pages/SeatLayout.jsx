import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assets } from '../assets/assets';
import Loading from '../Components/Loading';
import SeatHoldTimer from '../Components/SeatHoldTimer';
import {
  ArrowRightIcon,
  Clock10Icon,
  Sparkles,
  Calendar,
  Film,
  Tag,
  ArrowLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import isoTimeFormate from '../Lib/isoTimeFormate';
import BlurCircle from '../Components/BlurCircle';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import { io } from 'socket.io-client';

const SeatLayout = () => {
  const currency = import.meta.env.VITE_CURRENCY || "$";
  const groupRows = [["A", "B"], ["C", "D"], ["E", "F"], ["G", "H"], ["I", "J"]];
  const { id, date } = useParams();
  const navigate = useNavigate();

  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [show, setShow] = useState(null);
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const [liveSelectingSeats, setLiveSelectingSeats] = useState([]);
  const [isBooking, setIsBooking] = useState(false);

  const { axios, user, token, setIsAuthModalOpen } = useAppContext();
  const socketRef = useRef(null);

  // Initialize Socket.io connection for real-time seat sync
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_BASE_URL || "http://localhost:3001";
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on("seat:selecting", ({ seat }) => {
      setLiveSelectingSeats((prev) => [...new Set([...prev, seat])]);
    });

    socket.on("seat:released", ({ seat }) => {
      setLiveSelectingSeats((prev) => prev.filter((s) => s !== seat));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Join Socket.io room when showtime changes
  useEffect(() => {
    if (selectedTime?.showId && socketRef.current) {
      socketRef.current.emit("join:show", { showId: selectedTime.showId });
      return () => {
        socketRef.current.emit("leave:show", { showId: selectedTime.showId });
      };
    }
  }, [selectedTime]);

  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/show/${id}`);
      if (data.success) {
        setShow(data);
      } else {
        toast.error("Show not found");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch show details");
    }
  };

  const getOccupiedSeats = async () => {
    if (!selectedTime?.showId) return;
    try {
      const { data } = await axios.get(`/api/booking/seats/${selectedTime.showId}`);
      if (data.success) {
        setOccupiedSeats(data.occupiedSeats || []);
      } else {
        toast.error("Failed to fetch occupied seats");
      }
    } catch (error) {
      console.error("Error fetching occupied seats:", error);
    }
  };

  const calculateSeatPrice = (seatId) => {
    const row = seatId[0];
    const basePrice = selectedTime?.showPrice || 12;
    if (["A", "B", "C", "D"].includes(row)) return basePrice; // Standard
    if (["E", "F", "G", "H"].includes(row)) return basePrice + 4; // Premium
    return basePrice + 8; // VIP Recliner (I, J)
  };

  const getTotalPrice = () => {
    return selectedSeats.reduce((sum, seatId) => sum + calculateSeatPrice(seatId), 0);
  };

  const handleSeatClick = (seatId) => {
    if (!selectedTime) return toast("Please select a showtime first");
    if (!selectedSeats.includes(seatId) && selectedSeats.length >= 5) {
      return toast("Maximum 5 seats per transaction");
    }
    if (occupiedSeats.includes(seatId)) {
      return toast.error("This seat is already booked");
    }

    const isSelecting = !selectedSeats.includes(seatId);

    setSelectedSeats((prev) =>
      isSelecting ? [...prev, seatId] : prev.filter((seat) => seat !== seatId)
    );

    // Emit Socket.io real-time event to other users
    if (socketRef.current && selectedTime?.showId) {
      socketRef.current.emit(isSelecting ? "seat:selecting" : "seat:released", {
        showId: selectedTime.showId,
        seat: seatId,
        userId: user?.id,
      });
    }
  };

  const handleHoldExpire = () => {
    setSelectedSeats([]);
    toast.error("Seat reservation hold expired. Please reselect your seats.");
  };

  const bookTickets = async () => {
    try {
      if (!user || !token) {
        toast.error("Please log in to book tickets");
        setIsAuthModalOpen(true);
        return;
      }
      if (!selectedTime || selectedSeats.length === 0) {
        return toast.error("Please select a time and at least one seat");
      }

      setIsBooking(true);
      const { data } = await axios.post("/api/booking/create", {
        showId: selectedTime.showId,
        selectedSeats,
      });

      if (data.success && data.url) {
        window.location.href = data.url; // Redirect to Stripe Checkout
      } else {
        toast.error(data.message || "Failed to create booking");
      }
    } catch (error) {
      console.error("Error booking tickets:", error);
      toast.error(error.response?.data?.message || "Failed to book tickets");
    } finally {
      setIsBooking(false);
    }
  };

  // Helper to get timings for the selected date with timezone-safe fallbacks
  const getAvailableTimings = () => {
    if (!show?.dateTime) return [];

    // 1. Direct match by date key
    if (show.dateTime[date] && show.dateTime[date].length > 0) {
      return show.dateTime[date];
    }

    // 2. Fuzzy match across all date keys
    for (const [key, times] of Object.entries(show.dateTime)) {
      if (key === date || key.includes(date) || date?.includes(key)) {
        return times;
      }
    }

    // 3. Fallback: match by parsing item.time
    const allTimes = Object.values(show.dateTime).flat();
    const matched = allTimes.filter((item) => {
      const d1 = new Date(item.time).toISOString().split('T')[0];
      const d2 = new Date(item.time).toLocaleDateString('en-CA');
      return d1 === date || d2 === date;
    });
    if (matched.length > 0) return matched;

    // 4. Return all showtimes if date is broader
    return allTimes;
  };

  const availableTimings = getAvailableTimings();

  // Extract all available screening dates
  const getAvailableDatesList = () => {
    if (!show?.dateTime || Object.keys(show.dateTime).length === 0) {
      // Generate next 7 dates from today
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().split('T')[0]);
      }
      return dates;
    }

    const uniqueDates = Object.keys(show.dateTime).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
    return uniqueDates.length > 0 ? uniqueDates.sort() : Object.keys(show.dateTime);
  };

  const availableDates = getAvailableDatesList();

  const handleDateChange = (newDate) => {
    if (newDate === date) return;
    setSelectedSeats([]);
    setSelectedTime(null);
    navigate(`/movies/${id}/${newDate}`);
  };

  useEffect(() => {
    if (availableTimings.length > 0) {
      setSelectedTime(availableTimings[0]);
    }
  }, [show, date]);

  useEffect(() => {
    getShow();
  }, [id]);

  useEffect(() => {
    if (selectedTime) {
      getOccupiedSeats();
    }
  }, [selectedTime]);

  const renderSeats = (row, count = 9) => (
    <div key={row} className="flex gap-2 mt-2 items-center">
      <span className="w-4 text-xs font-bold text-gray-400">{row}</span>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: count }, (_, i) => {
          const seatId = `${row}${i + 1}`;
          const isSelected = selectedSeats.includes(seatId);
          const isOccupied = occupiedSeats.includes(seatId);
          const isLiveSelecting = liveSelectingSeats.includes(seatId);

          let seatStyle = "bg-gray-900 border-gray-700 text-gray-300 hover:border-primary/60";
          if (isSelected) seatStyle = "bg-primary text-white border-primary shadow-lg shadow-primary/40 scale-105";
          else if (isOccupied) seatStyle = "bg-gray-800 text-gray-600 border-gray-800 cursor-not-allowed opacity-40";
          else if (isLiveSelecting) seatStyle = "bg-amber-500/30 text-amber-300 border-amber-500 animate-pulse";

          return (
            <button
              key={seatId}
              disabled={isOccupied}
              onClick={() => handleSeatClick(seatId)}
              className={`h-8 w-8 rounded-lg text-xs font-semibold border transition-all duration-200 cursor-pointer flex items-center justify-center ${seatStyle}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );

  const movie = show?.movie;
  const formattedSelectedDate = date
    ? new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Selected Date';

  return show ? (
    <div className="min-h-screen pb-24 pt-24 md:pt-32 px-4 md:px-12 lg:px-24">
      
      {/* 🎬 Top Banner: Selected Movie & Details Header */}
      <div className="max-w-6xl mx-auto mb-8 bg-gray-900/90 border border-gray-800 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <BlurCircle top="-40px" right="-40px" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* Movie Thumbnail & Info */}
          <div className="flex items-center gap-4">
            <img
              src={movie?.poster || 'https://via.placeholder.com/150x220?text=Movie'}
              alt={movie?.title || 'Movie'}
              className="w-16 h-24 md:w-20 md:h-28 object-cover rounded-2xl shadow-lg border border-gray-800 shrink-0"
            />
            <div>
              <button
                onClick={() => navigate(`/movies/${id}`)}
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Movie Overview
              </button>
              
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                {movie?.title || 'Cinema Screening'}
              </h1>
              
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-400">
                {movie?.runtime && (
                  <span className="px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 font-mono">
                    {movie.runtime}m
                  </span>
                )}
                {movie?.genres && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                    {Array.isArray(movie.genres) ? movie.genres.slice(0, 2).join(' • ') : movie.genres}
                  </span>
                )}
                {movie?.vote_average ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    ★ {Number(movie.vote_average).toFixed(1)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Active Date & Time Badge */}
          <div className="flex items-center gap-3 bg-gray-950/80 border border-gray-800/80 p-3.5 rounded-2xl shrink-0">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Booking For</p>
              <p className="text-sm font-extrabold text-white">{formattedSelectedDate}</p>
              {selectedTime && (
                <p className="text-xs text-primary font-bold mt-0.5">
                  Slot: {isoTimeFormate(selectedTime.time)}
                </p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 📅 Interactive Date Switcher Bar (Change Date in 1-Click) */}
      <div className="max-w-6xl mx-auto mb-10 bg-gray-900/60 border border-gray-800 rounded-3xl p-4 md:p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-primary" />
            Change Screening Date
          </p>
          <span className="text-[11px] text-gray-500">Pick any date to load showtimes</span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          {availableDates.map((dateKey) => {
            const isSelectedDate = dateKey === date;
            const parsedDate = new Date(dateKey);
            const weekday = parsedDate.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = parsedDate.getDate();
            const monthStr = parsedDate.toLocaleDateString('en-US', { month: 'short' });

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => handleDateChange(dateKey)}
                className={`flex flex-col items-center justify-center py-2.5 px-4 min-w-[72px] rounded-2xl transition cursor-pointer font-bold border shrink-0 ${
                  isSelectedDate
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-105'
                    : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
                  {weekday}
                </span>
                <span className="text-lg font-black">{dayNum}</span>
                <span className="text-[10px] uppercase tracking-wider opacity-80">
                  {monthStr}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Seat Canvas & Showtimes */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-10">
        
        {/* Timing Sidebar */}
        <div className="w-full md:w-64 bg-gray-900/60 border border-gray-800 rounded-3xl p-6 h-max md:sticky md:top-32 shadow-xl shrink-0">
          <p className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock10Icon className="w-5 h-5 text-primary" />
            Select Showtime
          </p>
          
          <div className="space-y-2">
            {availableTimings.length > 0 ? (
              availableTimings.map((item, index) => {
                const isSelectedSlot = selectedTime?.time === item.time || selectedTime?.showId === item.showId;
                return (
                  <div
                    key={`${item.time}-${index}`}
                    onClick={() => {
                      setSelectedTime(item);
                      setSelectedSeats([]);
                    }}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl cursor-pointer transition border ${
                      isSelectedSlot
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/30"
                        : "bg-gray-800/40 border-gray-800 hover:border-gray-700 text-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock10Icon className="w-4 h-4" />
                      <p className="text-sm font-semibold">{isoTimeFormate(item.time)}</p>
                    </div>
                    <span className="text-xs font-bold font-mono">{currency}{item.showPrice || 12}</span>
                  </div>
                );
              })
            ) : (
              <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800 text-center text-xs text-gray-400">
                No shows scheduled for this date. Please pick another date above.
              </div>
            )}
          </div>

          {/* Pricing Tier Legend */}
          <div className="mt-8 pt-6 border-t border-gray-800 space-y-2 text-xs text-gray-400">
            <p className="font-semibold text-gray-300 mb-2">Seat Tiers</p>
            <div className="flex items-center justify-between">
              <span>Standard (A-D)</span>
              <span className="font-semibold text-white">{currency}{selectedTime?.showPrice || 12}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Premium (E-H)</span>
              <span className="font-semibold text-amber-400">{currency}{(selectedTime?.showPrice || 12) + 4}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-rose-400">
                <Sparkles className="w-3 h-3" /> VIP Recliner (I-J)
              </span>
              <span className="font-semibold text-rose-400">{currency}{(selectedTime?.showPrice || 12) + 8}</span>
            </div>
          </div>
        </div>

        {/* Main Seat Canvas */}
        <div className="relative flex-1 flex flex-col items-center">
          <BlurCircle top="-50px" left="-50px" />

          {/* 10-Minute Hold Timer Header */}
          <SeatHoldTimer active={selectedSeats.length > 0} onExpire={handleHoldExpire} />

          <h2 className="text-2xl font-black text-white mb-1">Choose Your Seats</h2>
          <p className="text-xs text-gray-400 mb-8">Click on seats to select (Max 5 per order)</p>

          {/* Realistic Curved Screen Graphic */}
          <div className="w-full max-w-xl mb-10 flex flex-col items-center">
            <div className="w-full h-3 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full shadow-[0_0_25px_rgba(248,69,101,0.8)]" />
            <p className="text-[10px] tracking-[0.3em] font-mono text-gray-500 mt-2 uppercase">
              CINEMA SCREEN THIS WAY
            </p>
          </div>

          {/* Seat Layout Grid */}
          <div className="flex flex-col items-center text-xs text-gray-300 bg-gray-950/60 p-6 md:p-8 rounded-3xl border border-gray-800/80 shadow-2xl overflow-x-auto max-w-full">
            <div className="space-y-1 mb-6">
              {groupRows[0].map((row) => renderSeats(row))}
            </div>
            <div className="space-y-1 mb-6">
              {groupRows.slice(1, 4).flatMap((g) => g).map((row) => renderSeats(row))}
            </div>
            <div className="space-y-1 pt-4 border-t border-rose-500/20">
              {groupRows[4].map((row) => renderSeats(row))}
            </div>
          </div>

          {/* Seat Color Guide */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400 mt-6">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-gray-900 border border-gray-700 inline-block" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-primary border border-primary inline-block" />
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-gray-800 opacity-40 border border-gray-800 inline-block" />
              <span>Booked</span>
            </div>
          </div>

          {/* Checkout Bar */}
          <div className="mt-10 w-full max-w-lg bg-gray-900 border border-gray-800 p-6 rounded-3xl flex items-center justify-between shadow-2xl">
            <div>
              <span className="text-xs text-gray-400 block">Total Payable</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{currency}{getTotalPrice()}</span>
                <span className="text-xs text-gray-500 font-semibold">({selectedSeats.length} seats)</span>
              </div>
            </div>

            <button
              onClick={bookTickets}
              disabled={isBooking || selectedSeats.length === 0}
              className={`flex items-center gap-2 px-8 py-3.5 text-sm rounded-full font-bold transition cursor-pointer shadow-lg ${
                isBooking || selectedSeats.length === 0
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90 text-white shadow-primary/30 active:scale-95"
              }`}
            >
              {isBooking ? "Reserving..." : "Proceed to Checkout"}
              {!isBooking && <ArrowRightIcon className="w-4 h-4" />}
            </button>
          </div>

        </div>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default SeatLayout;
