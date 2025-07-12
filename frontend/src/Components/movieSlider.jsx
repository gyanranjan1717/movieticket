import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Loading from "./Loading";
import { Link } from "react-router-dom";
import image1 from '../assets/image.png';
import BlurCircle from "./BlurCircle";
import { movies } from "../assets/assets";
import { assets } from "../assets/assets";
// const movies = [
//   { id: 1,year:2033, title: "Movie 1", image: image1 }, // ✅ now works as URL
//   { id: 2, title: "Movie 2", image: "https://i.pinimg.com/736x/14/27/58/1427586be74ac26b3a4979a7fd1ab52a.jpg" },
//   { id: 3, title: "Movie 3", image: "https://image.tmdb.org/t/p/original/4VFRn5xcD8o3qUMrSShm3I6zpfl.jpg" },
//   { id: 4, title: "Movie 4", image: "https://image.tmdb.org/t/p/original/9m00IVxGymmltmbYlWOyBAFCE9B.jpg" },
//   { id: 5, title: "Movie 5", image: "https://i.pinimg.com/736x/46/5e/e5/465ee5353c668ae6212977ff876be19d.jpg" },
// ];

export default function MovieSlider() {

  const [currentIndex, setCurrentIndex] = useState(0);
  const indexRef = useRef(currentIndex);

  // Keep ref updated
  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

 
  // Keyboard navigation
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
  }, [movies.length]);

  // Auto-slide every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) =>
        prev === movies.length - 1 ? 0 : prev + 1
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [movies.length]);

  if (movies.length === 0) {
  return(
    
  <Loading/>)

}



  return (
    <div className="w-screen h-screen flex items-center justify-center bg-black-800">
         <BlurCircle top="0" right="-80px" />
        <BlurCircle bottom="0" left="-80px"/>
      <div className="relative w-[90vw] overflow-visible">
        {/* Slide container */}
        <BlurCircle top="0" right="-80px" />
        <BlurCircle bottom="0" left="-80px"/>
        <div
          className="flex transition-transform duration-500"
          style={{
            transform: `translateX(-${currentIndex * 80}%)`,
          }}
        >
          {movies.map((movie, index) => (
  <div
    key={movie._id || index}
    className="w-[80%] mx-4 flex-shrink-0 rounded-xl overflow-hidden shadow-2xl transition-all duration-500"
    style={{
      transform: index === currentIndex ? "scale(1)" : "scale(0.9)",
      zIndex: index === currentIndex ? 10 : 5,
    }}
  >
    <div className="relative w-full h-[75vh] group rounded-xl overflow-hidden">
      <Link to={`/Movies`}>
        <img
          src={movie.backdrop_path}
          alt={movie.title}
          className="w-full h-full object-cover transition duration-700 ease-in-out group-hover:scale-105 brightness-[0.7] cursor-pointer"
        />
      </Link>

      {/* Overlay content */}
      <div className="absolute inset-0 flex flex-col justify-end p-8 bg-gradient-to-t from-black/80 via-black/60 to-transparent">
  {/* Individual Studio Logo */}
  {/* <img
    src={movie.studio_logo}
    alt={`${movie.title} Studio Logo`}
    className="max-h-11 lg:h-11 mt-20"
  /> */}

  <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-md">
    {movie.title}
  </h1>

  <p className="text-sm text-gray-300 mb-1">🎬 {movie.genres || "Action | Adventure"}</p>
  <p className="text-sm text-gray-300">
    📅 {movie.year || 2022} ⏱ {movie.time || "2h 10m"}
  </p>
  <p className='max-w-md text-gray-300 font-medium'>
        {movie.overview}
      </p>
  <Link
    to={`/Movies`}
    className="mt-4 self-start px-5 py-2 bg-white text-black text-sm rounded-full font-medium hover:bg-gray-200 transition"
  >
    Explore →
  </Link>
</div>

    </div>
  </div>
))}
</div>

        {/* Left Arrow */}
        <button
          onClick={() =>
            currentIndex > 0 && setCurrentIndex((prev) => prev - 1)
          }
          className="absolute z-10 left-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white text-3xl px-4 py-2 rounded-full"
        >
          <ArrowLeft className="w-8 h-8" />
        </button>

        {/* Right Arrow */}
        <button
          onClick={() =>
            currentIndex < movies.length - 1 &&
            setCurrentIndex((prev) => prev + 1)
          }
          className="absolute z-10 right-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white text-3xl px-4 py-2 rounded-full"
        >
          <ArrowRight className="w-8 h-8" />
        </button>
       {/* Dots Indicator */}
<div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
  {movies.map((_, index) => (
    <div
      key={index}
      className={`w-3 h-3 rounded-full ${
        index === currentIndex ? "bg-white" : "bg-gray-500"
      } transition duration-300`}
    />
  ))}
</div>

      </div>
    </div>
  );
}
