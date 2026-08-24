import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Film,
  MapPin,
  Calendar,
  Heart,
  Ticket,
  ShieldCheck,
  Compass,
  X,
  Sparkles
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const RadialNavMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [customPos, setCustomPos] = useState(null); // null = pure CSS default right-4 top-[45%]

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, didDrag: false });
  const lastTouchTimeRef = useRef(0);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, favoriteMovies } = useAppContext();

  // Keep button within screen bounds on resize if dragged
  useEffect(() => {
    const handleResize = () => {
      if (customPos) {
        setCustomPos(prev => ({
          x: Math.min(Math.max(12, prev.x), window.innerWidth - 65),
          y: Math.min(Math.max(70, prev.y), window.innerHeight - 75)
        }));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [customPos]);

  // Close radial menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const navItems = [
    { id: 'home', path: '/', icon: Home, label: 'Home', color: 'hover:bg-rose-500' },
    { id: 'movies', path: '/movies', icon: Film, label: 'Movies', color: 'hover:bg-amber-500' },
    { id: 'theaters', path: '/theaters', icon: MapPin, label: 'Theaters', color: 'hover:bg-emerald-500' },
    { id: 'releases', path: '/releases', icon: Calendar, label: 'Releases', color: 'hover:bg-sky-500' },
    { id: 'favorites', path: '/favorites', icon: Heart, label: 'Favorites', badge: favoriteMovies?.length, color: 'hover:bg-pink-500' },
    { id: 'bookings', path: '/my-bookings', icon: Ticket, label: 'My Bookings', color: 'hover:bg-indigo-500' },
    ...(isAdmin || user?.role === 'admin'
      ? [{ id: 'admin', path: '/admin', icon: ShieldCheck, label: 'Admin', color: 'hover:bg-amber-600' }]
      : [])
  ];

  const handleNavigate = (path, e) => {
    if (e) e.stopPropagation();
    navigate(path);
    setIsOpen(false);
  };

  // --- TOUCH HANDLERS ---
  const onTouchStart = (e) => {
    const t = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      startX: t.clientX,
      startY: t.clientY,
      initialX: customPos ? customPos.x : rect.left,
      initialY: customPos ? customPos.y : rect.top,
      didDrag: false
    };
    setIsDragging(true);
  };

  const onTouchMove = (e) => {
    if (!isDragging) return;
    const t = e.touches[0];
    const dx = t.clientX - dragRef.current.startX;
    const dy = t.clientY - dragRef.current.startY;

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      dragRef.current.didDrag = true;
    }

    const nextX = Math.min(Math.max(12, dragRef.current.initialX + dx), window.innerWidth - 65);
    const nextY = Math.min(Math.max(70, dragRef.current.initialY + dy), window.innerHeight - 75);

    setCustomPos({ x: nextX, y: nextY });
  };

  const onTouchEnd = () => {
    lastTouchTimeRef.current = Date.now();
    setIsDragging(false);
    if (!dragRef.current.didDrag) {
      setIsOpen(prev => !prev);
    }
  };

  // --- MOUSE HANDLERS ---
  const onMouseDown = (e) => {
    if (Date.now() - lastTouchTimeRef.current < 500) return;
    if (e.button !== 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: customPos ? customPos.x : rect.left,
      initialY: customPos ? customPos.y : rect.top,
      didDrag: false
    };
    setIsDragging(true);

    const onMouseMove = (me) => {
      const dx = me.clientX - dragRef.current.startX;
      const dy = me.clientY - dragRef.current.startY;

      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        dragRef.current.didDrag = true;
      }

      const nextX = Math.min(Math.max(12, dragRef.current.initialX + dx), window.innerWidth - 65);
      const nextY = Math.min(Math.max(70, dragRef.current.initialY + dy), window.innerHeight - 75);

      setCustomPos({ x: nextX, y: nextY });
    };

    const onMouseUp = () => {
      setIsDragging(false);
      if (!dragRef.current.didDrag) {
        setIsOpen(prev => !prev);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Radius for circular fan-out arc (in pixels)
  const radius = 95;
  const totalItems = navItems.length;

  // Determine if button is on the left half or right half of the screen
  const currentX = customPos ? customPos.x : (typeof window !== 'undefined' ? window.innerWidth - 60 : 300);
  const isRightSide = currentX > (typeof window !== 'undefined' ? window.innerWidth / 2 : 200);

  return (
    <div className="md:hidden">
      {/* Backdrop overlay when open */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[998] animate-in fade-in duration-200"
        />
      )}

      {/* Floating Draggable Root Container */}
      <div
        style={
          customPos
            ? {
                position: 'fixed',
                left: `${customPos.x}px`,
                top: `${customPos.y}px`,
                zIndex: 999,
                touchAction: 'none'
              }
            : {
                position: 'fixed',
                right: '14px',
                top: '48%',
                transform: 'translateY(-50%)',
                zIndex: 999,
                touchAction: 'none'
              }
        }
        className="w-12 h-12 select-none"
      >
        {/* 3/4 Circular Arc Satellite Items Container */}
        {isOpen && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Glowing Ambient Arc Backdrop */}
            <div className="absolute -inset-24 rounded-full border border-primary/30 bg-gradient-to-tr from-primary/20 via-amber-500/10 to-transparent blur-md pointer-events-none" />

            {navItems.map((item, index) => {
              // If on right side, fan out towards left (90° to 270°)
              // If on left side, fan out towards right (-90° to 90°)
              const startAngle = isRightSide ? 90 : 270;
              const endAngle = isRightSide ? 270 : 450;
              const angleDeg =
                totalItems > 1
                  ? startAngle + (index * (endAngle - startAngle)) / (totalItems - 1)
                  : 180;
              const angleRad = (angleDeg * Math.PI) / 180;

              // Compute X and Y offsets from button center
              const x = Math.round(radius * Math.cos(angleRad));
              const y = -Math.round(radius * Math.sin(angleRad));

              const Icon = item.icon;
              const isActive = location.pathname.toLowerCase() === item.path.toLowerCase();

              return (
                <div
                  key={item.id}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                    transitionDelay: `${index * 25}ms`
                  }}
                  className="pointer-events-auto transition-all duration-300 ease-out animate-in zoom-in-50 fade-in"
                >
                  <button
                    type="button"
                    onClick={(e) => handleNavigate(item.path, e)}
                    title={item.label}
                    className={`relative group flex items-center justify-center w-11 h-11 rounded-full shadow-2xl transition-all duration-200 active:scale-90 cursor-pointer border ${
                      isActive
                        ? 'bg-gradient-to-tr from-primary to-amber-500 text-white border-white/50 ring-2 ring-primary shadow-primary/60 scale-110'
                        : 'bg-gray-900/95 backdrop-blur-xl text-gray-200 border-gray-700/80 hover:text-white hover:scale-110 shadow-black/90'
                    } ${item.color}`}
                  >
                    <Icon className="w-5 h-5 drop-shadow" />

                    {/* Active Indicator Dot */}
                    {isActive && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-gray-950" />
                    )}

                    {/* Optional Badge */}
                    {item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 px-1 min-w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center border border-gray-950">
                        {item.badge}
                      </span>
                    )}

                    {/* Floating Tooltip */}
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block px-2 py-0.5 rounded-md bg-gray-950/95 border border-gray-800 text-[10px] font-bold text-white whitespace-nowrap shadow-xl pointer-events-none">
                      {item.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Central Draggable Radial Trigger Button */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          role="button"
          aria-label="Toggle navigation wheel"
          className={`relative w-12 h-12 rounded-full shadow-2xl transition-transform duration-200 cursor-grab active:cursor-grabbing border-2 flex items-center justify-center ${
            isOpen
              ? 'bg-gradient-to-tr from-rose-600 to-primary text-white border-white/50 rotate-90 scale-105 shadow-primary/60 ring-4 ring-primary/20'
              : isDragging
              ? 'bg-gray-800 text-white border-primary scale-110 shadow-primary/40'
              : 'bg-gray-900/95 backdrop-blur-xl text-white border-gray-700/80 hover:border-primary/60 shadow-black/95 hover:scale-105'
          }`}
        >
          {/* Subtle Outer Pulse when idle */}
          {!isOpen && !isDragging && (
            <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-30 pointer-events-none" />
          )}

          {isOpen ? (
            <X className="w-5 h-5 transition-transform duration-300 pointer-events-none" />
          ) : (
            <div className="relative flex items-center justify-center pointer-events-none">
              <Compass className="w-5 h-5 text-primary drop-shadow" />
              <Sparkles className="absolute -top-1 -right-1 w-2.5 h-2.5 text-amber-400 fill-amber-400" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RadialNavMenu;
