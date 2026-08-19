import React, { useState } from "react";
import { X, Navigation, Search, MapPin, Building2, Check } from "lucide-react";
import toast from "react-hot-toast";

// Popular Metro Cities with Icons/Thumbnails (District by Zomato Style)
export const POPULAR_CITIES = [
  { name: "Bengaluru", state: "Karnataka", icon: "🏰", label: "Bengaluru" },
  { name: "Mumbai", state: "Maharashtra", icon: "🏛️", label: "Mumbai" },
  { name: "Delhi NCR", state: "Delhi", icon: "🕌", label: "Delhi NCR" },
  { name: "Hyderabad", state: "Telangana", icon: "🏙️", label: "Hyderabad" },
  { name: "Chennai", state: "Tamil Nadu", icon: "🛕", label: "Chennai" },
  { name: "Kolkata", state: "West Bengal", icon: "🌉", label: "Kolkata" },
  { name: "Pune", state: "Maharashtra", icon: "🏢", label: "Pune" },
  { name: "Ahmedabad", state: "Gujarat", icon: "🕌", label: "Ahmedabad" },
  { name: "Goa", state: "Goa", icon: "🏖️", label: "Goa" },
  { name: "Chandigarh", state: "Punjab", icon: "🏛️", label: "Chandigarh" },
  { name: "Dubai", state: "UAE", icon: "🏙️", label: "Dubai" },
  { name: "Abu Dhabi", state: "UAE", icon: "🕌", label: "Abu Dhabi" },
];

// All Major Cities Organized Alphabetically
export const ALL_CITIES = [
  { name: "Abohar", state: "Punjab" },
  { name: "Abu Dhabi", state: "UAE" },
  { name: "Abu Road", state: "Rajasthan" },
  { name: "Achampet", state: "Telangana" },
  { name: "Adilabad", state: "Telangana" },
  { name: "Adipur", state: "Gujarat" },
  { name: "Agra", state: "Uttar Pradesh" },
  { name: "Ahmedabad", state: "Gujarat" },
  { name: "Ajmer", state: "Rajasthan" },
  { name: "Akola", state: "Maharashtra" },
  { name: "Aligarh", state: "Uttar Pradesh" },
  { name: "Allahabad", state: "Uttar Pradesh" },
  { name: "Alwar", state: "Rajasthan" },
  { name: "Ambala", state: "Haryana" },
  { name: "Amritsar", state: "Punjab" },
  { name: "Aurangabad", state: "Maharashtra" },
  { name: "Bengaluru", state: "Karnataka" },
  { name: "Bhopal", state: "Madhya Pradesh" },
  { name: "Bhubaneswar", state: "Odisha" },
  { name: "Chandigarh", state: "Punjab" },
  { name: "Chennai", state: "Tamil Nadu" },
  { name: "Coimbatore", state: "Tamil Nadu" },
  { name: "Dehradun", state: "Uttarakhand" },
  { name: "Delhi NCR", state: "Delhi" },
  { name: "Dubai", state: "UAE" },
  { name: "Faridabad", state: "Haryana" },
  { name: "Ghaziabad", state: "Uttar Pradesh" },
  { name: "Goa", state: "Goa" },
  { name: "Gurgaon", state: "Haryana" },
  { name: "Guwahati", state: "Assam" },
  { name: "Gwalior", state: "Madhya Pradesh" },
  { name: "Hyderabad", state: "Telangana" },
  { name: "Indore", state: "Madhya Pradesh" },
  { name: "Jaipur", state: "Rajasthan" },
  { name: "Jalandhar", state: "Punjab" },
  { name: "Jammu", state: "Jammu and Kashmir" },
  { name: "Jamshedpur", state: "Jharkhand" },
  { name: "Jodhpur", state: "Rajasthan" },
  { name: "Kanpur", state: "Uttar Pradesh" },
  { name: "Kochi", state: "Kerala" },
  { name: "Kolkata", state: "West Bengal" },
  { name: "Lucknow", state: "Uttar Pradesh" },
  { name: "Ludhiana", state: "Punjab" },
  { name: "Madurai", state: "Tamil Nadu" },
  { name: "Mangalore", state: "Karnataka" },
  { name: "Mumbai", state: "Maharashtra" },
  { name: "Mysore", state: "Karnataka" },
  { name: "Nagpur", state: "Maharashtra" },
  { name: "Nashik", state: "Maharashtra" },
  { name: "Noida", state: "Uttar Pradesh" },
  { name: "Patna", state: "Bihar" },
  { name: "Pune", state: "Maharashtra" },
  { name: "Raipur", state: "Chhattisgarh" },
  { name: "Rajkot", state: "Gujarat" },
  { name: "Ranchi", state: "Jharkhand" },
  { name: "Shimla", state: "Himachal Pradesh" },
  { name: "Surat", state: "Gujarat" },
  { name: "Thane", state: "Maharashtra" },
  { name: "Thiruvananthapuram", state: "Kerala" },
  { name: "Udaipur", state: "Rajasthan" },
  { name: "Vadodara", state: "Gujarat" },
  { name: "Varanasi", state: "Uttar Pradesh" },
  { name: "Vijayawada", state: "Andhra Pradesh" },
  { name: "Visakhapatnam", state: "Andhra Pradesh" },
];

const ALPHABETS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const LocationModal = ({ isOpen, onClose, selectedCity, onSelectCity }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLetter, setSelectedLetter] = useState("ALL");
  const [isLocating, setIsLocating] = useState(false);

  if (!isOpen) return null;

  // Handle GPS Auto Location Detection (Free Nominatim Geocoding API)
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    toast.loading("Detecting your location...", { id: "geo" });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Reverse geocode using OpenStreetMap Nominatim Free Public API
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
          );
          const data = await response.json();

          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.state_district ||
            data.address?.county ||
            "Bengaluru";
          const state = data.address?.state || "Karnataka";

          onSelectCity({ name: city, state });
          toast.success(`📍 Located: ${city}, ${state}`, { id: "geo" });
          onClose();
        } catch (err) {
          console.error("Geocoding error:", err);
          toast.error("Failed to resolve city name. Please select manually.", { id: "geo" });
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Location permission denied or unavailable.", { id: "geo" });
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  // Filter all cities based on search and A-Z index
  const filteredAllCities = ALL_CITIES.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.state.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLetter =
      selectedLetter === "ALL"
        ? true
        : item.name.toUpperCase().startsWith(selectedLetter);

    return matchesSearch && matchesLetter;
  });

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 my-6 max-h-[90vh] flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 bg-gray-950/90 flex-shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-extrabold text-white">Select Location</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition cursor-pointer active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Auto-Locate Bar */}
        <div className="p-6 space-y-4 border-b border-gray-800 bg-gray-900/90 flex-shrink-0">
          {/* Search Box */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="Search city, area or locality..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 focus:border-primary text-white text-sm pl-11 pr-4 py-3 rounded-2xl outline-none transition"
            />
          </div>

          {/* Use Current Location Button */}
          <button
            onClick={handleDetectLocation}
            disabled={isLocating}
            className="flex items-center gap-2.5 text-primary font-bold text-sm hover:text-primary-dull transition cursor-pointer active:scale-95"
          >
            <Navigation className={`w-4 h-4 fill-primary ${isLocating ? "animate-spin" : ""}`} />
            <span>Use Current Location</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Popular Cities Section */}
          {!searchQuery && selectedLetter === "ALL" && (
            <div>
              <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3">
                Popular Cities
              </h3>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {POPULAR_CITIES.map((city) => {
                  const isSelected = selectedCity?.name === city.name;
                  return (
                    <button
                      key={city.name}
                      onClick={() => {
                        onSelectCity({ name: city.name, state: city.state });
                        onClose();
                      }}
                      className={`p-3 rounded-2xl border transition duration-200 flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 ${
                        isSelected
                          ? "bg-primary/20 border-primary text-white shadow-lg shadow-primary/20 font-bold"
                          : "bg-gray-950/80 border-gray-800 text-gray-300 hover:border-gray-700 hover:text-white"
                      }`}
                    >
                      <span className="text-2xl mb-1">{city.icon}</span>
                      <span className="text-xs truncate w-full">{city.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Cities Alphabetical Filter Bar */}
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                All Cities
              </h3>

              {/* A to Z Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full py-1">
                <button
                  onClick={() => setSelectedLetter("ALL")}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition ${
                    selectedLetter === "ALL"
                      ? "bg-primary text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  ALL
                </button>
                {ALPHABETS.map((char) => (
                  <button
                    key={char}
                    onClick={() => setSelectedLetter(char)}
                    className={`px-1.5 py-0.5 text-[11px] font-bold rounded-md transition ${
                      selectedLetter === char
                        ? "bg-primary text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>

            {/* Cities Grid List */}
            {filteredAllCities.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No cities found matching "{searchQuery}"
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {filteredAllCities.map((item) => {
                  const isSelected = selectedCity?.name === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        onSelectCity({ name: item.name, state: item.state });
                        onClose();
                      }}
                      className={`px-3 py-2 rounded-xl text-xs text-left truncate transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-primary/20 text-primary font-bold border border-primary/40"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                    >
                      <span className="truncate">{item.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-950 border-t border-gray-800 text-xs text-gray-400 flex items-center justify-between flex-shrink-0">
          <span>📍 Selected: <strong className="text-white">{selectedCity?.name}, {selectedCity?.state}</strong></span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationModal;
