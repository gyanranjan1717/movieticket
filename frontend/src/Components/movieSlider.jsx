import React, { useEffect, useState, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import BlurCircle from "./BlurCircle";
import Loading from "./Loading";
import { movies } from "../assets/assets"; // Ensure each movie has `logo`, `title`, `genres`, etc.

export default function MovieSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const indexRef = useRef(currentIndex);

  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight" && indexRef.current < movies.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else if (e.key === "ArrowLeft" && indexRef.current > 0) {
        setCurrentIndex((prev) => prev - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) =>
        prev === movies.length - 1 ? 0 : prev + 1
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!movies.length) return <Loading />;

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black text-white relative overflow-hidden">
      <BlurCircle top="0" right="-80px" />
      <BlurCircle bottom="0" left="-80px" />

      <div className="relative w-[90vw] overflow-visible">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * 80}%)`,
          }}
        >
          {movies.map((movie, index) => (
            <div
              key={movie._id || index}
              className={`w-[80%] mx-4 flex-shrink-0 rounded-2xl overflow-hidden 
              transition-all duration-700 transform shadow-[0_10px_40px_rgba(0,0,0,0.6)] 
              ${index === currentIndex ? "scale-100" : "scale-95 opacity-70"} group`}
              style={{ zIndex: index === currentIndex ? 10 : 5 }}
            >
              <div className="relative w-full h-[75vh] rounded-xl overflow-hidden">
                <Link to={`/Movies`}>
                  <img
                    src={movie.backdrop_path}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-105 rounded-xl cursor-pointer"
                  />
                </Link>

                {/* Overlay Info */}
                <div className="absolute inset-0 flex flex-col justify-end p-8 
                  bg-gradient-to-t from-black/40 via-black/20 to-transparent 
                  transition-all duration-500">
                  
                  {/* Studio Logo */}
                  {movie.logo && (
                    <div className="mb-4 p-[2px] bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500 rounded-full inline-block animate-pulse">
                      <img
                        src={movie.logo}
                        alt={`${movie.title} Logo`}
                        className="h-10 w-auto rounded-full bg-black p-1"
                      />
                    </div>
                  )}

                  <h1 className="text-4xl font-extrabold text-white mb-2 drop-shadow-lg tracking-wide">
                    {movie.title}
                  </h1>
                  <div className="flex flex-col gap-1 text-sm text-gray-300 font-medium">
                    <p>🎬 {movie.genres || "Action | Adventure"}</p>
                    <p>📅 {movie.year || 2022} ⏱ {movie.time || "2h 10m"}</p>
                  </div>
                  <p className="mt-2 text-gray-200 text-sm max-w-xl line-clamp-3">
                    {movie.overview}
                  </p>
                  <Link
                    to={`/Movies`}
                    className="mt-5 px-6 py-2 bg-white text-black text-sm font-bold rounded-full 
                      hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 
                      hover:text-white transition-all shadow-md hover:shadow-2xl hover:-translate-y-1"
                  >
                    Explore →
                  </Link>
                </div>

                {/* Animated Bottom Line */}
                <div className="absolute bottom-0 left-0 w-full h-1 
                  bg-gradient-to-r from-pink-500 via-yellow-400 to-blue-500 
                  animate-[pulse_4s_ease-in-out_infinite] shadow-inner shadow-white/20" />
              </div>
            </div>
          ))}
        </div>

        {/* Arrows */}
        <button
          onClick={() =>
            currentIndex > 0 && setCurrentIndex((prev) => prev - 1)
          }
          className="absolute z-10 left-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:scale-110 transition"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() =>
            currentIndex < movies.length - 1 &&
            setCurrentIndex((prev) => prev + 1)
          }
          className="absolute z-10 right-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:scale-110 transition"
        >
          <ArrowRight className="w-6 h-6" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4">
          {movies.map((_, index) => (
            <div
              key={index}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-white animate-pulse scale-110 shadow-lg"
                  : "bg-gray-400 opacity-40"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
