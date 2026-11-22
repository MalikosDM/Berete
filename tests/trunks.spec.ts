// The Signature Trunks (Yoni, 21 and 22/11/2026): every box closed at first, in the same square; a click opens it, in the
// film made by Yoni (Signature, Sirius, Tulips on Tour, BRT Coral Case, Trophy Trunk: no jump from its last frame to its
// open image) or from its real closed photo to its real open photo, in a light; then its piece, cut out of its photo,
// rises from the box and floats above it, and two buttons come: "Create your trunk" (a WhatsApp message that names the
// box) and "Discover the piece" (its capsule). A box whose piece is not known: only the first button, no piece. Its real
// photos on its page and on the page of its piece. Films loaded only near the screen. Asked for less motion: open at once.
// Computer and iPhone, silent. Screenshots go to verification/trunks/.
import { existsSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { expect, test, type Locator, type Page } from "./fixtures";
import { BOXES, REMOVED_BOXES } from "../src/data/pieces";
import { trunkOf } from "../src/data/trunks";
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
const FILMS = new Set(["signature-trunk", "sirius", "tulips-on-tour", "brt-coral-case", "trophy-trunk"]);
/** The boxes of before: their real photos, unchanged. */
const BEFORE = new Set(["campione-d-italia-case", "butterfly-trunk", "okafor-trunk"]);
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

/** The mean difference of two screenshots of the same square (0 to 255). */
async function difference(a: Buffer, b: Buffer): Promise<number> {
  const { default: sharp } = await import("sharp");
  const [x, y] = await Promise.all([a, b].map((buf) => sharp(buf).resize(200, 200).removeAlpha().raw().toBuffer()));
  let sum = 0;
  for (let i = 0; i < x!.length; i++) sum += Math.abs(x![i]! - y![i]!);
  return sum / x!.length;
}

async function square(card: Locator): Promise<Locator> {
  const sq = card.locator(".aspect-square");
  await sq.evaluate((el) => el.scrollIntoView({ block: "center" }));
  return sq;
}

const shot = (page: Page, name: string) => page.screenshot({ path: DIR + "/" + name + ".jpg", type: "jpeg", quality: 70 });

test("the data: the boxes of the page, their openings, their real photos, their pieces", () => {
  const shown = BOXES.filter((b) => b.published).map((b) => b.slug);
  expect(shown).toEqual(ORDER.map(([s]) => s));
  for (const [slug, piece] of ORDER) {
    const box = BOXES.find((b) => b.slug === slug)!;
    expect(box.pieceSlug, slug).toBe(piece);
    const trunk = trunkOf(slug)!;
    expect(trunk, slug).not.toBeNull();
    expect(Boolean(trunk.video), slug).toBe(FILMS.has(slug));
    for (const which of ["closed", "open"]) expect(existsSync("public" + trunk.base + "/" + which + "-1080.webp"), slug + " " + which).toBe(true);
    // Their real photos: the professional ones (the boxes of before keep theirs).
    if (BEFORE.has(slug)) expect(box.images.every((m) => !m.src.startsWith("/media/trunks/")), slug).toBe(true);
    else expect(box.images[0]!.src, slug).toBe("/media/trunks/" + slug + "/photo-01.webp");
  }
  // The AI openings of the boxes of before (their inside was invented) are gone, and the travel case of NZ stays off.
  for (const slug of [...BEFORE, "nz-travel-case"]) expect(existsSync("public/media/trunks/" + slug + "/opening.mp4"), slug).toBe(false);
  expect(REMOVED_BOXES).toContain("nz-travel-case");
  expect(trunkOf("nz-travel-case")).toBeNull();
});

test("the page: every box in the same square, aligned (three on a row on a computer, one on a phone)", async ({ page }, info) => {
  const phone = info.project.name !== "desktop";
  await skipIntro(page);
  await page.goto("/fr/boxes", { waitUntil: "load" });
  const squares = page.locator("[data-box] .trunk-reveal > .aspect-square");
  await expect(squares).toHaveCount(ORDER.length);
  const boxes = await squares.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) }; }));
  for (const b of boxes) {
    expect(Math.abs(b.w - boxes[0]!.w)).toBeLessThanOrEqual(1);
    expect(Math.abs(b.h - b.w)).toBeLessThanOrEqual(1);
  }
  expect(new Set(boxes.map((b) => b.x)).size).toBe(phone ? 1 : 3);
  // The squares of a row on the same line.
  for (let i = 0; i < boxes.length; i += phone ? 1 : 3) {
    const row = boxes.slice(i, i + (phone ? 1 : 3));
    expect(Math.max(...row.map((b) => b.y)) - Math.min(...row.map((b) => b.y))).toBeLessThanOrEqual(1);
  }
  // Closed at first, each with its poster; no film loaded yet but those near the screen.
  await expect(page.locator("[data-trunk-state='closed']")).toHaveCount(ORDER.length);
  for (const v of await page.locator("[data-trunk-video]").all()) expect(await v.getAttribute("poster")).toMatch(/\/closed-720\.webp$/);
  await shot(page, info.project.name + "-0-page");
});

for (const [slug, piece] of ORDER) {
  test(slug + ": it opens, " + (piece ? "its piece rises and floats above it, its two buttons" : "only its button to create one's own"), async ({ page }, info) => {
    const problems = watch(page);
    await skipIntro(page);
    await page.goto("/fr/boxes", { waitUntil: "load" });
    const card = page.locator("[data-box='" + slug + "']");
    const sq = await square(card);
    await page.waitForTimeout(700);
    await expect(card.locator("[data-trunk-image='closed']")).toHaveAttribute("data-shown", "");
    await expect(card.locator("[data-trunk-actions]")).toHaveCount(0);
    await shot(page, info.project.name + "-" + slug + "-1-ferme");
    await card.locator("[data-trunk-open]").click();
    if (FILMS.has(slug)) {
      // The film plays, silent; at its end its open image comes over its last frame, without a jump.
      const video = card.locator("[data-trunk-video]");
      await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime), { timeout: 15_000 }).toBeGreaterThan(1.5);
      expect(await video.evaluate((v) => (v as HTMLVideoElement).muted)).toBe(true);
      await shot(page, info.project.name + "-" + slug + "-2-ouverture");
      await page.addStyleTag({ content: ".trunk-jewel,.trunk-links,.trunk-glow{visibility:hidden!important}" });
      await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).ended), { timeout: 15_000 }).toBe(true);
      const lastFrame = await sq.screenshot();
      await page.waitForTimeout(1300);
      const openImage = await sq.screenshot();
      expect(await difference(lastFrame, openImage), "from the film to the open image").toBeLessThan(9);
      await page.evaluate(() => document.querySelectorAll("style").forEach((s) => s.textContent?.includes(".trunk-jewel,") && s.remove()));
    } else {
      // From the closed photo to the open one, in a light coming out of the box.
      await expect(card.locator(".trunk-burst")).toHaveCount(1);
      await page.waitForTimeout(700);
      await shot(page, info.project.name + "-" + slug + "-2-ouverture");
    }
    await expect(card.locator("[data-trunk-state]")).toHaveAttribute("data-trunk-state", "open", { timeout: 15_000 });
    await expect(card.locator("[data-trunk-image='open']")).toHaveAttribute("data-shown", "");
    const jewel = card.locator("[data-trunk-jewel]");
    const create = card.locator("[data-trunk-create]");
    const discover = card.locator("[data-trunk-piece]");
    await expect(create).toBeVisible();
    await page.waitForTimeout(2200);
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
      const [, ly] = trunkOf(slug)!.light;
      expect(j.y + j.height / 2, "above the light of the box").toBeLessThan(area.y + area.height * ly);
      await expect(discover).toHaveText("Découvrir la pièce");
      await expect(discover).toHaveAttribute("href", "/fr/pieces/" + piece);
    } else {
      await expect(jewel).toHaveCount(0);
      await expect(discover).toHaveCount(0);
    }
    // "Create your trunk": the journey of before, a WhatsApp message that names the box.
    await expect(create).toHaveText("Créer votre écrin");
    const href = (await create.getAttribute("href"))!;
    expect(href).toMatch(/^https:\/\/wa\.me\/[^?]+\?text=/);
    expect(new URL(href).searchParams.get("text")).toBe("Bonjour Berete, j’ai découvert " + FR[slug] + " sur votre site et j’aimerais créer mon propre écrin.");
    for (const b of [create, ...(piece ? [discover] : [])]) {
      expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(48);
      expect(await b.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
    }
    await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(300);
    await shot(page, info.project.name + "-" + slug + "-3-ouvert");
    // "Discover the piece" leads to its capsule (Dragon Ball, The Hand, VfB).
    if (piece && ["dragon-ball-trunk", "the-hand-cube", "dfb-pokal-2025-display"].includes(slug)) {
      await discover.click();
      await expect(page).toHaveURL(new RegExp("/fr/pieces/" + piece + "$"));
      await expect(page.locator("article[data-piece]")).toBeVisible();
    } else {
      // Close it again.
      await card.locator("[data-trunk-close]").click();
      await expect(card.locator("[data-trunk-image='closed']")).toHaveAttribute("data-shown", "");
      await expect(card.locator("[data-trunk-open]")).toBeVisible();
    }
    expect(problems.errors).toEqual([]);
  });
}

test("the films load only near the screen: none before the visitor comes near the trunks", async ({ page }) => {
  await skipIntro(page);
  await page.goto("/boxes", { waitUntil: "load" });
  await page.waitForTimeout(1200);
  // (A film loads in several requests: counted once.)
  const loaded = await page.evaluate(() => new Set(performance.getEntriesByType("resource").filter((e) => e.name.includes("/media/trunks/") && e.name.endsWith(".mp4")).map((e) => e.name)).size);
  const near = await page.locator("[data-trunk-video][src]").count();
  expect(loaded).toBeLessThanOrEqual(near);
  expect(near).toBeLessThan(FILMS.size);
});

test("asked for less motion: a click shows the box open at once, its piece in place, its buttons", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await skipIntro(page);
  await page.goto("/boxes", { waitUntil: "load" });
  const card = page.locator("[data-box='sirius']");
  await square(card);
  await card.locator("[data-trunk-open]").click();
  await expect(card.locator("[data-trunk-create]")).toBeVisible({ timeout: 2_000 });
  await expect(card.locator("[data-trunk-piece]")).toBeVisible();
  await expect(card.locator("[data-trunk-jewel] img")).toBeVisible();
  await expect(card.locator("[data-trunk-image='open']")).toHaveAttribute("data-shown", "");
  expect(await card.locator("[data-trunk-video]").evaluate((v) => (v as HTMLVideoElement).currentTime)).toBe(0);
});

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
    test.skip(info.project.name !== "desktop" && box !== "dragon-ball-trunk", "on a phone: one of them");
    await skipIntro(page);
    await page.goto("/fr/pieces/" + piece, { waitUntil: "load" });
    const link = page.locator("[data-custom-box]");
    await expect(link).toHaveAttribute("data-custom-box", box);
    await expect(link).toHaveAttribute("href", "/fr/boxes#box-" + box);
    await link.scrollIntoViewIfNeeded();
    const img = link.locator("img");
    await expect.poll(() => img.evaluate((e) => new URL((e as HTMLImageElement).currentSrc || (e as HTMLImageElement).src).pathname), { timeout: 15_000 }).toMatch(new RegExp("^/media/trunks/" + box + "/photo-01"));
    await link.click();
    await expect(page).toHaveURL(new RegExp("/fr/boxes#box-" + box + "$"));
    await expect(page.locator("#box-" + box + " .aspect-square")).toBeInViewport({ timeout: 10_000 });
  });
}
