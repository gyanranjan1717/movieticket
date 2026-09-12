/**
 * Playwright E2E Mock Fixtures
 * Provides robust mock API responses for hermetic, deterministic CI testing
 */

export const mockMovie = {
  _id: '6a84aac556a59e06b3c7ed16',
  title: 'Inception: Continuum',
  overview: 'A mind-bending psychological thriller navigating multidimensional dreams.',
  genres: ['Action', 'Sci-Fi'],
  duration: 148,
  release_date: '2026-07-16',
  poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500',
  backdrop: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200',
  showPrice: 15,
  hasActiveShows: true,
  rating: 8.9
};

export const mockShow = {
  _id: '68664b3d262e9a5920405712',
  movie: mockMovie,
  showDateTime: '2026-09-09T18:00:00.000Z',
  showPrice: 15,
  occupiedSeats: { A1: 'user1', B2: 'user2' }
};

export async function setupApiMocks(page) {
  // Mock shows endpoints (handling /api/show/all and /api/show/:movieId)
  await page.route('**/api/show/*', async (route) => {
    const url = route.request().url();
    if (url.includes('/api/show/all')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, shows: [mockShow] })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        movie: mockMovie,
        dateTime: {
          '2026-09-09': [{ time: '18:00', showId: mockShow._id, showPrice: 15 }]
        }
      })
    });
  });

  // Mock TMDB catalog endpoints (now-playing, upcoming, top-rated)
  await page.route('**/api/tmdb/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        movies: [
          {
            id: 'tmdb-1',
            _id: 'tmdb-1',
            title: 'Interstellar Horizons',
            poster_path: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500',
            backdrop_path: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200',
            vote_average: 8.7,
            release_date: '2026-11-20',
            overview: 'Humanity reaches toward new dimensional boundaries.',
            genres: ['Adventure', 'Sci-Fi']
          }
        ]
      })
    });
  });

  // Mock user favorites
  await page.route('**/api/user/favorites', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, movies: [] })
    });
  });

  // Mock seat occupancy
  await page.route('**/api/booking/seats/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, occupiedSeats: ['A1', 'B2'] })
    });
  });

  // Mock user bookings
  await page.route('**/api/user/bookings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, bookings: [] })
    });
  });

  // Mock user reminders
  await page.route('**/api/user/reminders', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, reminders: [] })
    });
  });

  // Mock chatbot config
  await page.route('**/api/chatbot/config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        config: {
          activeProvider: 'gemini',
          activeModel: 'gemini-3.6-flash',
          welcomeMessage: "👋 Hi! I'm your ShowTime AI Concierge.",
          suggestedPrompts: ["Recommend a thriller", "What are the ticket prices?"]
        }
      })
    });
  });
}
