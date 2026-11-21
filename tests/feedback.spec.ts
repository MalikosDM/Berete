// The feedback of Yoni on 20/11/2026 and his three new albums (36 BRT Flower, 37 Sirius, 38 the L pendant of Deniz Undav):
// - Créations: six pieces on the first screen of a computer (1440 × 900), two columns on a phone, a smaller title;
// - the capsules: the text of the opening smaller and discreet, the photos of "The Art of Detail" the size of those of
//   "Every Angle", the making-of of "Enter the Atelier" playing by itself on screen (silent), pausing off screen;
// - Sirius, BRT Flower, the L pendant: their photos and films; the Ruby T necklace opens on the whole necklace;
// - no repost of a story in the galleries (a player in an inset, the frame of Instagram, a mention).
// Screenshots go to verification/feedback/.
import { mkdirSync } from "node:fs";
import { expect, test, type Locator, type Page } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import { FILMS } from "../src/data/atelier";
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
  expect(sirius.gallery.length + 1).toBe(28);
  expect(sirius.cover.src).toBe("/media/hd/sirius/p27.webp");
  expect(FILMS["sirius"]?.reveal?.source).toContain("37/v02");
  expect(FILMS["sirius"]?.making?.source).toContain("37/v05");
  expect(sirius.making.raw?.src).toBe("/media/hd/sirius/p30.webp");
  const brt = pieceOf("brt-flower-chain");
  expect(brt.title).toBe("BRT Flower Chain");
  expect(brt.clientPublic).toBe(false);
  expect(brt.gallery.length + 1).toBe(11);
  expect(FILMS["brt-flower-chain"]?.reveal?.source).toContain("36/v01");
  expect(FILMS["brt-flower-chain"]?.making?.source).toContain("36/v02");
  expect(brt.making.setting?.src).toBe("/media/hd/brt-flower-chain/v04.mp4");
  expect(brt.making.polishing?.src).toBe("/media/hd/brt-flower-chain/v05.mp4");
  const deniz = pieceOf("deniz-undav-l-pendant");
  expect(deniz.gallery.length + 1).toBe(10);
  expect(FILMS["deniz-undav-l-pendant"]?.making?.source).toContain("38/v01");
  expect(deniz.making.polishing?.src).toBe("/media/hd/deniz-undav-l-pendant/v02.mp4");
});

test("Créations: six pieces on the first screen, a smaller title, two columns on a phone", async ({ page }, info) => {
  const problems = watch(page);
  const phone = info.project.name !== "desktop";
  await skipIntro(page);
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
    // Six whole cards (photo, name, made for) on the first screen, side by side.
    const seen = boxes.filter((b) => b.top >= 0 && b.bottom <= vh);
    expect(seen.length, "cards seen whole on the first screen").toBeGreaterThanOrEqual(6);
    expect(new Set(boxes.slice(0, 6).map((b) => b.x)).size).toBe(6);
    // One scroll of a screen shows about six more.
    const next = boxes.filter((b) => b.top >= vh && b.bottom <= 2 * vh);
    expect(next.length).toBeGreaterThanOrEqual(6);
  }
  // Every card: its photo, its name, the one it was made for, its way in; the text readable (16 px at least).
  const first = cards.first();
  await expect(first.locator("img")).toBeVisible();
  await expect(first.locator("[data-enter-world]")).toHaveText(/Entrer dans l’univers/);
  for (const el of await first.locator("span.title-caps, span.text-mist, [data-enter-world]").all()) {
    expect(parseFloat(await el.evaluate((e) => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
  }
  await shot(page, info.project.name + "-creations");
  await scrollTo(page, vh);
  await shot(page, info.project.name + "-creations-scroll");
  expect(problems.errors).toEqual([]);
});

/** The pieces of the feedback, and three other capsules. */
const CAPSULES = ["sirius", "brt-flower-chain", "deniz-undav-l-pendant", "marcus-thuram-ruby-t-necklace", "campione-d-italia-2023-2024", "noah-okafor-oka-pendant", "michy-batshuayi-butterfly-chain"];

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
    expect(titleSize).toBeGreaterThanOrEqual(24);
    const intro = page.locator("[data-piece-intro]");
    for (const b of await intro.locator("a, button").all()) {
      const box = (await b.boundingBox())!;
      expect(box.height, "a button of the opening").toBeGreaterThanOrEqual(phone ? 44 : 40);
      expect(parseFloat(await b.evaluate((e) => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
    }
    if (!phone) {
      // The text block leaves the jewel the most room.
      const width = (await intro.boundingBox())!.width;
      expect(width).toBeLessThan(560);
    }
    await shot(page, info.project.name + "-" + slug + "-opening");

    // The Ruby T necklace opens on the whole necklace; the T and its drop beside it.
    if (slug === "marcus-thuram-ruby-t-necklace") {
      if (phone) await expect(page.locator("[data-showcase-slide='0'] img").first()).toHaveAttribute("src", /\/cutouts\/marcus-thuram-ruby-t-necklace\/p01-/);
      else {
        await expect(page.locator("[data-showcase-view='p01']")).toHaveAttribute("data-place", "0");
        await expect(page.locator("[data-showcase-view='p02']")).toHaveAttribute("data-place", "1");
      }
    }

    // "Every Angle": each photo with its text, a photo the size of the former grid on a computer, the text under it on a phone.
    const tile = page.locator("[data-angle]").first();
    await tile.scrollIntoViewIfNeeded();
    const photoBox = (await tile.locator("button").boundingBox())!;
    const textBox = (await tile.locator("[data-angle-title]").boundingBox())!;
    const vw = page.viewportSize()!.width;
    if (phone) expect(textBox.y, "the text under its photo").toBeGreaterThanOrEqual(photoBox.y + photoBox.height - 1);
    else expect(photoBox.width / vw).toBeLessThan(0.26);

    // "Enter the Atelier": its making-of plays by itself on screen, silent, and pauses off screen.
    const passage = page.locator("[data-atelier-passage]");
    if (FILMS[slug]?.making) {
      await passage.scrollIntoViewIfNeeded();
      const preview = passage.locator("[data-atelier-preview]");
      await expect.poll(() => playing(preview), { timeout: 30_000 }).toBe(true);
      expect(await preview.evaluate((v) => (v as HTMLVideoElement).muted)).toBe(true);
      await page.waitForTimeout(500);
      await shot(page, info.project.name + "-" + slug + "-atelier");
      await scrollTo(page, 0);
      await expect.poll(() => playing(preview), { timeout: 10_000 }).toBe(false);
    } else {
      await expect(passage).toHaveCount(0);
    }
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
