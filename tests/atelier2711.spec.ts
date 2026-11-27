// The Atelier, 27/11/2026 (Yoni: "les images sont toujours là, on devait encore arranger cette partie"):
// 1. its chapters ("01 The Birth of Form"…) are filmed moments of the making-of films of the house, never still photos: a
//    silent clip (no sound track at all), looping, with its image (a frame of the clip) under it, playing only while seen,
//    the phone clip on a phone; asked for less motion, the image only;
// 2. "Up next" in the atelier of a piece, as on YouTube: the other making-of films beside the film (under it on a phone),
//    the closest first; one chosen plays in the same room; at the end of a film, "Enter the World" (its finished piece) and
//    "Next film"; Escape still closes.
// Screenshots: verification/atelier2711/.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import chapters from "../src/data/atelier-chapters.generated.json" with { type: "json" };
import { expect, test, type Page } from "./fixtures";
import { skipIntro } from "./helpers";

const DIR = "verification/atelier2711";
const shot = (page: Page, project: string, name: string) => {
  mkdirSync(DIR, { recursive: true });
  return page.screenshot({ path: DIR + "/" + project + "-" + name + ".jpg", quality: 80 });
};

/** The streams of a file of public/ (ffprobe), or null without ffprobe. */
function streamsOf(publicPath: string): string[] | null {
  const file = join("public", publicPath);
  if (!existsSync(file)) return ["missing"];
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", file], { encoding: "utf8" });
  if (r.error) return null;
  return r.stdout.trim().split("\n").filter(Boolean);
}

/** Scrolls the window so that the top of chapter i reaches the top of the screen (its card then covers the one before). */
async function toChapter(page: Page, i: number) {
  await page.evaluate((index) => {
    const section = document.querySelector("[data-atelier-chapters]") as HTMLElement;
    const top = section.getBoundingClientRect().top + window.scrollY + index * window.innerHeight + 2;
    window.scrollTo(0, top);
  }, i);
  await page.waitForTimeout(900);
}

test.describe("the chapters of The Atelier", () => {
  test("each chapter is a silent looping clip over its image, playing only while seen; no still photo left", async ({ page, isMobile }, info) => {
    await skipIntro(page);
    await page.goto("/atelier", { waitUntil: "load" });
    const cards = page.locator("[data-atelier-chapters] [data-atelier-chapter]");
    await expect(cards).toHaveCount(chapters.length);
    expect(chapters.length).toBe(4);
    // The former photos of the chapters (public/media/atelier/01…04) are gone from the section.
    expect(await page.locator("[data-atelier-chapters] img[src*='/media/atelier/']").count()).toBe(0);

    for (let i = 0; i < chapters.length; i++) {
      const c = chapters[i]!;
      // The files: H.264 picture only (no sound track), small, versioned names.
      for (const f of [c.video, c.mobile]) {
        expect(f).toMatch(/^\/media\/atelier-chapters\/[\w-]+\.[0-9a-f]{10}\.mp4$/);
        const streams = streamsOf(f);
        if (streams) expect(streams, f).toEqual(["video"]);
      }
      expect(c.poster).toMatch(/\.[0-9a-f]{10}\.webp$/);
      expect(c.duration).toBeGreaterThanOrEqual(4);
      expect(c.duration).toBeLessThanOrEqual(8);

      await toChapter(page, i);
      const card = cards.nth(i);
      // Its image: a real picture (never black while the clip loads).
      const poster = card.locator("img[data-chapter-poster]");
      await expect(poster).toHaveCount(1);
      await expect.poll(() => poster.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      const posterSrc = await poster.evaluate((img: HTMLImageElement) => img.currentSrc);
      expect(posterSrc).toContain(isMobile ? c.posterMobile : c.poster);

      // Its clip: muted, looping, the phone clip on a phone, playing now.
      const video = card.locator("video[data-chapter-video]");
      await expect(video).toHaveCount(1);
      await expect
        .poll(() => video.evaluate((v: HTMLVideoElement) => !v.paused && v.currentTime > 0.2), { timeout: 20_000 })
        .toBe(true);
      const state = await video.evaluate((v: HTMLVideoElement) => ({ muted: v.muted, loop: v.loop, src: v.currentSrc, controls: v.controls, opacity: getComputedStyle(v).opacity }));
      expect(state.muted).toBe(true);
      expect(state.loop).toBe(true);
      expect(state.controls).toBe(false);
      expect(state.src).toContain(isMobile ? c.mobile : c.video);
      await expect.poll(() => video.evaluate((v) => getComputedStyle(v).opacity)).toBe("1");
      // The card before (covered by this one) and the cards after (not yet on screen) are paused.
      const others = await page.evaluate((index) => [...document.querySelectorAll<HTMLVideoElement>("[data-atelier-chapter] video")].map((v, j) => (j === index ? null : v.paused)), i);
      expect(others.filter((p) => p === false), "only the chapter seen plays").toEqual([]);
      if (i === 0 || i === 3) await shot(page, info.project.name, "chapter-0" + (i + 1));
    }

    // Past the chapters: every clip paused.
    await page.locator("[data-atelier-films]").scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    expect(await page.evaluate(() => [...document.querySelectorAll<HTMLVideoElement>("[data-atelier-chapter] video")].every((v) => v.paused))).toBe(true);
  });

  test("asked for less motion: the image of each chapter only, no clip", async ({ browser, isMobile }, info) => {
    const context = await browser.newContext({ ...info.project.use, reducedMotion: "reduce" });
    const { silence } = await import("./fixtures");
    await silence(context);
    // Behind the door of the site under construction (online): enter it as tests/fixtures.ts does for its own context.
    if (process.env.ACCESS_PASSWORD && info.project.use.baseURL) await context.request.post(new URL("/api/access", info.project.use.baseURL).href, { form: { password: process.env.ACCESS_PASSWORD, next: "/" }, maxRedirects: 0 });
    const page = await context.newPage();
    await skipIntro(page);
    await page.goto("/atelier", { waitUntil: "load" });
    await toChapter(page, 1);
    expect(await page.locator("[data-atelier-chapters] video").count()).toBe(0);
    await expect(page.locator("[data-atelier-chapter] img[data-chapter-poster]")).toHaveCount(4);
    expect(await page.locator("[data-atelier-chapter]").nth(1).locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    if (!isMobile) await shot(page, info.project.name, "chapter-reduced");
    await context.close();
  });
});

test.describe("Up next in the atelier", () => {
  test("the other making-of films beside the film, the closest first; one plays in the same room; Escape closes", async ({ page, isMobile }, info) => {
    await skipIntro(page);
    // The ruby T of Marcus Thuram: his T-Serpent first (the same person).
    await page.goto("/atelier?piece=marcus-thuram-ruby-t-necklace", { waitUntil: "load" });
    const room = page.locator("[data-atelier-room]");
    await expect(room).toHaveAttribute("data-atelier-room", "marcus-thuram-ruby-t-necklace");
    const list = room.locator("[data-atelier-upnext]");
    await expect(list).toBeAttached();
    const items = list.locator("button[data-upnext]");
    const count = await items.count();
    const thumbs = await page.locator("[data-atelier-films] li[data-atelier-film]").count();
    expect(count, "every other making-of of the page").toBe(thumbs - 1);
    await expect(items.first()).toHaveAttribute("data-upnext", "marcus-thuram-t-serpent-pendant");
    expect(await items.evaluateAll((els) => els.some((e) => e.getAttribute("data-upnext") === "marcus-thuram-ruby-t-necklace"))).toBe(false);
    // Each: its image, its name, its length.
    for (const i of [0, 1, count - 1]) {
      const item = items.nth(i);
      await item.scrollIntoViewIfNeeded();
      await expect.poll(() => item.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      await expect(item).toContainText(/\d:\d\d/);
      const box = await item.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(48);
    }
    // Beside the film on a computer; under it on a phone (the room scrolls down to it).
    const film = await room.locator("[data-atelier-film]").boundingBox();
    const listBox = await list.boundingBox();
    if (isMobile) expect(listBox!.y).toBeGreaterThanOrEqual(film!.y + film!.height - 1);
    else expect(listBox!.x).toBeGreaterThanOrEqual(film!.x + film!.width - 1);
    // The texts: 16 px at least on a phone; no blue in the list.
    const styles = await list.evaluate((nav) =>
      [...nav.querySelectorAll<HTMLElement>("h3, button span")]
        .filter((el) => el.offsetParent !== null && el.textContent?.trim() && !el.closest(".sr-only,[aria-hidden='true']"))
        .map((el) => ({ size: parseFloat(getComputedStyle(el).fontSize), color: getComputedStyle(el).color })),
    );
    if (isMobile) expect(styles.filter((s) => s.size < 15.9)).toEqual([]);
    for (const s of styles) {
      const [r = 0, g = 0, b = 0] = (s.color.match(/[\d.]+/g) ?? []).map(Number);
      expect(b - Math.max(r, g), "no blue: " + s.color).toBeLessThan(30);
    }
    await room.locator("video[data-atelier-video]").evaluate((v: HTMLVideoElement) => v.pause());
    await page.evaluate(() => {
      document.querySelector("[data-atelier-room]")?.scrollTo(0, 0);
      document.querySelector("[data-atelier-upnext] ol")?.scrollTo(0, 0);
    });
    await page.waitForTimeout(700);
    await shot(page, info.project.name, "room-upnext");
    if (isMobile) {
      await list.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await shot(page, info.project.name, "room-upnext-list");
    }

    // One chosen plays in the same room, from its making-of.
    const second = await items.nth(1).getAttribute("data-upnext");
    const before = await room.locator("video[data-atelier-video]").getAttribute("src");
    await items.nth(1).click();
    await expect(room).toHaveAttribute("data-atelier-room", second!);
    await expect(room.locator("[data-atelier-upnext] button[data-upnext]").first()).not.toHaveAttribute("data-upnext", second!);
    await expect.poll(() => room.locator("video[data-atelier-video]").getAttribute("src")).not.toBe(before);
    await expect(room.locator("#atelier-room-title")).not.toHaveText("");
    // Its play button has the focus (a keyboard goes on from there).
    expect(await page.evaluate(() => document.activeElement?.hasAttribute("data-atelier-play"))).toBe(true);

    // Escape closes the room; the page stays The Atelier.
    await page.keyboard.press("Escape");
    await expect(room).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe("/atelier");
  });

  test("at the end of a film: Enter the World (its finished piece) and Next film (the first suggestion)", async ({ page }, info) => {
    await skipIntro(page);
    // The L pendant of Deniz Undav: a making-of without a film of the finished piece (its end comes at the end of the making-of).
    await page.goto("/atelier?piece=deniz-undav-l-pendant", { waitUntil: "load" });
    const room = page.locator("[data-atelier-room]");
    await expect(room).toHaveAttribute("data-atelier-room", "deniz-undav-l-pendant");
    const first = await room.locator("[data-atelier-upnext] button[data-upnext]").first().getAttribute("data-upnext");
    const video = room.locator("video[data-atelier-video]");
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState >= 1 && v.duration > 0), { timeout: 20_000 }).toBe(true);
    await video.evaluate((v: HTMLVideoElement) => {
      v.currentTime = Math.max(0, v.duration - 0.3);
      void v.play().catch(() => undefined);
    });
    const end = room.locator("[data-atelier-end]");
    await expect(end).toBeVisible({ timeout: 20_000 });
    const world = end.locator("a[data-atelier-end-world]");
    await expect(world).toHaveAttribute("href", "/pieces/deniz-undav-l-pendant");
    const next = end.locator("button[data-atelier-next]");
    await expect(next).toHaveAttribute("data-atelier-next", first!);
    for (const el of [world, next]) expect((await el.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    // The focus on the first choice.
    await expect.poll(() => page.evaluate(() => document.activeElement?.hasAttribute("data-atelier-end-world"))).toBe(true);
    await shot(page, info.project.name, "room-end");

    // Next film: the first suggestion, in the same room.
    await next.click();
    await expect(room).toHaveAttribute("data-atelier-room", first!);
    await expect(room.locator("[data-atelier-end]")).toHaveCount(0);

    // Enter the World leads to the page of the finished piece (never off the site).
    await room.locator("[data-atelier-world]").filter({ visible: true }).first().click();
    await expect(page).toHaveURL(new RegExp("/pieces/" + first + "$"));
    await expect(page.locator("[data-atelier-room]")).toHaveCount(0);
  });
});
