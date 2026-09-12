import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for ShowTime Frontend
 * Configured exclusively for Chromium as requested.
 */
// Check if running in a Continuous Integration (CI) environment like GitHub Actions
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  // testIgnore: '**/04-all-routes-navigation.spec.js', // <-- UNCOMMENT this line if you do NOT want to run the all-routes test!
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // =========================================================================
    // 🎬 VISUAL / HEADED / UI MODE CONTROLS (Uncomment the lines below to watch live):
    // =========================================================================
    // headless: false,        // <-- Uncomment to open the actual Chrome browser window
    // slowMo: 600,            // <-- Uncomment to delay actions by 600ms so each click/type is clearly visible
    // devtools: true,         // <-- Uncomment to automatically open Chrome Developer Tools inspect pane
    // =========================================================================
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
