import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sparkles, Utensils, Film, Ticket, Laugh, ShoppingBag, Waves, Gamepad2 } from "lucide-react";
import toast from "react-hot-toast";

export const DISTRICT_CATEGORIES = [
  { id: "for-you", label: "For You", icon: Sparkles, route: "/", badge: "Trending" },
  { id: "movies", label: "Movies", icon: Film, route: "/Movies", active: true },
  { id: "theaters", label: "Theaters", icon: Ticket, route: "/Theaters" },
  { id: "events", label: "Events", icon: Ticket, route: "/Releases", badge: "Live" },
  { id: "comedy", label: "Comedy", icon: Laugh, route: "/Movies?category=comedy", badge: "Standup" },
  { id: "dining", label: "Dining", icon: Utensils, route: "/Theaters", badge: "Food & Drinks" },
  { id: "stores", label: "Stores", icon: ShoppingBag, route: "/Movies" },
  { id: "activities", label: "Activities", icon: Waves, route: "/Theaters" },
  { id: "play", label: "Play", icon: Gamepad2, route: "/Releases" },
];

const DistrictCategoryBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="w-full bg-gray-950/80 border-b border-gray-800/80 backdrop-blur-md sticky top-20 z-40 px-4 md:px-16 lg:px-36 py-3 transition-all duration-300">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {DISTRICT_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive =
            location.pathname === cat.route ||
            (cat.id === "movies" && location.pathname.startsWith("/Movies"));

          return (
            <button
              key={cat.id}
              onClick={() => {
                navigate(cat.route);
                scrollTo(0, 0);
              }}
              className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all duration-300 flex items-center gap-2 cursor-pointer flex-shrink-0 active:scale-95 ${
                isActive
                  ? "bg-white text-gray-950 shadow-lg shadow-white/20 font-black border border-white"
                  : "bg-gray-900/90 text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-800"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-primary fill-primary/30" : "text-gray-400"}`} />
              <span>{cat.label}</span>
              {cat.badge && !isActive && (
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-primary/20 text-primary border border-primary/30 rounded-md">
                  {cat.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DistrictCategoryBar;
