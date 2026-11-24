// The proportions of the site (Yoni, call of 23-24/11/2026: "luxury does not shout"): every page at the sizes of the
// screens of the visitors, laptop (1280 × 800, 1440 × 900, MacBook Air 1470 × 956, MacBook Pro 14 1512 × 982), large screen
// (1920 × 1080), iPad and iPhone (393 × 852). At each: nothing sticks out sideways, the top of the page fits in the first
// screen. Captures in verification/tailles/<SHOTS>/<size>/ (SHOTS=avant before the pass, apres after it), the first screen
// and the whole page. Silent (tests/fixtures.ts).
import { devices } from "@playwright/test";
import { expect, silence, test } from "./fixtures";
import { mkdirSync } from "node:fs";
import { skipIntro } from "./helpers";

const TAG = process.env.SHOTS ?? "apres";
const FULL = process.env.SHOTS_FULL !== "0";

export const PAGES: [path: string, name: string][] = [
  ["/", "accueil"],
  ["/creations", "creations"],
  ["/creations/pendants", "pendentifs"],
  ["/creations/chains", "chaines"],
  ["/pieces/kevin-schade-dragon-ball-pendant", "piece-dragon-ball"],
  ["/pieces/campione-d-italia-2023-2024", "piece-inter"],
  ["/pieces/vfb-stuttgart-dfb-pokal-2025", "piece-vfb"],
  ["/pieces/the-safi-link", "piece-safi-link"],
  ["/pieces/sirius", "piece-sirius"],
  ["/players", "cercle"],
  ["/players/marcus-thuram", "profil-thuram"],
  ["/atelier", "atelier"],
  ["/boxes", "ecrins"],
  ["/process", "bespoke-journey"],
  ["/about", "maison"],
  ["/press", "presse"],
  ["/contact", "contact"],
];

const DESKTOPS: [w: number, h: number][] = (process.env.SHOTS_SIZES ?? "1280x800,1440x900,1470x956,1512x982,1920x1080")
  .split(",")
  .map((s) => s.split("x").map(Number) as [number, number]);

async function shoot(page: import("@playwright/test").Page, dir: string, path: string, name: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load").catch(() => undefined);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: dir + "/" + name + ".jpg", type: "jpeg", quality: 70 });
  // Nothing wider than the screen.
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(wide, name + ": the page is wider than the screen").toBeLessThanOrEqual(1);
  if (FULL) {
    // The whole page: every reveal on the way shown first.
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.8) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: dir + "/" + name + "-page.jpg", type: "jpeg", quality: 45, fullPage: true });
  }
}

test.describe.configure({ mode: "parallel" });

for (const [path, name] of PAGES) {
  test("proportions: " + name, async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop" && info.project.name !== "iphone");
    const sizes: { label: string; options: Parameters<typeof browser.newContext>[0] }[] =
      info.project.name === "desktop"
        ? DESKTOPS.map(([w, h]) => ({ label: w + "x" + h, options: { viewport: { width: w, height: h } } }))
        : [
            { label: "iphone-393", options: { ...devices["iPhone 15"], viewport: { width: 393, height: 852 } } },
            ...(process.env.SHOTS_IPAD ? [{ label: "ipad", options: { ...devices["iPad (gen 7)"] } }] : []),
          ];
    for (const { label, options } of sizes) {
      const context = await browser.newContext(options);
      await silence(context);
      const page = await context.newPage();
      await skipIntro(page);
      const dir = "verification/tailles/" + TAG + "/" + label;
      mkdirSync(dir, { recursive: true });
      await shoot(page, dir, path, name);
      await context.close();
    }
  });
}
