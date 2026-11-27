import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

/*
 * End-to-end checks of the site (npm run verify). By default they run against
 * the production build served by the API (npm run build && npm start, port 3001);
 * BASE_URL points them elsewhere (the dev server: http://localhost:5173).
 * Screenshots go to verification/. Every check runs silent (tests/fixtures.ts).
 */
export default defineConfig({
  testDir: "tests",
  timeout: 15 * 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: 4,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3001",
    trace: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // The site run with Docker on this Mac (https://localhost:8443) has a local certificate.
    ignoreHTTPSErrors: /^https:\/\/localhost[:/]/.test(process.env.BASE_URL ?? ""),
  },
  projects: [
    // Silent: no sound from the videos on the speakers of the computer (WebKit: tests/fixtures.ts).
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, launchOptions: { args: ["--mute-audio"] } } },
    { name: "iphone", use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
    // The smallest and the largest iPhones, for the home page and the new sections (tests/home.spec.ts).
    { name: "iphone-se", testMatch: /home\.spec\.ts/, use: { ...devices["iPhone SE"], viewport: { width: 320, height: 568 } } },
    { name: "iphone-pro-max", testMatch: /home\.spec\.ts/, use: { ...devices["iPhone 15 Pro Max"], viewport: { width: 430, height: 932 } } },
    // Safari on a laptop, at a middle width (Yoni, 23/11/2026: the menu of the phone showed there): tests/yoni2311.spec.ts.
    // The trunks too (23/11/2026: open and close again in Safari), and the call of 24/11/2026.
    { name: "safari", testMatch: /yoni2311\.spec\.ts|trunks\.spec\.ts|yoni2411\.spec\.ts|coherence2411\.spec\.ts|retours2411\.spec\.ts|loupe\.spec\.ts|monogram\.spec\.ts|audit2411\.spec\.ts|retours2511\.spec\.ts|editor3d\.spec\.ts|film-frame\.spec\.ts|client3d\.spec\.ts|editor3d-confort\.spec\.ts/, use: { ...devices["Desktop Safari"], viewport: { width: 1280, height: 800 } } },
  ],
});
