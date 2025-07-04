import { StarIcon } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import timeformate from '../Lib/TimeFormate';

const MovieCard = ({ movie }) => {
  const Navigate = useNavigate();

  // Safely get a high-res image or fallback
  const posterUrl = movie?.poster
    ? movie.poster.replace(/_w\d+/, "_w780")
    : movie?.backdrop_path || "/collection.jpg";

  const genreText = Array.isArray(movie?.genres)
    ? movie.genres
        .slice(0, 2)
        .map(genre => (typeof genre === "string" ? genre : genre.name))
        .join(" | ")
    : "Unknown Genre";

  const releaseYear = movie?.release_date
    ? new Date(movie.release_date).getFullYear()
    : "N/A";

  return (
    <div className='flex flex-col justify-between p-3 bg-gray-800
      rounded-2xl hover:-translate-y-1 transition duration-300 w-64'>
      
      <img
        onClick={() => Navigate(`/Movies/${movie._id}`)}
        src={posterUrl}
        alt={movie.title || "Movie Poster"}
        className='rounded-lg h-52 w-full object-cover object-center cursor-pointer'
      />

      <p className='font-semibold mt-2 truncate'>
        {movie.title || "Untitled"}
      </p>

      <p className='text-sm text-gray-400 mt-2'>
        {releaseYear} · {genreText} · {movie.runtime ? timeformate(movie.runtime) : "N/A"}
      </p>

      <div className='flex items-center justify-between mt-4 pb-3'>
        <button
          onClick={() => Navigate(`/Movies/${movie._id}`)}
          className='px-4 py-2 text-xs bg-primary hover:bg-primary-dull
            transition rounded-full font-medium cursor-pointer'
        >
          Buy Tickets
        </button>

        <p className='flex items-center gap-1 text-sm text-gray-400 mt-1 pr-1'>
          <StarIcon className='w-4 h-4 text-primary fill-primary' />
          {typeof movie.vote_average === "number"
            ? movie.vote_average.toFixed(1)
            : "N/A"}
        </p>
      </div>
    </div>
  );
};

export default MovieCard;
