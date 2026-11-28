import sharp from "sharp";
import { expect, silence, test, type Page } from "./fixtures";
import { HOUSE_SUMMARY, composeHouseSummary } from "../src/data/houseSummary";
import { YONI } from "../src/data/yoni2711";
import { ar } from "../src/i18n/house/ar";
import { de } from "../src/i18n/house/de";
import { en } from "../src/i18n/house/en";
import { es } from "../src/i18n/house/es";
import { fr } from "../src/i18n/house/fr";
import { nl } from "../src/i18n/house/nl";

// The home page of 28/11/2026 (Yoni and Malik): the photo of the opening fills the screen from edge to edge (its ground extended
// around the trunk, never an edge between it and the black of the page), the trunk the size it always had; each great section
// tells more of its piece (real photos, a sentence of Yoni word for word, its way in); the other mechanisms under the Dragon
// Ball; « The House » after Press. At 1280×800, 1440×900, 1920×1080, 2560×1440, 2560×1080 and on an iPhone (WebKit). Silent.
const phone = (name: string) => name.startsWith("iphone");
const SIZES = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 2560, height: 1080 },
];
// The box of the original photo of the trunk before 28/11/2026 (measured on the site, .local/scripts/home-shots.mjs).
const BEFORE: Record<string, { w: number; h: number }> = {
  "1280x800": { w: 1263.6, h: 705.3 },
  "1440x900": { w: 1440, h: 803.7 },
  "1920x1080": { w: 1765.2, h: 985.3 },
  "2560x1440": { w: 2410.2, h: 1345.3 },
  "2560x1080": { w: 1765.2, h: 985.3 },
  iphone: { w: 390, h: 262.3 },
};

async function home(page: Page, path = "/") {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("bj-intro-seen", "1");
    } catch {
      /* nothing */
    }
  });
  await page.goto(path);
  await page.waitForFunction(() => {
    const i = document.querySelector<HTMLImageElement>("[data-home-photo-img]");
    return !!i && i.complete && i.naturalWidth > 0;
  });
  await page.locator("[data-home-photo-img]").evaluate((i: HTMLImageElement) => i.decode().catch(() => undefined));
  await page.waitForTimeout(400);
}

const lum = (d: Buffer, i: number) => 0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!;

/**
 * The opening seen as pixels: its room under the menu (a computer) or its section under the menu (a phone), a little of what
 * is above and under it, the box of the original photo and the words on its floor.
 */
async function measureOpening(page: Page) {
  const g = await page.evaluate(() => {
    const r = (s: string) => document.querySelector(s)!.getBoundingClientRect();
    const header = r("header");
    const section = r("[data-home-photo]");
    const frame = r("[data-home-photo-frame]");
    const box = r("[data-home-photo-original]");
    const upright = matchMedia("(max-aspect-ratio: 1/1)").matches;
    const words = ["[data-home-tagline]", "[data-home-discover]"].map((s) => {
      const b = r(s);
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    });
    return { upright, header: header.bottom, top: upright ? header.bottom : frame.top, bottom: upright ? section.bottom : frame.bottom, width: innerWidth, box: { x: box.x, y: box.y, w: box.width, h: box.height }, words, dpr: devicePixelRatio };
  });
  // From 6 px above the room (the menu) to 6 px under it (the next section, after its fine line).
  const clip = { x: 0, y: Math.max(0, g.top - 6), width: g.width, height: g.bottom - g.top + 12 };
  const png = await page.screenshot({ clip, animations: "disabled" });
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { g, clip, data, W: info.width, H: info.height, k: info.width / g.width };
}

test("1. the photo of the opening: the trunk the size it was, no edge between the photo and the black of the page", async ({ page }, info) => {
  test.setTimeout(4 * 60_000);
  const sizes = phone(info.project.name) ? [null] : SIZES;
  const wrong: string[] = [];
  for (const size of sizes) {
    if (size) await page.setViewportSize(size);
    await home(page);
    const key = size ? size.width + "x" + size.height : "iphone";
    const { g, clip, data, W, H, k } = await measureOpening(page);
    // The box of the original photo: the same size as before (± 1 %).
    const before = BEFORE[key]!;
    if (Math.abs(g.box.w - before.w) > before.w * 0.01 || Math.abs(g.box.h - before.h) > before.h * 0.01) wrong.push(key + " box " + g.box.w.toFixed(1) + "×" + g.box.h.toFixed(1));
    // A mean luminance over a strip of the screen (points of the page → pixels of the capture).
    const strip = (x0: number, y0: number, w: number, h: number) => {
      const X0 = Math.max(0, Math.round(x0 * k));
      const Y0 = Math.max(0, Math.round((y0 - clip.y) * k));
      const X1 = Math.min(W, Math.max(X0 + 1, Math.round((x0 + w) * k)));
      const Y1 = Math.min(H, Math.max(Y0 + 1, Math.round((y0 + h - clip.y) * k)));
      let s = 0;
      for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) s += lum(data, (y * W + x) * 3);
      return s / ((X1 - X0) * (Y1 - Y0));
    };
    const inBox = (p: { x: number; y: number }) => p.x > g.box.x && p.x < g.box.x + g.box.w && p.y > g.box.y && p.y < g.box.y + g.box.h;
    const onWords = (p: { x: number; y: number }) => g.words.some((w) => p.x > w.x - 10 && p.x < w.x + w.w + 10 && p.y > w.y - 10 && p.y < w.y + w.h + 10);
    // « No step of more than 4 between two neighbouring rows or columns »: each line one point thick, its luminance averaged
    // over 8 points along it (the grain of the photo cancelled). Over the extended ground and across the edge of the photo,
    // from the menu into the room and from the room into the next section (after its fine line, its own design). Inside the
    // photo itself (its trunk, its floor): its own drawing, not checked.
    let steps = 0;
    let worst = "";
    const L = 8;
    const yEnd = g.bottom + 5;
    for (let y = clip.y; y + 2 <= yEnd; y++) {
      for (let x = 0; x + L <= g.width; x += L) {
        const p = { x: x + L / 2, y: y + 0.5 };
        const q = { x: x + L / 2, y: y + 1.5 };
        // Rows: (y, y+1). The fine line on top of the next section is skipped (compared from the row under it).
        if (!(inBox(p) && inBox(q)) && !onWords(p) && !onWords(q) && !(y + 2 > g.bottom - 0.5 && y < g.bottom + 2)) {
          const d = Math.abs(strip(x, y, L, 1) - strip(x, y + 1, L, 1));
          if (d > 4) {
            steps++;
            if (!worst) worst = `row ${d.toFixed(1)} at ${x},${y}`;
          }
        }
      }
    }
    for (let x = 0; x + 2 <= g.width; x++) {
      for (let y = g.top; y + L <= g.bottom; y += L) {
        const p = { x: x + 0.5, y: y + L / 2 };
        const q = { x: x + 1.5, y: y + L / 2 };
        if (inBox(p) && inBox(q)) continue;
        if (onWords(p) || onWords(q)) continue;
        const d = Math.abs(strip(x, y, 1, L) - strip(x + 1, y, 1, L));
        if (d > 4) {
          steps++;
          if (!worst) worst = `column ${d.toFixed(1)} at ${x},${y}`;
        }
      }
    }
    if (steps > 0) wrong.push(key + " steps " + steps + " (" + worst + ")");
    // Blocks of 4 points for the edges.
    const B = Math.max(1, Math.round(4 * k));
    const cols = Math.floor(W / B);
    const rows = Math.floor(H / B);
    const mean = new Float32Array(cols * rows);
    for (let by = 0; by < rows; by++)
      for (let bx = 0; bx < cols; bx++) {
        let s = 0;
        for (let y = by * B; y < by * B + B; y++) for (let x = bx * B; x < bx * B + B; x++) s += lum(data, (y * W + x) * 3);
        mean[by * cols + bx] = s / (B * B);
      }
    const at = (bx: number, by: number) => ({ x: (bx * B + B / 2) / k, y: clip.y + (by * B + B / 2) / k });
    // The four edges of the room: the black of the page (± 3), or the photo going on (no step from the block next to it).
    const bad: string[] = [];
    const edge = (bx: number, by: number, ix: number, iy: number) => {
      const v = mean[by * cols + bx]!;
      const ok = Math.abs(v - 10) <= 3 || Math.abs(v - mean[iy * cols + ix]!) <= 4;
      if (!ok && bad.length < 3) bad.push(`${Math.round(at(bx, by).x)},${Math.round(at(bx, by).y)}=${v.toFixed(1)}/${mean[iy * cols + ix]!.toFixed(1)}`);
      return ok;
    };
    const firstRow = Math.ceil(((g.top - clip.y) * k) / B);
    const lastRow = Math.floor(((g.bottom - clip.y) * k) / B) - 1;
    let edges = 0;
    for (let bx = 0; bx < cols; bx++) {
      if (!onWords(at(bx, firstRow)) && !edge(bx, firstRow, bx, firstRow + 1)) edges++;
      if (!onWords(at(bx, lastRow)) && !edge(bx, lastRow, bx, lastRow - 1)) edges++;
    }
    for (let by = firstRow; by <= lastRow; by++) {
      if (!onWords(at(0, by)) && !edge(0, by, 1, by)) edges++;
      if (!onWords(at(cols - 1, by)) && !edge(cols - 1, by, cols - 2, by)) edges++;
    }
    if (edges > 0) wrong.push(key + " edges " + edges + " (" + bad.join(" ") + ")");
    // The larger image fills the room under the menu, from edge to edge (on a phone its width; its floor goes on under it).
    const img = await page.locator("[data-home-photo-img]").boundingBox();
    if (!img || img.x > 1 || img.x + img.width < g.width - 1 || (!g.upright && (img.y > g.top + 1 || img.y + img.height < g.bottom - 1))) wrong.push(key + " the image does not fill the room " + JSON.stringify(img));
    // The signature and « Discover More » on the floor, never over the trunk: under 85 % of the height of the photo.
    if (g.words[0]!.y < g.box.y + g.box.h * 0.85) wrong.push(key + " signature over the trunk");
  }
  expect(wrong).toEqual([]);
});

test("2. each great section tells more of its piece: real photos, a sentence of Yoni, its way in; one screen high on a computer", async ({ page }, info) => {
  test.setTimeout(3 * 60_000);
  await home(page);
  // The house: the Butterfly in three moments (the hand of Yoni drawing it, its metal before the setting, its wings set), the
  // sentence of The Bespoke Journey, its world and The Bespoke Journey.
  const house = page.locator("[data-home-story='house']");
  const thread = house.locator("[data-home-thumb]");
  await expect(thread).toHaveCount(3);
  expect(await thread.nth(0).getAttribute("data-home-thumb")).toMatch(/^\/media\/sketches\/michy-batshuayi-butterfly-chain\./);
  expect(await thread.nth(1).getAttribute("data-home-thumb")).toMatch(/\/michy-batshuayi-butterfly-chain\/p77\./);
  expect(await thread.nth(2).getAttribute("data-home-thumb")).toMatch(/michy-batshuayi-butterfly-pendant\/setting\./);
  await expect(house.locator("[data-home-more]")).toHaveText("From a first sketch to the handover in its case: six steps, followed with you on WhatsApp.");
  // One way in per section: The Bespoke Journey; the photo of the piece leads into its world.
  await expect(house.locator("[data-cta]")).toHaveCount(1);
  await expect(house.locator("a[href='/process'][data-cta]")).toHaveCount(1);
  await expect(house.locator("a[data-hero-piece]")).toHaveAttribute("href", "/pieces/michy-batshuayi-butterfly-pendant");
  // A photo of the thread opens full screen, among the others.
  await thread.nth(0).click();
  await expect(page.locator("[role='dialog']")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("[role='dialog']")).toHaveCount(0);

  // The Mechanism: the Dragon Ball and its sphere first, its sentence of Yoni; then the five other mechanisms, each its circle,
  // its title and its sentence (word for word), leading to its piece.
  const mech = page.locator("[data-home-story='mechanism']");
  await expect(mech.locator("[data-sphere-film]")).toHaveCount(1);
  await expect(mech.locator("[data-home-more]")).toHaveText("We therefore engineered the Spirit Bomb to rotate, transforming symbolism into movement.");
  const cards = mech.locator("[data-mechanism]");
  expect(await cards.evaluateAll((as) => as.map((a) => a.getAttribute("data-mechanism")))).toEqual(["vfb-stuttgart-dfb-pokal-2025", "campione-d-italia-2023-2024", "noah-okafor-oka-pendant", "malik-tillman-cross-pendant", "eljero-elia-clover-medallion"]);
  const words = await cards.evaluateAll((as) => as.map((a) => (a as HTMLElement).innerText.replace(/\s+/g, " ").trim()));
  const sentence = (slug: string, label: string) => YONI[slug]!.specs!.find(([l]) => l === label)![1];
  expect(words[0]).toContain(sentence("vfb-stuttgart-dfb-pokal-2025", "HIDDEN MECHANISM"));
  expect(words[1]).toContain(sentence("campione-d-italia-2023-2024", "MECHANISM"));
  expect(words[2]).toContain(sentence("noah-okafor-oka-pendant", "SPECIAL MECHANISM"));
  expect(words[3]).toContain("The central element is designed to rotate, bringing movement to the creation.");
  expect(words[4]).toContain("In the film, the centre turns under the finger.");
  for (const slug of ["vfb-stuttgart-dfb-pokal-2025", "campione-d-italia-2023-2024", "noah-okafor-oka-pendant", "malik-tillman-cross-pendant", "eljero-elia-clover-medallion"]) {
    await expect(mech.locator(`a[data-mechanism='${slug}']`)).toHaveAttribute("href", "/pieces/" + slug);
  }

  // The two championship rings: three real photos each, the sentence of Yoni on the commission, « Enter the World ».
  for (const [slug, re] of [
    ["campione-d-italia-2023-2024", /^Born from a special project/],
    ["vfb-stuttgart-dfb-pokal-2025", /^Created to immortalise/],
  ] as const) {
    const s = page.locator(`[data-home-story='ring-${slug}']`);
    await expect(s.locator("[data-home-thumb]")).toHaveCount(3);
    await expect(s.locator("[data-home-more]")).toHaveText(YONI[slug]!.story.find((x) => re.test(x))!);
    await expect(s.locator(`a[href='/pieces/${slug}'][data-cta]`)).toHaveCount(1);
  }
  // Never a photo of a player taken on the web: the photos of the Inter come from its folder or the hand-over film of Yoni.
  const inter = await page.locator("[data-home-story='ring-campione-d-italia-2023-2024'] [data-home-thumb]").evaluateAll((bs) => bs.map((b) => b.getAttribute("data-home-thumb")));
  for (const src of inter) expect(src).toMatch(/^\/media\/(hd\/campione-d-italia-2023-2024|yoni-2711\/inter-photos)\//);

  // One screen at most on a computer, at every size.
  if (!phone(info.project.name)) {
    for (const size of SIZES) {
      await page.setViewportSize(size);
      await page.waitForTimeout(200);
      const heights = await page.locator("[data-home-story]").evaluateAll((ss) => ss.map((s) => [s.getAttribute("data-home-story"), Math.round(s.getBoundingClientRect().height)] as const));
      for (const [name, h] of heights) expect(h, size.width + "x" + size.height + " " + name).toBeLessThanOrEqual(size.height);
    }
  }
});

test("3. never the same image twice on the home page", async ({ page }) => {
  await home(page);
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
  });
  await page.waitForTimeout(1200);
  const keys = await page.evaluate(() => {
    const key = (s: string) =>
      s
        .replace(/^https?:\/\/[^/]+/, "")
        .replace(/[?#].*$/, "")
        .replace(/\.(webp|avif|jpe?g|png|mp4)$/i, "")
        .replace(/\.(w\d+|loupe)$/, "")
        .replace(/\.[0-9a-f]{10}$/, "")
        .replace(/-(poster|frame)$/, "")
        .replace(/-(\d{3,4})$/, "");
    const out: string[] = [];
    for (const el of document.querySelectorAll("main img, main video, main [data-home-thumb]")) {
      if (el.closest("header, footer, picture source")) continue;
      // A thumbnail button holds its own photo (counted through its button: its photo is the same file).
      if (el.matches("img") && el.closest("[data-home-thumb]")) continue;
      const src = el.getAttribute("data-home-thumb") ?? el.getAttribute("src") ?? (el as HTMLVideoElement).poster ?? "";
      if (!src || src.startsWith("data:")) continue;
      out.push(key(src));
    }
    return out;
  });
  const seen = new Map<string, number>();
  for (const k of keys) seen.set(k, (seen.get(k) ?? 0) + 1);
  expect([...seen].filter(([, n]) => n > 1).map(([k]) => k)).toEqual([]);
});

test("4. « The House » after Press: the portrait of Yoni, his story in a few sentences of the page The House, its way", async ({ page }) => {
  // Each summary is made of the chapters of its language, nothing added (the recipe of src/data/houseSummary.ts).
  for (const [lang, h] of Object.entries({ en, fr, es, de, nl, ar })) expect(composeHouseSummary(h.chapters, lang as "en"), lang).toBe(HOUSE_SUMMARY[lang as "en"]);
  for (const [path, lang] of [
    ["/", "en"],
    ["/fr", "fr"],
    ["/ar", "ar"],
  ] as const) {
    await home(page, path);
    const order = await page.evaluate(() => [...document.querySelectorAll("main section")].map((s) => s.getAttribute("data-home-story") ?? (s.hasAttribute("data-home-press") ? "press" : "")).filter(Boolean));
    expect(order.indexOf("house-summary"), path).toBe(order.indexOf("press") + 1);
    const s = page.locator("[data-home-story='house-summary']");
    await expect(s.locator("[data-home-text='house-summary']")).toHaveText(HOUSE_SUMMARY[lang]);
    await expect(s.locator("[data-home-portrait] img")).toHaveAttribute("src", /\/media\/house\/portrait/);
    await expect(s.locator("[data-home-house-link]")).toHaveAttribute("href", lang === "en" ? "/about" : "/" + lang + "/about");
  }
});

test("5. the loops of The Mechanism: silent, loaded only on screen, still with « reduce motion »", async ({ page, browser }, info) => {
  await home(page);
  const loops = page.locator("[data-home-loop]");
  expect(await loops.count()).toBeGreaterThanOrEqual(3);
  // Nothing loaded before they come on screen.
  expect(await loops.evaluateAll((vs) => vs.filter((v) => v.getAttribute("src")).length)).toBe(0);
  for (const v of await loops.all()) expect(await v.evaluate((e: HTMLVideoElement) => e.muted && e.loop && e.preload === "none")).toBe(true);
  // (On a phone the cards scroll sideways: the cross of Malik Tillman brought into view.)
  await page.locator("[data-mechanism='malik-tillman-cross-pendant']").scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator("[data-mechanisms] [data-home-loop]").evaluateAll((vs) => vs.filter((v) => v.getAttribute("src")).length), { timeout: 10_000 }).toBeGreaterThan(0);
  // With « reduce motion »: their first image only.
  if (phone(info.project.name)) return;
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 }, baseURL: info.project.use.baseURL });
  await silence(context);
  if (process.env.ACCESS_PASSWORD) await context.request.post(new URL("/api/access", info.project.use.baseURL!).href, { form: { password: process.env.ACCESS_PASSWORD, next: "/" }, maxRedirects: 0 });
  const still = await context.newPage();
  await home(still);
  await still.locator("[data-mechanisms]").scrollIntoViewIfNeeded();
  await still.waitForTimeout(1500);
  expect(await still.locator("[data-home-loop]").evaluateAll((vs) => vs.filter((v) => v.getAttribute("src")).length)).toBe(0);
  await context.close();
});
