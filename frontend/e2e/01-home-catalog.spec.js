import { test, expect } from '@playwright/test';
import { setupApiMocks } from './fixtures.js';

test.describe('1. Home Page & Catalog Exploration', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });
  test('should load the home page with branding, navbar links and location badge', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 1. Verify Branding Logo
    const logo = page.locator('img[alt="Show Time Logo"]').first();
    await expect(logo).toBeVisible({ timeout: 15000 });

    // 2. Verify Desktop Navigation Links
    const homeLink = page.getByRole('link', { name: 'Home', exact: true }).first();
    const moviesLink = page.getByRole('link', { name: 'Movies', exact: true }).first();
    const theatersLink = page.getByRole('link', { name: 'Theaters', exact: true }).first();

    await expect(homeLink).toBeVisible();
    await expect(moviesLink).toBeVisible();
    await expect(theatersLink).toBeVisible();

    // 3. Verify Location Selector Badge
    const locationBadge = page.locator('button[title="Change City Location"]').first();
    await expect(locationBadge).toBeVisible();
  });

  test('should render hero section, movie slider, and AI chatbot widget', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 1. Check AI ChatBot Widget trigger
    const chatbotTrigger = page.locator('button[aria-label="Open AI Cinema Concierge"]').first();
    await expect(chatbotTrigger).toBeVisible({ timeout: 15000 });

    // 2. Check VIP Feature Section Heading
    const cinemaExperience = page.getByRole('heading', { name: /The Ultimate.*Cinema Experience/i });
    await expect(cinemaExperience).toBeVisible({ timeout: 10000 });

    // 3. Check Trending Spotlight Section
    const trendingHeading = page.getByRole('heading', { name: /Trending Spotlight/i });
    await expect(trendingHeading).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Movies page and render movie catalog', async ({ page }) => {
    await page.goto('/movies', { waitUntil: 'domcontentloaded' });

    // Verify URL
    await expect(page).toHaveURL(/\/movies/i);

    // Verify category filter pill buttons render
    const allCollectionsBtn = page.getByRole('button', { name: /All Collections/i });
    await expect(allCollectionsBtn).toBeVisible({ timeout: 15000 });

    // Verify movie cards container
    const movieCards = page.locator('div.group');
    await expect(movieCards.first()).toBeVisible({ timeout: 15000 });
    const count = await movieCards.count();
    expect(count).toBeGreaterThan(0);
  });
});
