// The Signature Trunks (Yoni, 22/11/2026, 4): the 13 boxes open AND close again in their own films (00 Contexte Yoni/Ecrins
// IA (ouverture) v2/<folder>/: closed.jpg, open.jpg, ouverture.mp4, fermeture.mp4), in the same square. Closed at first; at
// "Open" its opening plays, then its piece, cut out of its photo, rises from the box, and "Create your trunk" (a WhatsApp
// message that names the box) and "Discover the piece" (its capsule) come; a box whose piece is not known: only the first
// one. At "Close" the buttons go, the piece goes back into the box, its closing plays and it ends closed, "Open" again; as
// many times as wanted; "Watch the opening again" on the open box. No jump between its images and its films; a click while a
// film plays breaks nothing. Every address carries the version of its files. Its professional photos in its gallery. Films
// loaded only near the screen. Computer and iPhone (touches), silent. Screenshots go to verification/trunks/.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { expect, test, type Locator, type Page, type TestInfo } from "./fixtures";
import { BOXES, REMOVED_BOXES } from "../src/data/pieces";
import { trunkImage, trunkOf } from "../src/data/trunks";
import { skipIntro, watch } from "./helpers";

const DIR = "verification/trunks";
mkdirSync(DIR, { recursive: true });

/** The boxes of the page, in their order, and their piece (null: not known yet). */
const ORDER: [string, string | null][] = [
  ["signature-trunk", null],
  ["sirius", "sirius"],
  ["tulips-on-tour", "tulips-on-tour-medallion"],
  ["dragon-ball-trunk", "kevin-schade-dragon-ball-pendant"],
  ["the-hand-cube", "the-hand"],
  ["dfb-pokal-2025-display", "vfb-stuttgart-dfb-pokal-2025"],
  ["world-cup-display", null],
  ["photo-case", null],
  ["brt-coral-case", null],
  ["trophy-trunk", null],
  ["campione-d-italia-case", "campione-d-italia-2023-2024"],
  ["butterfly-trunk", "michy-batshuayi-butterfly-pendant"],
  ["okafor-trunk", "noah-okafor-octagon-pendant"],
];
/** Without professional photos: their gallery keeps their real photos. */
const NO_PRO = new Set(["campione-d-italia-case", "butterfly-trunk", "okafor-trunk"]);
/** The French name of each box, as its WhatsApp message names it. */
const FR: Record<string, string> = {
  "signature-trunk": "l’écrin Signature",
  sirius: "l’écrin Sirius",
  "tulips-on-tour": "l’écrin Tulips on Tour",
  "dragon-ball-trunk": "la malle Dragon Ball",
  "the-hand-cube": "le cube The Hand",
  "dfb-pokal-2025-display": "la vitrine DFB-Pokal 2025",
  "world-cup-display": "la vitrine Coupe du monde",
  "photo-case": "la malle photo",
  "brt-coral-case": "la malle BRT corail",
  "trophy-trunk": "la malle au trophée",
  "campione-d-italia-case": "l’écrin Campione d'Italia",
  "butterfly-trunk": "la malle Butterfly",
  "okafor-trunk": "la malle Okafor",
};
const VERSIONED = /\.[0-9a-f]{10}\.(webp|avif|mp4)$/;

/** The mean difference of two images (0 to 255), at 200 px. */
async function difference(a: Buffer | string, b: Buffer | string): Promise<number> {
  const { default: sharp } = await import("sharp");
  const [x, y] = await Promise.all([a, b].map((src) => sharp(src).resize(200, 200).removeAlpha().raw().toBuffer()));
  let sum = 0;
  for (let i = 0; i < x!.length; i++) sum += Math.abs(x![i]! - y![i]!);
  return sum / x!.length;
}

/** The first or the last frame of a film (PNG). */
function frame(file: string, last: boolean): Buffer {
  const r = spawnSync("ffmpeg", ["-loglevel", "error", "-i", file, ...(last ? ["-vf", "reverse"] : []), "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"], { maxBuffer: 1 << 28 });
  return r.stdout;
}

const phoneOf = (info: TestInfo) => info.project.name !== "desktop";
/** A finger on the iPhone, the mouse on the computer. */
const press = (info: TestInfo, l: Locator, options: { force?: boolean; position?: { x: number; y: number } } = {}) => (phoneOf(info) ? l.tap(options) : l.click(options));

async function square(card: Locator): Promise<Locator> {
  const sq = card.locator(".aspect-square");
  await sq.evaluate((el) => el.scrollIntoView({ block: "center" }));
  return sq;
}
const stateOf = (card: Locator) => card.locator("[data-trunk-state]");
const shot = (page: Page, name: string) => page.screenshot({ path: DIR + "/" + name + ".jpg", type: "jpeg", quality: 70 });
/** Only the images and the films (the light, the piece and the buttons hidden), to compare them. */
const HIDE = ".trunk-jewel,.trunk-links,.trunk-glow{visibility:hidden!important}";
async function bare(page: Page, on: boolean) {
  if (on) await page.addStyleTag({ content: HIDE });
  else await page.evaluate((css) => document.querySelectorAll("style").forEach((s) => s.textContent === css && s.remove()), HIDE);
}

/** Waits for the end of a film (it goes back to its start once it has faded away: its end is caught as it comes). */
const endOf = (video: Locator) =>
  video.evaluate(
    (v) =>
      new Promise<void>((done, fail) => {
        const id = window.setTimeout(() => fail(new Error("the film did not end")), 15_000);
        v.addEventListener("ended", () => (window.clearTimeout(id), done()), { once: true });
      }),
  );

/** A click (a touch) on "Open", again until the page is ready and the box starts opening. */
async function openIt(info: TestInfo, card: Locator) {
  await expect(async () => {
    await press(info, card.locator("[data-trunk-open]"), {});
    await expect(stateOf(card)).not.toHaveAttribute("data-trunk-state", "closed", { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
}

/** Waits for a film to be on the screen: its own file (with its version), playing, silent. */
async function playsIts(card: Locator, which: "opening" | "closing", src: string) {
  const video = card.locator("[data-trunk-video='" + which + "']");
  await expect(video).toHaveAttribute("data-shown", "", { timeout: 15_000 });
  const now = await video.evaluate((v) => {
    const el = v as HTMLVideoElement;
    return { src: new URL(el.currentSrc).pathname, paused: el.paused, muted: el.muted, time: el.currentTime };
  });
  expect(now.src).toBe(src);
  expect(now.src).toMatch(VERSIONED);
  expect(now.paused).toBe(false);
  expect(now.muted).toBe(true);
  // From its start.
  expect(now.time).toBeLessThan(2.5);
  return video;
}

test("the data: 13 boxes, each its two images and its two films, every name with its version; their photos", async () => {
  const shown = BOXES.filter((b) => b.published).map((b) => b.slug);
  expect(shown).toEqual(ORDER.map(([s]) => s));
  // Nothing else in the folder of the trunks (no old box, no old opening).
  expect(readdirSync("public/media/trunks").sort()).toEqual(ORDER.map(([s]) => s).sort());
  for (const [slug, piece] of ORDER) {
    const box = BOXES.find((b) => b.slug === slug)!;
    expect(box.pieceSlug, slug).toBe(piece);
    const trunk = trunkOf(slug)!;
    expect(trunk, slug).not.toBeNull();
    const v = trunk.version;
    expect(v, slug).toMatch(/^[0-9a-f]{10}$/);
    expect(trunk.opening).toBe("/media/trunks/" + slug + "/opening." + v + ".mp4");
    expect(trunk.closing).toBe("/media/trunks/" + slug + "/closing." + v + ".mp4");
    expect(trunk.duration).toBeGreaterThan(4);
    expect(trunk.closingDuration).toBeGreaterThan(4);
    // Every file of the box carries its version: nobody keeps an old one in a cache.
    for (const f of readdirSync("public/media/trunks/" + slug)) expect(f, slug).toContain("." + v + ".");
    for (const which of ["closed", "open"] as const) for (const w of trunk.widths) for (const ext of ["avif", "webp"] as const) expect(existsSync("public" + trunkImage(trunk, which, w, ext)), slug + " " + which + " " + w + " " + ext).toBe(true);
    // Without any jump: the opening starts on the closed image and ends on the open one, the closing the other way.
    const img = (which: "closed" | "open") => "public" + trunkImage(trunk, which, 720, "webp");
    expect(await difference(frame("public" + trunk.opening, false), img("closed")), slug + ": start of the opening").toBeLessThan(6);
    expect(await difference(frame("public" + trunk.opening, true), img("open")), slug + ": end of the opening").toBeLessThan(6);
    expect(await difference(frame("public" + trunk.closing, false), img("open")), slug + ": start of the closing").toBeLessThan(6);
    expect(await difference(frame("public" + trunk.closing, true), img("closed")), slug + ": end of the closing").toBeLessThan(6);
    // Its professional photos in its gallery ("x photos"), not in its opening; the others keep their real photos.
    if (NO_PRO.has(slug)) {
      expect(trunk.photos, slug).toBeUndefined();
      expect(box.images.length, slug).toBeGreaterThan(0);
      expect(box.images.every((m) => !m.src.startsWith("/media/trunks/")), slug).toBe(true);
    } else {
      expect(box.images.map((m) => m.src).slice(0, trunk.photos!.length), slug).toEqual(trunk.photos!.map((p) => p.src));
      expect(box.images[0]!.src, slug).toBe("/media/trunks/" + slug + "/photo-01." + v + ".webp");
    }
  }
  expect(REMOVED_BOXES).toContain("nz-travel-case");
  expect(trunkOf("nz-travel-case")).toBeNull();
});

test("the page: every box closed, in the same square, aligned (three on a row on a computer, one on a phone)", async ({ page }, info) => {
  const phone = phoneOf(info);
  await skipIntro(page);
  await page.goto("/fr/boxes", { waitUntil: "load" });
  const squares = page.locator("[data-box] .trunk-reveal > .aspect-square");
  await expect(squares).toHaveCount(ORDER.length);
  const boxes = await squares.evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) };
    }),
  );
  for (const b of boxes) {
    expect(Math.abs(b.w - boxes[0]!.w)).toBeLessThanOrEqual(1);
    expect(Math.abs(b.h - b.w)).toBeLessThanOrEqual(1);
  }
  expect(new Set(boxes.map((b) => b.x)).size).toBe(phone ? 1 : 3);
  for (let i = 0; i < boxes.length; i += phone ? 1 : 3) {
    const row = boxes.slice(i, i + (phone ? 1 : 3));
    expect(Math.max(...row.map((b) => b.y)) - Math.min(...row.map((b) => b.y))).toBeLessThanOrEqual(1);
  }
  // Closed at first, on its closed image (with its version), "Open" on each.
  await expect(page.locator("[data-trunk-state='closed']")).toHaveCount(ORDER.length);
  await expect(page.locator("[data-trunk-open]")).toHaveCount(ORDER.length);
  for (const [slug] of ORDER) {
    const src = await page.locator("[data-box='" + slug + "'] [data-trunk-image='closed'] img").getAttribute("src");
    expect(src).toBe(trunkImage(trunkOf(slug)!, "closed", 1080, "webp"));
  }
  await expect(page.locator("[data-trunk-open]").first()).toHaveText("Ouvrir");
  await shot(page, info.project.name + "-0-page");
});

for (const [slug, piece] of ORDER) {
  test(slug + ": it opens in its film, " + (piece ? "its piece rises" : "no piece") + ", then it closes again in its film", async ({ page }, info) => {
    const problems = watch(page);
    const trunk = trunkOf(slug)!;
    const phone = phoneOf(info);
    const name = info.project.name + "-" + slug;
    // Every file asked for this box carries its version.
    const asked: string[] = [];
    page.on("request", (r) => {
      const path = new URL(r.url()).pathname;
      if (path.startsWith("/media/trunks/" + slug + "/")) asked.push(path);
    });
    await skipIntro(page);
    await page.goto("/fr/boxes", { waitUntil: "domcontentloaded" });
    const card = page.locator("[data-box='" + slug + "']");
    const sq = await square(card);
    await page.waitForTimeout(700);
    await expect(card.locator("[data-trunk-open]")).toBeVisible();
    await expect(card.locator("[data-trunk-image='open']")).not.toHaveAttribute("data-shown", "");
    await expect(card.locator("[data-trunk-actions]")).toHaveCount(0);
    await shot(page, name + "-1-ferme");

    /* ---- It opens ---- */
    await openIt(info, card);
    const opening = await playsIts(card, "opening", trunk.opening);
    // A click (a touch) in the middle while the film plays: nothing to click, nothing breaks.
    const box = (await sq.boundingBox())!;
    await press(info, sq, { force: true, position: { x: box.width / 2, y: box.height / 2 } });
    await expect(stateOf(card)).toHaveAttribute("data-trunk-state", "opening");
    await expect(card.locator("[data-trunk-open], [data-trunk-close]")).toHaveCount(0);
    await expect.poll(() => opening.evaluate((v) => (v as HTMLVideoElement).currentTime), { timeout: 15_000 }).toBeGreaterThan(2);
    await shot(page, name + "-2-ouverture");
    // At its end, the open image under it and the film fading away: the same image.
    await bare(page, true);
    await endOf(opening);
    const lastFrame = await sq.screenshot();
    await expect(stateOf(card)).toHaveAttribute("data-trunk-state", "open");
    await expect(card.locator("[data-trunk-image='open']")).toHaveAttribute("data-shown", "");
    await page.waitForTimeout(900);
    await expect(opening).not.toHaveAttribute("data-shown", "");
    expect(await difference(lastFrame, await sq.screenshot()), "from the opening to the open image").toBeLessThan(9);
    await bare(page, false);
    // The film of the closing loads now that the box is open.
    await expect(card.locator("[data-trunk-video='closing']")).toHaveAttribute("src", trunk.closing);

    /* ---- Open: its piece, its buttons ---- */
    const jewel = card.locator("[data-trunk-jewel]");
    const create = card.locator("[data-trunk-create]");
    const discover = card.locator("[data-trunk-piece]");
    const closeButton = card.locator("[data-trunk-close]");
    await expect(create).toBeVisible();
    await page.waitForTimeout(1500);
    if (piece) {
      // Its piece, cut out, floating above the box, whole inside the square.
      await expect(jewel).toHaveAttribute("data-trunk-jewel", piece);
      const img = jewel.locator("img");
      await expect(img).toHaveAttribute("src", new RegExp("^/media/cutouts/" + piece + "/"));
      await expect.poll(() => img.evaluate((e) => (e as HTMLImageElement).naturalWidth), { timeout: 15_000 }).toBeGreaterThan(0);
      const area = (await sq.boundingBox())!;
      const j = (await img.boundingBox())!;
      expect(j.x).toBeGreaterThanOrEqual(area.x - 1);
      expect(j.x + j.width).toBeLessThanOrEqual(area.x + area.width + 1);
      expect(j.y).toBeGreaterThanOrEqual(area.y - 1);
      expect(j.y + j.height / 2, "above the light of the box").toBeLessThan(area.y + area.height * trunk.light[1]);
      await expect(discover).toHaveText("Découvrir la pièce");
      await expect(discover).toHaveAttribute("href", "/fr/pieces/" + piece);
    } else {
      await expect(jewel).toHaveCount(0);
      await expect(discover).toHaveCount(0);
    }
    await expect(create).toHaveText("Créer votre écrin");
    const href = (await create.getAttribute("href"))!;
    expect(href).toMatch(/^https:\/\/wa\.me\/[^?]+\?text=/);
    expect(new URL(href).searchParams.get("text")).toBe("Bonjour Berete, j’ai découvert " + FR[slug] + " sur votre site et j’aimerais créer mon propre écrin.");
    // "Close" where "Open" was, "Watch the opening again" in its corner; all readable and large enough for a finger.
    await expect(closeButton).toBeVisible();
    await expect(closeButton).toHaveText("Refermer");
    // (Its name as the page writes it, in French.)
    await expect(closeButton).toHaveAttribute("aria-label", "Refermer : " + (await card.locator("h3").evaluate((e) => e.textContent!.trim())));
    await expect(card.locator("[data-trunk-replay]")).toHaveText("Revoir l’ouverture");
    for (const b of [create, closeButton, card.locator("[data-trunk-replay]"), ...(piece ? [discover] : [])]) {
      expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(48);
      expect(await b.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
    }
    await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(300);
    await shot(page, name + "-3-ouvert");

    /* ---- It closes ---- */
    await press(info, closeButton);
    // Its buttons go, its piece goes back into the box...
    await expect(stateOf(card)).toHaveAttribute("data-trunk-state", "lowering");
    await expect(card.locator("[data-trunk-actions]")).toHaveAttribute("data-leaving", "");
    if (piece) await expect(jewel).toHaveAttribute("data-leaving", "");
    await page.waitForTimeout(phone ? 150 : 300);
    await shot(page, name + "-4-la-piece-rentre");
    // ... then the film of its closing.
    const closing = await playsIts(card, "closing", trunk.closing);
    await expect(jewel).toHaveCount(0);
    await expect(card.locator("[data-trunk-actions]")).toHaveCount(0);
    await press(info, sq, { force: true, position: { x: box.width / 2, y: box.height / 2 } });
    await expect(stateOf(card)).toHaveAttribute("data-trunk-state", "closing");
    await expect.poll(() => closing.evaluate((v) => (v as HTMLVideoElement).currentTime), { timeout: 15_000 }).toBeGreaterThan(2);
    await shot(page, name + "-5-fermeture");
    await bare(page, true);
    await endOf(closing);
    const closedFrame = await sq.screenshot();
    await expect(stateOf(card)).toHaveAttribute("data-trunk-state", "closed");
    await page.waitForTimeout(900);
    await expect(closing).not.toHaveAttribute("data-shown", "");
    expect(await difference(closedFrame, await sq.screenshot()), "from the closing to the closed image").toBeLessThan(9);
    await bare(page, false);
    // Closed again, "Open" again.
    await expect(card.locator("[data-trunk-open]")).toBeVisible();
    await expect(card.locator("[data-trunk-image='open']")).not.toHaveAttribute("data-shown", "");
    await shot(page, name + "-6-referme");

    // Only its own files, all with their version.
    expect(asked.length).toBeGreaterThan(0);
    for (const a of asked) expect(a).toMatch(VERSIONED);
    expect(asked.some((a) => a.startsWith("/media/trunks/" + slug + "/opening."))).toBe(true);
    expect(asked.some((a) => a.startsWith("/media/trunks/" + slug + "/closing."))).toBe(true);
    expect(problems.errors).toEqual([]);
  });
}

test("as many times as wanted: open, watch the opening again, close, open, close", async ({ page }, info) => {
  const problems = watch(page);
  const slug = "dragon-ball-trunk";
  const trunk = trunkOf(slug)!;
  await skipIntro(page);
  await page.goto("/fr/boxes", { waitUntil: "domcontentloaded" });
  const card = page.locator("[data-box='" + slug + "']");
  await square(card);
  await page.waitForTimeout(500);
  const waitOpen = () => expect(card.locator("[data-trunk-close]")).toBeVisible({ timeout: 20_000 });
  const waitClosed = () => expect(card.locator("[data-trunk-open]")).toBeVisible({ timeout: 25_000 });
  await openIt(info, card);
  await playsIts(card, "opening", trunk.opening);
  await waitOpen();
  // Watch the opening again: its piece goes back, the closed image comes back, the opening plays from its start.
  await press(info, card.locator("[data-trunk-replay]"));
  await expect(stateOf(card)).toHaveAttribute("data-trunk-state", "rewinding");
  await expect(card.locator("[data-trunk-jewel]")).toHaveAttribute("data-leaving", "");
  await playsIts(card, "opening", trunk.opening);
  await waitOpen();
  await expect(card.locator("[data-trunk-jewel]")).toHaveAttribute("data-trunk-jewel", "kevin-schade-dragon-ball-pendant");
  for (let round = 0; round < 2; round++) {
    await press(info, card.locator("[data-trunk-close]"));
    await playsIts(card, "closing", trunk.closing);
    await waitClosed();
    if (round === 1) break;
    await openIt(info, card);
    await playsIts(card, "opening", trunk.opening);
    await waitOpen();
  }
  await expect(card.locator("[data-trunk-jewel]")).toHaveCount(0);
  expect(problems.errors).toEqual([]);
});

test("with the keyboard: Enter opens, the focus goes to Close; Enter closes, the focus comes back to Open", async ({ page }, info) => {
  test.skip(phoneOf(info), "the keyboard: on a computer");
  await skipIntro(page);
  await page.goto("/fr/boxes", { waitUntil: "load" });
  const card = page.locator("[data-box='signature-trunk']");
  await square(card);
  await page.waitForTimeout(500);
  await card.locator("[data-trunk-open]").focus();
  await page.keyboard.press("Enter");
  await expect(card.locator("[data-trunk-close]")).toBeFocused({ timeout: 20_000 });
  await page.keyboard.press("Enter");
  await expect(card.locator("[data-trunk-open]")).toBeFocused({ timeout: 25_000 });
});

test("the films load only near the screen: no closing before a box is open", async ({ page }) => {
  await skipIntro(page);
  await page.goto("/boxes", { waitUntil: "load" });
  await page.waitForTimeout(1200);
  const films = await page.evaluate(() => [...new Set(performance.getEntriesByType("resource").map((e) => new URL(e.name).pathname).filter((p) => p.startsWith("/media/trunks/") && p.endsWith(".mp4")))]);
  const near = await page.locator("[data-trunk-video='opening'][src]").count();
  expect(films.filter((f) => f.includes("/opening.")).length).toBeLessThanOrEqual(near);
  expect(near).toBeLessThan(ORDER.length);
  expect(films.filter((f) => f.includes("/closing."))).toEqual([]);
  await expect(page.locator("[data-trunk-video='closing'][src]")).toHaveCount(0);
});

test("asked for less motion: open and closed at once, its piece in place, its buttons", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await skipIntro(page);
  await page.goto("/fr/boxes", { waitUntil: "load" });
  const card = page.locator("[data-box='sirius']");
  await square(card);
  await openIt(info, card);
  await expect(card.locator("[data-trunk-create]")).toBeVisible({ timeout: 2_000 });
  await expect(card.locator("[data-trunk-jewel] img")).toBeVisible();
  await expect(card.locator("[data-trunk-image='open']")).toHaveAttribute("data-shown", "");
  await expect(card.locator("[data-trunk-replay]")).toHaveCount(0);
  expect(await card.locator("[data-trunk-video='opening']").evaluate((v) => (v as HTMLVideoElement).currentTime)).toBe(0);
  await press(info, card.locator("[data-trunk-close]"));
  await expect(card.locator("[data-trunk-open]")).toBeVisible({ timeout: 2_000 });
  await expect(card.locator("[data-trunk-image='open']")).not.toHaveAttribute("data-shown", "");
});

/** "Discover the piece" leads to its capsule (less motion: the box opens at once). */
for (const [slug, piece] of ORDER.filter(([, p]) => p)) {
  test(slug + ": « Découvrir la pièce » leads to " + piece, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await skipIntro(page);
    await page.goto("/fr/boxes", { waitUntil: "load" });
    const card = page.locator("[data-box='" + slug + "']");
    await square(card);
    await openIt(info, card);
    await press(info, card.locator("[data-trunk-piece]"));
    await expect(page).toHaveURL(new RegExp("/fr/pieces/" + piece + "$"));
    await expect(page.locator("article[data-piece]")).toBeVisible();
  });
}

/** The pages of the pieces: their own box, in its professional photo, leading to it on the page of the trunks. */
const PIECE_BOXES: [string, string][] = [
  ["kevin-schade-dragon-ball-pendant", "dragon-ball-trunk"],
  ["the-hand", "the-hand-cube"],
  ["vfb-stuttgart-dfb-pokal-2025", "dfb-pokal-2025-display"],
  ["sirius", "sirius"],
  ["tulips-on-tour-medallion", "tulips-on-tour"],
];
for (const [piece, box] of PIECE_BOXES) {
  test(piece + ": its page shows its own box (" + box + "), in its real photo, and leads to it", async ({ page }, info) => {
    test.skip(phoneOf(info) && box !== "dragon-ball-trunk", "on a phone: one of them");
    await skipIntro(page);
    await page.goto("/fr/pieces/" + piece, { waitUntil: "load" });
    const link = page.locator("[data-custom-box]");
    await expect(link).toHaveAttribute("data-custom-box", box);
    await expect(link).toHaveAttribute("href", "/fr/boxes#box-" + box);
    await link.scrollIntoViewIfNeeded();
    const img = link.locator("img");
    await expect
      .poll(() => img.evaluate((e) => new URL((e as HTMLImageElement).currentSrc || (e as HTMLImageElement).src).pathname), { timeout: 15_000 })
      .toMatch(new RegExp("^/media/trunks/" + box + "/photo-01\\." + trunkOf(box)!.version + "\\."));
    await link.click();
    await expect(page).toHaveURL(new RegExp("/fr/boxes#box-" + box + "$"));
    await expect(page.locator("#box-" + box + " .aspect-square")).toBeInViewport({ timeout: 10_000 });
  });
}
