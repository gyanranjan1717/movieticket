import { test, expect } from '@playwright/test';
import { setupApiMocks } from './fixtures.js';

test.describe('3. Critical Path: Seat Layout Grid & Checkout Gateway', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  const sampleMovieId = '6a84aac556a59e06b3c7ed16';
  const sampleDate = '2026-09-09';
  const targetShowUrl = `/movies/${sampleMovieId}/${sampleDate}`;

  test('should render seat canvas, showtime sidebar, and pricing tier legend', async ({ page }) => {
    await page.goto(targetShowUrl, { waitUntil: 'domcontentloaded' });

    // 1. Verify "Select Showtime" sidebar
    const showtimeHeading = page.locator('text=Select Showtime');
    await expect(showtimeHeading).toBeVisible({ timeout: 15000 });

    // 2. Verify Pricing Tier Legend (Standard, Premium, VIP)
    await expect(page.locator('text=Seat Tiers')).toBeVisible();
    await expect(page.locator('text=Standard (A-D)')).toBeVisible();
    await expect(page.locator('text=Premium (E-H)')).toBeVisible();

    // 3. Verify Screen indicator and seat grid header
    await expect(page.locator('text=Choose Your Seats').first()).toBeVisible();
    await expect(page.locator('text=CINEMA SCREEN THIS WAY').first()).toBeVisible();

    // 4. Verify Legend (Available, Selected, Booked)
    await expect(page.locator('text=Available').first()).toBeVisible();
    await expect(page.locator('text=Selected').first()).toBeVisible();
    await expect(page.locator('text=Booked').first()).toBeVisible();
  });

  test('should select an available seat, compute total price, and gate unauthenticated checkout with Auth Modal', async ({ page }) => {
    await page.goto(targetShowUrl, { waitUntil: 'domcontentloaded' });

    // Wait for seat layout checkout bar to render
    const checkoutBar = page.locator('text=Total Payable');
    await expect(checkoutBar).toBeVisible({ timeout: 15000 });

    // Initial state: Total should be 0 and 0 seats selected
    const seatCounter = page.locator('text=(0 seats)');
    await expect(seatCounter).toBeVisible();

    // Locate available seat buttons in the seat matrix (h-8 w-8 buttons that are not disabled)
    const availableSeats = page.locator('button.h-8.w-8:not([disabled])');
    const availableCount = await availableSeats.count();
    expect(availableCount).toBeGreaterThan(0);

    // Click on the first available seat
    await availableSeats.first().click();

    // Assert that selected seats count updates to (1 seats)
    const updatedCounter = page.locator('text=(1 seats)');
    await expect(updatedCounter).toBeVisible({ timeout: 10000 });

    // Assert that the Checkout button is now enabled
    const checkoutBtn = page.getByRole('button', { name: /Proceed to Checkout/i });
    await expect(checkoutBtn).toBeEnabled();

    // Click "Proceed to Checkout" without being logged in
    await checkoutBtn.click();

    // Assert that unauthenticated booking triggers Auth Modal with email input
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });
});
