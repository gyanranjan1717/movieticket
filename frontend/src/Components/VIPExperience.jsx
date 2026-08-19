import React from 'react';
import { Film, Volume2, Armchair, Zap, ShieldCheck } from 'lucide-react';
import BlurCircle from './BlurCircle';

const FEATURES = [
  {
    icon: Film,
    title: "4K Laser IMAX Projection",
    description: "Experience ultra-sharp 4K resolution with double the brightness and vibrant color depth.",
    color: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400",
  },
  {
    icon: Volume2,
    title: "Dolby Atmos 7.1 Spatial Audio",
    description: "Feel every explosion and acoustic whisper with 360-degree multi-dimensional soundscapes.",
    color: "from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400",
  },
  {
    icon: Armchair,
    title: "VIP Plush Recliner Seating",
    description: "Relax in heated leather recliners with personal tray tables and in-seat waiter service.",
    color: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400",
  },
  {
    icon: Zap,
    title: "Sub-2ms Redis Live Booking",
    description: "Powered by Redis distributed locking to guarantee zero double-booking and instant seat holds.",
    color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400",
  },
];

const VIPExperience = () => {
  return (
    <div className="relative px-6 md:px-16 lg:px-24 xl:px-44 py-24 text-white overflow-hidden bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <BlurCircle top="50px" left="-50px" />
      <BlurCircle bottom="50px" right="-50px" />

      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> Next-Gen Theater Specs
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            The Ultimate <span className="text-primary">Cinema Experience</span>
          </h2>
          <p className="text-gray-400 mt-3 text-sm md:text-base leading-relaxed">
            We combine state-of-the-art cinema technology with unmatched luxury comfort for every movie fan.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((item, idx) => {
            const Icon = item.icon;

            return (
              <div
                key={idx}
                className={`group relative p-6 bg-gradient-to-b ${item.color} border rounded-2xl backdrop-blur-md shadow-xl hover:shadow-2xl transition duration-300 hover:-translate-y-2 flex flex-col justify-between`}
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-gray-900/80 border border-white/10 flex items-center justify-center mb-5 shadow-inner group-hover:scale-110 transition duration-300">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-lg text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-300 leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-semibold text-gray-400 group-hover:text-white transition">
                  <span>Standard on all screens</span>
                  <span>✓ Included</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VIPExperience;
