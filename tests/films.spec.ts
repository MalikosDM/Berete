// The films of the site from the originals in HD (21/11/2026, "Videos HD/" of the folders of Yoni, scripts/film-media.mjs):
// on a computer true 1080p, on a phone a light 720p copy, never heavier than before; their images taken from the
// originals; every film loaded only once it is near (since 24/11/2026: the finished piece in its section right after the
// opening, src/components/FeatureFilm.tsx; the making-of in The Atelier only, /atelier?piece=<slug>, its room opening at
// once). Six capsules, on a computer and an iPhone, silent (fixtures). Screenshots go to verification/films/.
import { mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Locator, type Page } from "./fixtures";
import { resolveReveal } from "../src/data/atelier";
import { defaultCatalogue } from "../src/data/catalogue";
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
  "panther-champion-pendant", // Losene Keita
  "thorns-and-roses-crucifix", // Jesus Cross
  "sirius",
];

const play = (video: Locator) =>
  video.evaluate((el) => {
    const v = el as HTMLVideoElement;
    return { time: v.currentTime, paused: v.paused, src: new URL(v.currentSrc || v.src, location.href).pathname, short: Math.min(v.videoWidth, v.videoHeight) };
  });

for (const slug of CAPSULES) {
  test(slug + ": its films in HD on a computer, light on a phone, each loaded once near", async ({ page }, info) => {
    const problems = watch(page);
    const phone = info.project.name !== "desktop";
    const name = info.project.name + "-" + slug;
    const { making } = FILMS[slug]!;
    // The film of the finished piece shown on its page (none for the Inter ring since 24/11/2026: its film was a 3D render).
    const reveal = resolveReveal(slug, defaultCatalogue.pieces.find((p) => p.slug === slug)!.atelier)?.film as Film | undefined;
    const asked = new Set<string>();
    page.on("request", (r) => {
      const path = new URL(r.url()).pathname;
      if (path.startsWith("/media/films/") && path.endsWith(".mp4")) asked.add(path);
    });
    await skipIntro(page);
    await page.goto("/fr/pieces/" + slug);
    await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });

    // 1. The finished piece, in its section right after the opening: the copy made for the screen, sharp, playing by itself.
    const section = page.locator("[data-feature-film='" + slug + "']");
    if (reveal) {
      await section.locator("[data-feature-frame]").evaluate((el) => el.scrollIntoView({ block: "center" }));
      const video = section.locator("[data-feature-video]");
      await expect.poll(async () => (await play(video)).time, { timeout: 30_000 }).toBeGreaterThan(0.6);
      const state = await play(video);
      expect(state.paused).toBe(false);
      expect(state.src).toBe(phone ? reveal.mobile : reveal.src);
      if (isHd(slug, "reveal")) expect(state.short).toBe(phone ? 720 : 1080);
      await page.waitForTimeout(500);
      await shot(page, name + "-1-film");
    } else await expect(page.locator("[data-feature-film]")).toHaveCount(0);
    // Down the whole page: no other film of the piece is asked for (its making-of lives in The Atelier).
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 700) await page.evaluate((top) => window.scrollTo(0, top), y).then(() => page.waitForTimeout(150));
    await page.waitForTimeout(600);
    expect([...asked]).toEqual(reveal ? [phone ? reveal.mobile : reveal.src] : []);

    // 2. The making-of, in The Atelier: its room opens at once, the film for the screen, true 1080p on a computer.
    if (making) {
      await page.goto("/fr/atelier?piece=" + slug);
      const room = page.locator("[data-atelier-room]");
      const video = room.locator("[data-atelier-video]");
      await expect(video).toHaveAttribute("src", phone ? making.mobile : making.src);
      await expect.poll(async () => (await play(video)).time, { timeout: 30_000 }).toBeGreaterThan(1);
      if (isHd(slug, "making")) expect((await play(video)).short).toBe(phone ? 720 : 1080);
      expect(asked).toContain(phone ? making.mobile : making.src);
      await page.waitForTimeout(500);
      await shot(page, name + "-3-room");
      await room.locator("[data-atelier-close]:visible").click();
      await expect(room).toHaveCount(0);
    }
    expect(problems.errors).toEqual([]);
  });
}
