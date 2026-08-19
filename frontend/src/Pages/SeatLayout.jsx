import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assets } from '../assets/assets';
import Loading from '../Components/Loading';
import SeatHoldTimer from '../Components/SeatHoldTimer';
import { ArrowRightIcon, Clock10Icon, Sparkles } from 'lucide-react';
import isoTimeFormate from '../Lib/isoTimeFormate';
import BlurCircle from '../Components/BlurCircle';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import { io } from 'socket.io-client';

const SeatLayout = () => {
  const groupRows = [["A", "B"], ["C", "D"], ["E", "F"], ["G", "H"], ["I", "J"]];
  const { id, date } = useParams();
  const navigate = useNavigate();

  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [show, setShow] = useState(null);
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const [liveSelectingSeats, setLiveSelectingSeats] = useState([]); // Seats currently being clicked by other users in real time
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
    try {
      const { data } = await axios.get(`/api/booking/seats/${selectedTime.showId}`);
      if (data.success) {
        setOccupiedSeats(data.occupiedSeats);
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

  useEffect(() => {
    if (availableTimings.length > 0 && !selectedTime) {
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
          if (isSelected) seatStyle = "bg-primary text-white border-primary shadow-lg shadow-primary/40";
          else if (isOccupied) seatStyle = "bg-gray-800 text-gray-600 border-gray-800 cursor-not-allowed opacity-50";
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

  return show ? (
    <div className="flex flex-col md:flex-row px-6 md:px-16 lg:px-36 py-28 md:pt-40 gap-10">
      {/* Timing Sidebar */}
      <div className="w-full md:w-64 bg-gray-900/60 border border-gray-800 rounded-3xl p-6 h-max md:sticky md:top-32 shadow-xl">
        <p className="text-lg font-bold text-white mb-4">Select Showtime</p>
        <div className="space-y-2">
          {availableTimings.length > 0 ? (
            availableTimings.map((item, index) => (
              <div
                key={`${item.time}-${index}`}
                onClick={() => {
                  setSelectedTime(item);
                  setSelectedSeats([]);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition border ${
                  selectedTime?.time === item.time || selectedTime?.showId === item.showId
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/30"
                    : "bg-gray-800/40 border-gray-800 hover:border-gray-700 text-gray-300"
                }`}
              >
                <Clock10Icon className="w-4 h-4" />
                <p className="text-sm font-semibold">{isoTimeFormate(item.time)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No timings available</p>
          )}
        </div>

        {/* Pricing Tier Legend */}
        <div className="mt-8 pt-6 border-t border-gray-800 space-y-2 text-xs text-gray-400">
          <p className="font-semibold text-gray-300 mb-2">Seat Tiers</p>
          <div className="flex items-center justify-between">
            <span>Standard (A-D)</span>
            <span className="font-semibold text-white">${selectedTime?.showPrice || 12}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Premium (E-H)</span>
            <span className="font-semibold text-amber-400">${(selectedTime?.showPrice || 12) + 4}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-rose-400">
              <Sparkles className="w-3 h-3" /> VIP (I-J)
            </span>
            <span className="font-semibold text-rose-400">${(selectedTime?.showPrice || 12) + 8}</span>
          </div>
        </div>
      </div>

      {/* Main Seat Canvas */}
      <div className="relative flex-1 flex flex-col items-center">
        <BlurCircle top="-50px" left="-50px" />

        {/* 10-Minute Hold Timer Header */}
        <SeatHoldTimer active={selectedSeats.length > 0} onExpire={handleHoldExpire} />

        <h1 className="text-2xl font-bold text-white mb-2">Choose Your Seats</h1>
        <p className="text-xs text-gray-400 mb-8">Click seats to select (Max 5)</p>

        {/* Realistic Curved Screen Graphic */}
        <div className="w-full max-w-xl mb-10 flex flex-col items-center">
          <div className="w-full h-3 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full shadow-[0_0_25px_rgba(248,69,101,0.8)]" />
          <p className="text-[10px] tracking-[0.3em] font-mono text-gray-500 mt-2 uppercase">
            CINEMA SCREEN THIS WAY
          </p>
        </div>

        {/* Seat Layout Grid */}
        <div className="flex flex-col items-center text-xs text-gray-300 bg-gray-950/60 p-6 md:p-8 rounded-3xl border border-gray-800/80 shadow-2xl">
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

        {/* Checkout Bar */}
        <div className="mt-10 w-full max-w-md bg-gray-900 border border-gray-800 p-6 rounded-3xl flex items-center justify-between shadow-2xl">
          <div>
            <span className="text-xs text-gray-400 block">Total Amount</span>
            <span className="text-2xl font-bold text-white">${getTotalPrice()}</span>
            <span className="text-xs text-gray-500 ml-2">({selectedSeats.length} seats)</span>
          </div>

          <button
            onClick={bookTickets}
            disabled={isBooking || selectedSeats.length === 0}
            className={`flex items-center gap-2 px-8 py-3 text-sm rounded-full font-semibold transition cursor-pointer ${
              isBooking || selectedSeats.length === 0
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30"
            }`}
          >
            {isBooking ? "Reserving..." : "Proceed to Checkout"}
            {!isBooking && <ArrowRightIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default SeatLayout;
