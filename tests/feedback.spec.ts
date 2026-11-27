// The feedback of Yoni on 20/11/2026 and his three new albums (36 BRT Flower, 37 Sirius, 38 the L pendant of Deniz Undav):
// - Créations: six pieces on the first screen of a computer (1440 × 900), two columns on a phone, a smaller title;
// - the capsules: the text of the opening smaller and discreet, the photos of "The Art of Detail" the size of those of
//   "Every Angle", the making-of of "Enter the Atelier" playing by itself on screen (silent), pausing off screen (since
//   24/11/2026 the making-of is in The Atelier: the film of the finished piece plays so on the page, src/components/FeatureFilm.tsx);
// - Sirius, BRT Flower, the L pendant: their photos and films; the Ruby T necklace opens on the whole necklace;
// - no repost of a story in the galleries (a player in an inset, the frame of Instagram, a mention).
// Screenshots go to verification/feedback/.
import { mkdirSync } from "node:fs";
import { expect, test, type Locator, type Page } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import { FILMS, resolveAtelier, resolveReveal } from "../src/data/atelier";
import { featureFilmOf } from "../src/data/featureFilms";
import { completeMakingOf, makingSteps } from "../src/data/making";
import media from "../src/data/media.generated.json" with { type: "json" };
import { scrollTo, skipIntro, watch } from "./helpers";

const DIR = "verification/feedback";
mkdirSync(DIR, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: DIR + "/" + name + ".jpg", type: "jpeg", quality: 65, timeout: 45_000 });
const PUBLISHED = defaultCatalogue.pieces.filter((p) => p.published);
const pieceOf = (slug: string) => PUBLISHED.find((p) => p.slug === slug)!;
const galleries = (media as unknown as { galleries: Record<string, { file: string }[]> }).galleries;

/** The reposts of stories taken out of the galleries (a player in an inset, the frame of Instagram, a mention, stickers). */
const STORY_REPOSTS = [
  "kevin-schade/15",
  "kevin-schade/23",
  "kenan-yildiz/02",
  "noah-okafor/05",
  "noah-okafor/10",
  "noah-okafor-s24/04",
  "thuram/15",
  "thuram-ii/01",
  "angelo-stiller/01",
  "jamie-leweling/01",
  "collectors/03",
  "collectors/13",
  "collectors/53",
  "malik-tillman/02",
  "malik-tillman-ii/02",
  "malik-tillman-ii/03",
  "nz/01",
  "lois-openda/02",
  "michy-batshuayi/03",
  "tajon-buchanan/01",
  "tajon-buchanan/02",
  "radja-nainggolan/01",
].map((s) => "/media/stories/" + s + ".mp4");

test("no repost of a story in any gallery", () => {
  for (const p of PUBLISHED) {
    for (const m of [p.cover, ...p.gallery]) expect(STORY_REPOSTS, p.slug + " " + m.src).not.toContain(m.src);
  }
});

test("Sirius, BRT Flower and the L pendant: every photo of their folders, their films", () => {
  const sirius = pieceOf("sirius");
  expect(galleries["sirius"]!.length).toBe(28);
  // (24/11/2026: without its back, the photos of the chain alone or of its trunk; its plate straightened, a studio photo.)
  expect(sirius.gallery.length + 1).toBe(18);
  expect(sirius.cover.src).toBe("/media/hd/sirius/p27.webp");
  expect(FILMS["sirius"]?.reveal?.source).toContain("37/v02");
  expect(FILMS["sirius"]?.making?.source).toContain("37/v05");
  expect(sirius.making.raw?.src).toBe("/media/hd/sirius/p30.webp");
  // No setting of its own (21/11/2026: v05 shows a bur on the raw plate, no stone yet).
  expect(sirius.making.setting).toBeUndefined();
  const brt = pieceOf("brt-flower-chain");
  // (24/11/2026: one sheet with the twisted chain of Kevin Schade, "BRT Flowers".)
  expect(brt.title).toBe("BRT Flowers");
  expect(brt.people).toEqual(["kevin-schade"]);
  expect(brt.clientPublic).toBe(false);
  // BRT Flowers (24/11/2026): its own 11 photos, the chain alone of Sirius (its cover, 37/p29) and the photos of Kevin Schade.
  expect(brt.cover.src).toBe("/media/hd/sirius/p29.webp");
  expect(brt.gallery.length + 1).toBeGreaterThanOrEqual(11);
  expect(FILMS["brt-flower-chain"]?.reveal?.source).toContain("36/v01");
  expect(FILMS["brt-flower-chain"]?.making?.source).toContain("36/v02");
  expect(brt.making.setting?.src).toBe("/media/hd/brt-flower-chain/v04.mp4");
  // Its polishing: a frame of its making-of (21/11/2026: v05 was a bur on a raw link, not the polishing).
  expect(brt.making.polishing?.src).toBe("/media/hd/brt-flower-chain/v02-24_8s.webp");
  const deniz = pieceOf("deniz-undav-l-pendant");
  // Its 10 photos and, first since 23/11/2026, its studio image (also its cover).
  // Its ten real photos (25/11/2026: its image made by AI removed).
  expect(new Set([deniz.cover, ...deniz.gallery].map((m) => m.src)).size).toBe(10);
  expect(FILMS["deniz-undav-l-pendant"]?.making?.source).toContain("38/v01");
  expect(deniz.making.polishing?.src).toBe("/media/hd/deniz-undav-l-pendant/v02.mp4");
});

// Since 22/11/2026 (Yoni): three larger pieces on a row on a computer, one on a phone (tests/yoni2211.spec.ts); since
// 24/11/2026 four on a row on a computer, two on a phone.
test("Créations: four pieces on a row, a smaller title, two columns on a phone", async ({ page }, info) => {
  const problems = watch(page);
  const phone = info.project.name !== "desktop";
  await skipIntro(page);
  // (Since 22/11/2026 (2), the carousel first: this grid with "See all creations", tests/carousel.spec.ts.)
  await page.goto("/fr/creations", { waitUntil: "load" });
  const cards = page.locator("a[data-piece-card]");
  await expect(cards).toHaveCount(PUBLISHED.length);
  await page.waitForTimeout(1500);
  const size = parseFloat(await page.locator("h1").first().evaluate((el) => getComputedStyle(el).fontSize));
  expect(size, "the title of the page (px)").toBeLessThanOrEqual(phone ? 40 : 56);
  const boxes = await cards.evaluateAll((els) =>
    els.map((e) => {
      const img = e.querySelector("span")!.getBoundingClientRect();
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.left), top: r.top, imgBottom: img.bottom, bottom: r.bottom, width: r.width };
    }),
  );
  const vh = page.viewportSize()!.height;
  if (phone) {
    // Two columns.
    expect(new Set(boxes.slice(0, 6).map((b) => b.x)).size).toBe(2);
  } else {
    // Four on a row.
    expect(new Set(boxes.slice(0, 8).map((b) => b.x)).size).toBe(4);
    expect(boxes[0]!.width).toBeGreaterThan(250);
  }
  // Every card: its photo, its name, the one it was made for, its way in; the text readable on a phone (16 px at least;
  // a computer draws the site smaller since 24/11/2026).
  const first = cards.first();
  await expect(first.locator("img")).toBeVisible();
  await expect(first.locator("[data-enter-world]")).toHaveText(/Entrer dans l’univers/);
  if (phone) {
    for (const el of await first.locator("span.title-caps, span.text-mist, [data-enter-world]").all()) {
      expect(parseFloat(await el.evaluate((e) => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
    }
  }
  await shot(page, info.project.name + "-creations");
  await scrollTo(page, vh);
  await shot(page, info.project.name + "-creations-scroll");
  expect(problems.errors).toEqual([]);
});

/** The pieces of the feedback, and three other capsules. */
const CAPSULES = ["sirius", "brt-flower-chain", "deniz-undav-l-pendant", "marcus-thuram-ruby-t-necklace", "campione-d-italia-2023-2024", "noah-okafor-oka-pendant", "michy-batshuayi-butterfly-pendant"];

for (const slug of CAPSULES) {
  test(slug + ": a discreet opening, smaller photos of the details, its atelier playing by itself", async ({ page }, info) => {
    const problems = watch(page);
    const phone = info.project.name !== "desktop";
    const piece = pieceOf(slug);
    await skipIntro(page);
    await page.goto("/fr/pieces/" + slug, { waitUntil: "load" });
    await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
    await page.waitForTimeout(800);
    // The opening: the title still the largest text, smaller than before (72 px), the buttons easy to touch.
    const title = page.locator("h1#piece-title");
    await expect(title).toBeVisible();
    // (The typography of some universes is drawn larger or smaller: its scale.)
    const [titleSize, scale] = await title.evaluate((e) => [parseFloat(getComputedStyle(e).fontSize), parseFloat(getComputedStyle(e).getPropertyValue("--u-font-scale")) || 1]);
    expect(titleSize).toBeLessThanOrEqual((phone ? 36 : 46) * scale);
    // (A wide font of a universe, the Japanese brush of Sirius, is drawn smaller: its scale.)
    // (Drawn at exactly 24 px × its scale on a phone since 24/11/2026: a hundredth of a pixel of rounding allowed.)
    expect(titleSize).toBeGreaterThanOrEqual(24 * Math.min(1, scale) - 0.01);
    const intro = page.locator("[data-piece-intro]");
    // (Smaller and thinner on a computer since 24/11/2026, at a root of 15 px: its buttons 37 px high, the name of the
    // collection above the title 30 px; the 48 px and 16 px of the phone stay.)
    for (const b of await intro.locator("a, button").all()) {
      const box = (await b.boundingBox())!;
      expect(box.height, "a button of the opening").toBeGreaterThanOrEqual(phone ? 44 : 30);
      expect(parseFloat(await b.evaluate((e) => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(phone ? 16 : 11);
    }
    if (!phone) {
      // The text block leaves the jewel the most room.
      const width = (await intro.boundingBox())!.width;
      expect(width).toBeLessThan(560);
    }
    await shot(page, info.project.name + "-" + slug + "-opening");

    // The Ruby T necklace: since 23/11/2026 (Yoni) all black, the full necklace alone and large (tests/yoni2311b.spec.ts).
    if (slug === "marcus-thuram-ruby-t-necklace") await expect(page.locator("[data-showcase-view]").first()).toHaveAttribute("data-showcase-view", "p01");

    // "Every Angle" (23/11/2026: a gallery; 24/11/2026: four on a row on a computer, two on a phone; no text under most photos).
    const tile = page.locator("[data-angle]").first();
    await tile.scrollIntoViewIfNeeded();
    const photoBox = (await tile.locator("button").boundingBox())!;
    const vw = page.viewportSize()!.width;
    expect(photoBox.width / vw).toBeLessThanOrEqual(phone ? 0.5 : 0.25);

    // The film of the finished piece (24/11/2026, right after the opening): it plays by itself on screen, silent, and pauses
    // off screen. No film: no section.
    const film = page.locator("[data-feature-film]");
    // (The Inter ring: the final film of Yoni, 26/11/2026; the AngeL Pendant: the film of his album, 27/11/2026, src/data/yoniMedia.ts.)
    if (featureFilmOf(slug) || resolveReveal(slug, piece.atelier) || slug === "campione-d-italia-2023-2024" || slug === "deniz-undav-l-pendant") {
      await film.locator("[data-feature-frame]").evaluate((el) => el.scrollIntoView({ block: "center" }));
      const video = film.locator("[data-feature-video]");
      await expect.poll(() => playing(video), { timeout: 30_000 }).toBe(true);
      expect(await video.evaluate((v) => (v as HTMLVideoElement).muted)).toBe(true);
      await page.waitForTimeout(500);
      await shot(page, info.project.name + "-" + slug + "-film");
      await scrollTo(page, 0);
      await expect.poll(() => playing(video), { timeout: 10_000 }).toBe(false);
    } else {
      await expect(film).toHaveCount(0);
    }
    // "Enter the Atelier": its making-of is in The Atelier, where it starts at once.
    const box = piece.boxSlug ? defaultCatalogue.boxes.find((b) => b.slug === piece.boxSlug)?.images[0] : undefined;
    const atelier = page.locator("[data-enter-atelier-link]");
    if (resolveAtelier(slug, piece.atelier) || completeMakingOf(slug, piece.atelier) || makingSteps(piece, box).length > 0) await expect(atelier).toHaveAttribute("href", "/fr/atelier?piece=" + slug);
    else await expect(atelier).toHaveCount(0);
    expect(piece.gallery.length).toBeGreaterThan(0);
    expect(problems.errors).toEqual([]);
  });
}

async function playing(video: Locator): Promise<boolean> {
  return video.evaluate((v) => {
    const el = v as HTMLVideoElement;
    return !el.paused && el.currentTime > 0.2;
  });
}
