import React, { useState, useEffect } from "react";
import {
  Building2,
  MapPin,
  Sparkles,
  Volume2,
  Tv,
  Coffee,
  Clock,
  ChevronRight,
  ShieldCheck,
  Navigation,
  ExternalLink,
} from "lucide-react";
import { useAppContext } from "../context/AppContext";
import BlurCircle from "../Components/BlurCircle";
import { useNavigate } from "react-router-dom";
import LocationModal from "../Components/LocationModal";
import TheaterRouteModal from "../Components/TheaterRouteModal";
import LiveRouteTrackerModal from "../Components/LiveRouteTrackerModal";
import toast from "react-hot-toast";

const THEATER_DATA = [
  {
    id: "th-1",
    name: "ShowTime Grand IMAX Multiplex",
    city: "Bengaluru",
    address: "Koramangala 8th Block, Forum Mall",
    experience: "IMAX 3D Laser",
    screens: 8,
    lat: 12.9345,
    lon: 77.6200,
    amenities: ["IMAX 70mm Laser", "Dolby Atmos 128-ch", "VIP Plush Recliners", "Gourmet Dine-In"],
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "th-2",
    name: "PVR Inox Director's Cut Luxe",
    city: "Bengaluru",
    address: "Indiranagar, 100 Feet Road",
    experience: "Dolby Vision & Atmos",
    screens: 6,
    lat: 12.9784,
    lon: 77.6408,
    amenities: ["Dolby Vision HDR", "Full Reclining Seats", "Artisan Cocktails", "Valet Parking"],
    image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "th-3",
    name: "ShowTime 4DX Motion Arena",
    city: "Mumbai",
    address: "Bandra West, Linking Road",
    experience: "4DX Dynamic Motion",
    screens: 5,
    lat: 19.0600,
    lon: 72.8333,
    amenities: ["4DX Environmental Effects", "Surround Sound", "Star Lounges", "Wheelchair Accessible"],
    image: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "th-4",
    name: "Cinepolis VIP Luxe Multiplex",
    city: "Delhi NCR",
    address: "Saket District Centre, Select Citywalk",
    experience: "4K Laser & Atmos",
    screens: 7,
    lat: 28.5286,
    lon: 77.2188,
    amenities: ["4K Barco Laser", "Dolby Atmos", "Luxury Lounges", "Live Concessions"],
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: "th-5",
    name: "AMB Cinemas Superplex",
    city: "Hyderabad",
    address: "Gachibowli, Hitech City Road",
    experience: "VIP M-Screen & Laser",
    screens: 9,
    lat: 17.4401,
    lon: 78.3489,
    amenities: ["ScreenX 270-degree", "Dolby Atmos 3D", "Lounge Dining", "Recliner Seats"],
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80",
  },
];

const Theaters = () => {
  const { shows, selectedCity, changeCity } = useAppContext();
  const navigate = useNavigate();

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [isLiveTrackerOpen, setIsLiveTrackerOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedTheater, setSelectedTheater] = useState(THEATER_DATA[0]);
  const [nearbyCinemas, setNearbyCinemas] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);

  // Filter theaters based on selected city or show all
  const filteredTheaters = THEATER_DATA.filter(
    (t) => t.city.toLowerCase() === selectedCity?.name?.toLowerCase()
  );

  const displayTheaters = filteredTheaters.length > 0 ? filteredTheaters : THEATER_DATA;

  useEffect(() => {
    if (displayTheaters.length > 0) {
      setSelectedTheater(displayTheaters[0]);
    }
  }, [selectedCity]);

  // Query Real OpenStreetMap Overpass Public API for Nearby Cinemas
  const handleFindNearbyGPSCinemas = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLoadingNearby(true);
    toast.loading("Querying real cinemas near your GPS location...", { id: "gps-cinemas" });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lon: longitude });
          // Query Overpass API (Free public OpenStreetMap cinema query)
          const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node["amenity"="cinema"](around:25000,${latitude},${longitude});out;`;
          const res = await fetch(overpassUrl);
          const data = await res.json();

          if (data.elements && data.elements.length > 0) {
            const realCinemas = data.elements.slice(0, 6).map((el, index) => ({
              id: `real-${el.id}`,
              name: el.tags.name || `Cinema ${index + 1}`,
              address: el.tags["addr:street"] || el.tags["addr:city"] || "Nearby Theater Venue",
              lat: el.lat,
              lon: el.lon,
              experience: "Real Local Theater",
              screens: 4,
              amenities: ["Surround Sound", "Online Ticketing", "Parking"],
              image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80",
            }));

            setNearbyCinemas(realCinemas);
            setSelectedTheater(realCinemas[0]);
            toast.success(`Found ${realCinemas.length} real cinemas near your GPS!`, { id: "gps-cinemas" });
          } else {
            toast.error("No OpenStreetMap cinemas registered within 25km radius.", { id: "gps-cinemas" });
          }
        } catch (err) {
          console.error("Overpass API error:", err);
          toast.error("Failed to query OpenStreetMap. Showing partner multiplexes.", { id: "gps-cinemas" });
        } finally {
          setLoadingNearby(false);
        }
      },
      (error) => {
        toast.error("GPS location permission denied.", { id: "gps-cinemas" });
        setLoadingNearby(false);
      }
    );
  };

  return (
    <div className="min-h-screen px-6 md:px-16 lg:px-36 pt-28 md:pt-36 pb-20 text-white relative">
      <BlurCircle top="50px" left="-100px" />
      <BlurCircle top="500px" right="-100px" />

      {/* Location Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        selectedCity={selectedCity}
        onSelectCity={changeCity}
      />

      {/* Theater Route & Navigation Modal */}
      <TheaterRouteModal
        isOpen={isRouteModalOpen}
        onClose={() => setIsRouteModalOpen(false)}
        theater={selectedTheater}
        userLocation={userLocation}
      />

      {/* Live Rapido-Style GPS Route Tracker Modal */}
      <LiveRouteTrackerModal
        isOpen={isLiveTrackerOpen}
        onClose={() => setIsLiveTrackerOpen(false)}
        theater={selectedTheater}
        userLocation={userLocation}
      />

      {/* Header */}
      <div className="max-w-4xl mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
          <Building2 className="w-3.5 h-3.5" /> World-Class Multiplexes & Real GPS Locations
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Find Theaters in <span className="text-primary">{selectedCity?.name}</span>
        </h1>
        <p className="text-gray-400 mt-3 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          Select your city or auto-detect your location to find real-time multiplexes, IMAX 4K Laser screens, and Dolby Atmos theaters near you.
        </p>

        {/* Location & GPS Action Buttons */}
        <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-xl text-xs font-bold text-white transition cursor-pointer flex items-center gap-2 shadow-lg active:scale-95"
          >
            <MapPin className="w-4 h-4 text-primary" />
            <span>Change City ({selectedCity?.name}, {selectedCity?.state})</span>
          </button>

          <button
            onClick={handleFindNearbyGPSCinemas}
            disabled={loadingNearby}
            className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg shadow-primary/30 active:scale-95"
          >
            <Navigation className={`w-4 h-4 ${loadingNearby ? "animate-spin" : ""}`} />
            <span>Find Real Nearby Cinemas (GPS)</span>
          </button>
        </div>
      </div>

      {/* Experience Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
        <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-2xl flex items-center gap-4 backdrop-blur-md">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">IMAX 3D Laser</h4>
            <p className="text-xs text-gray-400 mt-0.5">Crystal clear 4K visuals</p>
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-2xl flex items-center gap-4 backdrop-blur-md">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Volume2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">Dolby Atmos</h4>
            <p className="text-xs text-gray-400 mt-0.5">128-channel spatial sound</p>
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-2xl flex items-center gap-4 backdrop-blur-md">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">VIP Recliner Club</h4>
            <p className="text-xs text-gray-400 mt-0.5">Motorized heated seats</p>
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-2xl flex items-center gap-4 backdrop-blur-md">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Coffee className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">In-Seat Dining</h4>
            <p className="text-xs text-gray-400 mt-0.5">Gourmet chef menu delivery</p>
          </div>
        </div>
      </div>

      {/* Main Theaters & Schedule Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Theaters List */}
        <div className="lg:col-span-5 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Cinemas in {selectedCity?.name} ({nearbyCinemas.length > 0 ? nearbyCinemas.length : displayTheaters.length})
          </p>

          {(nearbyCinemas.length > 0 ? nearbyCinemas : displayTheaters).map((theater) => {
            const isSelected = selectedTheater?.id === theater.id;

            return (
              <div
                key={theater.id}
                onClick={() => setSelectedTheater(theater)}
                className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? "bg-gradient-to-r from-primary/20 via-gray-900 to-gray-900 border-primary shadow-xl"
                    : "bg-gray-900/60 border-gray-800 hover:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-4">
                  <img
                    src={theater.image}
                    alt={theater.name}
                    className="w-16 h-16 rounded-xl object-cover border border-gray-800"
                  />
                  <div>
                    <h3 className="font-bold text-sm text-white">{theater.name}</h3>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-primary" /> {theater.address}
                    </p>
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                      {theater.experience}
                    </span>
                  </div>
                </div>

                <ChevronRight
                  className={`w-5 h-5 transition-transform ${
                    isSelected ? "text-primary translate-x-1" : "text-gray-600"
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Selected Theater Showcase & Today's Shows */}
        <div className="lg:col-span-7 bg-gray-900/70 border border-gray-800 rounded-3xl p-6 md:p-8 backdrop-blur-md">
          {selectedTheater ? (
            <div>
              {/* Theater Banner */}
              <div className="relative h-48 rounded-2xl overflow-hidden mb-6 border border-gray-800">
                <img
                  src={selectedTheater.image}
                  alt={selectedTheater.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 flex-wrap">
                  <div>
                    <span className="px-3 py-1 bg-primary text-white text-xs font-extrabold rounded-full">
                      {selectedTheater.experience}
                    </span>
                    <h2 className="text-2xl font-bold text-white mt-2">{selectedTheater.name}</h2>
                    <p className="text-xs text-gray-300 mt-1">{selectedTheater.address}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsRouteModalOpen(true)}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/30 active:scale-95"
                    >
                      <Navigation className="w-4 h-4 fill-white" /> Show Route
                    </button>

                    <button
                      onClick={() => setIsLiveTrackerOpen(true)}
                      className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-primary/30 active:scale-95"
                    >
                      <Navigation className="w-4 h-4 fill-white animate-pulse" /> Live Tracker
                    </button>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="mb-8">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Hall Amenities
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedTheater.amenities.map((amenity, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-xl bg-gray-800/80 border border-gray-700 text-xs font-medium text-gray-300 flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" /> {amenity}
                    </span>
                  ))}
                </div>
              </div>

              {/* Today's Screenings */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" /> Today's Showtimes at this Venue
                  </p>
                </div>

                {shows.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4">No active shows scheduled for today</p>
                ) : (
                  <div className="space-y-3">
                    {shows.map((showItem) => (
                      <div
                        key={showItem._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gray-950/50 border border-gray-800/80"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={showItem.movie.poster}
                            alt={showItem.movie.title}
                            className="w-12 h-16 rounded-lg object-cover border border-gray-800"
                          />
                          <div>
                            <h4 className="font-bold text-sm text-white">{showItem.movie.title}</h4>
                            <p className="text-xs text-gray-400">
                              {showItem.movie.language || "English"} ·{" "}
                              {Array.isArray(showItem.movie.genres)
                                ? showItem.movie.genres.join(", ")
                                : showItem.movie.genres}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            navigate(`/movies/${showItem.movie._id}`);
                            scrollTo(0, 0);
                          }}
                          className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-primary/20 text-center"
                        >
                          Book Seats
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-500">Select a theater to view details</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Theaters;
