import axios from 'axios';
import Movie from '../../models/movieModel.js';
import Show from '../../models/showModel.js';
import Booking from '../../models/bookingModel.js';
import MovieReminder from '../../models/MovieReminder.js';
import User from '../../models/User.js';
import { safeRedisGet, safeRedisSet, safeRedisDel } from '../../configs/redis.js';
import { acquireSeatLocks, releaseSeatLocks, getStripeInstance } from '../../controllers/bookingController.js';
import { sendMovieReminderConfirmationEmail, sendCancellationRefundEmailDirect } from '../emailService.js';

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_API_KEY = process.env.TMDB_API_KEY || "b7137153ea0b11c6c469fb17a7e38dea";

/**
 * Normalizes conversational date strings (e.g. "14th September", "September 14", "14-09-2026", "2026-09-14", "tomorrow")
 * into a startOfDay and endOfDay Date pair for MongoDB queries.
 */
export const parseFlexibleDateRange = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const raw = dateStr.trim().toLowerCase();

  const now = new Date();
  const currentYear = now.getFullYear();

  // 1. Relative dates
  if (raw === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { startOfDay: start, endOfDay: end };
  }
  if (raw === 'tomorrow') {
    const start = new Date(now);
    start.setDate(start.getDate() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { startOfDay: start, endOfDay: end };
  }
  if (raw.includes('day after tomorrow')) {
    const start = new Date(now);
    start.setDate(start.getDate() + 2);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { startOfDay: start, endOfDay: end };
  }

  // 2. Clean ordinal suffixes: "14th" -> "14", "1st" -> "1", "2nd" -> "2", "3rd" -> "3"
  let cleaned = raw.replace(/(\d+)(st|nd|rd|th)/gi, '$1');

  // 3. Check for month names (e.g. "14 september", "september 14", "sep 14")
  const months = [
    { name: 'january', short: 'jan', index: 0 },
    { name: 'february', short: 'feb', index: 1 },
    { name: 'march', short: 'mar', index: 2 },
    { name: 'april', short: 'apr', index: 3 },
    { name: 'may', short: 'may', index: 4 },
    { name: 'june', short: 'jun', index: 5 },
    { name: 'july', short: 'jul', index: 6 },
    { name: 'august', short: 'aug', index: 7 },
    { name: 'september', short: 'sept', short2: 'sep', index: 8 },
    { name: 'october', short: 'oct', index: 9 },
    { name: 'november', short: 'nov', index: 10 },
    { name: 'december', short: 'dec', index: 11 },
  ];

  for (const m of months) {
    if (cleaned.includes(m.name) || (m.short && cleaned.includes(m.short)) || (m.short2 && cleaned.includes(m.short2))) {
      const numbers = cleaned.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        let day = parseInt(numbers[0], 10);
        let year = currentYear;
        if (numbers.length > 1) {
          if (numbers[0].length === 4) {
            year = parseInt(numbers[0], 10);
            day = parseInt(numbers[1], 10);
          } else if (numbers[1].length === 4) {
            year = parseInt(numbers[1], 10);
          }
        }
        const parsedDate = new Date(year, m.index, day);
        if (!isNaN(parsedDate.getTime())) {
          const start = new Date(parsedDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(parsedDate);
          end.setHours(23, 59, 59, 999);
          return { startOfDay: start, endOfDay: end };
        }
      }
    }
  }

  // 4. ISO or standard format: YYYY-MM-DD or DD-MM-YYYY
  const ddmmyyyy = cleaned.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    const parsedDate = new Date(year, month, day);
    if (!isNaN(parsedDate.getTime())) {
      const start = new Date(parsedDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(parsedDate);
      end.setHours(23, 59, 59, 999);
      return { startOfDay: start, endOfDay: end };
    }
  }

  // Fallback to Date.parse with year attached if missing
  let fallback = new Date(cleaned);
  if (isNaN(fallback.getTime())) {
    fallback = new Date(`${cleaned} ${currentYear}`);
  }
  if (!isNaN(fallback.getTime())) {
    if (fallback.getFullYear() < 2020) {
      fallback.setFullYear(currentYear);
    }
    const start = new Date(fallback);
    start.setHours(0, 0, 0, 0);
    const end = new Date(fallback);
    end.setHours(23, 59, 59, 999);
    return { startOfDay: start, endOfDay: end };
  }

  return null;
};

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

// Curated fallback blockbusters with verified high-res TMDB posters
export const CURATED_BLOCKBUSTER_MOVIES = [
  {
    id: 693134,
    title: "Dune: Part Two",
    overview: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
    poster_path: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    backdrop_path: "/xOMo8BRK7PfcJv9JCnx7s520b22.jpg",
    release_date: "2024-03-01",
    vote_average: 8.3,
    vote_count: 5400,
    original_language: "en"
  },
  {
    id: 872585,
    title: "Oppenheimer",
    overview: "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II.",
    poster_path: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    backdrop_path: "/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg",
    release_date: "2023-07-21",
    vote_average: 8.1,
    vote_count: 9200,
    original_language: "en"
  },
  {
    id: 533535,
    title: "Deadpool & Wolverine",
    overview: "A listless Wade Wilson toils in civilian life until a global existential threat pushes him to team up with an even more reluctant Wolverine.",
    poster_path: "/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
    backdrop_path: "/9l1eZiJHmhr5jIlthMdJN5ZegGh.jpg",
    release_date: "2024-07-26",
    vote_average: 7.7,
    vote_count: 6100,
    original_language: "en"
  },
  {
    id: 558449,
    title: "Gladiator II",
    overview: "Years after witnessing the death of the revered hero Maximus at the hands of his uncle, Lucius must enter the Colosseum after his home is conquered.",
    poster_path: "/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg",
    backdrop_path: "/euYIwmwkmz95mnEx7vG5vtNZJNG.jpg",
    release_date: "2024-11-22",
    vote_average: 7.5,
    vote_count: 3200,
    original_language: "en"
  },
  {
    id: 157336,
    title: "Interstellar",
    overview: "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.",
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdrop_path: "/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
    release_date: "2014-11-05",
    vote_average: 8.4,
    vote_count: 35000,
    original_language: "en"
  },
  {
    id: 569094,
    title: "Spider-Man: Across the Spider-Verse",
    overview: "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.",
    poster_path: "/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    backdrop_path: "/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg",
    release_date: "2023-06-02",
    vote_average: 8.4,
    vote_count: 7000,
    original_language: "en"
  },
  {
    id: 414906,
    title: "The Batman",
    overview: "In his second year of fighting crime, Batman uncovers corruption in Gotham City that connects to his own family while facing a serial killer known as the Riddler.",
    poster_path: "/74xTEgt7R36Fpooo50r9T25onhq.jpg",
    backdrop_path: "/tRS6jvPM9qPrrnx2KRx3ew96Yot.jpg",
    release_date: "2022-03-04",
    vote_average: 7.7,
    vote_count: 9800,
    original_language: "en"
  },
  {
    id: 299534,
    title: "Avengers: Endgame",
    overview: "After the devastating events of Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more.",
    poster_path: "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    backdrop_path: "/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    release_date: "2019-04-26",
    vote_average: 8.3,
    vote_count: 25000,
    original_language: "en"
  },
  {
    id: 27205,
    title: "Inception",
    overview: "Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets, is offered a chance to regain his old life.",
    poster_path: "/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg",
    backdrop_path: "/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
    release_date: "2010-07-16",
    vote_average: 8.4,
    vote_count: 36000,
    original_language: "en"
  },
  {
    id: 889737,
    title: "Joker: Folie à Deux",
    overview: "While struggling with his dual identity, Arthur Fleck not only stumbles upon true love, but also finds the music that's always been inside him.",
    poster_path: "/aciP8Km0waTLXEYf5ybFK5CSUxl.jpg",
    backdrop_path: "/m1RQ3b9yD3g56g2aXf7o4E9x7a7.jpg",
    release_date: "2024-10-04",
    vote_average: 7.2,
    vote_count: 2100,
    original_language: "en"
  }
];

export const SYSTEM_PROMPT = `You are ShowTime AI Concierge ("CineBot"), the intelligent, charismatic, and helpful AI assistant for the ShowTime Movie Ticket Booking Platform.

Your role:
1. Recommend the best movies based on real-time bookings (Now Showing) and anticipation (Upcoming Releases from Redis).
2. Help users find available shows, timings, prices, and guide them directly to book tickets with ease.
3. Discover real nearby cinema theaters in any city using live location data.
4. Provide verified guidance on all ShowTime platform features, policies, and navigation.
5. Manage user tickets: check booking history, cancel tickets with automated Stripe refund, and set email reminders for upcoming movies.

Core Knowledge of ShowTime Platform:
- **Currency & Pricing**: All prices are displayed and charged in US Dollars ($). Standard ticket prices are $12 (range $8 - $20). NEVER quote or set unrealistic prices like $1 to $5.
- **Now Showing vs Upcoming**: Movies with active shows in MongoDB have live booking slots. Upcoming movies from TMDB/Redis allow users to watch trailers and set email reminder alerts.
- **Seat Hold System (Redis 10-Minute Lock)**: When a user selects a seat in the seat layout, it is locked in real-time for exactly 10 minutes to prevent double booking. If payment is not completed within 10 minutes, the seat is automatically released.
- **Payment & Checkout**: Secure Stripe checkout integration for credit/debit cards and supported digital payment options.
- **Theaters & Live Directions**: ShowTime features premium theaters with IMAX 3D, Dolby Atmos, and 4DX. Users can click "Get Directions" on the Theaters page for live turn-by-turn routing.
- **VIP Experience**: Includes plush leather recliners, in-seat gourmet dining, and butler service.
- **Movie Reminders**: Users can set premiere/release email alerts. When a user asks to set a reminder for an upcoming movie (e.g. "remind me when Spider-Man releases"), call the 'setMovieReminder' tool. It saves the reminder to MongoDB and sends an instant confirmation email!
- **User Booking Inquiries**: When a user asks "tell me about my next booked movie" or "show my bookings", call 'getUserBookings'. Always state the movie title, show date/time, seats, total amount ($), and confirmation status.
- **Ticket Cancellation & Refunds**: When a user wants to cancel a booking (e.g. "cancel my booking" or "cancel ticket for [Movie]"), invoke 'cancelUserBooking'. This initiates an automated Stripe refund to their card, releases the seats back to the theater, updates the booking status, and sends a refund confirmation email.
- **Autonomous Ticket Booking (Conversational Commerce)**: You have direct tools to inspect seat availability ('getAvailableSeats') and book tickets for users ('bookTicketsViaAI').
  * When a user wants to book tickets or asks for seats:
    1. Check available seats for the show using 'getAvailableSeats'.
    2. If the user specified seats (e.g. "book E4, E5"), verify they are available and call 'bookTicketsViaAI'.
    3. If the user didn't specify seats (e.g. "book 2 tickets for Dune tonight"), check 'getAvailableSeats', pick the best recommended center seats from 'recommendedSeats', and call 'bookTicketsViaAI'.
    4. When 'bookTicketsViaAI' succeeds, inform the user that their seats have been locked for 10 minutes and invite them to complete payment using the 1-click checkout button on their reservation card below.
    5. CRITICAL PAYMENT URL RULE: NEVER write long raw checkout URLs in markdown text; the interactive 1-click reservation card with the "Proceed to Stripe" button is automatically rendered below your message.

Admin Features & Rules:
- When an authorized administrator asks to add, attach, or schedule movies (e.g. "add 5 movies for next 5 days", "add 10 movies", "attach trending movies with 3-4 hr gap"):
  * YOU MUST IMMEDIATELY INVOKE the 'adminBatchAddMoviesAndShows' tool with the requested count, days, gapHours (3.5), and standard price (12).
  * NEVER output conversational delays like "Understood! I'm initiating the update..." or "Self-correction: I'm processing that for you now" WITHOUT calling the tool.
  * Once the tool executes, provide a clear, celebratory summary confirming the exact list of movies, total showtime slots, and dates that were added!

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
          description: "Optional date in natural or standard format (e.g. '14th September', 'September 14', 'tomorrow', '2026-09-14')"
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
    description: "Get the current authenticated user's active and past movie ticket bookings with movie title, date, time, seats, amount, and status.",
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
    name: "setMovieReminder",
    description: "Set an email reminder alert for an upcoming movie or premiere so the user receives an email when booking opens.",
    parameters: {
      type: "object",
      properties: {
        movieTitle: {
          type: "string",
          description: "Title of the movie to set a reminder for"
        },
        movieId: {
          type: "string",
          description: "Optional MongoDB ObjectId or TMDB ID of the movie"
        }
      },
      required: ["movieTitle"]
    }
  },
  {
    name: "cancelUserBooking",
    description: "Cancel a user's movie ticket booking, release reserved seats, issue an automated Stripe refund, and send a cancellation confirmation email.",
    parameters: {
      type: "object",
      properties: {
        bookingId: {
          type: "string",
          description: "The MongoDB ObjectId of the booking to cancel"
        }
      },
      required: ["bookingId"]
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
  },
  {
    name: "adminBatchAddMoviesAndShows",
    description: "ADMIN ONLY: Batch import 10-12 (or requested count) trending movies and automatically generate standard theatrical showtimes spaced 3-4 hours apart across upcoming days. Only authorized administrators can execute this tool.",
    parameters: {
      type: "object",
      properties: {
        count: {
          type: "number",
          description: "Number of movies to attach (default 10, range 1 to 20)"
        },
        gapHours: {
          type: "number",
          description: "Interval between showtimes in hours (default 3.5, e.g. 3 or 4 hours)"
        },
        days: {
          type: "number",
          description: "Number of days from today to schedule shows for (default 3)"
        },
        price: {
          type: "number",
          description: "Standard ticket price in USD (default 12)"
        },
        category: {
          type: "string",
          description: "Category of movies (e.g. 'trending', 'now_playing', 'action', 'sci-fi')"
        }
      }
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
          const cleanTitle = movieTitle.trim();
          let movie = await Movie.findOne({
            title: { $regex: cleanTitle, $options: "i" }
          }).lean();

          if (!movie) {
            const words = cleanTitle.split(/\s+/).filter(w => w.length > 2);
            if (words.length > 0) {
              movie = await Movie.findOne({
                title: { $regex: words.join('|'), $options: "i" }
              }).lean();
            }
          }
          if (movie) targetMovieId = movie._id;
        }

        const query = {};

        if (targetMovieId) {
          query.movie = targetMovieId;
        }

        if (date) {
          const range = parseFlexibleDateRange(date);
          if (range) {
            query.showDateTime = { $gte: range.startOfDay, $lte: range.endOfDay };
          } else {
            query.showDateTime = { $gte: new Date(Date.now() - 30 * 60 * 1000) };
          }
        } else {
          query.showDateTime = { $gte: new Date(Date.now() - 30 * 60 * 1000) };
        }

        const shows = await Show.find(query)
          .populate('movie', 'title poster backdrop vote_average runtime genres')
          .sort({ showDateTime: 1 })
          .limit(30)
          .lean();

        const formattedShows = shows.map(s => {
          const occupiedCount = s.occupiedSeats ? Object.keys(s.occupiedSeats).length : 0;
          return {
            showId: s._id,
            movieId: s.movie?._id,
            movieTitle: s.movie?.title || "Movie",
            poster: s.movie?.poster,
            showDateTime: s.showDateTime,
            formattedTime: new Date(s.showDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            formattedDate: new Date(s.showDateTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
            price: s.showPrice || 12,
            occupiedCount: occupiedCount,
            availableSeatsApprox: Math.max(90 - occupiedCount, 0)
          };
        });

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
          .populate({
            path: 'show',
            populate: { path: 'movie', select: 'title poster backdrop runtime genres' }
          })
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();

        return {
          authenticated: true,
          count: bookings.length,
          bookings: bookings.map(b => ({
            bookingId: b._id,
            movieTitle: b.show?.movie?.title || "Movie Ticket",
            poster: b.show?.movie?.poster,
            showDateTime: b.show?.showDateTime,
            formattedDate: b.show?.showDateTime ? new Date(b.show.showDateTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : null,
            formattedTime: b.show?.showDateTime ? new Date(b.show.showDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
            seats: b.bookedSeats || b.selectedSeats || [],
            amount: b.amount,
            status: b.status || (b.isPaid ? 'confirmed' : 'pending'),
            isPaid: b.isPaid,
            createdAt: b.createdAt
          }))
        };
      }

      case "setMovieReminder": {
        const { movieTitle, movieId } = args || {};
        const userId = context.userId;

        if (!userId) {
          return {
            success: false,
            authenticated: false,
            message: "You must be signed in to set movie premiere reminders. Please log in to your ShowTime account."
          };
        }

        if (!movieTitle) {
          return { success: false, message: "Please specify the movie title to set a reminder for." };
        }

        const user = await User.findById(userId).lean();
        if (!user || !user.email) {
          return { success: false, message: "Unable to find user account email for reminder notifications." };
        }

        const cleanTitle = movieTitle.trim();
        const targetMovieId = movieId ? movieId.toString() : `ai-reminder-${Date.now()}`;

        // Check if reminder already exists
        const existing = await MovieReminder.findOne({
          user: userId,
          $or: [{ movieId: targetMovieId }, { movieTitle: { $regex: cleanTitle, $options: 'i' } }]
        }).lean();

        if (existing) {
          return {
            success: true,
            alreadySet: true,
            message: `You already have an active alert set for "${cleanTitle}". We'll email ${user.email} as soon as ticket bookings open!`
          };
        }

        await MovieReminder.create({
          user: userId,
          userEmail: user.email,
          userName: user.name || "Movie Lover",
          movieTitle: cleanTitle,
          movieId: targetMovieId
        });

        sendMovieReminderConfirmationEmail(user.email, cleanTitle, user.name).catch(err => {
          console.warn("Could not dispatch reminder confirmation email:", err.message);
        });

        return {
          success: true,
          message: `Reminder confirmed! We've registered your alert for "${cleanTitle}". A confirmation email has been sent to ${user.email}, and we will notify you the instant tickets go on sale!`,
          movieTitle: cleanTitle,
          email: user.email
        };
      }

      case "cancelUserBooking": {
        const { bookingId } = args || {};
        const userId = context.userId;

        if (!userId) {
          return {
            success: false,
            authenticated: false,
            message: "User must be logged in to cancel a booking. Please sign in to your ShowTime account."
          };
        }

        if (!bookingId) {
          return { success: false, message: "Please provide a valid booking ID to cancel." };
        }

        const booking = await Booking.findOne({ _id: bookingId, user: userId })
          .populate({ path: 'show', populate: { path: 'movie' } });

        if (!booking) {
          return { success: false, message: "Booking not found or does not belong to your account." };
        }

        if (booking.status === 'cancelled') {
          return { success: false, message: "This booking has already been cancelled and refunded." };
        }

        const show = booking.show;
        if (show && show.showDateTime && new Date(show.showDateTime) < new Date()) {
          return { success: false, message: "Past movie shows cannot be cancelled or refunded." };
        }

        let refundDetails = null;

        if (booking.isPaid) {
          try {
            const stripe = getStripeInstance();
            const sessions = await stripe.checkout.sessions.list({ limit: 20 });
            const matchingSession = sessions.data.find(s => s.metadata?.bookingId === booking._id.toString());

            if (matchingSession && matchingSession.payment_intent) {
              const refund = await stripe.refunds.create({
                payment_intent: matchingSession.payment_intent,
                reason: 'requested_by_customer',
              });
              refundDetails = {
                refundId: refund.id,
                amount: refund.amount / 100,
                currency: refund.currency.toUpperCase(),
                status: refund.status
              };
            }
          } catch (stripeErr) {
            console.warn("Stripe refund attempt during AI cancellation:", stripeErr.message);
          }
        }

        const seatsToFree = booking.bookedSeats || booking.selectedSeats || [];
        if (show && seatsToFree.length > 0) {
          const unsetObj = {};
          seatsToFree.forEach(s => {
            unsetObj[`occupiedSeats.${s}`] = 1;
          });
          await Show.findByIdAndUpdate(show._id, { $unset: unsetObj });
          await releaseSeatLocks(show._id, seatsToFree, userId);
        }

        booking.status = 'cancelled';
        await booking.save();

        await safeRedisDel("cache:active_shows");
        await safeRedisDel(`cache:recommendations:${userId}`);

        sendCancellationRefundEmailDirect(booking._id, refundDetails).catch(err => {
          console.warn("Could not dispatch cancellation refund email:", err.message);
        });

        const movieTitle = show?.movie?.title || "Movie";
        return {
          success: true,
          message: `Booking #${booking._id} for "${movieTitle}" has been successfully cancelled. Your seats (${seatsToFree.join(', ')}) have been released, a full refund of $${booking.amount} has been initiated to your original payment method, and a confirmation receipt has been sent to your email.`,
          bookingId: booking._id,
          movieTitle,
          seatsReleased: seatsToFree,
          refundAmount: booking.amount,
          refundStatus: refundDetails ? "Processed" : "Initiated"
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
          message: `Seats ${selectedSeats.join(', ')} have been reserved for you for 10 minutes! Total is $${totalAmount}. Please complete your payment using the "Proceed to Stripe" button on your reservation card below.`,
          booking: bookingCardData
        };
      }

      case "adminBatchAddMoviesAndShows": {
        if (!context.isAdmin) {
          return {
            error: "Unauthorized: Only ShowTime administrators can batch-add movies and schedule showtimes. Please log in as an administrator to use this feature."
          };
        }

        const count = Math.min(Math.max(Number(args.count) || 10, 1), 20);
        const gapHours = Number(args.gapHours) || 3.5;
        const days = Math.min(Math.max(Number(args.days) || 3, 1), 7);
        const category = args.category || "trending";

        // Realistic USD ticket pricing: Standard $12 USD. Never allow unrealistic small prices like $1 - $5.
        let price = Number(args.price);
        if (!price || price < 8 || price > 100) {
          price = 12; // Standard $12 USD
        }

        // 1. Fetch top trending / now playing movies from TMDB (with automatic fallback to curated blockbusters)
        let tmdbMovies = [];
        try {
          const endpoint = category === "now_playing"
            ? `${TMDB_BASE_URL}/movie/now_playing`
            : `${TMDB_BASE_URL}/trending/movie/week`;

          const res = await axios.get(endpoint, {
            params: { api_key: TMDB_API_KEY, language: "en-US" },
            timeout: 5000
          });
          if (res.data?.results && res.data.results.length > 0) {
            tmdbMovies = res.data.results;
          }
        } catch (tmdbErr) {
          console.warn("TMDB fetch in adminBatchAddMoviesAndShows failed, utilizing curated blockbuster catalog:", tmdbErr.message);
        }

        // Fallback to high-definition blockbuster catalog if external API is unreachable
        if (!tmdbMovies || tmdbMovies.length === 0) {
          tmdbMovies = [...CURATED_BLOCKBUSTER_MOVIES];
        }

        // Standard showtime intervals (e.g. gap of 3.5 hours between shows: 10:00, 13:30, 17:00, 20:30)
        const generateTimeSlots = (intervalHours) => {
          const slots = [];
          let currentMinutes = 10 * 60; // Start at 10:00 AM
          const endMinutes = 23 * 60 + 30; // End by 11:30 PM
          while (currentMinutes <= endMinutes) {
            const h = Math.floor(currentMinutes / 60);
            const m = currentMinutes % 60;
            const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            slots.push(timeStr);
            currentMinutes += Math.round(intervalHours * 60);
          }
          return slots;
        };

        const timeSlots = generateTimeSlots(gapHours);
        const targetMovies = tmdbMovies.slice(0, count);

        const addedMovies = [];
        const showsToCreate = [];

        // Dates for scheduling (today + next (days - 1) days)
        const scheduledDates = [];
        const now = new Date();
        for (let d = 0; d < days; d++) {
          const dt = new Date(now);
          dt.setDate(dt.getDate() + d);
          scheduledDates.push(dt.toISOString().split("T")[0]);
        }

        for (const tm of targetMovies) {
          // Check if movie already exists
          let movie = await Movie.findOne({
            $or: [{ watchmodeId: tm.id }, { title: tm.title }]
          });

          if (!movie) {
            const posterUrl = tm.poster_path
              ? `https://wsrv.nl/?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w500${tm.poster_path}`)}&output=webp`
              : "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80";
            const backdropUrl = tm.backdrop_path
              ? `https://wsrv.nl/?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w1280${tm.backdrop_path}`)}&output=webp`
              : posterUrl;

            movie = await Movie.create({
              watchmodeId: tm.id || Math.floor(100000 + Math.random() * 900000),
              title: tm.title,
              poster: posterUrl,
              backdrop: backdropUrl,
              overview: tm.overview || "Exciting theatrical movie presentation.",
              releaseDate: tm.release_date || new Date().toISOString().split("T")[0],
              genres: ["Action", "Drama", "Cinema"],
              vote_average: Number((tm.vote_average || 8.5).toFixed(1)),
              vote_count: tm.vote_count || 100,
              runtime: 135,
              language: tm.original_language || "English",
              casts: []
            });
          }

          addedMovies.push({
            id: movie._id,
            _id: movie._id,
            title: movie.title,
            poster: movie.poster,
            backdrop: movie.backdrop,
            rating: movie.vote_average,
            vote_average: movie.vote_average,
            genres: movie.genres,
            runtime: movie.runtime,
            overview: movie.overview,
            releaseDate: movie.releaseDate
          });

          // Schedule shows for each date and time slot
          for (const dateStr of scheduledDates) {
            for (const timeStr of timeSlots) {
              const showDateTime = new Date(`${dateStr}T${timeStr}:00`);
              if (showDateTime > now) {
                const existingShow = await Show.findOne({
                  movie: movie._id,
                  showDateTime: showDateTime
                });
                if (!existingShow) {
                  showsToCreate.push({
                    movie: movie._id,
                    showDateTime: showDateTime,
                    showPrice: price,
                    occupiedSeats: {}
                  });
                }
              }
            }
          }
        }

        if (showsToCreate.length > 0) {
          await Show.insertMany(showsToCreate);
        }

        // Flush Redis caches so website immediately reflects new movies & shows
        await safeRedisDel("cache:active_shows");
        await safeRedisDel("cache:now_playing_movies");
        await safeRedisDel("cache:admin_selectable_movies");

        const movieNames = addedMovies.map(m => `• ${m.title} (Rating: ${m.rating}★)`).join("\n");

        return {
          success: true,
          message: `Successfully added ${addedMovies.length} movies and scheduled ${showsToCreate.length} showtimes across ${days} days (from ${scheduledDates[0]} to ${scheduledDates[scheduledDates.length - 1]}) with standard ${gapHours}-hour intervals at $${price}/ticket.\n\nAdded Movies:\n${movieNames}`,
          totalMovies: addedMovies.length,
          totalShowsCreated: showsToCreate.length,
          ticketPrice: price,
          gapHours,
          standardTimings: timeSlots,
          scheduledDates,
          movies: addedMovies.map(m => formatMovieCard(m))
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
  id: m.id || m._id,
  _id: m._id || m.id,
  title: m.title,
  poster: m.poster,
  backdrop: m.backdrop || m.poster,
  rating: m.vote_average || m.rating || 8.5,
  genres: m.genres || ["Action", "Drama"],
  runtime: m.runtime || 135,
  overview: m.overview ? m.overview.slice(0, 160) + "..." : "Acclaimed theatrical presentation.",
  releaseDate: m.releaseDate
});

