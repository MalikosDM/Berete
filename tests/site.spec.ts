import { YONI } from "../src/data/yoni2711";
import { expect, test, type Page } from "./fixtures";
import { resolveAtelier } from "../src/data/atelier";
import { COLLECTIONS, MIN_PIECES } from "../src/data/collections";
import { partOf, PIECES } from "../src/data/pieces";
import { defaultCatalogue } from "../src/data/catalogue";
import { pieceMediaOf } from "../src/data/pageMedia";
import { resolveShowcase } from "../src/data/showcase";
import { completeMakingOf, makingSteps } from "../src/data/making";
import type { Catalogue, MediaItem, Piece } from "../src/data/types";
import { coverSrcSet, srcSetOf } from "../src/lib/responsive";
import { checkPage, getCatalogue, skipIntro, watch } from "./helpers";

/*
 * Checks of the whole site, on a 1440px desktop and a 390px iPhone:
 * no console error, no 404, the 30 stories in order with every step shown
 * and every video really playing, the scroll-driven films, every page of the
 * catalogue, no horizontal overflow, readable text; the collections from the
 * home page to every piece; the links between players, pieces and stories in
 * both directions; sharp, well framed main photos. Screenshots: verification/.
 */


const MAIN_PAGES = ["/", "/creations", "/players", "/atelier", "/boxes", "/process", "/about", "/press", "/contact", "/legal", "/privacy", "/admin"];

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

/* ---------- Pages ---------- */

test("main pages: no error, no 404, no overflow, own title", async ({ page }, info) => {
  const titles = new Map<string, string>();
  for (const path of MAIN_PAGES) {
    const name = path === "/" ? "home" : path.slice(1);
    titles.set(path, await checkPage(page, info, path, name, path === "/" || path === "/process" ? 6 : 3));
  }
  expect(titles.get("/")).toBe("Berete Jewellers — The Art of Individuality, Dubai");
  expect(new Set(titles.values()).size, "every page has its own title").toBe(titles.size);
});

/**
 * Sharpness of a photo: variance of its Laplacian at 320px (same measure as the review of the photos).
 * Measured on the file the browser chose (currentSrc): with a srcset, naturalWidth is scaled to the screen.
 */
async function sharpness(page: Page, selector: string): Promise<{ score: number; width: number; height: number }> {
  return page.locator(selector).first().evaluate(async (el) => {
    const img = new Image();
    img.src = (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src;
    await img.decode();
    const s = 320 / Math.max(img.naturalWidth, img.naturalHeight);
    const w = Math.max(1, Math.round(img.naturalWidth * s));
    const h = Math.max(1, Math.round(img.naturalHeight * s));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    const g = (x: number, y: number) => {
      const i = (y * w + x) * 4;
      return 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
    };
    let sum = 0;
    let sq = 0;
    let n = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const v = Math.min(255, Math.max(0, g(x - 1, y) + g(x + 1, y) + g(x, y - 1) + g(x, y + 1) - 4 * g(x, y) + 128));
        sum += v;
        sq += v * v;
        n++;
      }
    }
    const mean = sum / n;
    return { score: sq / n - mean * mean, width: img.naturalWidth, height: img.naturalHeight };
  });
}

/** What a piece page must show: its cover (sharp), gallery, people, the five steps, similar pieces, the WhatsApp button. */
async function checkPieceStructure(page: Page, cat: Catalogue, piece: Piece) {
  const id = piece.slug;
  await expect(page.locator("h1#piece-title"), id).toHaveText(piece.title);
  // The photo of the opening as it is shown (since 28/11/2026 the layout not shown loads a transparent pixel instead).
  const cover = 'section[aria-labelledby="piece-title"] img:visible';
  await expect.poll(() => page.locator(cover).first().evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0), { message: id + " cover loaded" }).toBe(true);
  const quality = await sharpness(page, cover);
  // (The FAM medallion: its only real photo is 604 px, its AI studio image gone on 27/11/2026: an HD photo is asked of Yoni.)
  if (piece.slug !== "tanguy-nianzou-fam-medallion") expect(Math.min(quality.width, quality.height), id + " cover size").toBeGreaterThanOrEqual(360);
  expect(quality.score, id + " cover sharpness").toBeGreaterThan(250);
  // Begin Your Creation leads to the contact page with the piece; WhatsApp writes its name (24/11/2026).
  await expect(page.locator("[data-want-piece]"), id).toHaveAttribute("href", "/contact?piece=" + piece.slug);
  await expect(page.locator("[data-piece-whatsapp]"), id).toHaveAttribute("href", new RegExp("wa\\.me/971585930211\\?text=.*" + encodeURIComponent(piece.title).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  // "Every Angle": every photo and film, each with its text; the first ones when there are many, then "See N more".
  const part = partOf(piece.slug);
  const partPiece = part ? defaultCatalogue.pieces.find((p) => p.slug === part.slug) : undefined;
  const angles = pieceMediaOf(piece, {
    box: piece.boxSlug ? defaultCatalogue.boxes.find((b) => b.slug === piece.boxSlug) : undefined,
    part: part && partPiece ? { piece: partPiece, photos: part.photos } : null,
    opening: resolveShowcase(piece.slug, piece.showcase),
  }).angles;
  // Since 25/11/2026 a magazine: four photos of the whole at most, the photos of the details beside their sentence, then See more.
  expect(await page.locator("[data-every-angle] [data-angle]").count(), id + " every angle").toBeLessThanOrEqual(4);
  const shownFirst = await page.locator("[data-angle]").count();
  // (Yoni's pages, 26-27/11/2026: Every Angle may open on the photo of the opening, a detail on a photo of its chain.)
  expect(shownFirst, id + " photos shown first").toBeLessThanOrEqual(angles.length + (YONI[piece.slug] ? 4 + piece.details.length : 0));
  // (Since 26/11/2026 a watch whose only photos are its opening and worn ones — its AI studio image gone — has no Every Angle.)
  if (angles.length > 0) expect(shownFirst, id + " photos shown first").toBeGreaterThan(0);
  // (Yoni's pages: See More whenever photos are left beyond its four and its details.)
  if (!YONI[piece.slug]) await expect(page.locator("[data-angle-more]"), id + " see more").toHaveCount(angles.length > shownFirst ? 1 : 0);
  for (const v of await page.locator("[data-angle] video").all()) {
    expect(await v.evaluate((el) => (el as HTMLVideoElement).muted && (el as HTMLVideoElement).loop), id + " gallery videos are muted loops").toBe(true);
  }
  // "The Making of a Masterpiece" lives in The Atelier since 24/11/2026 (Yoni): on the page, a way there when the piece has
  // its making-of film or real steps (src/data/making.ts); none: no way.
  const box = piece.boxSlug ? cat.boxes.find((b) => b.slug === piece.boxSlug)?.images[0] : undefined;
  const steps = makingSteps(piece, box);
  const film = resolveAtelier(piece.slug, piece.atelier) || completeMakingOf(piece.slug, piece.atelier);
  await expect(page.locator("[data-making]"), id + " no making-of on the page").toHaveCount(0);
  await expect(page.locator("[data-enter-atelier-link]"), id + " the way to its making-of").toHaveCount(steps.length > 0 || film ? 1 : 0);
  if (steps.length > 0 || film) await expect(page.locator("[data-enter-atelier-link]")).toHaveAttribute("href", "/atelier?piece=" + piece.slug);
  for (const slug of piece.people.slice(0, 3)) await expect(page.locator('[data-made-for-person="' + slug + '"]'), id + " made for " + slug).toHaveAttribute("href", "/players/" + slug);
  const sameType = cat.pieces.filter((p) => p.type === piece.type && p.slug !== piece.slug);
  const similar = await page.locator("[data-similar] [data-piece-card]").evaluateAll((els) => els.map((e) => e.getAttribute("data-piece-card")));
  expect(similar.length, id + " similar").toBe(Math.min(4, sameType.length));
  for (const s of similar) expect(sameType.some((p) => p.slug === s), id + " similar " + s + " is of the same type").toBe(true);
  if (piece.boxSlug) await expect(page.locator("[data-custom-box]"), id + " custom box").toHaveCount(1);
}

/** Three pieces get full screenshots, desktop and phone. */
const SHOWCASE = ["kevin-schade-dragon-ball-pendant", "vfb-stuttgart-dfb-pokal-2025", "michy-batshuayi-butterfly-pendant"];
const CHUNK = 8;

// The published pieces (the others have no page: tests/identity.spec.ts checks their redirects).
const PUBLISHED = PIECES.filter((p) => p.published);
for (let i = 0; i < PUBLISHED.length; i += CHUNK) {
  const slugs = PUBLISHED.slice(i, i + CHUNK).map((p) => p.slug);
  test("piece pages " + (i + 1) + " to " + (i + slugs.length) + ": opening, gallery, made for, making, similar, WhatsApp", async ({ page }, info) => {
    const cat = await getCatalogue(page);
    for (const slug of slugs) {
      const piece = cat.pieces.find((p) => p.slug === slug);
      expect(piece, slug + " is in the base").toBeTruthy();
      const showcase = SHOWCASE.includes(slug);
      await checkPage(page, info, "/pieces/" + slug, (showcase ? "piece-showcase-" : "piece-") + slug, showcase ? 5 : 1);
      await checkPieceStructure(page, cat, piece!);
    }
  });
}

test("every person has a working page", async ({ page }, info) => {
  const cat = await getCatalogue(page);
  const titles = new Set<string>();
  for (const p of cat.people) titles.add(await checkPage(page, info, "/players/" + p.slug, "player-" + p.slug, 1));
  expect(titles.size, "unique titles").toBe(cat.people.length);
});

// Since 23/11/2026 the home page has no tiles of the collections: the menu leads to each one (Yoni: under « Creations »).
test("the menu leads to every collection, every card to its piece", async ({ page }, info) => {
  const cat = await getCatalogue(page);
  const count = (type: string) => cat.pieces.filter((p) => p.type === type).length;
  const expected = COLLECTIONS.filter((c) => count(c.type) >= MIN_PIECES);
  expect(expected.length, "at least four collections").toBeGreaterThanOrEqual(4);
  const phone = info.project.name !== "desktop";
  const openFromMenu = async (slug: string) => {
    if (phone) {
      await page.locator("button[aria-controls='mobile-menu']").click();
      await page.locator("#mobile-menu a[href='/creations/" + slug + "']").click();
    } else {
      await page.locator("[data-desktop-nav] a[href='/creations']").first().hover();
      await page.locator("[data-creations-menu] a[href='/creations/" + slug + "']").click();
    }
  };

  const titles = new Set<string>();
  for (const c of expected) {
    await page.goto("/");
    await openFromMenu(c.slug);
    await expect(page).toHaveURL(new RegExp("/creations/" + c.slug + "$"));
    // Reached in the page itself (no reload): the collection is really shown.
    await expect(page.locator("h1")).toContainText(c.name);
    titles.add(await checkPage(page, info, "/creations/" + c.slug, "collection-" + c.slug, 3));
    // (Its grid, since 23/11/2026.)
    const hrefs = await page.locator("[data-creations-grid] [data-piece-card]").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    expect(hrefs.sort(), c.slug + " shows all its pieces").toEqual(cat.pieces.filter((p) => p.type === c.type).map((p) => "/pieces/" + p.slug).sort());
    await expect(page.locator("h1")).toContainText(c.name);
  }
  expect(titles.size, "each collection has its own title").toBe(expected.length);

  // A type without pieces yet: no error, a clear message.
  const empty = COLLECTIONS.find((c) => count(c.type) === 0);
  if (empty) {
    await checkPage(page, info, "/creations/" + empty.slug, "collection-" + empty.slug, 1);
    await expect(page.getByText("New pieces are being crafted")).toBeVisible();
  }
});

test("creations filters and old addresses", async ({ page }) => {
  const problems = watch(page);
  const cat = await getCatalogue(page);
  const count = (type: string) => cat.pieces.filter((p) => p.type === type).length;
  await page.goto("/creations");
  // (The creations of the grid, since 23/11/2026.)
  const cards = page.locator("[data-creations-grid] [data-piece-card]");
  await expect(cards).toHaveCount(cat.pieces.length);
  for (const c of COLLECTIONS) {
    const button = page.getByRole("button", { name: new RegExp("^" + c.name) });
    if (count(c.type) === 0) {
      await expect(button, c.name + " has no filter while it has no piece").toHaveCount(0);
      continue;
    }
    await button.click();
    await expect(cards).toHaveCount(count(c.type));
  }
  // Old addresses: a piece under /creations, renamed pieces, /pieces alone.
  await page.goto("/creations/the-hand");
  await expect(page).toHaveURL(/\/pieces\/the-hand$/);
  await page.goto("/creations/rs");
  await expect(page).toHaveURL(/\/pieces\/angelo-stiller-as-pendant$/);
  await page.goto("/pieces/white-hands");
  await expect(page).toHaveURL(/\/pieces\/kenan-yildiz-celebration-pendant$/);
  await page.goto("/pieces");
  await expect(page).toHaveURL(/\/creations$/);
  // The same in another language, and the server answers with a real redirect.
  await page.goto("/fr/creations/rs");
  await expect(page).toHaveURL(/\/fr\/pieces\/angelo-stiller-as-pendant$/);
  const moved = await page.request.get("/es/pieces/white-hands", { maxRedirects: 0 });
  expect(moved.status()).toBe(301);
  expect(moved.headers()["location"]).toBe("/es/pieces/kenan-yildiz-celebration-pendant");
  // Every photo and video of the catalogue answers.
  const files = new Set<string>();
  for (const p of cat.pieces) [p.cover, ...p.gallery, ...p.handover, ...Object.values(p.making)].forEach((m) => m && files.add(m.src));
  for (const b of cat.boxes) b.images.forEach((m) => files.add(m.src));
  for (const s of cat.stories) {
    files.add(s.cover);
    s.media.forEach((m) => {
      files.add(m.src);
      if (m.poster) files.add(m.poster);
    });
  }
  for (const src of files) {
    const r = await page.request.head(src);
    expect(r.status(), src).toBeLessThan(400);
  }
  expect(problems.errors).toEqual([]);
});

/* ---------- Players, pieces and stories are linked both ways ---------- */

test("every photo of the catalogue has its lighter copies (npm run media:sizes)", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "once is enough");
  const cat = await getCatalogue(page);
  const photos: MediaItem[] = [
    ...cat.pieces.flatMap((p) => [p.cover, ...p.gallery, ...p.handover, ...Object.values(p.making ?? {})]),
    ...cat.boxes.flatMap((b) => b.images),
    ...cat.stories.flatMap((s) => s.media),
  ].filter((m): m is MediaItem => !!m && m.type === "image");
  const sets = [...photos.map((m) => srcSetOf(m.src, m.width)), ...cat.stories.map((s) => coverSrcSet(s.cover))];
  const copies = [...new Set(sets.flatMap((s) => (s ? s.split(", ").map((c) => c.split(" ")[0]!) : [])))];
  expect(copies.length, "copies offered").toBeGreaterThan(200);
  const missing: string[] = [];
  for (const url of copies) if ((await page.request.head(url)).status() !== 200) missing.push(url);
  expect(missing, "missing copies").toEqual([]);
});

// Since 23/11/2026 (Yoni) no bubbles of stories on their page: their pieces only.
test("player pages show all their pieces, and no bubbles of stories", async ({ page }) => {
  const cat = await getCatalogue(page);
  for (const person of cat.people) {
    await page.goto("/players/" + person.slug);
    await expect(page.locator("[data-player-story]")).toHaveCount(0);
    // Player -> pieces: every piece made for this person, and nothing else.
    const hrefs = await page.locator('#player-pieces ~ ul a[href^="/pieces/"]').evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    const own = cat.pieces.filter((p) => p.people.includes(person.slug)).map((p) => "/pieces/" + p.slug);
    expect(hrefs.sort(), person.slug + " pieces").toEqual(own.sort());
  }
  // Collectors and Press stay stories only.
  await page.goto("/players");
  await expect(page.locator('a[href="/players/collectors"], a[href="/players/press"]')).toHaveCount(0);
});

test("piece -> player and stories, story -> piece", async ({ page }) => {
  const problems = watch(page);
  // Profile -> its stories (24/11/2026: the stories live on the profiles, never on the pages of the pieces).
  await page.goto("/players/kevin-schade?story=kevin-schade&piece=kevin-schade-dragon-ball-pendant");
  await expect(page.locator('[role="dialog"][data-story="kevin-schade"]')).toBeVisible();
  // Story -> piece, from the viewer.
  const see = page.locator('[role="dialog"] [data-see-piece]');
  await expect(see).toHaveAttribute("data-see-piece", "kevin-schade-dragon-ball-pendant");
  await page.getByRole("button", { name: "Close the story" }).click();
  // Piece -> player -> stories.
  await page.goto("/pieces/kevin-schade-dragon-ball-pendant");
  await page.locator('[data-made-for-person="kevin-schade"]').evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.locator('[data-made-for-person="kevin-schade"]').click();
  await expect(page).toHaveURL(/\/players\/kevin-schade$/);
  await expect(page.locator('a[href="/pieces/kevin-schade-dragon-ball-pendant"]').first()).toBeVisible();
  // Story -> piece (no bubbles any more, 23/11/2026: its stories open from the piece), then the click opens the piece.
  await page.goto("/players/michy-batshuayi?story=michy-batshuayi&piece=michy-batshuayi-butterfly-pendant");
  const link = page.locator('[role="dialog"] [data-see-piece]');
  await expect(link).toHaveAttribute("href", "/pieces/michy-batshuayi-butterfly-pendant");
  await link.click();
  await expect(page).toHaveURL(/\/pieces\/michy-batshuayi-butterfly-pendant$/);
  await expect(page.locator("h1#piece-title")).toContainText("Butterfly");
  // From a piece to a similar one, then to its collection and another one, without reloading.
  const similar = page.locator("[data-similar] [data-piece-card]").first();
  const next = await similar.getAttribute("data-piece-card");
  await similar.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await similar.click();
  await expect(page).toHaveURL(new RegExp("/pieces/" + next + "$"));
  const nextTitle = (await getCatalogue(page)).pieces.find((p) => p.slug === next)!.title;
  await expect(page.locator("h1#piece-title")).toHaveText(nextTitle);
  await page.goto("/creations/pendants");
  await page.locator('main a[href="/creations/chains"]').first().evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.locator('main a[href="/creations/chains"]').first().click();
  await expect(page.locator("h1")).toContainText("Chains");
  const chains = (await getCatalogue(page)).pieces.filter((p) => p.type === "chain").length;
  await expect(page.locator("[data-creations-grid] [data-piece-card]")).toHaveCount(chains);
  expect(problems.errors).toEqual([]);
});

/* ---------- Stories ---------- */

// (The 30 stories were opened from the bubbles of the home page: no bubbles since 23/11/2026, Yoni. A story opens from its
// piece, or from the page of a person known from the stories only.)

test("story viewer: buttons, pause, close", async ({ page }) => {
  await page.goto("/players/kevin-schade?story=kevin-schade");
  const dialog = page.locator('[role="dialog"][data-story="kevin-schade"]');
  await expect(dialog).toBeVisible();
  // Long press pauses the photo timer.
  const bar = dialog.locator("[data-progress]");
  const surface = dialog.locator("[data-story-surface]");
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(400);
  const w1 = await bar.evaluate((el) => (el as HTMLElement).style.width);
  await page.waitForTimeout(1000);
  const w2 = await bar.evaluate((el) => (el as HTMLElement).style.width);
  await page.mouse.up();
  expect(w2).toBe(w1);
  await dialog.getByRole("button", { name: "Close the story" }).click();
  await expect(dialog).toHaveCount(0);
});

/* ---------- Scroll-driven films ---------- */

// 24/11/2026 (Yoni): no film moved by the scroll on the site any more (the home page lost it on 23/11, /process on 24/11; the
// films are kept, SketchToJewel and ScrollVideo stay in the code): The Bespoke Journey is a compact page and a timeline of
// six steps, each with its image.
test("/process: no film moved by the scroll, the journey then a timeline of six steps with their images", async ({ page }) => {
  const problems = watch(page);
  await page.goto("/process", { waitUntil: "load" });
  await expect(page.locator("[data-scroll-video]")).toHaveCount(0);
  await expect(page.locator("[data-journey]")).toBeVisible();
  const steps = page.locator("[data-timeline] [data-timeline-step]");
  await expect(steps).toHaveCount(6);
  for (const step of await steps.all()) {
    await step.scrollIntoViewIfNeeded();
    const img = step.locator("img").first();
    await expect.poll(() => img.evaluate((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0), { timeout: 15_000 }).toBe(true);
  }
  await expect(steps.nth(3)).toContainText("Live progress photos and videos on WhatsApp");
  expect(problems.errors).toEqual([]);
});

/* ---------- Logo, admin, forms ---------- */

// 24/11/2026 (Yoni): the logo a sharp vector image (src/components/Logo.tsx), the name smaller and exactly in the middle of the page.
test("logo in the navigation: the logo as it was, and the name of the house again, in the middle of the bar (23-24/11/2026)", async ({ page }, info) => {
  const phone = info.project.name === "iphone";
  await page.goto("/creations");
  const logo = page.locator('header a[aria-label="Berete Jewellers, home"] img:visible');
  await expect(logo).toHaveAttribute("src", /\/media\/brand\/logo-sharp\.[0-9a-f]+\.svg$/);
  // 40 px on a phone, 44 px at the 15 px scale of a computer.
  expect(Math.round((await logo.boundingBox())!.height)).toBe(phone ? 40 : 41);
  const name = page.locator("header [data-wordmark] img");
  await expect(name).toBeVisible();
  const box = (await name.boundingBox())!;
  expect(box.width).toBeGreaterThan(phone ? 140 : 180);
  // In the middle of the page.
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThanOrEqual(2);
  // Still there once the page has scrolled.
  await page.evaluate(() => window.scrollTo(0, 2400));
  await page.waitForTimeout(600);
  await expect(name).toBeInViewport();
});

test("contact: call back request reaches the admin", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "once is enough");
  const password = process.env.ADMIN_PASSWORD;
  test.skip(!password, "ADMIN_PASSWORD (.env) is needed to open the admin");
  const problems = watch(page);
  await page.goto("/contact");
  // The block fades in when it reaches the screen.
  await page.locator("button[aria-controls=callback-form]").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.getByRole("button", { name: /By Phone/i }).click();
  const form = page.locator("#callback-form");
  await form.getByLabel("Name").fill("Test Verification");
  await form.getByLabel("Phone number").fill("+971500000000");
  await form.getByRole("button", { name: "Call me back" }).click();
  await expect(page.getByText("We will call you back shortly")).toBeVisible();

  await page.goto("/admin");
  await page.getByLabel("Mot de passe").fill(password!);
  await page.getByRole("button", { name: "Se connecter" }).click();
  // (« Stories » left the admin on 25/11/2026.)
  await expect(page.getByRole("tab", { name: "Pièces" })).toBeVisible();
  await page.getByRole("tab", { name: "Messages" }).click();
  await expect(page.getByText("Test Verification").first()).toBeVisible();
  expect(problems.errors).toEqual([]);
});
