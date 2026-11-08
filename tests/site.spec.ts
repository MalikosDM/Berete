import { expect, test, type Page } from "@playwright/test";
import { COLLECTIONS, MIN_PIECES } from "../src/data/collections";
import { PIECES } from "../src/data/pieces";
import { MAKING_STEPS, type Catalogue, type MediaItem, type Piece } from "../src/data/types";
import { coverSrcSet, srcSetOf } from "../src/lib/responsive";
import { checkPage, getCatalogue, scrollTo, shotPath, skipIntro, watch } from "./helpers";

/*
 * Checks of the whole site, on a 1440px desktop and a 390px iPhone:
 * no console error, no 404, the 30 stories in order with every step shown
 * and every video really playing, the scroll-driven films, every page of the
 * catalogue, no horizontal overflow, readable text; the collections from the
 * home page to every piece; the links between players, pieces and stories in
 * both directions; sharp, well framed main photos. Screenshots: verification/.
 */

const STORY_TITLES = [
  "Kenan Yildiz", "Noah Okafor", "Kevin Schade", "Thuram", "Loïs Openda", "Inter Milan", "Michy Batshuayi", "Radja Nainggolan", "Collectors", "Press",
  "Noah Okafor II", "Jamie Leweling", "Deniz Undav", "Angelo Stiller", "Samuel Ballet", "Keita Losene", "Malik Tillman", "Thuram II", "Noah Okafor S24", "Thuram SS23",
  "Inter Squad", "Sambi Lokonga", "NZ", "Malik Tillman II", "Tajon Buchanan", "Eljero Elia", "Sidney Eweka", "Tanguy Nianzou", "Marcus Thuram", "Jeff Chabot",
];

const MAIN_PAGES = ["/", "/creations", "/players", "/atelier", "/boxes", "/process", "/about", "/contact", "/legal", "/privacy", "/admin"];

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
  expect(titles.get("/")).toBe("Berete Jewellers — Custom High Jewellery, Dubai");
  expect(new Set(titles.values()).size, "every page has its own title").toBe(titles.size);
});

/** The piece shown in each story file, as the story viewer computes it. */
function pieceByMedia(cat: Catalogue): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of cat.pieces) {
    for (const m of [p.cover, ...p.gallery, ...p.handover, ...Object.values(p.making)]) if (m && m.src && !map.has(m.src)) map.set(m.src, p.slug);
  }
  return map;
}

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
  const cover = 'section[aria-labelledby="piece-title"] img';
  await expect.poll(() => page.locator(cover).first().evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0), { message: id + " cover loaded" }).toBe(true);
  const quality = await sharpness(page, cover);
  expect(Math.min(quality.width, quality.height), id + " cover size").toBeGreaterThanOrEqual(360);
  expect(quality.score, id + " cover sharpness").toBeGreaterThan(250);
  await expect(page.locator("[data-want-piece]"), id).toHaveAttribute("href", new RegExp("wa\\.me/971XXXXXXXXX\\?text=.*" + encodeURIComponent(piece.title).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await expect(page.locator("[data-gallery-item]"), id + " gallery").toHaveCount(piece.gallery.length);
  for (const v of await page.locator("[data-gallery-item] video").all()) {
    expect(await v.evaluate((el) => (el as HTMLVideoElement).muted && (el as HTMLVideoElement).loop), id + " gallery videos are muted loops").toBe(true);
  }
  await expect(page.locator("[data-making-step]"), id + " making").toHaveCount(MAKING_STEPS.length);
  for (const slug of piece.people.slice(0, 3)) await expect(page.locator('[data-made-for-person="' + slug + '"]'), id + " made for " + slug).toHaveAttribute("href", "/players/" + slug);
  const sameType = cat.pieces.filter((p) => p.type === piece.type && p.slug !== piece.slug);
  const similar = await page.locator("[data-similar] [data-piece-card]").evaluateAll((els) => els.map((e) => e.getAttribute("data-piece-card")));
  expect(similar.length, id + " similar").toBe(Math.min(4, sameType.length));
  for (const s of similar) expect(sameType.some((p) => p.slug === s), id + " similar " + s + " is of the same type").toBe(true);
  if (piece.boxSlug) await expect(page.locator("[data-custom-box]"), id + " custom box").toHaveCount(1);
}

/** Three pieces get full screenshots, desktop and phone. */
const SHOWCASE = ["kevin-schade-dragon-ball-pendant", "vfb-stuttgart-dfb-pokal-2025", "michy-batshuayi-butterfly-chain"];
const CHUNK = 8;

for (let i = 0; i < PIECES.length; i += CHUNK) {
  const slugs = PIECES.slice(i, i + CHUNK).map((p) => p.slug);
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

test("home collections lead to every type page, every card to its piece", async ({ page }, info) => {
  const cat = await getCatalogue(page);
  const count = (type: string) => cat.pieces.filter((p) => p.type === type).length;
  const expected = COLLECTIONS.filter((c) => count(c.type) >= MIN_PIECES);
  expect(expected.length, "at least four collections").toBeGreaterThanOrEqual(4);

  await page.goto("/");
  const tiles = page.locator("[data-collection-tile]");
  expect(await tiles.evaluateAll((els) => els.map((e) => e.getAttribute("data-collection-tile")))).toEqual(expected.map((c) => c.slug));
  for (const c of expected) await expect(page.locator('[data-collection-tile="' + c.slug + '"]')).toContainText(String(count(c.type)) + " pieces");
  await page.locator("[data-collections]").evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: shotPath(info, "home-collections"), type: "jpeg", quality: 60 });

  const titles = new Set<string>();
  for (const c of expected) {
    await page.goto("/");
    const tile = page.locator('[data-collection-tile="' + c.slug + '"]');
    await tile.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await tile.click();
    await expect(page).toHaveURL(new RegExp("/creations/" + c.slug + "$"));
    // Reached in the page itself (no reload): the collection is really shown.
    await expect(page.locator("h1")).toContainText(c.name);
    titles.add(await checkPage(page, info, "/creations/" + c.slug, "collection-" + c.slug, 3));
    const hrefs = await page.locator("[data-piece-card]").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
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
  const cards = page.locator("[data-piece-card]");
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

test("player pages show their stories and all their pieces", async ({ page }) => {
  const cat = await getCatalogue(page);
  const expected: Record<string, string[]> = {
    "noah-okafor": ["Noah Okafor", "Noah Okafor II", "Noah Okafor S24"],
    "marcus-thuram": ["Thuram", "Thuram II", "Thuram SS23", "Marcus Thuram"],
    "malik-tillman": ["Malik Tillman", "Malik Tillman II"],
    "tanguy-nianzou": ["NZ", "Tanguy Nianzou"],
    "inter-milan": ["Inter Milan", "Inter Squad"],
    "deniz-undav": ["Deniz Undav"],
    "angelo-stiller": ["Angelo Stiller"],
    "jamie-leweling": ["Jamie Leweling"],
    "maximilian-mittelstaedt": [],
    "vfb-stuttgart": [],
    "sidney-eweka": ["Sidney Eweka"],
  };
  for (const person of cat.people) {
    await page.goto("/players/" + person.slug);
    if (expected[person.slug]) {
      const stories = await page.locator("[data-player-story]").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")?.replace("Open the story ", "")));
      expect(stories, person.slug).toEqual(expected[person.slug]);
    }
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
  // Piece -> its stories.
  await page.goto("/pieces/kevin-schade-dragon-ball-pendant");
  await page.locator("[data-seen-in-stories]").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.locator("[data-seen-in-stories]").click();
  await expect(page.locator('[role="dialog"][data-story="kevin-schade"]')).toBeVisible();
  // Story -> piece, from the viewer.
  const see = page.locator('[role="dialog"] [data-see-piece]');
  await expect(see).toHaveAttribute("data-see-piece", "kevin-schade-dragon-ball-pendant");
  await page.getByRole("button", { name: "Close the story" }).click();
  // Piece -> player -> stories.
  await page.locator('[data-made-for-person="kevin-schade"]').evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.locator('[data-made-for-person="kevin-schade"]').click();
  await expect(page).toHaveURL(/\/players\/kevin-schade$/);
  await expect(page.locator('[data-player-story="kevin-schade"]')).toHaveCount(1);
  await expect(page.locator('a[href="/pieces/kevin-schade-dragon-ball-pendant"]').first()).toBeVisible();
  // Story -> piece from the home bar, then the click opens the piece.
  await page.goto("/");
  await page.locator('[data-story-bubble="michy-batshuayi"]').click();
  const link = page.locator('[role="dialog"] [data-see-piece]');
  await expect(link).toHaveAttribute("href", "/pieces/michy-batshuayi-butterfly-chain");
  await link.click();
  await expect(page).toHaveURL(/\/pieces\/michy-batshuayi-butterfly-chain$/);
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
  await expect(page.locator("[data-piece-card]")).toHaveCount(chains);
  expect(problems.errors).toEqual([]);
});

/* ---------- Stories ---------- */

test("the 30 stories, in order, every step shown, videos playing", async ({ page }, info) => {
  const problems = watch(page);
  const cat = await getCatalogue(page);
  await page.goto("/");
  const bubbles = page.locator("[data-story-bubble]");
  await expect(bubbles).toHaveCount(30);
  const titles = await bubbles.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")?.replace("Open the story ", "")));
  expect(titles).toEqual(STORY_TITLES);

  // Covers: swipe the bar to its end, as a visitor would, so the lazy ones load; then check them all.
  const bar = page.locator("[data-stories-bar] .no-scrollbar");
  const width = await bar.evaluate((el) => el.scrollWidth);
  for (let x = 0; x <= width; x += 200) {
    await bar.evaluate((el, left) => el.scrollTo({ left }), x);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1000);
  await bar.evaluate((el) => el.scrollTo({ left: 0 }));
  const covers = await page.locator("[data-story-bubble] img").evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0));
  expect(covers.filter(Boolean).length, "covers loaded").toBe(30);

  // Names: whole, on two lines at most; 16px margin on phones.
  const names = await page.locator("[data-story-name]").evaluateAll((els) =>
    els.map((e) => {
      const s = getComputedStyle(e);
      const lines = Math.round(e.scrollHeight / parseFloat(s.lineHeight));
      return { text: e.textContent, lines, cut: e.scrollWidth > e.clientWidth + 1 };
    }),
  );
  for (const n of names) {
    expect(n.lines, n.text ?? "").toBeLessThanOrEqual(2);
    expect(n.cut, n.text ?? "").toBe(false);
  }
  if (info.project.name === "iphone") {
    const left = await bubbles.first().evaluate((el) => el.getBoundingClientRect().left);
    expect(Math.round(left)).toBe(16);
  }
  await page.screenshot({ path: shotPath(info, "stories-bar"), type: "jpeg", quality: 60 });

  const byMedia = pieceByMedia(cat);
  await bubbles.first().click();
  const dialog = page.locator('[role="dialog"][data-story]');
  await expect(dialog).toBeVisible();
  for (const [i, story] of cat.stories.entries()) {
    await expect(dialog).toHaveAttribute("data-story", story.slug);
    for (const [j, item] of story.media.entries()) {
      await expect(dialog, story.slug + " step " + (j + 1)).toHaveAttribute("data-step", String(j));
      // "See the piece": the piece shown in this file, else the piece of the story.
      const piece = byMedia.get(item.src) ?? story.pieceSlug;
      if (piece) await expect(dialog.locator("[data-see-piece]"), story.slug + " step " + (j + 1) + " piece").toHaveAttribute("data-see-piece", piece);
      else await expect(dialog.locator("[data-see-piece]"), story.slug + " step " + (j + 1) + " no piece").toHaveCount(0);
      if (item.type === "image") {
        const img = dialog.locator("[data-story-surface] img");
        await expect(img).toHaveAttribute("src", item.src);
        await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0), { message: story.slug + " photo " + (j + 1) }).toBe(true);
      } else {
        const video = dialog.locator("video[data-story-video]");
        await expect(video).toHaveAttribute("src", item.src);
        await expect.poll(() => video.evaluate((el) => (el as HTMLVideoElement).currentTime), { message: story.slug + " video " + (j + 1) + " plays", timeout: 15_000 }).toBeGreaterThan(0.25);
        // ONE video element for the whole viewer.
        expect(await page.locator("video[data-story-video]").count()).toBe(1);
      }
      if (j === 0 && (i === 0 || i === 9)) await page.screenshot({ path: shotPath(info, "story-" + story.slug), type: "jpeg", quality: 60 });
      await page.keyboard.press("ArrowRight");
    }
  }
  await expect(dialog).toHaveCount(0);
  expect(problems.errors).toEqual([]);
});

test("story viewer: buttons, pause, close", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-story-bubble="press"]').click();
  const dialog = page.locator('[role="dialog"][data-story="press"]');
  await expect(dialog.getByRole("link", { name: /Read the article/ })).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Want yours\? WhatsApp/ })).toHaveAttribute("href", /wa\.me\/971XXXXXXXXX/);
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

for (const path of ["/", "/process"]) {
  test("the film of " + path + " is moved by the scroll only", async ({ page }) => {
    const problems = watch(page);
    await page.goto(path);
    const section = page.locator("[data-scroll-video]");
    await expect(section).toHaveCount(1);
    const canvas = section.locator("canvas");
    await expect(canvas).toHaveCount(1);
    const frame = () => canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL("image/jpeg", 0.5).length);
    // Wait for the whole frame sequence.
    await expect(canvas).toHaveAttribute("data-frames", /^\d+$/);
    const count = Number(await canvas.getAttribute("data-frames"));
    await expect
      .poll(() => page.evaluate(() => new Set(performance.getEntriesByType("resource").map((e) => e.name).filter((n) => /frames-(desktop|mobile)\/\d+\.webp/.test(n))).size), { timeout: 60_000 })
      .toBeGreaterThanOrEqual(count);
    const box = await section.evaluate((el) => ({ top: el.getBoundingClientRect().top + window.scrollY, height: el.offsetHeight }));
    const vh = await page.evaluate(() => window.innerHeight);
    const at = async (p: number) => {
      await scrollTo(page, box.top + p * (box.height - vh));
      await page.waitForTimeout(1200);
      return frame();
    };
    const f0 = await at(0);
    await page.waitForTimeout(1500);
    expect(await frame(), "frozen while the scroll does not move").toBe(f0);
    const f1 = await at(0.3);
    const f2 = await at(0.7);
    const back = await at(0.3);
    expect(f1).not.toBe(f0);
    expect(f2).not.toBe(f1);
    expect(Math.abs(back - f1) / f1, "scrolling back shows the same frame again").toBeLessThan(0.02);
    // No <video> plays by itself in the film.
    expect(await section.locator("video").count()).toBe(0);
    expect(problems.errors).toEqual([]);
  });
}

/* ---------- Logo, admin, forms ---------- */

test("logo size in the navigation", async ({ page }, info) => {
  await page.goto("/creations");
  const logo = page.locator('header a[aria-label="Berete Jewellers, home"] span:visible');
  const h = await logo.evaluate((el) => el.getBoundingClientRect().height);
  expect(Math.round(h)).toBe(info.project.name === "iphone" ? 40 : 56);
});

test("contact: call back request reaches the admin", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "once is enough");
  const password = process.env.ADMIN_PASSWORD;
  test.skip(!password, "ADMIN_PASSWORD (.env) is needed to open the admin");
  const problems = watch(page);
  await page.goto("/contact");
  // The block fades in when it reaches the screen.
  await page.locator("button[aria-controls=callback-form]").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.getByRole("button", { name: /Prefer a call back/i }).click();
  const form = page.locator("#callback-form");
  await form.getByLabel("Name").fill("Test Verification");
  await form.getByLabel("Phone number").fill("+971500000000");
  await form.getByRole("button", { name: "Call me back" }).click();
  await expect(page.getByText("We will call you back shortly")).toBeVisible();

  await page.goto("/admin");
  await page.getByLabel("Mot de passe").fill(password!);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("tab", { name: "Stories" })).toBeVisible();
  await expect(page.locator("main li, section li").filter({ hasText: "/kenan-yildiz" })).toHaveCount(1);
  await page.getByRole("tab", { name: "Messages" }).click();
  await expect(page.getByText("Test Verification").first()).toBeVisible();
  expect(problems.errors).toEqual([]);
});
