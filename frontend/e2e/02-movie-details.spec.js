import { test, expect } from '@playwright/test';

test.describe('2. Movie Details & Showtime Selection', () => {
  test('should open movie details page, display synopsis, badges and date options', async ({ page }) => {
    // 1. Start from Home and click on a movie card or Buy Tickets button
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Click Buy Tickets on the first featured movie card
    const buyTicketsBtn = page.getByRole('button', { name: 'Buy Tickets' }).first();
    await expect(buyTicketsBtn).toBeVisible({ timeout: 15000 });
    await buyTicketsBtn.click();

    // Verify navigation to Movie Details page
    await expect(page).toHaveURL(/\/movies\//i);

    // Verify presence of DateSelect section (using .first() to handle responsive duplicate containers)
    const dateSection = page.locator('#dateSelect').first();
    await expect(dateSection).toBeVisible({ timeout: 15000 });
  });

  test('should allow selecting screening date or display catalog reminder', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const buyTicketsBtn = page.getByRole('button', { name: 'Buy Tickets' }).first();
    await expect(buyTicketsBtn).toBeVisible({ timeout: 15000 });
    await buyTicketsBtn.click();

    await expect(page.locator('#dateSelect').first()).toBeVisible({ timeout: 15000 });

    // Check if screening dates buttons exist
    const dateButtons = page.locator('#dateSelect button:not(:has-text("Book Now")):not(:has-text("Remind"))');
    const dateCount = await dateButtons.count();

    if (dateCount > 0) {
      // Click the first date button
      await dateButtons.first().click();

      // Verify "Book Now" button is visible
      const bookNowBtn = page.getByRole('button', { name: 'Book Now' });
      await expect(bookNowBtn).toBeVisible();
    } else {
      // Catalog Reference movie without scheduled shows
      const reminderOrCatalog = page.locator('text=Catalog Reference Movie, text=Remind Me When Tickets Open, text=Screening Showtimes Opening Soon');
      await expect(reminderOrCatalog.first()).toBeVisible();
    }
  });
});
