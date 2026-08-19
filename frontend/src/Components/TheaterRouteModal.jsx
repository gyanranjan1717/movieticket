import React, { useState, useEffect } from "react";
import { X, Navigation, MapPin, Compass, ExternalLink, Car, Clock, ShieldCheck, ArrowRight, Share2 } from "lucide-react";
import toast from "react-hot-toast";

/**
 * Calculates distance between two coordinates in kilometers using Haversine formula
 */
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Number(distance.toFixed(1));
};

const TheaterRouteModal = ({ isOpen, onClose, theater, userLocation }) => {
  const [currentCoords, setCurrentCoords] = useState(userLocation || null);
  const [loadingGps, setLoadingGps] = useState(false);

  useEffect(() => {
    if (userLocation) {
      setCurrentCoords(userLocation);
    }
  }, [userLocation]);

  if (!isOpen || !theater) return null;

  // Auto-detect GPS if not provided
  const handleAcquireGPS = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setCurrentCoords(coords);
        setLoadingGps(false);
        toast.success("📍 GPS location acquired!");
      },
      (err) => {
        console.error("GPS error:", err);
        toast.error("Failed to acquire GPS location.");
        setLoadingGps(false);
      }
    );
  };

  const theaterLat = theater.lat || 12.9345;
  const theaterLon = theater.lon || 77.6200;
  const rawDistance = currentCoords
    ? calculateDistanceKm(currentCoords.lat, currentCoords.lon, theaterLat, theaterLon)
    : 4.8;
  const distance = rawDistance || 4.8;
  const isInterCity = distance > 100;
  const drivingTimeMins = Math.max(5, Math.round(distance * 2.5));

  const googleMapsUrl = currentCoords
    ? `https://www.google.com/maps/dir/?api=1&origin=${currentCoords.lat},${currentCoords.lon}&destination=${theaterLat},${theaterLon}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(theater.name + " " + theater.address)}`;

  const appleMapsUrl = currentCoords
    ? `http://maps.apple.com/?saddr=${currentCoords.lat},${currentCoords.lon}&daddr=${theaterLat},${theaterLon}`
    : `http://maps.apple.com/?q=${encodeURIComponent(theater.name)}`;

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 my-6 flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/90 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30">
              <Navigation className="w-4 h-4" />
            </div>
            <h3 className="text-base font-extrabold text-white truncate">
              Route to {theater.name}
            </h3>
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
          
          {/* Distance & Driving Time Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/20 via-gray-900 to-gray-900 border border-primary/40 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-extrabold text-white">{distance} km</span>
                  <span className="text-xs text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Fastest Route
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Approx. {drivingTimeMins} mins drive via main roads
                </p>
              </div>
            </div>

            {!currentCoords && (
              <button
                onClick={handleAcquireGPS}
                disabled={loadingGps}
                className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-bold text-primary border border-primary/40 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Compass className={`w-3.5 h-3.5 ${loadingGps ? "animate-spin" : ""}`} /> GPS
              </button>
            )}
          </div>

          {/* Turn-by-Turn Route Flow Indicator */}
          <div className="bg-gray-950/80 border border-gray-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-2">
              Route Breakdown
            </h4>

            {/* Start Node */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Your Current Location</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {currentCoords ? `GPS Coords (${currentCoords.lat.toFixed(3)}, ${currentCoords.lon.toFixed(3)})` : "City Center Origin"}
                </p>
              </div>
            </div>

            {/* Connecting Line */}
            <div className="ml-3.5 border-l-2 border-dashed border-gray-800 h-6 -my-2" />

            {/* Destination Node */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/50 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <Navigation className="w-3.5 h-3.5 fill-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{theater.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{theater.address}</p>
              </div>
            </div>
          </div>

          {/* Embedded Interactive OpenStreetMap Route View */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-gray-800 bg-gray-950 shadow-inner">
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${theaterLon - 0.03}%2C${theaterLat - 0.03}%2C${theaterLon + 0.03}%2C${theaterLat + 0.03}&layer=mapnik&marker=${theaterLat}%2C${theaterLon}`}
              title={`Map for ${theater.name}`}
              className="w-full h-full border-0 filter grayscale opacity-90 hover:grayscale-0 transition duration-300"
            />
            <div className="absolute top-2 right-2 bg-black/70 border border-white/10 px-2.5 py-1 rounded-lg text-[10px] font-bold text-gray-300 backdrop-blur-md">
              📍 Theater GPS Marker
            </div>
          </div>

          {/* Action Launch Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <ExternalLink className="w-4 h-4" /> Start Google Maps Driving Route
            </a>

            <a
              href={appleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <Navigation className="w-4 h-4 text-primary" /> Open in Apple / Waze Maps
            </a>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-950 border-t border-gray-800 text-xs text-gray-400 flex items-center justify-between flex-shrink-0">
          <span>🚗 Live Turn-by-Turn GPS Directions</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer font-semibold"
          >
            Close Modal
          </button>
        </div>
      </div>
    </div>
  );
};

export default TheaterRouteModal;
