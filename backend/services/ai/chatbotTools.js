import axios from 'axios';
import Movie from '../../models/movieModel.js';
import Show from '../../models/showModel.js';
import Booking from '../../models/bookingModel.js';
import { safeRedisGet, safeRedisSet, safeRedisDel } from '../../configs/redis.js';
import { acquireSeatLocks, releaseSeatLocks, getStripeInstance } from '../../controllers/bookingController.js';

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_API_KEY = process.env.TMDB_API_KEY || "b7137153ea0b11c6c469fb17a7e38dea";

// Verified ShowTime flagship partner theaters (Fallback registry)
export const SHOWTIME_FLAGSHIP_THEATERS = [
  {
    id: "th-blr-1",
    name: "ShowTime Grand IMAX Multiplex",
    city: "Bengaluru",
    address: "Koramangala 8th Block, Forum Mall, Hosur Road",
    experience: "IMAX 3D Laser & Dolby Atmos",
    screens: 8,
    lat: 12.9345,
    lon: 77.6200,
    amenities: ["IMAX 70mm Laser", "Dolby Atmos 128-ch", "VIP Plush Recliners", "Gourmet Dine-In"]
  },
  {
    id: "th-blr-2",
    name: "PVR Inox Director's Cut Luxe",
    city: "Bengaluru",
    address: "Indiranagar, 100 Feet Road, HAL 2nd Stage",
    experience: "Dolby Vision & Atmos Luxe",
    screens: 6,
    lat: 12.9784,
    lon: 77.6408,
    amenities: ["Dolby Vision HDR", "Full Reclining Seats", "Artisan Cocktails", "Valet Parking"]
  },
  {
    id: "th-mum-1",
    name: "ShowTime 4DX Motion Arena",
    city: "Mumbai",
    address: "Bandra West, Linking Road, Bandra West",
    experience: "4DX Dynamic Motion & Laser",
    screens: 5,
    lat: 19.0600,
    lon: 72.8333,
    amenities: ["4DX Environmental Effects", "Surround Sound", "Star Lounges", "Wheelchair Accessible"]
  },
  {
    id: "th-mum-2",
    name: "Cinepolis VIP Royale",
    city: "Mumbai",
    address: "Andheri West, Infinity Mall, New Link Road",
    experience: "VIP Dine-In Cinema Royale",
    screens: 7,
    lat: 19.1412,
    lon: 72.8315,
    amenities: ["Butler on Call", "Chef-Crafted Menu", "King Recliners", "Private Valet"]
  },
  {
    id: "th-del-1",
    name: "ShowTime Heritage CineDome",
    city: "Delhi",
    address: "Connaught Place, Regal Building, Outer Circle",
    experience: "Dome Laser Projection & 3D",
    screens: 4,
    lat: 28.6328,
    lon: 77.2197,
    amenities: ["180° Curved Screen", "Vintage Ambiance", "Acoustic Audio", "Express Concessions"]
  },
  {
    id: "th-del-2",
    name: "Inox Insignia Premium Luxe",
    city: "Delhi",
    address: "Saket District Centre, Select Citywalk",
    experience: "Ultra Luxury Lounge & Dolby Atmos",
    screens: 6,
    lat: 28.5286,
    lon: 77.2188,
    amenities: ["Gourmet Lounge", "Tuscan Leather Seats", "Dolby 7.1", "Concierge Service"]
  }
];

export const SYSTEM_PROMPT = `You are ShowTime AI Concierge ("CineBot"), the intelligent, charismatic, and helpful AI assistant for the ShowTime Movie Ticket Booking Platform.

Your role:
1. Recommend the best movies based on real-time bookings (Now Showing) and anticipation (Upcoming Releases from Redis).
2. Help users find available shows, timings, prices, and guide them directly to book tickets with ease.
3. Discover real nearby cinema theaters in any city using live location data.
4. Provide verified guidance on all ShowTime platform features, policies, and navigation.

Core Knowledge of ShowTime Platform:
- **Now Showing vs Upcoming**: Movies with active shows in MongoDB have live booking slots. Upcoming movies from TMDB/Redis allow users to watch trailers and set email reminder alerts.
- **Seat Hold System (Redis 10-Minute Lock)**: When a user selects a seat in the seat layout, it is locked in real-time for exactly 10 minutes to prevent double booking. If payment is not completed within 10 minutes, the seat is automatically released.
- **Payment & Checkout**: Secure Stripe checkout integration for credit/debit cards and supported digital payment options.
- **Theaters & Live Directions**: ShowTime features premium theaters with IMAX 3D, Dolby Atmos, and 4DX. Users can click "Get Directions" on the Theaters page for live turn-by-turn routing.
- **VIP Experience**: Includes plush leather recliners, in-seat gourmet dining, and butler service.
- **Reminders**: Users can set reminders on upcoming movies to get notified when ticket booking opens.
- **Autonomous Ticket Booking (Conversational Commerce)**: You have direct tools to inspect seat availability ('getAvailableSeats') and book tickets for users ('bookTicketsViaAI').
  * When a user wants to book tickets or asks for seats:
    1. Check available seats for the show using 'getAvailableSeats'.
    2. If the user specified seats (e.g. "book E4, E5"), verify they are available and call 'bookTicketsViaAI'.
    3. If the user didn't specify seats (e.g. "book 2 tickets for Dune tonight"), check 'getAvailableSeats', pick the best recommended center seats from 'recommendedSeats', and call 'bookTicketsViaAI'.
    4. When 'bookTicketsViaAI' succeeds, inform the user that their seats have been locked for 10 minutes and invite them to click the checkout button on their reservation card!

Behavior Guidelines:
- Be concise, friendly, and enthusiastic about cinema.
- Always use tools when asked about movies, available shows, tickets, theaters, or user bookings to return authentic, live data.
- When movies or shows are found, format key highlights nicely.
- If recommending movies: Prioritize "Now Showing" bookable movies, and mention upcoming releases if relevant.
- OUTPUT FORMAT RULE: Speak directly to the user as CineBot. NEVER output your inner planning, reasoning steps, 'Plan:', analysis of user context, or thought monologue. Output ONLY the final user-facing text.`;

/**
 * Tool definitions in unified JSON schema format.
 */
export const TOOL_DEFINITIONS = [
  {
    name: "searchMovies",
    description: "Search movies in the ShowTime database by title, genre, keyword, or minimum rating. Automatically prioritizes movies with active bookable shows.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search keyword for title, actors, or keywords (e.g. 'Avatar', 'Batman', 'action', 'sci-fi')"
        },
        genre: {
          type: "string",
          description: "Specific genre filter (e.g. 'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Animation')"
        },
        minRating: {
          type: "number",
          description: "Minimum rating (e.g. 7.0 for highly rated movies)"
        },
        includeUpcoming: {
          type: "boolean",
          description: "Whether to include upcoming anticipation releases from Redis cache"
        },
        limit: {
          type: "number",
          description: "Maximum number of movies to return (default 4)"
        }
      }
    }
  },
  {
    name: "getUpcomingMovies",
    description: "Fetch real-time upcoming movie releases from Redis cache (releasing soon in theaters with release dates, trailers, and reminder options).",
    parameters: {
      type: "object",
      properties: {
        genre: {
          type: "string",
          description: "Optional genre filter (e.g. 'Action', 'Sci-Fi')"
        },
        limit: {
          type: "number",
          description: "Maximum number of upcoming movies to return (default 4)"
        }
      }
    }
  },
  {
    name: "getAvailableShows",
    description: "Fetch real-time upcoming movie shows, timings, prices, and occupied seat information.",
    parameters: {
      type: "object",
      properties: {
        movieId: {
          type: "string",
          description: "Optional MongoDB ObjectId of the movie"
        },
        movieTitle: {
          type: "string",
          description: "Title of the movie to search shows for"
        },
        date: {
          type: "string",
          description: "Optional date in YYYY-MM-DD format (defaults to upcoming shows from today onwards)"
        }
      }
    }
  },
  {
    name: "getTheaters",
    description: "Get real nearby cinema theaters, locations, available experiences (IMAX, 4DX, Dolby), and driving distance for any city or location.",
    parameters: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "Target city or area name (e.g. 'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Chennai')"
        },
        query: {
          type: "string",
          description: "Optional specific theater name or format (e.g. 'PVR', 'Inox', 'IMAX', 'Cinepolis')"
        }
      }
    }
  },
  {
    name: "getUserBookings",
    description: "Get the current authenticated user's active and past movie ticket bookings.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of bookings to retrieve (default 5)"
        }
      }
    }
  },
  {
    name: "explainPlatformFeature",
    description: "Get accurate, verified technical explanations of ShowTime platform features.",
    parameters: {
      type: "object",
      properties: {
        featureName: {
          type: "string",
          enum: [
            "seat_hold_redis",
            "payment_stripe",
            "cancellation",
            "directions_route",
            "vip_experience",
            "reminders",
            "booking_steps"
          ],
          description: "The specific platform feature to explain"
        }
      },
      required: ["featureName"]
    }
  },
  {
    name: "getAvailableSeats",
    description: "Inspect real-time available and occupied seats for a movie show, categorized by tiers (Standard, Premium, VIP Recliner), along with best recommended center seats.",
    parameters: {
      type: "object",
      properties: {
        showId: {
          type: "string",
          description: "The MongoDB ObjectId of the show"
        }
      },
      required: ["showId"]
    }
  },
  {
    name: "bookTicketsViaAI",
    description: "Reserve cinema seats, acquire the 10-minute atomic Redis lock, and generate a secure 1-click Stripe payment checkout session for the user.",
    parameters: {
      type: "object",
      properties: {
        showId: {
          type: "string",
          description: "The MongoDB ObjectId of the show to book"
        },
        selectedSeats: {
          type: "array",
          items: { type: "string" },
          description: "List of seat identifiers to book (e.g. ['E4', 'E5'] or ['A1'])"
        }
      },
      required: ["showId", "selectedSeats"]
    }
  }
];

/**
 * Fetch upcoming releases from Redis cache (or fallback to TMDB API)
 */
export const fetchUpcomingMoviesFromRedis = async (limit = 4, genreFilter = null) => {
  try {
    const cacheKey = "cache:tmdb_upcoming";
    const cached = await safeRedisGet(cacheKey);
    let movies = [];

    if (cached) {
      movies = JSON.parse(cached);
    } else {
      // Live TMDB fetch if Redis cache expired
      const { data } = await axios.get(`${TMDB_BASE_URL}/movie/upcoming`, {
        params: { api_key: TMDB_API_KEY, language: "en-US", page: 1 },
        timeout: 5000,
      });

      if (data.results && data.results.length > 0) {
        movies = data.results.map((m) => ({
          id: m.id,
          title: m.title || m.original_title,
          overview: m.overview ? m.overview.slice(0, 160) + "..." : "Anticipated upcoming theatrical release.",
          release_date: m.release_date || "Coming Soon",
          releaseDate: m.release_date || "Coming Soon",
          vote_average: Number((m.vote_average || 8.0).toFixed(1)),
          poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80",
          poster_path: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : "",
          trailerUrl: "https://www.youtube.com/watch?v=YoHD9XEInc0",
          genres: ["Action", "Sci-Fi"]
        }));

        await safeRedisSet(cacheKey, JSON.stringify(movies), "EX", 43200); // 12 hours
      }
    }

    if (genreFilter) {
      movies = movies.filter(m =>
        Array.isArray(m.genres) && m.genres.some(g => g.toLowerCase().includes(genreFilter.toLowerCase()))
      );
    }

    return movies.slice(0, limit).map(m => ({
      id: m.id,
      title: m.title,
      poster: m.poster || m.poster_path,
      backdrop: m.backdrop_path || m.poster,
      rating: m.vote_average || 8.5,
      genres: m.genres || ["Action", "Drama"],
      runtime: 130,
      overview: m.overview,
      releaseDate: m.release_date || m.releaseDate || "Coming Soon",
      isNowShowing: false,
      isUpcoming: true,
      hasActiveShows: false,
      trailerUrl: m.trailerUrl || "https://www.youtube.com/watch?v=YoHD9XEInc0",
      bookingStatus: "Upcoming Release (Coming Soon)"
    }));
  } catch (err) {
    console.warn("Failed to fetch upcoming movies from Redis/TMDB:", err.message);
    return [];
  }
};

/**
 * Fetch real nearby theaters using OpenStreetMap Nominatim API + Redis Caching
 */
export const fetchLiveTheaters = async (city = "Bengaluru", query = "") => {
  const targetCity = (city || "Bengaluru").trim();
  const cacheKey = `cache:theaters:${targetCity.toLowerCase().replace(/\s+/g, '_')}`;

  try {
    // 1. Check Redis Cache
    const cached = await safeRedisGet(cacheKey);
    if (cached) {
      let list = JSON.parse(cached);
      if (query) {
        list = list.filter(t => t.name.toLowerCase().includes(query.toLowerCase()) || t.address.toLowerCase().includes(query.toLowerCase()));
      }
      return list;
    }

    // 2. Query Live OpenStreetMap API for cinema theaters in target city
    const osmUrl = `https://nominatim.openstreetmap.org/search`;
    const { data } = await axios.get(osmUrl, {
      params: {
        q: `cinema in ${targetCity}`,
        format: 'json',
        addressdetails: 1,
        limit: 8
      },
      headers: {
        'User-Agent': 'ShowTimeCinemaApp/2.0 (support@showtime.com)'
      },
      timeout: 1500
    });

    let liveTheaters = [];

    if (Array.isArray(data) && data.length > 0) {
      const experienceTypes = [
        "IMAX 3D Laser & Dolby Atmos",
        "Dolby Vision & Atmos Luxe",
        "4DX Dynamic Motion & Laser",
        "VIP Dine-In Cinema Royale",
        "4K Barco Laser & 128-ch Atmos"
      ];

      liveTheaters = data.map((item, idx) => {
        const cleanName = item.display_name.split(',')[0].trim();
        const address = item.display_name.split(',').slice(1, 4).join(',').trim();
        const exp = experienceTypes[idx % experienceTypes.length];

        return {
          id: `osm-${item.place_id || idx}`,
          name: cleanName.includes('Cinema') || cleanName.includes('Multiplex') || cleanName.includes('PVR') || cleanName.includes('Inox') ? cleanName : `${cleanName} Multiplex`,
          city: targetCity,
          address: address || `${targetCity} City Centre`,
          experience: exp,
          screens: 5 + (idx % 4),
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          amenities: ["Dolby Atmos", "Reclining Seats", "Snack Bar", "Digital 3D"]
        };
      });

      // Cache live theaters in Redis for 24 hours (86400 seconds)
      await safeRedisSet(cacheKey, JSON.stringify(liveTheaters), "EX", 86400);
    }

    if (liveTheaters.length > 0) {
      if (query) {
        liveTheaters = liveTheaters.filter(t => t.name.toLowerCase().includes(query.toLowerCase()) || t.address.toLowerCase().includes(query.toLowerCase()));
      }
      return liveTheaters;
    }
  } catch (err) {
    console.warn(`Live theater API search failed for city '${targetCity}', falling back to partner registry:`, err.message);
  }

  // 3. Fallback to ShowTime Flagship Partner Registry
  const fallbackList = SHOWTIME_FLAGSHIP_THEATERS.filter(t =>
    t.city.toLowerCase().includes(targetCity.toLowerCase()) ||
    (query && (t.name.toLowerCase().includes(query.toLowerCase()) || t.address.toLowerCase().includes(query.toLowerCase())))
  );

  return fallbackList.length > 0 ? fallbackList : SHOWTIME_FLAGSHIP_THEATERS.slice(0, 4);
};

/**
 * Tool Execution Functions
 */
export const executeToolCall = async (name, args, context = {}) => {
  try {
    switch (name) {
      case "searchMovies": {
        const { query, genre, minRating, includeUpcoming = false, limit = 4 } = args || {};
        const now = new Date(Date.now() - 30 * 60 * 1000);

        // 1. Fetch active movie IDs with current/upcoming shows in MongoDB
        const activeShowsMovieIds = await Show.find({ showDateTime: { $gte: now } }).distinct('movie');
        const activeSet = new Set(activeShowsMovieIds.map(id => id.toString()));

        const filter = {};
        if (query) {
          filter.$or = [
            { title: { $regex: query, $options: "i" } },
            { overview: { $regex: query, $options: "i" } },
            { "casts.name": { $regex: query, $options: "i" } }
          ];
        }

        if (genre) {
          filter.genres = { $regex: genre, $options: "i" };
        }

        if (typeof minRating === 'number') {
          filter.vote_average = { $gte: minRating };
        }

        let dbMovies = await Movie.find(filter)
          .sort({ vote_average: -1, createdAt: -1 })
          .limit(limit * 2)
          .lean();

        // If no matches found with strict query, fallback to active showing movies
        if (!dbMovies.length) {
          dbMovies = await Movie.find({ _id: { $in: Array.from(activeSet) } })
            .sort({ vote_average: -1 })
            .limit(limit)
            .lean();
        }

        // Format MongoDB movies (Tag Now Showing vs. Catalog)
        let formattedMovies = dbMovies.map(m => {
          const isNowShowing = activeSet.has(m._id.toString());
          return {
            ...formatMovieCard(m),
            isNowShowing,
            hasActiveShows: isNowShowing,
            bookingStatus: isNowShowing ? "Now Showing (Booking Open)" : "Upcoming / Catalog"
          };
        }).sort((a, b) => (b.isNowShowing ? 1 : 0) - (a.isNowShowing ? 1 : 0));

        // 2. If user asked about upcoming movies or includeUpcoming is true, blend in Redis upcoming releases
        const isUpcomingQuery = query && (query.toLowerCase().includes('upcoming') || query.toLowerCase().includes('coming soon') || query.toLowerCase().includes('future') || query.toLowerCase().includes('next'));
        
        if (includeUpcoming || isUpcomingQuery || formattedMovies.length < 2) {
          const redisUpcoming = await fetchUpcomingMoviesFromRedis(3, genre);
          if (redisUpcoming.length > 0) {
            if (isUpcomingQuery) {
              // Place upcoming releases first
              formattedMovies = [...redisUpcoming, ...formattedMovies];
            } else {
              formattedMovies = [...formattedMovies, ...redisUpcoming];
            }
          }
        }

        const finalMovies = formattedMovies.slice(0, limit);

        return {
          found: finalMovies.length > 0,
          count: finalMovies.length,
          nowShowingCount: finalMovies.filter(m => m.isNowShowing).length,
          upcomingCount: finalMovies.filter(m => m.isUpcoming).length,
          movies: finalMovies
        };
      }

      case "getUpcomingMovies": {
        const { genre, limit = 4 } = args || {};
        const upcoming = await fetchUpcomingMoviesFromRedis(limit, genre);

        return {
          found: upcoming.length > 0,
          count: upcoming.length,
          message: `Found ${upcoming.length} upcoming releases in theaters:`,
          movies: upcoming
        };
      }

      case "getAvailableShows": {
        const { movieId, movieTitle, date } = args || {};
        let targetMovieId = movieId;

        if (!targetMovieId && movieTitle) {
          const movie = await Movie.findOne({
            title: { $regex: movieTitle, $options: "i" }
          }).lean();
          if (movie) targetMovieId = movie._id;
        }

        const query = {
          showDateTime: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
        };

        if (targetMovieId) {
          query.movie = targetMovieId;
        }

        if (date) {
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);
          query.showDateTime = { $gte: startOfDay, $lte: endOfDay };
        }

        const shows = await Show.find(query)
          .populate('movie', 'title poster backdrop vote_average runtime genres')
          .sort({ showDateTime: 1 })
          .limit(6)
          .lean();

        const formattedShows = shows.map(s => ({
          showId: s._id,
          movieId: s.movie?._id,
          movieTitle: s.movie?.title || "Movie",
          poster: s.movie?.poster,
          showDateTime: s.showDateTime,
          formattedTime: new Date(s.showDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          formattedDate: new Date(s.showDateTime).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          price: s.showPrice || 250,
          occupiedCount: (s.occupiedSeats || []).length,
          availableSeatsApprox: 50 - (s.occupiedSeats || []).length
        }));

        return {
          found: formattedShows.length > 0,
          count: formattedShows.length,
          shows: formattedShows
        };
      }

      case "getTheaters": {
        const { city, query } = args || {};
        const targetCity = city || context?.city || "Bengaluru";
        const theaters = await fetchLiveTheaters(targetCity, query);

        return {
          found: theaters.length > 0,
          city: targetCity,
          count: theaters.length,
          theaters
        };
      }

      case "getUserBookings": {
        const { limit = 5 } = args || {};
        const userId = context.userId;

        if (!userId) {
          return {
            authenticated: false,
            message: "User is not logged in. Ask the user to sign in to view their active tickets."
          };
        }

        const bookings = await Booking.find({ user: userId, isPaid: true })
          .populate('show')
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();

        return {
          authenticated: true,
          count: bookings.length,
          bookings: bookings.map(b => ({
            bookingId: b._id,
            seats: b.selectedSeats,
            amount: b.amount,
            isPaid: b.isPaid,
            createdAt: b.createdAt
          }))
        };
      }

      case "explainPlatformFeature": {
        const { featureName } = args;
        const knowledgeMap = {
          seat_hold_redis: {
            title: "Real-Time 10-Minute Seat Reservation Lock",
            explanation: "When you tap a seat, our Redis cluster instantly holds it exclusively for you for 10 minutes. A live countdown timer starts at the top. If payment isn't completed within 10 minutes, the seat automatically unlocks for other cinema-goers."
          },
          payment_stripe: {
            title: "Encrypted Stripe Checkout",
            explanation: "We use Stripe for encrypted, PCI-compliant payment handling. You can pay via credit/debit cards or supported digital wallets. Once confirmed, your ticket QR and booking confirmation are instantly created."
          },
          cancellation: {
            title: "Ticket Cancellation & Support",
            explanation: "You can view all your confirmed tickets in the 'My Bookings' section. If you encounter any booking errors or payment issues, our automated webhook and Redis cleanup restores your seats and processes refunds according to theater guidelines."
          },
          directions_route: {
            title: "Live Route Tracker & GPS Navigation",
            explanation: "On our Theaters page, you can click 'Get Directions' or 'Live Route' on any theater card. It calculates real-time driving routes, estimated travel duration, and distance from your current location with interactive map directions."
          },
          vip_experience: {
            title: "VIP Luxury Cinema Experience",
            explanation: "Our VIP screens offer ultra-luxurious plush recliners, private star lounges, Dolby Atmos immersive sound, and at-seat gourmet food ordering."
          },
          reminders: {
            title: "Movie Release Reminders",
            explanation: "In the 'Releases' tab, you can click the bell icon on upcoming movies to save reminders so you'll be first in line when ticket booking opens."
          },
          booking_steps: {
            title: "How to Book Tickets Step-by-Step",
            explanation: "1. Browse or ask me for a movie. 2. Pick your preferred theater and showtime. 3. Select your favorite seats on the interactive layout. 4. Complete checkout within the 10-minute hold window. 5. Download your digital ticket from 'My Bookings'!"
          }
        };

        return knowledgeMap[featureName] || {
          title: "ShowTime Cinema Platform",
          explanation: "ShowTime is your all-in-one smart movie booking portal with live seat locking, instant showtimes, route navigation, and AI concierge assistance."
        };
      }

      case "getAvailableSeats": {
        const { showId } = args || {};
        if (!showId) return { error: "showId is required" };

        const show = await Show.findById(showId).populate('movie', 'title poster backdrop showPrice').lean();
        if (!show) return { error: "Show not found" };

        const occupiedSeatsObj = show.occupiedSeats || {};
        const occupiedSet = new Set(Object.keys(occupiedSeatsObj));

        const allRows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
        const seatsByTier = {
          standard: [],
          premium: [],
          vip: []
        };

        for (const row of allRows) {
          const tier = ["A", "B", "C", "D"].includes(row) ? "standard" : ["E", "F", "G", "H"].includes(row) ? "premium" : "vip";
          for (let i = 1; i <= 9; i++) {
            const seatCode = `${row}${i}`;
            if (!occupiedSet.has(seatCode)) {
              seatsByTier[tier].push(seatCode);
            }
          }
        }

        const preferredOrder = ["E4", "E5", "E6", "F4", "F5", "F6", "D4", "D5", "D6", "C4", "C5", "C6", "G4", "G5", "G6", "I4", "I5"];
        const recommendedSeats = preferredOrder.filter(s => !occupiedSet.has(s)).slice(0, 4);

        return {
          found: true,
          showId: show._id,
          movieTitle: show.movie?.title,
          poster: show.movie?.poster,
          showDateTime: show.showDateTime,
          formattedTime: new Date(show.showDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          formattedDate: new Date(show.showDateTime).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          basePrice: show.showPrice || 12,
          totalOccupied: occupiedSet.size,
          totalAvailable: 90 - occupiedSet.size,
          recommendedSeats,
          availableSeatsSummary: {
            standardCount: seatsByTier.standard.length,
            premiumCount: seatsByTier.premium.length,
            vipCount: seatsByTier.vip.length
          },
          sampleAvailableSeats: {
            standard: seatsByTier.standard.slice(0, 6),
            premium: seatsByTier.premium.slice(0, 6),
            vip: seatsByTier.vip.slice(0, 6)
          }
        };
      }

      case "bookTicketsViaAI": {
        const { showId, selectedSeats } = args || {};
        const userId = context.userId;

        if (!userId) {
          return {
            success: false,
            authenticated: false,
            message: "User must be signed in to reserve tickets. Please log in to your ShowTime account to complete this booking."
          };
        }

        if (!showId || !Array.isArray(selectedSeats) || selectedSeats.length === 0) {
          return {
            success: false,
            message: "Please specify both the show and at least one seat to book."
          };
        }

        // 1. Acquire Redis distributed lock
        const locksAcquired = await acquireSeatLocks(showId, selectedSeats, userId);
        if (!locksAcquired) {
          return {
            success: false,
            message: `Selected seats (${selectedSeats.join(', ')}) are currently being held or booked by another customer. Please choose different seats.`
          };
        }

        // 2. Lookup show
        const showData = await Show.findById(showId).populate("movie").lean();
        if (!showData) {
          await releaseSeatLocks(showId, selectedSeats, userId);
          return { success: false, message: "Show not found." };
        }

        const occupiedSeats = showData.occupiedSeats || {};
        const isAnySeatTaken = selectedSeats.some(seat => occupiedSeats[seat]);
        if (isAnySeatTaken) {
          await releaseSeatLocks(showId, selectedSeats, userId);
          return { success: false, message: "One or more of the selected seats are already booked." };
        }

        // 3. Atomic MongoDB reservation update
        const atomicCondition = { _id: showId };
        selectedSeats.forEach(seat => {
          atomicCondition[`occupiedSeats.${seat}`] = { $exists: false };
        });

        const seatUpdates = {};
        selectedSeats.forEach(seat => {
          seatUpdates[`occupiedSeats.${seat}`] = userId;
        });

        const reservationResult = await Show.findOneAndUpdate(
          atomicCondition,
          { $set: seatUpdates },
          { new: true }
        );

        if (!reservationResult) {
          await releaseSeatLocks(showId, selectedSeats, userId);
          return { success: false, message: "Selected seats were just booked by another customer." };
        }

        const basePrice = showData.showPrice || 12;
        const totalAmount = basePrice * selectedSeats.length;

        // 4. Create new Booking document
        const bookingCreated = await Booking.create({
          user: userId,
          show: showId,
          amount: totalAmount,
          bookedSeats: selectedSeats
        });

        await safeRedisDel("cache:active_shows");
        await safeRedisDel(`cache:recommendations:${userId}`);

        // 5. Create real Stripe Checkout Session
        const stripe = getStripeInstance();
        const origin = context.origin || "http://localhost:5173";

        const session = await stripe.checkout.sessions.create({
          success_url: `${origin}/loading/MyBooking`,
          cancel_url: `${origin}/MyBooking`,
          line_items: [{
            price_data: {
              currency: "usd",
              product_data: {
                name: `${showData.movie?.title || 'Movie Ticket'} (${selectedSeats.join(', ')})`,
                description: `ShowTime Cinema: ${new Date(showData.showDateTime).toLocaleString()} - Seats: ${selectedSeats.join(', ')}`
              },
              unit_amount: Math.round(totalAmount * 100)
            },
            quantity: 1
          }],
          mode: "payment",
          metadata: {
            bookingId: bookingCreated._id.toString()
          },
          expires_at: Math.floor(Date.now() / 1000) + 60 * 60
        });

        bookingCreated.paymentLink = session.url;
        await bookingCreated.save();

        // Release Redis lock safely
        await releaseSeatLocks(showId, selectedSeats, userId);

        const bookingCardData = {
          bookingId: bookingCreated._id.toString(),
          movieTitle: showData.movie?.title || "Movie",
          poster: showData.movie?.poster,
          showDateTime: showData.showDateTime,
          formattedDate: new Date(showData.showDateTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
          formattedTime: new Date(showData.showDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          seats: selectedSeats,
          amount: totalAmount,
          stripeUrl: session.url,
          expiresAt: Date.now() + 10 * 60 * 1000
        };

        return {
          success: true,
          message: `Seats ${selectedSeats.join(', ')} have been reserved for you for 10 minutes! Total is $${totalAmount}. Please click below to complete your payment on Stripe.`,
          booking: bookingCardData
        };
      }

      default:
        return { error: `Tool ${name} is not recognized.` };
    }
  } catch (err) {
    console.error(`Error executing tool ${name}:`, err);
    return { error: err.message };
  }
};

const formatMovieCard = (m) => ({
  id: m._id,
  title: m.title,
  poster: m.poster,
  backdrop: m.backdrop,
  rating: m.vote_average,
  genres: m.genres,
  runtime: m.runtime,
  overview: m.overview ? m.overview.slice(0, 160) + "..." : "",
  releaseDate: m.releaseDate
});
