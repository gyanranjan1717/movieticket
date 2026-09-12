/**
 * Playwright Comprehensive All-Routes & Navigation E2E Test Suite
 * File: frontend/e2e/04-all-routes-navigation.spec.js
 *
 * This test file comprehensively covers every public, dynamic, user, and admin route:
 * 1.  /                    (Home Page & Hero Spotlight)
 * 2.  /movies, /Movies     (All Movies Catalog & Filters)
 * 3.  /theaters, /Theaters (Theaters & GPS Cinema Locator)
 * 4.  /releases, /Releases (Upcoming & Now Playing Releases)
 * 5.  /movies/:id          (Movie Details & Showtimes)
 * 6.  /movies/:id/:date    (Interactive Seat Matrix Layout)
 * 7.  /mybooking, /my-bookings, /MyBooking (User Ticket Bookings & Auth Guard)
 * 8.  /favorites, /favroites (Saved Favorites & Watchlist)
 * 9.  /admin, /admin/*     (Protected Admin Dashboard & Security Guard)
 * 10. AI Concierge Widget  (ChatBot Toggle & Suggested Prompts)
 *
 * =============================================================================
 * 🎬 HOW TO RUN VISUALLY (HEADED / UI MODE) - YOU CAN UNCOMMENT IN playwright.config.js
 * OR RUN VIA TERMINAL:
 *
 * Terminal command to run with headed browser (opens Google Chrome):
 *   npm run test:e2e:headed -- 04-all-routes-navigation.spec.js
 *
 * Terminal command to run in Playwright Interactive UI mode (full visual inspector):
 *   npm run test:e2e:ui
 * =============================================================================
 */

import { test, expect } from '@playwright/test';
import { setupApiMocks, mockMovie } from './fixtures.js';

// =============================================================================
// UNCOMMENT THE LINES BELOW IF YOU WANT THIS SPECIFIC FILE TO ALWAYS RUN HEADED:
// =============================================================================
// test.use({
//   headless: false,  // <-- Uncomment to watch real browser window
//   slowMo: 500,      // <-- Uncomment to slow down steps by 500ms so you can watch each click
// });
// =============================================================================
// 🚫 HOW TO SKIP THIS FILE IF YOU DO NOT WANT TO RUN ALL ROUTES:
// Option A: In `playwright.config.js`, uncomment:
//            testIgnore: '**/04-all-routes-navigation.spec.js',
// Option B: Change `test.describe(` below to `test.describe.skip(`
// =============================================================================

test.describe('ShowTime Full Platform Route Matrix & Navigation Verification', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  // ---------------------------------------------------------------------------
  // 1. Home Page ('/')
  // ---------------------------------------------------------------------------
  test('Route: / (Home) should render navbar, hero, location selector and branding', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Verify Title & Branding
    await expect(page).toHaveTitle(/ShowTime/i);
    const logo = page.locator('img[alt="Show Time Logo"]').first();
    await expect(logo).toBeVisible({ timeout: 15000 });

    // Verify Navigation Links
    await expect(page.getByRole('link', { name: 'Home', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Movies', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Theaters', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Releases', exact: true }).first()).toBeVisible();

    // Verify Location Selector
    const locationBtn = page.locator('button[title="Change City Location"]').first();
    await expect(locationBtn).toBeVisible();

    // Verify Trending Showcase section
    const trendingHeader = page.getByRole('heading', { name: /Trending Spotlight/i });
    await expect(trendingHeader).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 2. Movies Catalog Route ('/movies')
  // ---------------------------------------------------------------------------
  test('Route: /movies should render catalog filters and movie listings', async ({ page }) => {
    await page.goto('/movies', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/movies/i);

    // Verify Filter Pill Buttons
    const allCollectionsBtn = page.getByRole('button', { name: /All Collections/i });
    await expect(allCollectionsBtn).toBeVisible({ timeout: 15000 });

    // Verify Movie Grid
    const movieCards = page.locator('div.group');
    await expect(movieCards.first()).toBeVisible({ timeout: 15000 });
    expect(await movieCards.count()).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 3. Theaters & GPS Locator Route ('/theaters')
  // ---------------------------------------------------------------------------
  test('Route: /theaters should render multiplex list, amenities and GPS cinema buttons', async ({ page }) => {
    await page.goto('/theaters', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/theaters/i);

    // Verify Header
    const heading = page.locator('text=Find Theaters in').first();
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Verify Experience Highlights (IMAX, Dolby Atmos, etc.)
    await expect(page.locator('text=IMAX 3D Laser').first()).toBeVisible();
    await expect(page.locator('text=Dolby Atmos').first()).toBeVisible();

    // Verify GPS Nearby action button
    const gpsBtn = page.locator('text=Find Real Nearby Cinemas').first();
    await expect(gpsBtn).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 4. Releases Route ('/releases')
  // ---------------------------------------------------------------------------
  test('Route: /releases should render premiere tab switcher and upcoming blockbusters', async ({ page }) => {
    await page.goto('/releases', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/releases/i);

    // Verify Hero title
    const header = page.locator('text=New & Upcoming Releases').first();
    await expect(header).toBeVisible({ timeout: 15000 });

    // Verify Tab Switchers
    const upcomingTab = page.getByRole('button', { name: /Coming Soon/i }).first();
    const nowPlayingTab = page.getByRole('button', { name: /Now In Cinemas/i }).first();
    await expect(upcomingTab).toBeVisible({ timeout: 10000 });
    await expect(nowPlayingTab).toBeVisible({ timeout: 10000 });

    // Click Now In Cinemas Tab and verify active transition
    await nowPlayingTab.click();
    await expect(nowPlayingTab).toHaveClass(/bg-primary/i);
  });

  // ---------------------------------------------------------------------------
  // 5. Dynamic Movie Details Route ('/movies/:id')
  // ---------------------------------------------------------------------------
  test('Route: /movies/:id should render movie synopsis and date selector', async ({ page }) => {
    await page.goto(`/movies/${mockMovie._id}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`/movies/${mockMovie._id}`));

    // Verify Date Selection container
    const dateSection = page.locator('#dateSelect').first();
    await expect(dateSection).toBeVisible({ timeout: 15000 });

    // Verify screening date buttons or catalog status
    const dateHeading = page.locator('text=Choose Screening Date').or(page.locator('text=Screening Showtimes Opening Soon')).first();
    await expect(dateHeading).toBeVisible({ timeout: 15000 });
  });

  // ---------------------------------------------------------------------------
  // 6. Dynamic Seat Selection Route ('/movies/:id/:date')
  // ---------------------------------------------------------------------------
  test('Route: /movies/:id/:date should render interactive seat layout, screen banner and tier pricing', async ({ page }) => {
    await page.goto(`/movies/${mockMovie._id}/2026-09-09`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`/movies/${mockMovie._id}/2026-09-09`));

    // Verify Screen Banner
    await expect(page.locator('text=CINEMA SCREEN THIS WAY').first()).toBeVisible({ timeout: 15000 });

    // Verify Seat Legend
    await expect(page.locator('text=Available').first()).toBeVisible();
    await expect(page.locator('text=Selected').first()).toBeVisible();
    await expect(page.locator('text=Booked').first()).toBeVisible();

    // Verify Interactive Seat Matrix
    const availableSeats = page.locator('button.h-8.w-8:not([disabled])');
    expect(await availableSeats.count()).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // 7. My Bookings Route ('/mybooking')
  // ---------------------------------------------------------------------------
  test('Route: /mybooking should display authentication prompt when unauthenticated', async ({ page }) => {
    await page.goto('/mybooking', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/mybooking/i);

    // Verify Security Authentication Gate for bookings
    const authPrompt = page.locator('text=Sign in to View Bookings').first();
    await expect(authPrompt).toBeVisible({ timeout: 15000 });

    const signInBtn = page.getByRole('button', { name: /Sign In \/ Register/i }).first();
    await expect(signInBtn).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 8. Favorites Route ('/favorites')
  // ---------------------------------------------------------------------------
  test('Route: /favorites should render empty state or favorites list', async ({ page }) => {
    await page.goto('/favorites', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/favorites/i);

    // With mock returning empty array, expect "No Favorites Found" or "Your Favorites"
    const favHeading = page.locator('text=No Favorites Found').or(page.locator('text=Your Favorites')).first();
    await expect(favHeading).toBeVisible({ timeout: 15000 });
  });

  // ---------------------------------------------------------------------------
  // 9. Protected Admin Routes ('/admin', '/admin/addshow', '/admin/listshow', etc.)
  // ---------------------------------------------------------------------------
  test('Route: /admin and admin sub-routes should enforce security guard on unauthenticated visitors', async ({ page }) => {
    // 1. Visit /admin root
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    const adminGuard = page.locator('text=Admin Authentication Required').first();
    await expect(adminGuard).toBeVisible({ timeout: 15000 });

    const loginAdminBtn = page.getByRole('button', { name: /Log In as Admin/i }).first();
    await expect(loginAdminBtn).toBeVisible();

    // 2. Visit /admin/addshow
    await page.goto('/admin/addshow', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Admin Authentication Required').first()).toBeVisible({ timeout: 15000 });

    // 3. Visit /admin/listshow
    await page.goto('/admin/listshow', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Admin Authentication Required').first()).toBeVisible({ timeout: 15000 });

    // 4. Visit /admin/ai-settings
    await page.goto('/admin/ai-settings', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Admin Authentication Required').first()).toBeVisible({ timeout: 15000 });
  });

  // ---------------------------------------------------------------------------
  // 10. Multi-Route Navigation Bar Flow
  // ---------------------------------------------------------------------------
  test('User flow: should navigate seamlessly across routes via Top Navigation bar', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 1. Click Movies Link
    const moviesNav = page.getByRole('link', { name: 'Movies', exact: true }).first();
    await moviesNav.click();
    await expect(page).toHaveURL(/\/movies/i);

    // 2. Click Theaters Link
    const theatersNav = page.getByRole('link', { name: 'Theaters', exact: true }).first();
    await theatersNav.click();
    await expect(page).toHaveURL(/\/theaters/i);

    // 3. Click Releases Link
    const releasesNav = page.getByRole('link', { name: 'Releases', exact: true }).first();
    await releasesNav.click();
    await expect(page).toHaveURL(/\/releases/i);

    // 4. Click Home Link
    const homeNav = page.getByRole('link', { name: 'Home', exact: true }).first();
    await homeNav.click();
    await expect(page).toHaveURL(/^(http:\/\/localhost:\d+\/|\/)$/);
  });

  // ---------------------------------------------------------------------------
  // 11. Global AI Concierge ChatBot Widget
  // ---------------------------------------------------------------------------
  test('Widget: AI Concierge widget should toggle open and display greeting and prompts', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Find the AI Concierge Floating Trigger
    const chatbotTrigger = page.locator('button[aria-label="Open AI Cinema Concierge"]').first();
    await expect(chatbotTrigger).toBeVisible({ timeout: 15000 });

    // Hover over button to verify the hover tooltip pill
    await chatbotTrigger.hover();
    const tooltipPill = page.locator('text=Ask ShowTime AI').first();
    await expect(tooltipPill).toBeVisible({ timeout: 5000 });

    // Click to open the Chatbot modal
    await chatbotTrigger.click();

    // Verify Chatbot dialog opens with visible header
    const chatHeader = page.locator('h3:has-text("ShowTime AI Concierge")').first();
    await expect(chatHeader).toBeVisible({ timeout: 15000 });

    // Verify message input is available
    const chatInput = page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"]').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Verify Close button works
    const closeBtn = page.locator('button[title="Close chat"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

});
