import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  Navigation,
  MapPin,
  Car,
  Clock,
  Compass,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";

// Haversine Distance formula in km
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
};

const LiveRouteTrackerModal = ({ isOpen, onClose, theater, userLocation }) => {
  // Use passed userLocation or fallback
  const initialLocation = useMemo(() => {
    return userLocation || { lat: 12.9716, lon: 77.5946 };
  }, [userLocation]);

  const [currentCoords, setCurrentCoords] = useState(initialLocation);
  const [speed, setSpeed] = useState(0); // km/h
  const [heading, setHeading] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [hasArrived, setHasArrived] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const watchIdRef = useRef(null);

  // Parse theater coordinates strictly
  const theaterLat = Number(theater?.lat) || 12.9345;
  const theaterLon = Number(theater?.lon) || 77.6200;

  // Sync initial location when modal opens
  useEffect(() => {
    if (userLocation) {
      setCurrentCoords(userLocation);
    }
  }, [userLocation, isOpen]);

  // Start Geolocation Watcher with Accuracy & Jump Protection Filter
  useEffect(() => {
    if (!isOpen) {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      setIsTracking(false);
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsTracking(true);
    toast.success("🛰️ Live GPS Tracker Active", { id: "live-gps" });

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const accuracy = pos.coords.accuracy; // meters
        setGpsAccuracy(Math.round(accuracy));

        // FILTER OUT COARSE IP JUMPS (e.g. accuracy > 5000 meters or wild >30km jumps)
        if (accuracy > 5000) {
          console.warn("Ignored coarse IP geolocation jump with low accuracy:", accuracy);
          return;
        }

        // Calculate distance from previous locked location
        const jumpDistance = currentCoords
          ? calculateDistanceKm(currentCoords.lat, currentCoords.lon, lat, lon)
          : 0;

        // If desktop browser jumps > 50km suddenly, reject the wild jump!
        if (jumpDistance > 50) {
          console.warn(`Rejected wild GPS jump of ${jumpDistance} km`);
          return;
        }

        const currentSpeed = pos.coords.speed
          ? Math.round(pos.coords.speed * 3.6) // m/s to km/h
          : 0;

        setCurrentCoords({ lat, lon });
        setSpeed(currentSpeed);
        if (pos.coords.heading) setHeading(pos.coords.heading);

        // Check if arrived (within 200m)
        const dist = calculateDistanceKm(lat, lon, theaterLat, theaterLon);
        if (dist !== null && dist < 0.2) {
          setHasArrived(true);
          toast.success("🎉 You have arrived at the theater!", { id: "arrived" });
        }
      },
      (err) => {
        console.warn("Live GPS watch warning:", err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 3000,
      }
    );

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isOpen, theaterLat, theaterLon]);

  if (!isOpen || !theater) return null;

  // Calculate clean distance
  const distanceKm = currentCoords
    ? calculateDistanceKm(currentCoords.lat, currentCoords.lon, theaterLat, theaterLon)
    : 4.8;
  const remainingEtaMins = distanceKm ? Math.max(1, Math.round(distanceKm * 2.5)) : 12;

  // Static Map Embed URL (Prevents iframe re-render wild jumping)
  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(currentCoords.lon, theaterLon) - 0.03}%2C${Math.min(currentCoords.lat, theaterLat) - 0.03}%2C${Math.max(currentCoords.lon, theaterLon) + 0.03}%2C${Math.max(currentCoords.lat, theaterLat) + 0.03}&layer=mapnik&marker=${theaterLat}%2C${theaterLon}`;

  const googleMapsNavUrl = `https://www.google.com/maps/dir/?api=1&origin=${currentCoords.lat},${currentCoords.lon}&destination=${theaterLat},${theaterLon}&travelmode=driving`;

  return (
    <div
      className="fixed inset-0 z-[170] flex items-center justify-center bg-black/85 backdrop-blur-lg p-4 animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 my-6 flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/90 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                Live GPS Route Tracker <span className="px-2 py-0.5 text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 rounded-md font-bold uppercase">LIVE</span>
              </h3>
              <p className="text-xs text-gray-400">Destination: {theater.name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition cursor-pointer active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">

          {/* Live Telemetry Cards */}
          <div className="grid grid-cols-3 gap-3">
            {/* Live Distance */}
            <div className="p-4 rounded-2xl bg-gray-950/80 border border-gray-800 text-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Distance
              </p>
              <p className="text-2xl font-extrabold text-white">
                {distanceKm} <span className="text-xs font-normal text-primary">km</span>
              </p>
            </div>

            {/* Live ETA */}
            <div className="p-4 rounded-2xl bg-gray-950/80 border border-gray-800 text-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Est. Time
              </p>
              <p className="text-2xl font-extrabold text-amber-400">
                {remainingEtaMins} <span className="text-xs font-normal text-amber-400/80">mins</span>
              </p>
            </div>

            {/* Live Speed */}
            <div className="p-4 rounded-2xl bg-gray-950/80 border border-gray-800 text-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Speed
              </p>
              <p className="text-2xl font-extrabold text-emerald-400">
                {speed} <span className="text-xs font-normal text-emerald-400/80">km/h</span>
              </p>
            </div>
          </div>

          {/* Live Map View */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-gray-800 bg-gray-950 shadow-inner">
            <iframe
              src={mapEmbedUrl}
              title={`Live Route Map to ${theater.name}`}
              className="w-full h-full border-0 filter opacity-90"
            />

            {/* Floating Live Telemetry Badge over Map */}
            <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Real-Time GPS Locked ({currentCoords.lat.toFixed(3)}, {currentCoords.lon.toFixed(3)})</span>
            </div>

            {hasArrived && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-fadeIn">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
                <h4 className="text-xl font-extrabold text-white">You Have Arrived!</h4>
                <p className="text-xs text-gray-300 mt-1 max-w-sm">
                  Welcome to {theater.name}. Present your E-Ticket QR code at the ticket scanner.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <a
              href={googleMapsNavUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <ExternalLink className="w-4 h-4" /> Start Google Maps Turn-by-Turn
            </a>

            <button
              onClick={onClose}
              className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Minimize Tracker
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-950 border-t border-gray-800 text-xs text-gray-400 flex items-center justify-between flex-shrink-0">
          <span>📡 Protected High-Accuracy GPS Watcher ({gpsAccuracy ? `±${gpsAccuracy}m` : "Locked"})</span>
          <span className="text-emerald-400 font-semibold">Active Watcher</span>
        </div>
      </div>
    </div>
  );
};

export default LiveRouteTrackerModal;
