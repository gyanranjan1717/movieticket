import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  X,
  Send,
  Sparkles,
  RefreshCw,
  Mic,
  MicOff,
  Film,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Navigation,
  ChevronRight,
  Maximize2,
  Minimize2,
  Play,
  Ticket,
  Info,
  Layers,
  ArrowRight,
  Volume2,
  CheckCircle2
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import TrailerModal from '../TrailerModal';
import toast from 'react-hot-toast';

const DEFAULT_LOADING_STAGES = [
  { text: "Scanning live box office & active shows...", icon: "🎬" },
  { text: "Locating nearest IMAX, 4DX & Dolby screens...", icon: "📍" },
  { text: "Analyzing real-time seat availability & ratings...", icon: "🍿" },
  { text: "Curating personalized recommendations for you...", icon: "✨" }
];

const generateDynamicLoadingStages = (prompt, city = 'Bengaluru') => {
  const p = (prompt || '').toLowerCase();

  // 1. Theaters / Location / Near Me
  if (p.includes('theater') || p.includes('theatre') || p.includes('cinema') || p.includes('nearby') || p.includes('near') || p.includes('location') || p.includes('place') || p.includes('mall') || p.includes('imax') || p.includes('4dx') || p.includes('pvr') || p.includes('inox')) {
    const knownCities = ['mumbai', 'delhi', 'bengaluru', 'bangalore', 'hyderabad', 'pune', 'chennai', 'kolkata', 'ahmedabad', 'jaipur', 'chandigarh', 'noida', 'gurgaon'];
    const mentionedCity = knownCities.find(c => p.includes(c));
    const targetLoc = mentionedCity 
      ? mentionedCity.charAt(0).toUpperCase() + mentionedCity.slice(1) 
      : (city ? `${city}` : 'your location');

    return [
      { text: `Locating real-time cinemas near ${targetLoc}...`, icon: "📍" },
      { text: `Calculating GPS driving distances in ${targetLoc}...`, icon: "🧭" },
      { text: "Fetching IMAX, 4DX & Dolby Atmos screen specs...", icon: "🏛️" },
      { text: "Formatting live venue & route cards...", icon: "✨" }
    ];
  }

  // 2. Seat Hold / Redis / Platform Policies / Payment / Steps
  if (p.includes('seat') || p.includes('hold') || p.includes('lock') || p.includes('10 minute') || p.includes('stripe') || p.includes('pay') || p.includes('refund') || p.includes('cancel') || p.includes('how to') || p.includes('feature')) {
    return [
      { text: "Accessing ShowTime platform architecture...", icon: "🔒" },
      { text: "Verifying Redis 10-minute seat lock protocols...", icon: "⏱️" },
      { text: "Retrieving secure Stripe checkout & booking rules...", icon: "💳" },
      { text: "Formulating step-by-step guidance...", icon: "💡" }
    ];
  }

  // 3. User Bookings / Tickets / History
  if (p.includes('booking') || p.includes('ticket') || p.includes('my ticket') || p.includes('history') || p.includes('receipt') || p.includes('qr') || p.includes('booked')) {
    return [
      { text: "Connecting to your ShowTime account...", icon: "🔐" },
      { text: "Fetching confirmed tickets & seat allocations...", icon: "🎟️" },
      { text: "Preparing digital tickets & QR passes...", icon: "📲" }
    ];
  }

  // 4. Specific Genres: Action / Sci-Fi / Horror / Comedy / Romance / Thriller
  if (p.includes('action') || p.includes('sci-fi') || p.includes('scifi') || p.includes('thriller') || p.includes('horror') || p.includes('comedy') || p.includes('romance') || p.includes('anime') || p.includes('drama') || p.includes('romantic')) {
    const genreMatch = p.match(/(action|sci-fi|scifi|thriller|horror|comedy|romance|romantic|anime|drama)/i);
    const genreName = genreMatch ? genreMatch[0].toUpperCase() : "CINEMA";
    return [
      { text: `Searching top-rated ${genreName} blockbusters...`, icon: "🚀" },
      { text: "Filtering by TMDB ratings & user reviews...", icon: "⭐" },
      { text: "Checking live showtimes in theaters...", icon: "🍿" },
      { text: "Curating personalized recommendations...", icon: "✨" }
    ];
  }

  // 5. Upcoming / Coming Soon / Future Movies
  if (p.includes('upcoming') || p.includes('coming soon') || p.includes('future') || p.includes('next') || p.includes('release') || p.includes('trailer')) {
    return [
      { text: "Querying Redis cache for upcoming theatrical releases...", icon: "⚡" },
      { text: "Fetching release dates, posters & official trailers...", icon: "🎬" },
      { text: "Setting up reminder notification triggers...", icon: "🔔" }
    ];
  }

  // 6. Shows / Times / Timings / Today / Tomorrow
  if (p.includes('show') || p.includes('time') || p.includes('today') || p.includes('tomorrow') || p.includes('evening') || p.includes('night') || p.includes('morning') || p.includes('slot')) {
    return [
      { text: "Checking live MongoDB showtime schedule...", icon: "🕒" },
      { text: "Scanning available slots & ticket pricing tiers...", icon: "🎟️" },
      { text: "Checking seat hold availability...", icon: "💺" }
    ];
  }

  // 7. General / Movie Matchmaker
  return [
    { text: "Scanning live box office & active shows...", icon: "🎬" },
    { text: "Analyzing real-time seat availability & ratings...", icon: "🍿" },
    { text: "Curating personalized recommendations for you...", icon: "✨" }
  ];
};

const BookingReservationCard = ({ booking, onBookingConfirmed, navigate }) => {
  const [isPaid, setIsPaid] = useState(Boolean(booking.isPaid));
  const [timeLeft, setTimeLeft] = useState(() => {
    if (booking.isPaid) return 0;
    const diff = Math.max(0, Math.floor(((booking.expiresAt || Date.now()) - Date.now()) / 1000));
    return diff || 600;
  });

  // Countdown timer effect (only runs while unpaid)
  useEffect(() => {
    if (isPaid || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaid, timeLeft]);

  // Polling & focus listener to check payment completion on Stripe
  useEffect(() => {
    if (isPaid || !booking.bookingId) return;

    let isMounted = true;

    const checkPayment = async () => {
      try {
        const { data } = await axios.get(`/api/booking/status/${booking.bookingId}`);
        if (data.success && data.isPaid && isMounted) {
          setIsPaid(true);
          setTimeLeft(0);
          booking.isPaid = true;
          onBookingConfirmed?.(booking);
        }
      } catch (err) {
        // Silent polling catch
      }
    };

    // Immediate check on mount/focus
    checkPayment();

    const intervalId = setInterval(checkPayment, 3500);
    window.addEventListener('focus', checkPayment);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', checkPayment);
    };
  }, [isPaid, booking.bookingId]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpired = !isPaid && timeLeft <= 0;

  return (
    <div className={`w-full mt-3 rounded-2xl p-3.5 shadow-xl text-left animate-in fade-in slide-in-from-bottom-2 duration-300 border ${
      isPaid
        ? 'bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-950/40 border-emerald-500/50 shadow-emerald-950/30'
        : 'bg-gradient-to-br from-gray-900 via-gray-900 to-amber-950/40 border-amber-500/40 shadow-amber-950/30'
    }`}>
      {/* Top Banner with Lock & Countdown */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-gray-800/80">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-emerald-400 animate-pulse'}`} />
          <span className={`text-[11px] font-bold uppercase tracking-wider ${isPaid ? 'text-emerald-300' : 'text-amber-300'}`}>
            {isPaid ? 'Ticket Booked & Confirmed' : '10-Min Atomic Seat Hold'}
          </span>
        </div>
        <div className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold flex items-center gap-1 border ${
          isPaid
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : isExpired 
              ? 'bg-red-500/20 text-red-400 border-red-500/30' 
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        }`}>
          {isPaid ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Paid & Secured</span>
            </>
          ) : (
            <>
              <Clock className="w-3 h-3" />
              <span>
                {isExpired ? 'Hold Expired' : `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Movie Details & Poster */}
      <div className="flex gap-3 items-center">
        {booking.poster && (
          <img
            src={booking.poster}
            alt={booking.movieTitle}
            className="w-14 h-20 object-cover rounded-xl shadow-md border border-gray-800 shrink-0"
          />
        )}
        <div className="flex-1 overflow-hidden">
          <h4 className="font-bold text-white text-sm truncate">
            {booking.movieTitle}
          </h4>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {booking.formattedDate} • <span className="text-amber-400 font-semibold">{booking.formattedTime}</span>
          </p>
          
          {/* Seats Pill Badges */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="text-[10px] text-gray-400 font-medium">Seats:</span>
            {booking.seats?.map(seat => (
              <span
                key={seat}
                className={`px-2 py-0.5 text-[11px] font-bold font-mono rounded-md border shadow-sm ${
                  isPaid
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-primary/20 text-primary border-primary/40'
                }`}
              >
                {seat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing & 1-Click CTA */}
      <div className="mt-3 pt-2.5 border-t border-gray-800/80 flex items-center justify-between gap-3">
        <div>
          <span className="block text-[10px] text-gray-400 uppercase font-semibold">
            {isPaid ? 'Amount Paid' : 'Total Amount'}
          </span>
          <span className="text-base font-extrabold text-emerald-400">
            ${booking.amount?.toFixed ? booking.amount.toFixed(2) : booking.amount}
          </span>
        </div>

        {isPaid ? (
          <button
            onClick={() => {
              if (navigate) navigate('/MyBooking');
              else window.location.href = '/MyBooking';
            }}
            className="flex-1 max-w-[210px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40 active:scale-95"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>View in My Bookings</span>
          </button>
        ) : (
          <button
            disabled={isExpired}
            onClick={() => {
              if (booking.stripeUrl) {
                window.location.href = booking.stripeUrl;
              }
            }}
            className={`flex-1 max-w-[200px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer ${
              isExpired
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                : 'bg-gradient-to-r from-amber-500 via-primary to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white shadow-primary/30 active:scale-95'
            }`}
          >
            <span>{isExpired ? 'Hold Expired' : 'Proceed to Stripe'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

const ChatBotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('showtime_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeLoadingStages, setActiveLoadingStages] = useState(DEFAULT_LOADING_STAGES);
  const [loadingStageIdx, setLoadingStageIdx] = useState(0);
  const [streamingMsgIndex, setStreamingMsgIndex] = useState(null);

  const [config, setConfig] = useState({
    activeProvider: 'gemini',
    activeModel: 'gemini-3.6-flash',
    welcomeMessage: "👋 Hi! I'm your ShowTime AI Concierge. How can I help you book tickets or find great movies today?",
    suggestedPrompts: [
      "🍿 Recommend a top-rated movie for tonight",
      "🎟️ How do I book tickets & select seats?",
      "🕒 How does the 10-minute seat hold work?",
      "📍 Find theaters near me"
    ]
  });

  const [isListening, setIsListening] = useState(false);
  const [trailerMovie, setTrailerMovie] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, selectedCity, favoriteMovies } = useAppContext();

  const handleBookingConfirmed = (confirmedBooking) => {
    setMessages(prev => {
      const updated = prev.map(m => {
        if (m.cards?.booking?.bookingId === confirmedBooking.bookingId) {
          return {
            ...m,
            cards: {
              ...m.cards,
              booking: { ...m.cards.booking, isPaid: true }
            }
          };
        }
        return m;
      });

      const alreadyHasConfirmation = updated.some(m =>
        m.role === 'assistant' &&
        m.content?.includes(confirmedBooking.movieTitle) &&
        m.content?.includes('Ticket is Booked')
      );

      if (alreadyHasConfirmation) return updated;

      const aiMsg = {
        role: 'assistant',
        content: `🎉 **Payment Confirmed! Your Ticket is Booked!**\n\nYour reservation for **${confirmedBooking.movieTitle}** is complete!\n\n- **Seats:** ${confirmedBooking.seats?.join(', ')}\n- **Date & Time:** ${confirmedBooking.formattedDate} at ${confirmedBooking.formattedTime}\n- **Amount Paid:** $${Number(confirmedBooking.amount).toFixed(2)}\n\nYour seats are confirmed and your QR ticket is ready in **[My Bookings](/MyBooking)**.\n\nEnjoy the movie! 🍿🎬`,
        cards: {},
        provider: config.activeProvider,
        model: config.activeModel,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      return [...updated, aiMsg];
    });

    toast.success("Ticket Confirmed & Booked! 🎟️");
  };

  // Cycle loading stages every 1.3s while loading
  useEffect(() => {
    let interval = null;
    if (loading) {
      setLoadingStageIdx(0);
      interval = setInterval(() => {
        setLoadingStageIdx((prev) => (prev + 1) % (activeLoadingStages.length || 1));
      }, 1300);
    } else {
      setLoadingStageIdx(0);
    }
    return () => clearInterval(interval);
  }, [loading, activeLoadingStages]);

  const formatModelName = (provider, model) => {
    if (!model) return provider ? provider.toUpperCase() : 'AI Assistant';
    const map = {
      'gemini-3.6-flash': 'Gemini 3.6 Flash',
      'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
      'gemini-2.5-pro': 'Gemini 2.5 Pro',
      'gemini-3.7-flash': 'Gemini 3.7 Flash',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-4o': 'GPT-4o',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo'
    };
    if (map[model]) return map[model];
    return model.replace(/^models\//, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const fetchConfig = async () => {
    try {
      const { data } = await axios.get('/api/chatbot/config');
      if (data.success && data.config) {
        setConfig(data.config);
        // If no chat history, add initial greeting
        if (messages.length === 0) {
          setMessages([
            {
              role: 'assistant',
              content: data.config.welcomeMessage,
              cards: {},
              provider: data.config.activeProvider,
              model: data.config.activeModel,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      }
    } catch (err) {
      console.warn("Could not fetch chatbot config:", err);
    }
  };

  // Load config on mount & whenever chat widget is opened
  useEffect(() => {
    fetchConfig();
  }, [isOpen]);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('showtime_chat_history', JSON.stringify(messages.slice(-20)));
    }
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading, streamingMsgIndex, loadingStageIdx]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e) => {
        console.warn("Speech recognition error:", e.error);
        setIsListening(false);
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputMessage(transcript);
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        recognitionRef.current.stop();
      }
    }
  };

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    // Generate prompt-specific dynamic loading stages instantly in 0ms!
    const promptStages = generateDynamicLoadingStages(text, selectedCity?.name || 'Bengaluru');
    setActiveLoadingStages(promptStages);
    setLoadingStageIdx(0);

    const userTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessages = [
      ...messages,
      { role: 'user', content: text, timestamp: userTimestamp }
    ];

    setMessages(newMessages);
    setInputMessage('');
    setLoading(true);

    // Build context object with admin awareness
    const context = {
      userId: user?._id || user?.id || null,
      userName: user?.name || null,
      userRole: user?.role || (isAdmin ? 'admin' : 'user'),
      isAdmin: Boolean(isAdmin || user?.role === 'admin' || location.pathname.startsWith('/admin')),
      userCity: selectedCity?.name || 'Bengaluru',
      currentPath: location.pathname,
      favoriteCount: favoriteMovies?.length || 0
    };

    try {
      // Prepare payload for backend
      const payloadMessages = newMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data } = await axios.post('/api/chatbot/message', {
        messages: payloadMessages,
        context
      });

      if (data.success && data.reply) {
        const reply = data.reply;
        const newMsgIndex = newMessages.length;
        setStreamingMsgIndex(newMsgIndex);

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: reply.text,
            cards: reply.cards || {},
            provider: reply.provider || config.activeProvider,
            model: reply.model || config.activeModel,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isTyping: true
          }
        ]);
      } else {
        throw new Error(data.message || "Failed to receive AI reply.");
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errMsg = error.response?.data?.message || "Sorry, I had trouble processing your request. Please try again.";
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ ${errMsg}`,
          cards: {},
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClearChat = () => {
    const initialGreeting = {
      role: 'assistant',
      content: config.welcomeMessage,
      cards: {},
      provider: config.activeProvider,
      model: config.activeModel,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([initialGreeting]);
    localStorage.removeItem('showtime_chat_history');
    toast.success("Chat history cleared");
  };

  const handleMovieCardClick = (movie) => {
    navigate(`/movies/${movie.id || movie._id}`);
    setIsExpanded(false);
    setIsOpen(false);
  };

  const handleShowClick = (show) => {
    setIsExpanded(false);
    setIsOpen(false);
    if (show.movieId && show.showDateTime) {
      const dateStr = new Date(show.showDateTime).toISOString().split('T')[0];
      navigate(`/movies/${show.movieId}/${dateStr}`);
    } else {
      navigate('/movies');
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-[999] group">
          <button
            onClick={() => {
              setIsOpen(true);
              setUnreadCount(0);
            }}
            className="relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-amber-600 via-primary to-amber-400 text-white shadow-2xl shadow-primary/40 hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white/20 cursor-pointer"
            aria-label="Open AI Cinema Concierge"
          >
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping opacity-40 pointer-events-none" />
            <Bot className="w-7 h-7 md:w-8 md:h-8 drop-shadow-md" />

            {/* Sparkle badge */}
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white border-2 border-gray-950">
              <Sparkles className="w-3 h-3 fill-current" />
            </span>
          </button>

          {/* Tooltip Hover Pill */}
          <div className="absolute right-20 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-900/95 border border-gray-800 text-xs font-semibold text-white shadow-xl whitespace-nowrap pointer-events-none transition">
            <span>Ask ShowTime AI</span>
            <span className="text-[10px] text-amber-400 font-mono">⚡ Instant Concierge</span>
          </div>
        </div>
      )}

      {/* Main Chatbot Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 flex flex-col bg-gray-950/95 backdrop-blur-2xl border border-gray-800/80 shadow-2xl rounded-3xl overflow-hidden ${
            isExpanded
              ? 'inset-4 md:inset-10'
              : 'bottom-4 right-4 md:bottom-6 md:right-6 w-[calc(100vw-32px)] md:w-[460px] h-[640px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="p-4 md:px-6 bg-gradient-to-r from-gray-900 via-gray-900/90 to-gray-950 border-b border-gray-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-primary flex items-center justify-center text-white shadow-md shadow-primary/20">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-gray-950" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-white text-base tracking-tight">
                    ShowTime AI Concierge
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-mono font-semibold">
                    <Sparkles className="w-3 h-3" />
                    ShowTime AI
                  </span>
                  <span>• {selectedCity?.name || 'Online'}</span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 text-gray-400">
              <button
                onClick={handleClearChat}
                title="Clear chat history"
                className="p-2 hover:bg-gray-800 hover:text-white rounded-xl transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse view" : "Expand view"}
                className="p-2 hover:bg-gray-800 hover:text-white rounded-xl transition cursor-pointer hidden md:block"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 custom-scrollbar">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const isCurrentlyStreaming = streamingMsgIndex === index;

              return (
                <div
                  key={index}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2 animate-in fade-in duration-300`}
                >
                  <div
                    className={`max-w-[88%] md:max-w-[85%] rounded-3xl p-4 text-sm leading-relaxed shadow-lg break-words [overflow-wrap:anywhere] overflow-hidden ${
                      isUser
                        ? 'bg-gradient-to-r from-primary to-amber-600 text-white rounded-tr-none'
                        : 'bg-gray-900/90 text-gray-200 border border-gray-800/80 rounded-tl-none'
                    }`}
                  >
                    {/* Character-by-Character Typewriter Reveal */}
                    {isCurrentlyStreaming ? (
                      <TypewriterReveal
                        text={msg.content}
                        onComplete={() => {
                          setStreamingMsgIndex(null);
                        }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] overflow-hidden">
                        <FormatMarkdown text={msg.content} />
                      </div>
                    )}

                    {/* Timestamp & ShowTime AI Badge */}
                    <div className={`mt-2 flex items-center justify-between text-[10px] ${isUser ? 'text-amber-100' : 'text-gray-500'}`}>
                      <span>{msg.timestamp || 'Just now'}</span>
                      {!isUser && (
                        <span className="font-mono text-[9px] text-primary/80 font-semibold uppercase">
                          ShowTime AI
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Render Rich Movie Cards if present (Fade in after streaming) */}
                  {!isCurrentlyStreaming && msg.cards?.movies && msg.cards.movies.length > 0 && (
                    <div className="w-full mt-2 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                        <Film className="w-3.5 h-3.5 text-primary" />
                        Recommended Movies ({msg.cards.movies.length})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {msg.cards.movies.map((movie, mIdx) => (
                          <div
                            key={mIdx}
                            className="bg-gray-900/80 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 rounded-2xl p-3 flex gap-3 transition shadow-md group"
                          >
                            <img
                              src={movie.poster || 'https://via.placeholder.com/150x220?text=No+Poster'}
                              alt={movie.title}
                              className="w-16 h-24 object-cover rounded-xl shrink-0 shadow"
                            />
                            <div className="flex-1 flex flex-col justify-between overflow-hidden">
                              <div>
                                <h4 className="font-bold text-white text-xs truncate group-hover:text-primary transition">
                                  {movie.title}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {movie.hasActiveShows !== false ? (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                      🟢 Now Showing
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                      🔔 Coming Soon
                                    </span>
                                  )}

                                  {movie.rating ? (
                                    <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-gray-800 text-amber-300">
                                      ★ {Number(movie.rating).toFixed(1)}
                                    </span>
                                  ) : null}
                                </div>
                                {movie.genres && (
                                  <p className="text-[10px] text-gray-400 truncate mt-1">
                                    {Array.isArray(movie.genres) ? movie.genres.slice(0, 2).join(', ') : movie.genres}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={() => handleMovieCardClick(movie)}
                                  className={`flex-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer ${
                                    movie.hasActiveShows !== false
                                      ? 'bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20'
                                      : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
                                  }`}
                                >
                                  {movie.hasActiveShows !== false ? (
                                    <>
                                      <Ticket className="w-3 h-3" /> Book Now
                                    </>
                                  ) : (
                                    <>
                                      <Film className="w-3 h-3 text-amber-400" /> View Overview
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Render Available Shows Slots if present */}
                  {!isCurrentlyStreaming && msg.cards?.shows && msg.cards.shows.length > 0 && (
                    <div className="w-full mt-2 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        Available Showtimes ({msg.cards.shows.length})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.cards.shows.map((show, sIdx) => (
                          <div
                            key={sIdx}
                            onClick={() => handleShowClick(show)}
                            className="bg-gray-900 border border-gray-800 hover:border-primary/60 rounded-2xl p-3 flex items-center justify-between transition cursor-pointer hover:bg-gray-850 group"
                          >
                            <div className="overflow-hidden">
                              <h5 className="font-bold text-white text-xs truncate group-hover:text-primary">
                                {show.movieTitle}
                              </h5>
                              <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                                <span className="text-amber-400 font-semibold">{show.formattedTime}</span>
                                <span>• {show.formattedDate}</span>
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-bold text-emerald-400">
                                ₹{show.price}
                              </span>
                              <span className="block text-[10px] text-primary group-hover:translate-x-0.5 transition font-semibold">
                                Select Seats →
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Render Theaters if present */}
                  {!isCurrentlyStreaming && msg.cards?.theaters && msg.cards.theaters.length > 0 && (
                    <div className="w-full mt-2 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        Live Nearby Cinemas ({msg.cards.theaters.length})
                      </p>
                      <div className="space-y-2">
                        {msg.cards.theaters.map((th, tIdx) => (
                          <div
                            key={tIdx}
                            className="bg-gray-900/90 border border-gray-800 hover:border-gray-700 rounded-2xl p-3 flex items-center justify-between gap-3 transition"
                          >
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                <h5 className="font-bold text-white text-xs truncate">{th.name}</h5>
                              </div>
                              <p className="text-[10px] text-gray-400 truncate mt-0.5">{th.address}</p>
                              {th.experience && (
                                <span className="inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                  {th.experience}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                navigate('/theaters');
                                setIsExpanded(false);
                                setIsOpen(false);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold border border-gray-700 transition cursor-pointer shrink-0 flex items-center gap-1"
                            >
                              <Navigation className="w-3 h-3 text-primary" />
                              Route
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Render 1-Click Ticket Reservation Card if present */}
                  {!isCurrentlyStreaming && msg.cards?.booking && (
                    <BookingReservationCard
                      booking={msg.cards.booking}
                      onBookingConfirmed={handleBookingConfirmed}
                      navigate={navigate}
                    />
                  )}
                </div>
              );
            })}

            {/* 🌟 Multi-Stage Cinematic Thinking Animation & Shimmer Skeletons */}
            {loading && (
              <div className="space-y-4 animate-in fade-in duration-300">
                
                {/* Stage Ticker with Soundwave and Glowing Avatar */}
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-primary via-amber-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-primary/30 animate-pulse">
                      <Bot className="w-5 h-5" />
                    </div>
                    {/* Concentric Glow Wave */}
                    <span className="absolute -inset-1 rounded-2xl bg-primary/20 animate-ping opacity-75" />
                  </div>

                  <div className="bg-gray-900/90 border border-gray-800/90 rounded-3xl rounded-tl-none p-4 shadow-xl space-y-2 max-w-[85%]">
                    <div className="flex items-center gap-2.5">
                      {/* Dancing Soundwave Equalizer */}
                      <div className="flex items-end gap-0.5 h-4 w-4 shrink-0">
                        <span className="w-1 bg-primary rounded-full animate-wave-1" />
                        <span className="w-1 bg-amber-400 rounded-full animate-wave-2" />
                        <span className="w-1 bg-rose-400 rounded-full animate-wave-3" />
                        <span className="w-1 bg-primary rounded-full animate-wave-4" />
                      </div>

                      {/* Dynamic Stage Text (Prompt-Aware) */}
                      <p className="text-xs font-semibold text-gray-200 transition-all duration-300 flex items-center gap-1.5">
                        <span>{(activeLoadingStages[loadingStageIdx] || activeLoadingStages[0] || DEFAULT_LOADING_STAGES[0]).icon}</span>
                        <span>{(activeLoadingStages[loadingStageIdx] || activeLoadingStages[0] || DEFAULT_LOADING_STAGES[0]).text}</span>
                      </p>
                    </div>

                    {/* Progress Shimmer Bar */}
                    <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary via-amber-400 to-primary rounded-full w-2/3 animate-shimmer" />
                    </div>
                  </div>
                </div>

                {/* Shimmer Placeholder Cards Skeleton (Like Gemini / Perplexity) */}
                <div className="pl-12 grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-60">
                  <div className="bg-gray-900/50 border border-gray-800/60 rounded-2xl p-3 flex gap-3 animate-shimmer">
                    <div className="w-16 h-20 bg-gray-800/80 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3.5 bg-gray-800/90 rounded-md w-3/4" />
                      <div className="h-2.5 bg-gray-800/60 rounded-md w-1/2" />
                      <div className="h-6 bg-gray-800/40 rounded-lg w-full mt-2" />
                    </div>
                  </div>

                  <div className="hidden sm:flex bg-gray-900/50 border border-gray-800/60 rounded-2xl p-3 gap-3 animate-shimmer">
                    <div className="w-16 h-20 bg-gray-800/80 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3.5 bg-gray-800/90 rounded-md w-3/4" />
                      <div className="h-2.5 bg-gray-800/60 rounded-md w-1/2" />
                      <div className="h-6 bg-gray-800/40 rounded-lg w-full mt-2" />
                    </div>
                  </div>
                </div>

              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          {messages.length <= 2 && !loading && (
            <div className="px-4 md:px-6 py-2 border-t border-gray-800/60 bg-gray-950/80 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              {(Boolean(isAdmin || user?.role === 'admin' || location.pathname.startsWith('/admin'))
                ? [
                    "⚡ Batch add 10 trending movies (3.5hr gap)",
                    ...config.suggestedPrompts
                  ]
                : config.suggestedPrompts
              ).map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer shrink-0 whitespace-nowrap shadow-sm border ${
                    prompt.startsWith("⚡")
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-gray-900 hover:bg-gray-850 text-gray-300 hover:text-white border-gray-800 hover:border-primary/50'
                  }`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <div className="p-3 md:p-4 bg-gray-900/90 border-t border-gray-800 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              {/* Mic voice button */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                title={isListening ? "Listening... click to stop" : "Speak your message"}
                className={`p-2.5 rounded-xl border transition cursor-pointer shrink-0 ${
                  isListening
                    ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isListening ? "Listening to your voice..." : "Ask for recommendations, shows, or help..."}
                disabled={loading}
                className="flex-1 bg-gray-950 border border-gray-800 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary transition disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="p-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 disabled:opacity-40 disabled:hover:bg-primary transition cursor-pointer shrink-0"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Optional Trailer Modal */}
      {trailerMovie && (
        <TrailerModal
          isOpen={Boolean(trailerMovie)}
          onClose={() => setTrailerMovie(null)}
          movie={trailerMovie}
        />
      )}
    </>
  );
};

/**
 * ⚡ Smooth Character-by-Character Streaming Typewriter Component
 */
const TypewriterReveal = ({ text, onComplete, speed = 12 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!text) return;
    let currentIndex = 0;
    setDisplayedText('');
    setIsDone(false);

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        // Stream in small micro-batches of 2-3 characters for silky 60fps streaming
        const nextBatch = Math.min(currentIndex + 3, text.length);
        setDisplayedText(text.slice(0, nextBatch));
        currentIndex = nextBatch;
      } else {
        clearInterval(interval);
        setIsDone(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <div>
      <FormatMarkdown text={displayedText} />
      {!isDone && (
        <span className="inline-block w-1.5 h-3.5 bg-primary ml-1 animate-pulse rounded-sm align-middle" />
      )}
    </div>
  );
};

/**
 * Basic Markdown Formatter for rendering bold, italic, bullets, and links cleanly
 */
const FormatMarkdown = ({ text }) => {
  if (!text) return null;

  // Merge split markdown links across newlines: [Title]\n(http...) -> [Title](http...)
  const normalizedText = text.replace(/\[([^\]]+)\]\s*\n+\s*\((https?:\/\/[^\s\)]+)\)/g, '[$1]($2)');

  // Split lines
  const lines = normalizedText.split('\n');
  return (
    <div className="space-y-1.5 break-words [overflow-wrap:anywhere] overflow-hidden max-w-full">
      {lines.map((line, idx) => {
        let content = line;
        const isBullet = content.trim().startsWith('- ') || content.trim().startsWith('* ');
        if (isBullet) {
          content = content.trim().replace(/^[-*]\s+/, '');
        }

        return (
          <div key={idx} className={`break-words [overflow-wrap:anywhere] max-w-full ${isBullet ? 'flex items-start gap-2 pl-1' : ''}`}>
            {isBullet && <span className="text-primary font-bold mt-0.5 shrink-0">•</span>}
            <span
              className="break-words [overflow-wrap:anywhere] leading-relaxed block overflow-hidden max-w-full"
              dangerouslySetInnerHTML={{
                __html: parseInlineMarkdown(content)
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

function parseInlineMarkdown(str) {
  return str
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-gray-300">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-gray-800 text-amber-300 font-mono text-[11px]">$1</code>')
    // Markdown external links: [Title](https://...)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2.5 py-1 my-1 rounded-xl bg-gradient-to-r from-primary/25 to-amber-500/25 hover:from-primary/40 hover:to-amber-500/40 text-amber-300 hover:text-white border border-amber-500/40 font-semibold text-xs break-all transition shadow-sm"><span>$1</span><span class="text-[10px]">↗</span></a>')
    // Internal app links: [Title](/route)
    .replace(/\[([^\]]+)\]\((\/[^\s\)]+)\)/g, '<a href="$2" class="inline-flex items-center gap-1 text-primary hover:text-amber-300 font-semibold underline underline-offset-2 break-all transition"><span>$1</span></a>')
    // Bare URLs not preceded by href="
    .replace(/(?<!href=")(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-amber-400 hover:text-amber-300 font-mono text-xs underline break-all inline-block max-w-full truncate align-bottom">$1 ↗</a>');
}

export default ChatBotWidget;
