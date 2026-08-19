import React, { useState } from 'react';
import { PlayCircle, Film, Sparkles } from 'lucide-react';
import BlurCircle from './BlurCircle';
import TrailerModal from './TrailerModal';

const FEATURED_TRAILERS = [
  {
    title: "Dune: Part Two",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
    videoUrl: "https://www.youtube.com/watch?v=Way9Dexny3w",
    category: "Official 4K Trailer",
    duration: "3m 02s",
  },
  {
    title: "Guardians of the Galaxy",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
    videoUrl: "https://www.youtube.com/watch?v=d96cjJhvlMA",
    category: "IMAX Teaser Trailer",
    duration: "2m 24s",
  },
  {
    title: "Deadpool & Wolverine",
    image: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80",
    videoUrl: "https://www.youtube.com/watch?v=73_1biulk6s",
    category: "Red Band Trailer",
    duration: "2m 38s",
  },
  {
    title: "Oppenheimer",
    image: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&auto=format&fit=crop&q=80",
    videoUrl: "https://www.youtube.com/watch?v=uYPbbksJxIg",
    category: "Official Trailer",
    duration: "3m 08s",
  }
];

const TrailerSection = () => {
  const [selectedTrailer, setSelectedTrailer] = useState(null);

  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-44 py-24 overflow-hidden relative text-white">
      <BlurCircle top="-100px" right="-100px" />

      {/* Trailer & Full Movie Info Modal */}
      {selectedTrailer && (
        <TrailerModal
          isOpen={!!selectedTrailer}
          onClose={() => setSelectedTrailer(null)}
          movie={selectedTrailer}
          movieTitle={selectedTrailer.title}
          trailerUrl={selectedTrailer.videoUrl}
        />
      )}

      {/* Section Header */}
      <div className="max-w-4xl mx-auto text-center mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" /> 4K Ultra HD Teasers
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          Trending <span className="text-primary">Trailers</span> Showcase
        </h2>
        <p className="text-gray-400 mt-2 text-sm max-w-xl mx-auto">
          Watch exclusive 4K official trailers and teaser reveals for upcoming blockbusters.
        </p>
      </div>

      {/* Grid of Interactive Video Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {FEATURED_TRAILERS.map((item, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedTrailer(item)}
            className="group relative bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden shadow-xl hover:border-primary/50 transition duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between"
          >
            {/* Thumbnail Image */}
            <div className="relative aspect-video w-full overflow-hidden bg-gray-950">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition" />

              {/* Play Icon Badge */}
              <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-primary/90 hover:bg-primary text-white flex items-center justify-center shadow-xl transition-all duration-300 scale-90 group-hover:scale-110">
                <PlayCircle className="w-7 h-7" />
              </div>

              {/* Duration Badge */}
              <span className="absolute bottom-2 right-2 text-[10px] font-bold text-white bg-black/80 px-2 py-0.5 rounded backdrop-blur-md">
                {item.duration}
              </span>
            </div>

            {/* Trailer Info */}
            <div className="p-4">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                {item.category}
              </span>
              <h4 className="font-bold text-base text-white mt-1 group-hover:text-primary transition truncate">
                {item.title}
              </h4>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 font-medium">
                <Film className="w-3.5 h-3.5 text-gray-500" /> Watch Official 4K Teaser →
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrailerSection;