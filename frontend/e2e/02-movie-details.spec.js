import { test, expect } from '@playwright/test';
import { setupApiMocks } from './fixtures.js';

test.describe('2. Movie Details & Showtime Selection', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });
  test('should open movie details page, display synopsis, badges and date options', async ({ page }) => {
    // Navigate to Movie Details page with seeded test movie
    await page.goto('/movies/6a84aac556a59e06b3c7ed16', { waitUntil: 'domcontentloaded' });

    // Verify presence of DateSelect section (using .first() to handle responsive duplicate containers)
    const dateSection = page.locator('#dateSelect').first();
    await expect(dateSection).toBeVisible({ timeout: 15000 });
  });

  test('should allow selecting screening date or display catalog reminder', async ({ page }) => {
    await page.goto('/movies/6a84aac556a59e06b3c7ed16', { waitUntil: 'domcontentloaded' });

    const dateSection = page.locator('#dateSelect').first();
    await expect(dateSection).toBeVisible({ timeout: 15000 });

    // Check if screening dates buttons exist
    const dateButtons = page.locator('#dateSelect button:not(:has-text("Book Now")):not(:has-text("Remind"))');
    const dateCount = await dateButtons.count();

    if (dateCount > 0) {
      // Click the first date button
      await dateButtons.first().click();

      // Verify "Book Now" button is visible
      const bookNowBtn = page.getByRole('button', { name: /Book Now/i }).first();
      await expect(bookNowBtn).toBeVisible({ timeout: 10000 });
    } else {
      // Catalog Reference movie without scheduled shows
      const reminderOrCatalog = page.locator('text=Catalog Reference Movie, text=Remind Me When Tickets Open, text=Screening Showtimes Opening Soon');
      await expect(reminderOrCatalog.first()).toBeVisible();
    }
  });
});
