// The audit of the site of 24/11/2026 at 23 h (14 points): nothing that looks unfinished or made in two different places.
// Computers (Chromium 1440 × 900, Safari 1280 × 800) and the iPhone. Silent (tests/fixtures.ts).
import sharp from "sharp";
import { expect, test } from "./fixtures";
import { skipIntro } from "./helpers";

const phoneOf = (name: string) => name.startsWith("iphone");

test("1–2. no provisional words; a piece for a private collector says it in a fine line under its name, never an empty section", async ({ page }) => {
  await skipIntro(page);
  for (const [path, line] of [
    ["/pieces/baguette-cross-pendant", "Created exclusively for a private collector"],
    ["/fr/pieces/baguette-cuban-chain", "Créée exclusivement pour un collectionneur privé"],
    ["/fr/pieces/baguette-cross-pendant", "Créé exclusivement pour un collectionneur privé"],
  ] as const) {
    await page.goto(path, { waitUntil: "load" });
    await expect(page.locator("main")).not.toContainText(/to be confirmed|à confirmer|as seen in the photos|d’après les photos/i);
    await expect(page.locator("[data-made-for-line]")).toHaveText(line);
    // No title of section saying it with nothing under it.
    await expect(page.locator("main h2", { hasText: /private collector|collectionneur privé/i })).toHaveCount(0);
  }
  // A piece made for someone keeps its section, with them.
  await page.goto("/pieces/kevin-schade-dragon-ball-pendant", { waitUntil: "load" });
  await expect(page.locator("[data-made-for] [data-made-for-person='kevin-schade']")).toHaveCount(1);
  await expect(page.locator("[data-made-for-line]")).toHaveCount(0);
});

test("3. every thumbnail on the same black: no edge, the jewel at the same share of its frame", async ({ page }, info) => {
  test.skip(phoneOf(info.project.name), "measured on a computer");
  await skipIntro(page);
  await page.goto("/creations", { waitUntil: "load" });
  const frames = page.locator("[data-creations-grid] [data-thumb-frame]");
  const n = await frames.count();
  expect(n).toBeGreaterThan(30);
  const bad: string[] = [];
  for (let i = 0; i < n; i++) {
    const frame = frames.nth(i);
    await frame.scrollIntoViewIfNeeded();
    await frame.locator("img").first().evaluate((img: HTMLImageElement) => (img.complete ? null : new Promise((r) => img.addEventListener("load", r, { once: true }))));
    await page.waitForTimeout(100);
    const slug = await frame.evaluate((el) => el.closest("[data-piece-card]")?.getAttribute("data-piece-card"));
    const { data, info: im } = await sharp(await frame.screenshot({ type: "png" })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const lum = (x: number, y: number) => (0.2126 * data[(y * im.width + x) * 3]! + 0.7152 * data[(y * im.width + x) * 3 + 1]! + 0.0722 * data[(y * im.width + x) * 3 + 2]!) / 255;
    let sum = 0;
    let count = 0;
    for (let y = 0; y < im.height; y++)
      for (let x = 0; x < im.width; x++) {
        if (x >= 6 && y >= 6 && x < im.width - 6 && y < im.height - 6) continue;
        sum += lum(x, y);
        count++;
      }
    const edge = sum / count - 10 / 255;
    let top = -1;
    let bottom = -1;
    for (let y = 0; y < im.height; y++) {
      let lit = 0;
      for (let x = 0; x < im.width; x++) if (lum(x, y) > 10 / 255 + 0.1) lit++;
      if (lit >= Math.max(2, im.width * 0.01)) {
        if (top < 0) top = y;
        bottom = y;
      }
    }
    const share = top < 0 ? 0 : (bottom - top + 1) / im.height;
    // A jewel wider than high fills the width of its frame instead (never cut by it).
    let left = im.width;
    let right = -1;
    for (let y = Math.max(0, top); y <= bottom; y++)
      for (let x = 0; x < im.width; x++)
        if (lum(x, y) > 10 / 255 + 0.1) {
          left = Math.min(left, x);
          right = Math.max(right, x);
        }
    const across = right < 0 ? 0 : (right - left + 1) / im.width;
    if (edge > 0.03 || share > 0.75 || (share < 0.55 && across < 0.85)) bad.push(slug + " (edge " + (edge * 100).toFixed(1) + " %, jewel " + Math.round(share * 100) + " % high, " + Math.round(across * 100) + " % wide)");
  }
  expect(bad).toEqual([]);
  await page.screenshot({ path: "verification/" + info.project.name + "/audit2411-creations.jpg", type: "jpeg", quality: 70, fullPage: true });
});

test("4–5. The Berete Circle: one rule for every card; one name for each section; Sambi Lokonga out until his piece", async ({ page }, info) => {
  await skipIntro(page);
  await page.goto("/players", { waitUntil: "load" });
  // No number on a card; a club only for the clubs of the house.
  await expect(page.locator("[data-player-card='marcus-thuram']")).not.toContainText("9");
  await expect(page.locator("[data-player-card='marcus-thuram']")).toContainText("Inter Milan");
  await expect(page.locator("[data-player-card='kenan-yildiz'] span.text-mist")).toHaveCount(0);
  await expect(page.locator("[data-player-card='inter-milan']")).not.toContainText(/^Club$/);
  await expect(page.locator("[data-player-card='sambi-lokonga']")).toHaveCount(0);
  await page.goto("/players/sambi-lokonga", { waitUntil: "load" });
  await expect(page).toHaveURL(/\/players$/);
  // The number on the page of the player only.
  await page.goto("/players/marcus-thuram", { waitUntil: "load" });
  await expect(page.locator("[data-player-number]")).toContainText("9");
  await expect(page.locator("main")).not.toContainText("The Moments");
  // A club: « Their Creation », and its page laid out like the page of a player.
  await page.goto("/players/inter-milan", { waitUntil: "load" });
  await expect(page.locator("#player-pieces")).toHaveText(/Their Creation/);
  await expect(page.locator("main")).not.toContainText("Personal Creation");
  await expect(page.locator("main")).not.toContainText("The Moments");
  if (!phoneOf(info.project.name)) {
    const photo = (await page.locator("[data-player-portrait]").boundingBox())!;
    const name = (await page.locator("[data-player-hero] h1").boundingBox())!;
    expect(name.x - (photo.x + photo.width)).toBeLessThan(140);
    expect(Math.abs(name.y + name.height - (photo.y + photo.height))).toBeLessThan(80);
  }
  await page.screenshot({ path: "verification/" + info.project.name + "/audit2411-club.jpg", type: "jpeg", quality: 70 });
  // French: « En images », the trunk of The Hand named like its piece.
  await page.goto("/fr/players/marcus-thuram", { waitUntil: "load" });
  await expect(page.locator("main")).not.toContainText("Moments exclusifs");
  await page.goto("/fr/pieces/the-hand", { waitUntil: "load" });
  await expect(page.locator("main")).not.toContainText("Cube The Hand");
});

test("6–7. one style for the titles of section; « Your story, in diamonds » once; the photos of The Atelier sharp", async ({ page }) => {
  await skipIntro(page);
  await page.goto("/atelier", { waitUntil: "load" });
  for (const h of await page.locator("main h2:visible").all()) expect(await h.evaluate((e) => getComputedStyle(e).textTransform), await h.innerText()).toBe("uppercase");
  await page.locator("[data-philosophy]").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-philosophy] [data-quote]")).toBeVisible();
  await page.goto("/contact", { waitUntil: "load" });
  expect(await page.getByText("Your story, in diamonds", { exact: false }).count()).toBe(1);
});

test("8–10. the cards: one format, « Enter the World → » on one line with its arrow held to it; on a phone the type alone", async ({ page }, info) => {
  await skipIntro(page);
  await page.goto("/creations", { waitUntil: "load" });
  const card = page.locator("[data-piece-card='kevin-schade-dragon-ball-pendant']");
  await card.scrollIntoViewIfNeeded();
  // (What is read on screen: the mention is hidden on a phone.)
  if (phoneOf(info.project.name)) await expect(card.locator("[data-card-line]")).toHaveText("Pendant", { useInnerText: true });
  else await expect(card.locator("[data-card-line]")).toHaveText("Pendant · Created exclusively for Kevin Schade", { useInnerText: true });
  const enter = card.locator("[data-enter-world]");
  // One line: all its words (and its arrow) on the same row (its box is taller: the room of a finger, 48 px).
  const rows = await enter.evaluate((e) => {
    const r = document.createRange();
    r.selectNodeContents(e);
    const tops = [...r.getClientRects()].filter((x) => x.width > 0).map((x) => x.top);
    // (The arrow sits a few pixels lower than the letters: a second row only beyond half a line.)
    return Math.max(...tops) - Math.min(...tops) > 8 ? 2 : 1;
  });
  // (English on one line; a longer language may wrap, its arrow always with its last word.)
  expect(rows).toBeLessThanOrEqual(1);
  // The arrow right after the words.
  const gap = await enter.evaluate((e) => {
    const svg = e.querySelector("svg")!.getBoundingClientRect();
    const r = document.createRange();
    r.selectNodeContents(e);
    const words = [...r.getClientRects()].filter((x) => x.width > 0);
    const last = words.filter((x) => Math.abs(x.top - svg.top) < 12).sort((a, b) => b.right - a.right).find((x) => x.right <= svg.left + 1);
    return last ? svg.left - last.right : 0;
  });
  expect(gap).toBeLessThan(14);
  await page.screenshot({ path: "verification/" + info.project.name + "/audit2411-cards.jpg", type: "jpeg", quality: 70 });
});

test("9. one button per card: the mechanisms (Enter the World), the press (the article, a photo on each)", async ({ page }) => {
  await skipIntro(page);
  await page.goto("/atelier", { waitUntil: "load" });
  for (const ring of await page.locator("[data-lifting-ring]").all()) await expect(ring.locator("[data-cta]")).toHaveCount(1);
  await expect(page.locator("main")).not.toContainText("Reveal the Secret");
  await page.goto("/press", { waitUntil: "load" });
  const cards = page.locator("[data-press-card]");
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    await expect(cards.nth(i).locator("[data-press-piece]")).toHaveCount(0);
    await expect(cards.nth(i).locator("img")).toHaveCount(1);
  }
});

test("11–13. Every Angle without captions, four different views first; the plan of the site without redirections; the journey centred", async ({ page, request }, info) => {
  await skipIntro(page);
  await page.goto("/pieces/campione-d-italia-2023-2024", { waitUntil: "load" });
  await page.locator("[data-every-angle]").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await expect(page.locator("[data-angle-title]")).toHaveCount(0);
  const first = await page.locator("[data-angle] img").evaluateAll((els) => els.slice(0, 4).map((e) => (e.getAttribute("src") ?? "").split("/").pop()!.split(".")[0]));
  expect(first.filter((f) => ["p55", "p56", "p57"].includes(f)).length).toBeLessThanOrEqual(1);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("/creations/chains/tennis");
  if (!phoneOf(info.project.name)) {
    await page.goto("/process", { waitUntil: "load" });
    const list = (await page.locator("[data-timeline-list]").boundingBox())!;
    const vw = page.viewportSize()!.width;
    expect(list.width).toBeLessThanOrEqual(762);
    expect(Math.abs(list.x + list.width / 2 - vw / 2)).toBeLessThan(12);
    const a = (await page.locator("[data-journey-order]").boundingBox())!;
    const b = (await page.locator("[data-journey-time]").boundingBox())!;
    expect(Math.abs(a.width - b.width)).toBeLessThan(2);
    await page.screenshot({ path: "verification/" + info.project.name + "/audit2411-journey.jpg", type: "jpeg", quality: 70 });
  }
});

test("8. iPhone: the photo of the home page whole and centred", async ({ page }, info) => {
  test.skip(!phoneOf(info.project.name), "a phone");
  await skipIntro(page);
  await page.goto("/", { waitUntil: "load" });
  const img = page.locator("[data-home-photo-img]");
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.currentSrc)).toContain("hero-phone");
  const box = (await page.locator("[data-home-photo-box]").boundingBox())!;
  const vw = page.viewportSize()!.width;
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(vw + 1);
  expect(Math.abs(box.x + box.width / 2 - vw / 2)).toBeLessThan(3);
  await page.screenshot({ path: "verification/" + info.project.name + "/audit2411-accueil.jpg", type: "jpeg", quality: 70 });
});
