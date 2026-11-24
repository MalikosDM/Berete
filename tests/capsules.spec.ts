// The pages of the pieces (the "capsules"), 20/11/2026: the film of the finished piece (since 24/11/2026 its own section right
// after the opening, src/components/FeatureFilm.tsx: silent, in a loop, playing while on screen), the official logo of Inter
// Milan (src/lib/clubs.ts), the Genkidama of Dragon Ball (its page and its story), and "The Art of Detail" in 3D with the
// details pointed at on the jewel (src/viewer/DetailViewer.tsx: on this computer only, the test model is never put on a
// real piece online). Screenshots go to verification/capsules/.
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { chromium, devices, expect, test, type Page } from "./fixtures";
import media from "../src/data/media.generated.json" with { type: "json" };
import { skipIntro, watch } from "./helpers";

type Film = { src: string; mobile: string; width: number; height: number; audio: boolean };
const FILMS = (media as unknown as { films: Record<string, { reveal?: Film }> }).films;
const INTER = "campione-d-italia-2023-2024";
const DIR = "verification/capsules";
mkdirSync(DIR, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: DIR + "/" + name + ".jpg", type: "jpeg", quality: 70, timeout: 45_000 });
const ready = (page: Page) => expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });

const filmState = (page: Page) =>
  page.locator("[data-feature-video]").evaluate((el) => {
    const v = el as HTMLVideoElement;
    return { time: v.currentTime, paused: v.paused, muted: v.muted, loop: v.loop, src: v.currentSrc, width: v.videoWidth };
  });

/* ---------- The film of the finished piece: its own section right after the opening (Yoni, 24/11/2026) ---------- */

// (The Inter ring left this list on 24/11/2026: its film was a 3D render, set to none; no film section on its page.)
const ENTERED = ["vfb-stuttgart-dfb-pokal-2025", "michy-batshuayi-butterfly-pendant", "noah-okafor-oka-pendant", "tulips-on-tour-medallion", "the-hand"];

for (const slug of ENTERED) {
  test("entering " + slug + " by a click: the piece first, then its film in its section, silent, in a loop, whole on screen", async ({ page }, info) => {
    const problems = watch(page);
    const phone = info.project.name !== "desktop";
    const film = FILMS[slug]!.reveal!;
    await skipIntro(page, { films: false });
    await page.goto("/fr/creations");
    const card = page.locator("a[data-piece-card='" + slug + "']").first();
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await expect(page).toHaveURL(new RegExp("/fr/pieces/" + slug + "$"));
    // The first thing seen: the piece; no film over it (the cinema window lives in The Atelier only).
    await expect(page.locator("[data-piece-opening] h1")).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(page.locator("[data-piece-film]")).toHaveCount(0);
    const section = page.locator("section#piece-film[data-feature-film='" + slug + "']");
    await expect(section).toHaveCount(1);
    // Right after the opening.
    expect(await section.evaluate((el) => el.previousElementSibling?.hasAttribute("data-piece-opening"))).toBe(true);
    // "Watch the film" leads down to it; on screen it plays by itself, silent, in a loop, its copy made for the screen.
    await ready(page);
    const watchFilm = page.locator("[data-watch-film]");
    await expect(watchFilm).toHaveAttribute("href", "#piece-film");
    await watchFilm.click();
    await expect(section).toBeInViewport({ timeout: 10_000 });
    const frame = section.locator("[data-feature-frame]");
    await frame.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect.poll(async () => (await filmState(page)).time, { timeout: 30_000 }).toBeGreaterThan(0.6);
    const state = await filmState(page);
    expect(state.paused).toBe(false);
    expect(state.muted).toBe(true);
    expect(state.loop).toBe(true);
    expect(new URL(state.src).pathname).toBe(phone ? film.mobile : film.src);
    // Sharp on a phone too: its own film at 720 pixels wide at least.
    expect(state.width).toBeGreaterThanOrEqual(720);
    // Its frame: the shape of the film, whole on the screen.
    await page.waitForTimeout(800);
    const box = (await frame.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(Math.abs(box.width / box.height - film.width / film.height)).toBeLessThan(0.02);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    // Its sound at a small button (when it has one), its full screen at another.
    const sound = section.locator("[data-feature-sound]");
    if (film.audio) {
      await expect(sound).toHaveAttribute("aria-pressed", "false");
      await sound.click();
      expect((await filmState(page)).muted).toBe(false);
      await expect(sound).toHaveAttribute("aria-pressed", "true");
    } else await expect(sound).toHaveCount(0);
    await expect(section.locator("[data-feature-fullscreen]")).toBeVisible();
    await shot(page, info.project.name + "-film-" + slug);
    // Off screen, it rests.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(async () => (await filmState(page)).paused, { timeout: 10_000 }).toBe(true);
    expect(problems.errors).toEqual([]);
  });
}

test("a piece without a film (the Safi Link; the Inter ring, whose film was a 3D render) has no film section; asked for less motion, no film by itself", async ({ page }) => {
  await skipIntro(page, { films: false });
  for (const without of ["the-safi-link", INTER]) {
    await page.goto("/fr/pieces/" + without);
    await ready(page);
    await expect(page.locator("[data-feature-film]")).toHaveCount(0);
    await expect(page.locator("[data-watch-film]")).toHaveCount(0);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/fr/pieces/vfb-stuttgart-dfb-pokal-2025");
  await expect(page.locator("[data-watch-film]")).toBeVisible();
  const section = page.locator("[data-feature-film]");
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  expect(await page.locator("[data-feature-video]").evaluate((v) => (v as HTMLVideoElement).paused)).toBe(true);
});

/* ---------- The logo of Inter Milan ---------- */

test("Inter Milan: its official logo in Created exclusively for, as the club made it, in the light of its universe", async ({ page }, info) => {
  const problems = watch(page);
  await skipIntro(page);
  await page.goto("/fr/pieces/" + INTER);
  await ready(page);
  const emblem = page.locator("[data-made-for] [data-club-logo='inter-milan']");
  await emblem.scrollIntoViewIfNeeded();
  await expect(emblem).toBeVisible();
  const img = emblem.locator("img");
  await expect.poll(() => img.evaluate((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0)).toBe(true);
  // The file of the club itself, byte for byte (never redrawn nor changed).
  const file = await (await page.request.get((await img.getAttribute("src"))!)).body();
  expect(createHash("sha1").update(file).digest("hex")).toBe("c6b22cd28b44aab549f2ef96dd6e285d4e5f2e72");
  // (Smaller since 24/11/2026: 64 px on a phone, 80 at the scale of 15 px of a computer.)
  expect((await emblem.boundingBox())!.width).toBeGreaterThanOrEqual(64);
  await page.waitForTimeout(500);
  await page.locator("[data-made-for]").screenshot({ path: DIR + "/" + info.project.name + "-logo-inter.jpg", type: "jpeg", quality: 75 });
  // Only Inter for now: VfB Stuttgart, a club too, keeps its portrait.
  await page.goto("/fr/pieces/vfb-stuttgart-dfb-pokal-2025");
  await ready(page);
  await expect(page.locator("[data-club-logo]")).toHaveCount(0);
  expect(problems.errors).toEqual([]);
});

/* ---------- The Genkidama of Dragon Ball ---------- */

test("Dragon Ball: black, the sphere of the Genkidama breathing, the light rising to it; its story too; the chain of Kevin Schade in its own world", async ({ page }, info) => {
  const problems = watch(page);
  const phone = info.project.name !== "desktop";
  await skipIntro(page);
  await page.goto("/pieces/kevin-schade-dragon-ball-pendant", { waitUntil: "load" });
  const universe = page.locator("article[data-piece] .universe");
  await expect(universe).toHaveAttribute("data-backdrop", "genkidama");
  await ready(page);
  await expect
    .poll(() => page.locator(".u-backdrop img").evaluate((i) => ((i as HTMLImageElement).complete ? (i as HTMLImageElement).currentSrc : "")))
    .toMatch(new RegExp("/media/universes/genkidama" + (phone ? "-m-\\d+" : "-\\d+") + "\\.(avif|webp)$"));
  // The glow on the sphere, breathing; the sphere at the top of the screen, in the middle of the image.
  const glow = page.locator("article[data-piece] .u-genki-glow");
  await expect(glow).toBeVisible();
  expect(await glow.evaluate((el) => getComputedStyle(el).animationName)).toBe("u-genki-pulse");
  const core = (await page.locator("article[data-piece] .u-genki-core").boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(core.y + core.height / 2).toBeLessThan(viewport.height * 0.45);
  expect(core.x + core.width / 2).toBeGreaterThan(0);
  expect(core.x + core.width / 2).toBeLessThan(viewport.width);
  // The light rising: the particles drawn in the canvas of the effects.
  await expect(page.locator("article[data-piece] .u-fx")).toHaveAttribute("data-running", "", { timeout: 10_000 });
  await page.waitForTimeout(1500);
  const lit = await page.locator("article[data-piece] .u-fx").evaluate((c) => {
    const canvas = c as HTMLCanvasElement;
    const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    let n = 0;
    for (let i = 3; i < data.length; i += 16) if (data[i]! > 20) n++;
    return n;
  });
  expect(lit).toBeGreaterThan(10);
  await shot(page, info.project.name + "-genkidama-page");
  // Its story: the same world around it.
  const open = page.locator("[data-seen-in-stories]");
  await open.scrollIntoViewIfNeeded();
  await open.click();
  const story = page.locator("[role='dialog'][data-story-world='kevin-schade-dragon-ball-pendant']");
  await expect(story).toBeVisible();
  await expect(story.locator(".universe[data-fixed]")).toHaveAttribute("data-backdrop", "genkidama");
  await expect(story.locator(".u-fx")).toHaveAttribute("data-running", "", { timeout: 10_000 });
  await page.waitForTimeout(1500);
  await shot(page, info.project.name + "-genkidama-story");
  await page.keyboard.press("Escape");
  // The chain of Kevin Schade is not in the Genkidama: since 24/11/2026 it is BRT Flowers (its address leads there), in the
  // roses of its own world.
  await page.goto("/pieces/kevin-schade-twisted-chain", { waitUntil: "load" });
  await expect(page).toHaveURL(/\/pieces\/brt-flower-chain$/);
  await expect(page.locator("article[data-piece] .universe")).toHaveAttribute("data-universe", "roses");
  await expect(page.locator(".u-genki")).toHaveCount(0);
  expect(problems.errors).toEqual([]);
});

/* ---------- "The Art of Detail" in 3D (this computer only) ---------- */

test("The Art of Detail in 3D: the points placed in the admin by a click on the model, the labels following the jewel, fading behind it", async ({ page, request }, info) => {
  test.skip(info.project.name !== "desktop", "placed once from the computer; the phone is checked inside (WebKit)");
  const password = process.env.ADMIN_PASSWORD;
  test.skip(!password, "ADMIN_PASSWORD (.env) is needed to open the admin");
  const base = String(info.project.use.baseURL ?? "");
  test.skip(!/^http:\/\/(localhost|127\.0\.0\.1)/.test(base), "on this computer only: the test model never goes on a real piece online");
  test.setTimeout(6 * 60_000);
  const problems = watch(page);
  await skipIntro(page);

  // The piece as it is, to put it back at the end.
  const { token } = (await (await request.post("/api/admin/login", { data: { password } })).json()) as { token: string };
  const auth = { Authorization: "Bearer " + token };
  const rows = ((await (await request.get("/api/admin/pieces", { headers: auth })).json()) as { items: Record<string, unknown>[] }).items;
  const before = rows.find((r) => r.slug === INTER)!;
  try {
    // The admin: the test model on the piece, then three details placed by a click on the jewel.
    // ?debug3d: the viewer tells where the jewel is (its points under the screen), to click on it.
    await page.goto("/admin?debug3d");
    const tab = page.getByRole("tab", { name: "Pièces" });
    await expect(tab.or(page.getByLabel("Mot de passe"))).toBeVisible();
    if (!(await tab.isVisible())) {
      await page.getByLabel("Mot de passe").fill(password!);
      await page.getByRole("button", { name: "Se connecter" }).click();
    }
    await tab.click();
    await page.locator("[data-admin-row='" + INTER + "'] button[aria-label='Modifier']").click();
    await page.locator("[data-model-option='ZN1242-bj001'] input").check();
    const field = page.locator("[data-detail-points-field]");
    await field.scrollIntoViewIfNeeded();
    const viewer = field.locator("[data-detail-3d='admin']");
    await expect(viewer).toHaveAttribute("data-detail-3d-status", "ready", { timeout: 90_000 });
    // Where the jewel is in the frame (the test model is a round necklace: its middle is empty), then real clicks there.
    await viewer.scrollIntoViewIfNeeded();
    const box = (await viewer.boundingBox())!;
    const spots = await page.evaluate((b) => {
      const api = (window as unknown as { __berete3d?: { pick: (x: number, y: number) => number[] | null } }).__berete3d!;
      const out: [number, number][] = [];
      for (let y = 0.15; y < 0.9; y += 0.05) for (let x = 0.15; x < 0.9; x += 0.05) if (api.pick(b.x + b.width * x, b.y + b.height * y)) out.push([x, y]);
      return out;
    }, box);
    expect(spots.length).toBeGreaterThan(5);
    for (const [k, n] of [1, 2, 3].entries()) {
      // After a point, the next detail without one waits already for its click.
      const place = field.locator("[data-place='" + n + "']");
      if ((await place.getAttribute("aria-pressed")) !== "true") await place.click();
      // The page may have moved to show the button: the frame measured again.
      await viewer.scrollIntoViewIfNeeded();
      const now = (await viewer.boundingBox())!;
      const [sx, sy] = spots[Math.floor((k * spots.length) / 3)]!;
      await page.mouse.click(now.x + now.width * sx, now.y + now.height * sy);
      await expect(field.locator("[data-detail-point-row='" + n + "']")).toHaveAttribute("data-placed", "true");
    }
    await expect(viewer.locator("[data-detail-label]")).toHaveCount(3);
    await page.waitForTimeout(600);
    await field.screenshot({ path: DIR + "/admin-points-3d.jpg", type: "jpeg", quality: 70 });
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(field).toHaveCount(0);

    // The page: the model turning, nothing over it but its details; the labels follow it, fade behind it, come back.
    const checkPage = async (p: Page, name: string, wide: boolean) => {
      await p.goto("/fr/pieces/" + INTER);
      await expect(p.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
      const section = p.locator("[data-details-3d]");
      await section.scrollIntoViewIfNeeded();
      const stage = section.locator("[data-detail-3d='page']");
      await expect(stage).toHaveAttribute("data-detail-3d-status", "ready", { timeout: 120_000 });
      await expect(stage.locator("button, select, input")).toHaveCount(0);
      const labels = stage.locator("[data-detail-label]");
      await expect(labels).toHaveCount(3);
      // The titles of the details on a computer; their numbers only on a phone.
      const display = await labels.first().locator(".detail-label-title").evaluate((el) => getComputedStyle(el).display);
      if (wide) expect(display).not.toBe("none");
      else expect(display).toBe("none");
      const watchLabels = async (rounds: number, shotAt: number | null) => {
        const seen = new Set<string>();
        const places = new Set<string>();
        for (let i = 0; i < rounds && !(seen.has("true") && seen.has("false") && places.size > 3); i++) {
          for (const state of await labels.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.visible ?? ""))) seen.add(state);
          places.add(await labels.first().evaluate((e) => (e as HTMLElement).style.transform));
          if (i === shotAt) await p.screenshot({ path: DIR + "/" + name + "-detail-3d.jpg", type: "jpeg", quality: 70 });
          await p.waitForTimeout(300);
        }
        return { seen, places };
      };
      // It turns by itself: the labels move with the jewel, seen.
      const first = await watchLabels(20, 6);
      expect(first.places.size).toBeGreaterThan(3);
      expect(first.seen.has("true")).toBe(true);
      if (!wide) return;
      // Turned from top to bottom with the mouse, the jewel seen from its side: the points of its far side go behind it
      // (their labels fade), then come back as it turns.
      const b = (await stage.boundingBox())!;
      // Upwards: the camera comes down to the height of the jewel (about a tenth of the height of the frame: a quarter turn).
      await p.mouse.move(b.x + b.width / 2, b.y + b.height * 0.6);
      await p.mouse.down();
      for (let k = 1; k <= 6; k++) await p.mouse.move(b.x + b.width / 2, b.y + b.height * 0.6 - k * b.height * 0.0155);
      await p.mouse.up();
      const side = await watchLabels(90, 30);
      expect([...side.seen].sort()).toEqual(["false", "true"]);
    };
    // The page, in a browser that draws with the graphics card of the Mac (as scripts/verify-3d.mjs: without it, Chromium
    // draws the 3D on the processor, many times slower than any phone).
    const gpu = await chromium.launch({ headless: true, channel: "chromium", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"] });
    try {
      const computer = await (await gpu.newContext({ viewport: { width: 1440, height: 900 }, baseURL: base })).newPage();
      await skipIntro(computer);
      await checkPage(computer, "desktop", true);
      // Away from the jewel, the wheel scrolls the page (it zooms once the jewel was clicked).
      const stage = computer.locator("[data-detail-3d='page']");
      await stage.scrollIntoViewIfNeeded();
      const stageBox = (await stage.boundingBox())!;
      await computer.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
      await computer.mouse.move(stageBox.x - 10, stageBox.y - 10);
      await computer.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
      const y0 = await computer.evaluate(() => window.scrollY);
      await computer.mouse.wheel(0, 400);
      await expect.poll(() => computer.evaluate(() => window.scrollY)).toBeGreaterThan(y0 + 100);

      // The phone: an iPhone screen, its processor slowed 4 times (the graphics card stays the Mac's).
      const { defaultBrowserType: _ignored, ...iphone } = devices["iPhone 13"];
      const phone = await (await gpu.newContext({ ...iphone, baseURL: base })).newPage();
      await skipIntro(phone);
      const cdp = await phone.context().newCDPSession(phone);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await checkPage(phone, "iphone", false);
      const fps = await phone.evaluate(
        () =>
          new Promise<number>((done) => {
            let n = 0;
            const t0 = performance.now();
            const tick = () => {
              n++;
              if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
              else done(n / 3);
            };
            requestAnimationFrame(tick);
          }),
      );
      console.log("The Art of Detail in 3D, emulated iPhone: " + fps.toFixed(0) + " images per second");
      expect(fps).toBeGreaterThan(20);
    } finally {
      await gpu.close();
    }
    expect(problems.errors).toEqual([]);
  } finally {
    // Back as it was: no model on the piece, no points.
    await request.put("/api/admin/pieces/" + INTER + "/model", { headers: auth, data: { modelId: null } });
    await request.put("/api/admin/pieces/" + String(before.id), { headers: auth, data: { ...before, detailPoints: null } });
  }
});
