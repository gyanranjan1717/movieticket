import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Mail, Phone, MapPin, Send, ShieldCheck, Zap, Sparkles, Heart, Twitter, Instagram, Youtube, Facebook, Github, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const Footer = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setSubscribed(true);
    toast.success('🎉 Welcome to ShowTime VIP Cinema Club!');
    setEmail('');
  };

  return (
    <footer className="relative bg-gradient-to-b from-gray-950 via-black to-black text-gray-400 pt-20 pb-10 border-t border-gray-800/80 overflow-hidden select-none">
      
      {/* Top Background Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-primary/10 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-16 lg:px-24">
        
        {/* Newsletter Box (Glassmorphic) */}
        <div className="relative mb-16 p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-gray-900/90 via-gray-900 to-gray-900/90 border border-gray-800 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-xl text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" /> VIP Cinema Club
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Never Miss a <span className="text-primary">Blockbuster Premiere</span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 mt-2 leading-relaxed">
                Subscribe for instant notifications on ticket drops, premiere seat holds, and exclusive VIP lounge discounts.
              </p>
            </div>

            <form onSubmit={handleSubscribe} className="flex items-center gap-2 w-full lg:w-auto max-w-md">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-gray-500 absolute left-4 top-3.5" />
                <input
                  type="email"
                  placeholder="Enter your email address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-950/90 border border-gray-800 focus:border-primary text-white text-xs sm:text-sm pl-11 pr-4 py-3 rounded-xl outline-none transition"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer flex items-center gap-2 flex-shrink-0 shadow-lg shadow-primary/30 active:scale-95"
              >
                {subscribed ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                <span>{subscribed ? 'Subscribed!' : 'Join VIP'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* 4 Column Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-16 border-b border-gray-800/80">
          
          {/* Col 1: Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div 
              onClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="flex items-center gap-2.5 cursor-pointer w-max group"
            >
              <div className="p-2 rounded-xl bg-primary text-white shadow-lg shadow-primary/40 group-hover:scale-105 transition duration-300">
                <Film className="w-6 h-6" />
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-white font-sans">
                ShowTime <span className="text-primary font-bold">Cinema</span>
              </span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
              Your ultimate destination for 4K IMAX cinema ticket booking, live seat reservations powered by Redis, and personalized movie recommendations.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg text-[11px] font-semibold text-emerald-400">
                <Zap className="w-3.5 h-3.5 fill-emerald-400" /> Sub-2ms Seat Reservation
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg text-[11px] font-semibold text-amber-400">
                <ShieldCheck className="w-3.5 h-3.5" /> SSL Encrypted
              </div>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-extrabold text-white tracking-wider uppercase">Navigation</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button 
                  onClick={() => { navigate('/'); window.scrollTo(0, 0); }}
                  className="hover:text-primary transition cursor-pointer"
                >
                  Home Showcase
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { navigate('/Movies'); window.scrollTo(0, 0); }}
                  className="hover:text-primary transition cursor-pointer flex items-center gap-1.5"
                >
                  All Movies & Screenings
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { navigate('/Releases'); window.scrollTo(0, 0); }}
                  className="hover:text-primary transition cursor-pointer"
                >
                  New & Upcoming Releases
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { navigate('/Favroites'); window.scrollTo(0, 0); }}
                  className="hover:text-primary transition cursor-pointer"
                >
                  My Favorites & Watchlist
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { navigate('/MyBooking'); window.scrollTo(0, 0); }}
                  className="hover:text-primary transition cursor-pointer"
                >
                  Booking History & Tickets
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Cinema Specs & Formats */}
          <div className="space-y-4">
            <h4 className="text-sm font-extrabold text-white tracking-wider uppercase">Cinema Formats</h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> 4K Laser IMAX 3D
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Dolby Atmos Surround Sound
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> VIP Heated Recliner Seats
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> In-Seat Gourmet Food Service
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Mobile QR Gate Access
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Social */}
          <div className="space-y-4">
            <h4 className="text-sm font-extrabold text-white tracking-wider uppercase">Contact Us</h4>
            <div className="space-y-3 text-xs">
              <p className="flex items-center gap-2.5 text-gray-300">
                <Mail className="w-4 h-4 text-primary" /> support@showtimecinema.com
              </p>
              <p className="flex items-center gap-2.5 text-gray-300">
                <Phone className="w-4 h-4 text-primary" /> +1 (800) 555-SHOW
              </p>
              <p className="flex items-center gap-2.5 text-gray-300">
                <MapPin className="w-4 h-4 text-primary" /> Hollywood Blvd, Los Angeles, CA
              </p>
            </div>

            {/* Social Icons */}
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-gray-400 mb-2.5 uppercase">Connect With Us</p>
              <div className="flex items-center gap-2">
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="p-2 bg-gray-900 hover:bg-primary text-gray-400 hover:text-white rounded-xl border border-gray-800 transition cursor-pointer active:scale-95">
                  <Twitter className="w-4 h-4" />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="p-2 bg-gray-900 hover:bg-primary text-gray-400 hover:text-white rounded-xl border border-gray-800 transition cursor-pointer active:scale-95">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noreferrer" className="p-2 bg-gray-900 hover:bg-primary text-gray-400 hover:text-white rounded-xl border border-gray-800 transition cursor-pointer active:scale-95">
                  <Youtube className="w-4 h-4" />
                </a>
                <a href="https://facebook.com" target="_blank" rel="noreferrer" className="p-2 bg-gray-900 hover:bg-primary text-gray-400 hover:text-white rounded-xl border border-gray-800 transition cursor-pointer active:scale-95">
                  <Facebook className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Copyright & Trust Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} ShowTime Cinema Inc. All Rights Reserved.</p>
          
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <span className="hover:text-gray-300 transition cursor-pointer">Privacy Policy</span>
            <span>·</span>
            <span className="hover:text-gray-300 transition cursor-pointer">Terms of Service</span>
            <span>·</span>
            <span className="hover:text-gray-300 transition cursor-pointer">Cookie Preferences</span>
          </div>

          <p className="flex items-center gap-1">
            Built with <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" /> for Movie Lovers
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;