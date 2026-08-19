import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MenuIcon, SearchIcon, TicketPlus, XIcon, UserIcon, LogOut, ShieldCheck, Heart, MapPin, ChevronDown } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import LocationModal from './LocationModal';

const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const navigate = useNavigate();
  const { user, logout, isAdmin, favoriteMovies, setIsAuthModalOpen, selectedCity, changeCity } = useAppContext();

  return (
    <div className='fixed top-0 left-0 z-50 w-full flex items-center justify-between px-6 md:px-16 lg:px-36 py-5 bg-gradient-to-b from-black/80 to-transparent'>
      
      {/* Location Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        selectedCity={selectedCity}
        onSelectCity={changeCity}
      />

      <div className="flex items-center gap-3 max-md:flex-1">
        <Link to='/'>
          <img 
            src='https://fonts.freepik.com/api/render?variantId=12360&fontSize=36&text=Show%20Time'
            alt="Show Time Logo" 
            className='w-32 sm:w-36 h-auto'
          />
        </Link>

        {/* District-Style Location Selector Badge */}
        <button
          onClick={() => setIsLocationModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900/80 hover:bg-gray-800 border border-gray-700/60 text-white text-xs font-bold transition cursor-pointer active:scale-95 shadow-lg backdrop-blur-md"
          title="Change City Location"
        >
          <MapPin className="w-3.5 h-3.5 text-primary fill-primary/30" />
          <span className="truncate max-w-[100px] sm:max-w-[150px]">
            {selectedCity?.name}, {selectedCity?.state}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className={`max-md:absolute max-md:top-0 max-md:left-0 max-md:font-medium
      max-md:text-lg z-50 flex flex-col md:flex-row items-center
      max-md:justify-center gap-8 min-md:px-8 py-3 max-md:h-screen 
      min-md:rounded-full backdrop-blur bg-black/70 md:bg-white/10 md:border
      border-gray-300/20 overflow-hidden transition-[width] duration-300 ${isOpen ? 'max-md:w-full' : 'max-md:w-0'}`}>
        
        <XIcon className='md:hidden absolute top-6 right-6 w-6 h-6 cursor-pointer' onClick={() => setIsOpen(!isOpen)} />

        <Link onClick={() => { scrollTo(0, 0); setIsOpen(false); }} to='/'>Home</Link>
        <Link onClick={() => { scrollTo(0, 0); setIsOpen(false); }} to='/Movies'>Movies</Link>
        <Link onClick={() => { scrollTo(0, 0); setIsOpen(false); }} to='/Theaters'>Theaters</Link>
        <Link onClick={() => { scrollTo(0, 0); setIsOpen(false); }} to='/Releases'>Releases</Link>
        
        {favoriteMovies.length > 0 && (
          <Link onClick={() => { scrollTo(0, 0); setIsOpen(false); }} to='/Favroites'>
            Favorites
          </Link>
        )}

        {(isAdmin || user?.role === 'admin') && (
          <Link 
            onClick={() => { scrollTo(0, 0); setIsOpen(false); }} 
            to='/admin' 
            className='text-primary font-semibold flex items-center gap-1'
          >
            <ShieldCheck className='w-4 h-4' /> Admin Panel
          </Link>
        )}
      </div>

      {/* Auth & Profile Actions */}
      <div className='flex items-center gap-6'>
        <SearchIcon className='max-md:hidden w-6 h-6 cursor-pointer text-gray-300 hover:text-white transition' />

        {!user ? (
          <button 
            onClick={() => setIsAuthModalOpen(true)} 
            className='px-5 py-2 bg-primary hover:bg-primary/80 transition rounded-full font-medium cursor-pointer text-white shadow-lg shadow-primary/30'
          >
            Login
          </button>
        ) : (
          <div className='relative'>
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className='flex items-center gap-2 p-1 rounded-full border border-gray-700 bg-gray-800/60 hover:bg-gray-800 transition cursor-pointer'
            >
              <img 
                src={user.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || user.email)}`} 
                alt={user.name} 
                className='w-8 h-8 rounded-full object-cover border border-primary/50'
              />
            </button>

            {/* User Dropdown Menu */}
            {showProfileMenu && (
              <div 
                className='absolute right-0 mt-3 w-56 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl py-2 z-50 text-sm text-gray-200'
                onMouseLeave={() => setShowProfileMenu(false)}
              >
                <div className='px-4 py-2 border-b border-gray-800'>
                  <p className='font-semibold text-white truncate'>{user.name || "User"}</p>
                  <p className='text-xs text-gray-400 truncate'>{user.email}</p>
                  {user.role === 'admin' && (
                    <span className='inline-block mt-1 px-2 py-0.5 text-[10px] font-bold bg-primary/20 text-primary rounded-md'>
                      ADMIN
                    </span>
                  )}
                </div>

                <button 
                  onClick={() => { navigate('/MyBooking'); setShowProfileMenu(false); }}
                  className='w-full px-4 py-2.5 flex items-center gap-2 hover:bg-gray-800 text-left transition cursor-pointer'
                >
                  <TicketPlus className='w-4 h-4 text-primary' /> My Bookings
                </button>

                <button 
                  onClick={() => { navigate('/Favroites'); setShowProfileMenu(false); }}
                  className='w-full px-4 py-2.5 flex items-center gap-2 hover:bg-gray-800 text-left transition cursor-pointer'
                >
                  <Heart className='w-4 h-4 text-rose-500' /> Favorites
                </button>

                {(isAdmin || user.role === 'admin') && (
                  <button 
                    onClick={() => { navigate('/admin'); setShowProfileMenu(false); }}
                    className='w-full px-4 py-2.5 flex items-center gap-2 hover:bg-gray-800 text-left transition cursor-pointer text-primary'
                  >
                    <ShieldCheck className='w-4 h-4' /> Admin Dashboard
                  </button>
                )}

                <div className='border-t border-gray-800 my-1' />

                <button 
                  onClick={() => { logout(); setShowProfileMenu(false); }}
                  className='w-full px-4 py-2.5 flex items-center gap-2 hover:bg-red-500/10 text-red-400 text-left transition cursor-pointer'
                >
                  <LogOut className='w-4 h-4' /> Sign Out
                </button>
              </div>
            )}
          </div>
        )}

        <MenuIcon onClick={() => setIsOpen(!isOpen)} className='max-md:ml-4 md:hidden w-8 h-8 cursor-pointer' />
      </div>

    </div>
  );
};

export default NavBar;