import React, { useState, useEffect } from "react";
import { Clock, AlertCircle } from "lucide-react";

const SeatHoldTimer = ({ active, initialSeconds = 600, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  useEffect(() => {
    if (!active) {
      setTimeLeft(initialSeconds);
      return;
    }

    if (timeLeft <= 0) {
      if (onExpire) onExpire();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [active, timeLeft, initialSeconds, onExpire]);

  if (!active) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  const isUrgent = timeLeft < 120; // Less than 2 minutes

  return (
    <div
      className={`w-full py-3 px-6 rounded-2xl flex items-center justify-between transition-all duration-300 border shadow-lg mb-6 ${
        isUrgent
          ? "bg-red-950/70 border-red-500/50 text-red-200 animate-pulse"
          : "bg-primary/15 border-primary/40 text-white"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className={`w-5 h-5 ${isUrgent ? "text-red-400" : "text-primary"}`} />
        <span>Seats Held Temporary Reserve</span>
      </div>

      <div className="flex items-center gap-2 font-mono text-xl font-bold">
        <span>{formattedTime}</span>
        {isUrgent && <AlertCircle className="w-5 h-5 text-red-400" />}
      </div>
    </div>
  );
};

export default SeatHoldTimer;
