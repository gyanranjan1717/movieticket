import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import BlurCircle from './BlurCircle';
import MovieCard from './MovieCard';
import Loading from './Loading';
import { useAppContext } from '../context/AppContext';

const FeatureSection = () => {
  const Navigate = useNavigate();
  const { shows } = useAppContext();

  console.log("🎥 FeatureSection shows:", shows); // ✅ Debug this

  const loading = shows.length === 0;

  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-44 overflow-hidden">
      <div className="relative pt-20 pb-10 flex justify-between items-center">
        <BlurCircle top="0" right="-80px" />
        <p className="text-gray-300 font-medium text-lg">Now Showing</p>

        <button
          onClick={() => Navigate('/Movies')}
          className="group flex items-center gap-2 text-sm text-gray-300 cursor-pointer"
        >
          View All
          <ArrowRight className="group-hover:translate-x-0.5 transition w-4.5 h-4.5" />
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="flex flex-wrap max-sm:justify-center gap-8 mt-8">
            {shows.slice(0, 4).map((show) => {
              console.log("🎬 Rendering show:", show); // Check here

              return (
                <MovieCard
                  key={show._id}
                  movie={show.movie || show} // ✅ show.movie may be undefined for older dummy data
                />
              );
            })}
          </div>

          <div className="flex justify-center mt-20">
            <button
              onClick={() => {
                Navigate('/Movies');
                scrollTo(0, 0);
              }}
              className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull
              transition rounded-md font-medium cursor-pointer"
            >
              Show More
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default FeatureSection;
