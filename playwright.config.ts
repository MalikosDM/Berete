import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

/*
 * End-to-end checks of the site (npm run verify). By default they run against
 * the production build served by the API (npm run build && npm start, port 3001);
 * BASE_URL points them elsewhere (the dev server: http://localhost:5173).
 * Screenshots go to verification/.
 */
export default defineConfig({
  testDir: "tests",
  timeout: 15 * 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3001",
    trace: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "iphone", use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
  ],
});
