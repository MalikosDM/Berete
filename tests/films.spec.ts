// The films of the site from the originals in HD (21/11/2026, "Videos HD/" of the folders of Yoni, scripts/film-media.mjs):
// on a computer true 1080p, on a phone a light 720p copy, never heavier than before; their images taken from the
// originals; every film loaded only once it is seen (the finished piece when the page opens, the making-of when its
// passage comes on screen, the room after the click). Six capsules, on a computer and an iPhone, silent (fixtures).
// Screenshots go to verification/films/.
import { mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Locator, type Page } from "./fixtures";
import media from "../src/data/media.generated.json" with { type: "json" };
import { skipIntro, watch } from "./helpers";

type Film = { src: string; mobile: string; width: number; height: number; duration: number; posters: string[]; source: string };
const FILMS = (media as unknown as { films: Record<string, { making?: Film; reveal?: Film }> }).films;
const DIR = "verification/films";
mkdirSync(DIR, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: DIR + "/" + name + ".jpg", type: "jpeg", quality: 68, timeout: 45_000 });

/** The films with no original in HD on the disk: phone videos (AS, Tulips, Sirius), the video of a Fabrication/ folder. */
const NOT_HD = ["angelo-stiller-as-pendant/making", "tulips-on-tour-medallion/making", "rose-iced-cuban-chain/making", "sirius/making"];
const isHd = (slug: string, kind: string) => !NOT_HD.includes(slug + "/" + kind);

/** Mbit/s of a film file, its sound included. */
const rate = (path: string, seconds: number) => (statSync(join("public", path)).size * 8) / seconds / 1e6;

test("every film from its original: 1080p on a computer, a light copy on a phone, no original in the site", () => {
  for (const [slug, kinds] of Object.entries(FILMS)) {
    for (const [kind, film] of Object.entries(kinds) as [string, Film][]) {
      const id = slug + " " + kind;
      if (isHd(slug, kind)) {
        expect(film.source, id).toMatch(/HD 1080p$/);
        expect(Math.min(film.width, film.height), id).toBe(1080);
      }
      // Web compression: a computer at most 4.5 Mbit/s (+ its sound); a phone 1.2 (a making-of) or 1.5 (the finished piece).
      expect(rate(film.src, film.duration), id + " computer").toBeLessThan(4.9);
      expect(rate(film.mobile, film.duration), id + " phone").toBeLessThan(kind === "reveal" ? 1.75 : 1.4);
      expect(film.posters.length, id).toBe(6);
    }
  }
  // Only web copies (H.264 MP4, WebP images): an original (ProRes .mov) never goes in the site nor in Git.
  for (const slug of readdirSync("public/media/films")) {
    for (const file of readdirSync(join("public/media/films", slug))) expect(file, slug).toMatch(/\.(mp4|webp)$/);
  }
});

const CAPSULES = [
  "campione-d-italia-2023-2024", // Inter Milan
  "vfb-stuttgart-dfb-pokal-2025",
  "marcus-thuram-ruby-t-necklace",
  "panther-champion-pendant", // Lasana Keita
  "thorns-and-roses-crucifix", // Jesus Cross
  "sirius",
];

const play = (video: Locator) =>
  video.evaluate((el) => {
    const v = el as HTMLVideoElement;
    return { time: v.currentTime, paused: v.paused, src: new URL(v.currentSrc || v.src, location.href).pathname, short: Math.min(v.videoWidth, v.videoHeight) };
  });

for (const slug of CAPSULES) {
  test(slug + ": its films in HD on a computer, light on a phone, each loaded once seen", async ({ page }, info) => {
    const problems = watch(page);
    const phone = info.project.name !== "desktop";
    const name = info.project.name + "-" + slug;
    const { making, reveal } = FILMS[slug]!;
    const asked = new Set<string>();
    page.on("request", (r) => {
      const path = new URL(r.url()).pathname;
      if (path.endsWith(".mp4")) asked.add(path);
    });
    await skipIntro(page, { films: false });
    await page.goto("/fr/pieces/" + slug);

    // 1. The finished piece (since 23/11/2026 in its own section, at a click): nothing loaded before the click, then the copy
    //    made for the screen, sharp, playing.
    if (reveal) {
      await expect(page.locator("[data-piece-opening] h1")).toBeVisible();
      await page.waitForTimeout(1000);
      expect([...asked]).toEqual([]);
      await page.locator("[data-watch-film-section]").scrollIntoViewIfNeeded();
      await page.locator("[data-watch-film-section]").click();
      const video = page.locator("[data-piece-film-video]");
      await expect(page.locator("[data-piece-film]")).toBeVisible();
      await expect.poll(async () => (await play(video)).time, { timeout: 30_000 }).toBeGreaterThan(0.6);
      const state = await play(video);
      expect(state.paused).toBe(false);
      expect(state.src).toBe(phone ? reveal.mobile : reveal.src);
      if (isHd(slug, "reveal")) expect(state.short).toBe(phone ? 720 : 1080);
      expect([...asked]).toEqual([state.src]);
      await page.waitForTimeout(500);
      await shot(page, name + "-1-film");
      await page.locator("[data-piece-film-skip]").click();
      await expect(page.locator("[data-piece-film]")).toHaveCount(0);
    }
    await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });

    // 2. The making-of: nothing before its passage is on screen, then its light copy, playing by itself, silent.
    if (making) {
      // (The film section stands just before the atelier: once it was scrolled to, the atelier may have come near already.)
      if (!reveal) expect([...asked].filter((p) => p.includes("/making"))).toEqual([]);
      const passage = page.locator("[data-atelier-passage]");
      await passage.scrollIntoViewIfNeeded();
      const preview = passage.locator("[data-atelier-preview]");
      await expect.poll(async () => (await play(preview)).time, { timeout: 30_000 }).toBeGreaterThan(0.3);
      expect(asked).toContain(making.mobile);
      if (isHd(slug, "making")) expect((await play(preview)).short).toBe(720);
      await page.waitForTimeout(500);
      await shot(page, name + "-2-atelier");

      // 3. In the room, after the click: the film for the screen, true 1080p on a computer.
      await passage.locator("[data-enter-atelier]").click();
      const room = page.locator("[data-atelier-room]");
      const video = room.locator("[data-atelier-video]");
      await expect(video).toHaveAttribute("src", phone ? making.mobile : making.src);
      await expect.poll(async () => (await play(video)).time, { timeout: 30_000 }).toBeGreaterThan(1);
      if (isHd(slug, "making")) expect((await play(video)).short).toBe(phone ? 720 : 1080);
      await page.waitForTimeout(500);
      await shot(page, name + "-3-room");
      await room.locator("[data-atelier-close]:visible").click();
      await expect(room).toHaveCount(0);
    }
    expect(problems.errors).toEqual([]);
  });
}
