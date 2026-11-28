import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// The speed of the site (28/11/2026, docs/vitesse-28-11.md), locally or online (BASE_URL, ACCESS_PASSWORD for the site under
// construction). Chromium with the graphics card (the WebGL of the universes as on a real computer), a « fast 4G » network
// (9 Mbit/s, +60 ms). Fails when one of the goals is no longer held:
//   first paint < 1.5 s; the piece of the top < 2.5 s; the first arrival of a visit (the monogram, then the page) < 3 s;
//   from one page to the next < 1 s; the page stops when the wheel stops (no gliding); the universes at 55 images/s or more;
//   no photo or film downloaded for nothing (the phone's photo on a computer, the films of the boxes before they are asked for).
//   BASE_URL=http://localhost:3001 npx playwright test tests/perf.spec.ts --project=desktop --workers=1
test.skip(({ browserName }) => browserName !== "chromium", "measured with Chromium");
test.describe.configure({ mode: "serial" });

const FAST_4G = { offline: false, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8, latency: 60 };
let browser: Browser;

test.beforeAll(async () => {
  browser = await chromium.launch({ args: ["--mute-audio", "--enable-gpu", "--use-angle=metal", "--ignore-gpu-blocklist"] });
});
test.afterAll(async () => {
  await browser?.close();
});

async function visit(baseURL: string, { intro = false, net = true } = {}): Promise<{ context: BrowserContext; page: Page; bytes: { image: number; media: number; mediaCount: number } }> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL });
  if (process.env.ACCESS_PASSWORD) await context.request.post(new URL("/api/access", baseURL).href, { form: { password: process.env.ACCESS_PASSWORD, next: "/" }, maxRedirects: 0 });
  const page = await context.newPage();
  await page.addInitScript((skip) => {
    if (skip) {
      try {
        sessionStorage.setItem("bj-intro-seen", "1");
      } catch {
        /* nothing */
      }
    }
    const w = window as unknown as { __p: { fcp: number; lcp: number } };
    w.__p = { fcp: 0, lcp: 0 };
    new PerformanceObserver((l) => l.getEntries().forEach((e) => e.name === "first-contentful-paint" && (w.__p.fcp = e.startTime))).observe({ type: "paint", buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => (w.__p.lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
    document.addEventListener("play", (e) => e.target instanceof HTMLMediaElement && ((e.target.muted = true), (e.target.volume = 0)), true);
  }, !intro);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  if (net) await cdp.send("Network.emulateNetworkConditions", FAST_4G);
  const bytes = { image: 0, media: 0, mediaCount: 0 };
  const types = new Map<string, string>();
  cdp.on("Network.responseReceived", (e) => types.set(e.requestId, e.type));
  cdp.on("Network.loadingFinished", (e) => {
    const t = types.get(e.requestId);
    if (t === "Image") bytes.image += e.encodedDataLength;
    if (t === "Media") {
      bytes.media += e.encodedDataLength;
      bytes.mediaCount += 1;
    }
  });
  return { context, page, bytes };
}

const paints = (page: Page) => page.evaluate(() => (window as unknown as { __p: { fcp: number; lcp: number } }).__p);

for (const path of ["/", "/pieces/campione-d-italia-2023-2024", "/creations"]) {
  test("fast 4G: " + path + " paints in < 1.5 s, its main picture in < 2.5 s", async ({ baseURL }) => {
    const { context, page } = await visit(baseURL!);
    await page.goto(path, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    const p = await paints(page);
    expect(p.fcp, "first paint").toBeGreaterThan(0);
    expect(p.fcp, "first paint").toBeLessThan(1500);
    expect(p.lcp, "the piece of the top").toBeLessThan(2500);
    await context.close();
  });
}

test("the first arrival of a visit (from a link): the monogram, then the piece, in < 3 s", async ({ baseURL }) => {
  const { context, page } = await visit(baseURL!, { intro: true });
  const t0 = Date.now();
  await page.goto("/pieces/campione-d-italia-2023-2024", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !document.getElementById("bj-intro") && !document.documentElement.hasAttribute("data-intro"), null, { timeout: 10_000 });
  // The piece of the opening drawn (its entrance shows it within its first second).
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>("[data-showcase-view] img, [data-piece-cover] img");
    return !!img && img.complete && Number(getComputedStyle(img).opacity) > 0.9;
  }, null, { timeout: 10_000 });
  expect(Date.now() - t0).toBeLessThan(3000);
  await context.close();
});

test("from one page to the next by its links: < 1 s, the page readable", async ({ baseURL }) => {
  const { context, page } = await visit(baseURL!);
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  for (const [want, sel] of [
    ["/creations", "a[href='/creations']"],
    ["/pieces/", "[data-piece-name]"],
    ["/atelier", "a[href='/atelier']"],
    ["/boxes", "a[href='/boxes']"],
  ] as const) {
    const link = page.locator(sel).first();
    await link.scrollIntoViewIfNeeded();
    const t0 = Date.now();
    await link.click();
    await page.waitForURL((u) => u.pathname.startsWith(want));
    await page.locator("main h1").first().waitFor();
    expect(Date.now() - t0, want).toBeLessThan(1000);
    await page.waitForTimeout(800);
  }
  await context.close();
});

test("the scroll: the page stops when the wheel stops, at 55 images/s or more", async ({ baseURL }) => {
  const { context, page } = await visit(baseURL!, { net: false });
  for (const path of ["/", "/pieces/kevin-schade-dragon-ball-pendant"]) {
    await page.goto(path, { waitUntil: "load" });
    await page.waitForFunction(() => !document.querySelector("[data-entering]"), null, { timeout: 15_000 });
    await page.mouse.move(700, 450);
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(120);
    const y0 = await page.evaluate(() => scrollY);
    await page.waitForTimeout(400);
    // No gliding after the wheel (it went on 300 px for a second before 28/11/2026).
    expect(Math.abs((await page.evaluate(() => scrollY)) - y0), path).toBeLessThan(20);
    const fps = await page.evaluate(() => new Promise<number>((res) => { let n = 0; const t0 = performance.now(); const tick = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else res(n / 2); }; requestAnimationFrame(tick); }));
    expect(fps, path + " images/s").toBeGreaterThanOrEqual(55);
  }
  await context.close();
});

test("nothing downloaded for nothing: a piece page on a computer, the boxes, the atelier", async ({ baseURL }) => {
  // A piece: only the photo of the computer (before 28/11/2026 the phone's photo came too: 700 KB more).
  let v = await visit(baseURL!, { net: false });
  await v.page.goto("/pieces/angelo-stiller-as-pendant", { waitUntil: "networkidle" });
  await v.page.waitForTimeout(1500);
  expect(v.bytes.image / 1024, "KB of photos of a piece page").toBeLessThan(1300);
  await v.context.close();
  // The boxes: no film before a box is asked for (before: 6 films, 4.4 MB, with the page).
  v = await visit(baseURL!, { net: false });
  await v.page.goto("/boxes", { waitUntil: "networkidle" });
  await v.page.waitForTimeout(2000);
  expect(v.bytes.mediaCount, "films of the boxes with the page").toBe(0);
  await v.context.close();
  // The atelier: its opening film only (its chapters as they come).
  v = await visit(baseURL!, { net: false });
  await v.page.goto("/atelier", { waitUntil: "networkidle" });
  await v.page.waitForTimeout(2000);
  expect(v.bytes.mediaCount, "films of the atelier with the page").toBeLessThanOrEqual(1);
  await v.context.close();
});
