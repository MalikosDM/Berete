// Feedback of Yoni (21/11/2026, third pass), checked on a computer and on an iPhone, silent:
// 1. Dragon Ball: its main cut-out view much larger at the opening, whole; its professional edit (13/v01, HD) opens the
//    capsule, and stays in its atelier (played once there).
// 2. The circle of the players: a click on a player leads straight to the capsule of their piece (their page when they
//    have several: their pieces first, their stories discreet at the bottom), wherever a player can be clicked.
// 3. Sirius: its new trunk (the black trunk with the horned mask, its opening, its photos on the page of the trunks) and its
//    Japanese night (blood moon, pagoda, oni masks whose eyes glow, flashes in the clouds, red embers and maple leaves, a
//    red reflection on the piece), readable.
// 4. The NZ Travel Case: gone from the site (kept unpublished in the admin), its old address leads to the page of the trunks.
// 5. The home page a little smaller everywhere; "Explore the Creations": small cards with air, several at once.
// 6. The menu of the computer: the same on every page (Worn by Icons included), whole from 1260 px wide.
// Screenshots go to verification/yoni2111/.
import { mkdirSync } from "node:fs";
import { expect, test, type Locator, type Page } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import { BOXES } from "../src/data/pieces";
import { personHref, piecesOf, publicCatalogue } from "../src/data/relations";
import { BACKDROPS, resolveTheme } from "../src/data/themes";
import { trunkOf } from "../src/data/trunks";
import media from "../src/data/media.generated.json" with { type: "json" };
import { skipIntro, watch } from "./helpers";

const DIR = "verification/yoni2111";
mkdirSync(DIR, { recursive: true });
const shot = (page: Page, name: string, full = false) => page.screenshot({ path: DIR + "/" + name + ".jpg", type: "jpeg", quality: 70, fullPage: full });
const DRAGON = "kevin-schade-dragon-ball-pendant";
const FILMS = (media as unknown as { films: Record<string, { making?: { src: string; mobile: string; source: string }; reveal?: { src: string; mobile: string; source: string } }> }).films;

function contrast(a: number[], b: number[]): number {
  const lum = (c: number[]) => {
    const [r, g, bl] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

async function groundContrast(page: Page, el: Locator): Promise<number> {
  const color = (await el.evaluate((e) => getComputedStyle(e).color)).match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
  const box = (await el.boundingBox())!;
  const vw = page.viewportSize()!.width;
  const clip = { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.min(box.width, vw - Math.max(0, box.x)), height: box.height };
  await el.evaluate((e) => ((e as HTMLElement).style.visibility = "hidden"));
  const ground = await page.screenshot({ clip, type: "png" });
  await el.evaluate((e) => ((e as HTMLElement).style.visibility = ""));
  const { default: sharp } = await import("sharp");
  const stats = await sharp(ground).stats();
  return contrast(color, stats.channels.slice(0, 3).map((c) => Math.min(255, c.mean + c.stdev)));
}

/** Where an image drawn "contain" really is on the screen (its frame minus the empty bands). */
const drawn = (img: Locator) =>
  img.evaluate((el) => {
    const i = el as HTMLImageElement;
    const r = i.getBoundingClientRect();
    const ratio = i.naturalWidth / i.naturalHeight;
    const w = Math.min(r.width, r.height * ratio);
    const h = w / ratio;
    return { left: r.left + (r.width - w) / 2, top: r.top + (r.height - h) / 2, width: w, height: h };
  });

/* ---------- 1. Dragon Ball ---------- */

test("Dragon Ball: its main view much larger and whole; its edit 13/v01 opens the capsule, once in its atelier", async ({ page }, info) => {
  const problems = watch(page);
  const phone = info.project.name !== "desktop";
  const film = FILMS[DRAGON]!;
  expect(film.reveal?.source, "the professional edit in HD").toBe("13/v01 · HD 1080p");
  expect(film.making?.source).toBe(film.reveal?.source);
  await skipIntro(page, { films: false });
  await page.goto("/pieces/" + DRAGON);
  // The film first: its own copy for the screen, playing.
  const video = page.locator("[data-piece-film-video]");
  await expect(page.locator("[data-piece-film]")).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime), { timeout: 30_000 }).toBeGreaterThan(0.6);
  expect(await video.evaluate((v) => new URL((v as HTMLVideoElement).currentSrc, location.href).pathname)).toBe(phone ? film.reveal!.mobile : film.reveal!.src);
  await page.waitForTimeout(1500);
  await shot(page, info.project.name + "-dragon-1-film");
  await page.locator("[data-piece-film-skip]").click();
  await expect(page.locator("[data-piece-film]")).toHaveCount(0);
  await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
  await page.waitForTimeout(800);
  // The piece: much larger than before (the main view took 74 % of its frame on a computer, a frame of 58 % of the screen
  // on a phone), whole on the screen.
  const showcase = page.locator("[data-piece-cover] [data-showcase-large]");
  await expect(showcase).toHaveCount(1);
  const img = phone ? page.locator("[data-showcase-slide='0'] img") : page.locator("[data-showcase-view][data-place='0'] img");
  await expect.poll(() => img.evaluate((i) => (i as HTMLImageElement).naturalWidth), { timeout: 15_000 }).toBeGreaterThan(0);
  const box = await drawn(img);
  const vp = page.viewportSize()!;
  expect(box.height / vp.height, "its height on the screen").toBeGreaterThan(phone ? 0.52 : 0.75);
  expect(box.top).toBeGreaterThanOrEqual(0);
  expect(box.top + box.height).toBeLessThanOrEqual(vp.height + 1);
  expect(box.left).toBeGreaterThanOrEqual(0);
  expect(box.left + box.width).toBeLessThanOrEqual(vp.width + 1);
  await shot(page, info.project.name + "-dragon-2-piece");
  // Its atelier: the same edit, played once.
  const atelier = page.locator("[data-atelier-passage]");
  await atelier.scrollIntoViewIfNeeded();
  await expect(atelier).toBeVisible();
  expect(problems.errors).toEqual([]);
});

/* ---------- 2. The circle of the players ---------- */

test("the rule: one piece, its capsule; several, the page of the player", () => {
  const cat = publicCatalogue(defaultCatalogue);
  const person = (slug: string) => cat.people.find((p) => p.slug === slug)!;
  expect(personHref(cat, person("kenan-yildiz"))).toBe("/pieces/kenan-yildiz-celebration-pendant");
  expect(personHref(cat, person("lois-openda"))).toBe("/pieces/lois-openda-script-pendant");
  expect(piecesOf(cat, "kevin-schade").length).toBeGreaterThan(1);
  expect(personHref(cat, person("kevin-schade"))).toBe("/players/kevin-schade");
});

const CLICKS: [string, string, boolean][] = [
  ["kenan-yildiz", "/pieces/kenan-yildiz-celebration-pendant", false],
  ["lois-openda", "/pieces/lois-openda-script-pendant", false],
  ["kevin-schade", "/players/kevin-schade", true],
];
for (const [slug, target, several] of CLICKS) {
  test("the circle: a click on " + slug + " leads to " + target, async ({ page }, info) => {
    const problems = watch(page);
    await skipIntro(page);
    await page.goto("/players", { waitUntil: "load" });
    const card = page.locator("[data-player-card='" + slug + "'] [data-player-link]");
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await expect(page).toHaveURL(new RegExp(target + "$"));
    if (!several) {
      // The capsule, in its universe; no story opens.
      await expect(page.locator("article[data-piece] > .universe")).toHaveCount(1);
      await expect(page.locator("[role='dialog']")).toHaveCount(0);
      await page.waitForTimeout(1500);
      await shot(page, info.project.name + "-circle-" + slug);
    } else {
      // Their pieces first (a card for each capsule), their stories after everything else, discreet.
      const pieces = page.locator("[data-player-pieces] [data-player-piece]");
      await expect(pieces).toHaveCount(piecesOf(publicCatalogue(defaultCatalogue), slug).length);
      await expect(page.locator("[data-player-watch]")).toHaveCount(0);
      const order = await page.evaluate(() => {
        const at = (sel: string) => document.querySelector(sel)?.getBoundingClientRect().top ?? -1;
        return { pieces: at("[data-player-pieces]"), stories: at("[data-player-stories]"), photos: at("[data-player-photos]") };
      });
      expect(order.pieces).toBeGreaterThan(0);
      expect(order.stories).toBeGreaterThan(order.pieces);
      if (order.photos > 0) expect(order.stories).toBeGreaterThan(order.photos);
      // The first card of a piece is on the first screen.
      const first = (await pieces.first().boundingBox())!;
      expect(first.y).toBeLessThan(page.viewportSize()!.height);
      await page.waitForTimeout(600);
      await shot(page, info.project.name + "-circle-" + slug + "-page");
      await page.locator("[data-player-stories]").scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await shot(page, info.project.name + "-circle-" + slug + "-stories");
      await pieces.first().click();
      await expect(page).toHaveURL(/\/pieces\//);
    }
    expect(problems.errors).toEqual([]);
  });
}

test("the circle of the home page and the players of a club follow the same rule", async ({ page }) => {
  await skipIntro(page);
  await page.goto("/", { waitUntil: "load" });
  const cat = publicCatalogue(defaultCatalogue);
  for (const link of await page.locator("[data-player-card]").all()) {
    const slug = (await link.getAttribute("data-player-card"))!;
    const href = (await link.locator("[data-player-link]").getAttribute("href"))!;
    expect(href, slug).toBe(personHref(cat, cat.people.find((p) => p.slug === slug)!));
  }
  await page.goto("/players/vfb-stuttgart", { waitUntil: "load" });
  const members = page.locator("#club-players ~ ul a");
  for (const a of await members.all()) expect(await a.getAttribute("href")).toMatch(/^\/(pieces|players)\//);
});

/* ---------- 3. Sirius: its trunk and its Japanese night ---------- */

test("Sirius: its Japanese night, the eyes of the masks, the flashes, the leaves and the embers; readable", async ({ page }, info) => {
  const problems = watch(page);
  const phone = info.project.name !== "desktop";
  const theme = resolveTheme(defaultCatalogue.pieces.find((p) => p.slug === "sirius")!.theme);
  expect(theme.preset).toBe("japon");
  expect(theme.effects).toEqual(expect.arrayContaining(["embers", "maple", "smoke", "scene", "jewel-blood"]));
  expect(BACKDROPS["sirius-japon"]?.portrait, "made for a whole phone screen: it surrounds a story of the piece too").toBe(true);
  await skipIntro(page);
  await page.goto("/fr/pieces/sirius", { waitUntil: "commit" });
  const world = page.locator("article[data-piece] > .universe[data-backdrop='sirius-japon']");
  await expect(world).toHaveCount(1, { timeout: 15_000 });
  await page.waitForTimeout(500);
  await shot(page, info.project.name + "-sirius-1-arrivee");
  await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
  const img = world.locator(".u-backdrop img").first();
  await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0), { timeout: 20_000 }).toBe(true);
  expect(await img.evaluate((el) => (el as HTMLImageElement).currentSrc)).toContain("/media/universes/sirius-japon" + (phone ? "-m-" : "-"));
  // The eyes of the masks of the image shown (4 on the computer image, 14 on the phone one), two flashes in the clouds.
  const shown = (sel: string) => world.locator(sel).evaluateAll((els) => els.filter((e) => getComputedStyle(e).display !== "none").length);
  expect(await shown(".u-spot[data-kind='eye']")).toBe(phone ? 14 : 4);
  expect(await shown(".u-spot[data-kind='flash']")).toBe(2);
  // Each flash lights its cloud now and then; the eyes flare.
  const peaks = await page.evaluate(async () => {
    const flashes = [...document.querySelectorAll<HTMLElement>(".u-spot[data-kind='flash']")].filter((e) => getComputedStyle(e).display !== "none");
    const eye = [...document.querySelectorAll<HTMLElement>(".u-spot[data-kind='eye']")].find((e) => getComputedStyle(e).display !== "none")!;
    const max = flashes.map(() => 0);
    let eyeMax = 0;
    for (let k = 0; k < 320; k++) {
      flashes.forEach((f, i) => (max[i] = Math.max(max[i]!, Number(getComputedStyle(f).opacity))));
      eyeMax = Math.max(eyeMax, Number(getComputedStyle(eye).opacity));
      await new Promise((r) => setTimeout(r, 50));
    }
    return { max, eyeMax };
  });
  for (const m of peaks.max) expect(m).toBeGreaterThan(0.5);
  expect(peaks.eyeMax).toBeGreaterThan(0.8);
  await expect(world.locator("canvas.u-fx")).toHaveAttribute("data-running", "");
  await expect(page.locator("[data-piece-cover] .u-jewel[data-jewel='jewel-blood']").first()).toBeAttached();
  await shot(page, info.project.name + "-sirius-2-apres-entree");
  expect(await groundContrast(page, page.locator("h1#piece-title")), "the title").toBeGreaterThanOrEqual(4.5);
  if (!phone) for (const link of await page.locator("header nav a").all()) if (await link.isVisible()) expect(await groundContrast(page, link), "the menu").toBeGreaterThanOrEqual(4.5);
  expect(problems.errors).toEqual([]);
});

test("the trunk of Sirius: the black trunk with the horned mask, its opening, its photos on the page of the trunks", async ({ page }, info) => {
  const problems = watch(page);
  const trunk = trunkOf("sirius")!;
  // Since 22/11/2026 (2): its professional photos (00 Contexte Yoni/Boites (photos pro)/sirius), its new film.
  expect(trunk.photos?.map((p) => p.src)).toEqual(["01", "02", "03", "04"].map((n) => "/media/trunks/sirius/photo-" + n + ".webp"));
  expect(BOXES.find((b) => b.slug === "sirius")!.images.map((m) => m.src)).toEqual(trunk.photos!.map((p) => p.src));
  await skipIntro(page);
  await page.goto("/fr/boxes", { waitUntil: "load" });
  const card = page.locator("[data-box='sirius']");
  await card.locator(".aspect-square").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(900);
  await shot(page, info.project.name + "-sirius-ecrin-1-ferme");
  await card.locator("[data-trunk-open]").click();
  const video = card.locator("[data-trunk-video]");
  await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime), { timeout: 15_000 }).toBeGreaterThan(2.5);
  expect(await video.evaluate((v) => new URL((v as HTMLVideoElement).currentSrc).pathname)).toBe("/media/trunks/sirius/opening.mp4");
  await shot(page, info.project.name + "-sirius-ecrin-2-ouverture");
  await expect(card.locator("[data-trunk-create]")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1200);
  await shot(page, info.project.name + "-sirius-ecrin-3-ouvert");
  // Its photos: the professional ones.
  await card.locator("[data-box-photos='sirius']").click();
  const dialog = page.locator("[role='dialog']");
  await expect(dialog).toBeVisible();
  // (The photos appear as they come into view.)
  await expect(dialog.locator("img").first()).toBeVisible();
  const srcs = await dialog.locator("img").evaluateAll((els) => els.map((e) => new URL((e as HTMLImageElement).src).pathname));
  expect(srcs.some((s) => s.startsWith("/media/trunks/sirius/photo-01"))).toBe(true);
  expect(srcs.some((s) => s.startsWith("/media/trunks/sirius/photo-0"))).toBe(true);
  expect(srcs.some((s) => s.includes("/media/hd/sirius/"))).toBe(false);
  expect(problems.errors).toEqual([]);
});

/* ---------- 4. The NZ Travel Case ---------- */

test("the page of the trunks without the NZ Travel Case; kept for the admin; its old address leads to the trunks", async ({ page, request }, info) => {
  const nz = BOXES.find((b) => b.slug === "nz-travel-case")!;
  expect(nz.published).toBe(false);
  expect(publicCatalogue(defaultCatalogue).boxes.map((b) => b.slug)).not.toContain("nz-travel-case");
  await skipIntro(page);
  await page.goto("/boxes", { waitUntil: "load" });
  await expect(page.locator("[data-box]")).toHaveCount(BOXES.length - 1);
  await expect(page.locator("[data-box='nz-travel-case']")).toHaveCount(0);
  expect(await page.locator("main").innerText()).not.toMatch(/NZ Travel Case/i);
  await shot(page, info.project.name + "-ecrins-sans-nz", true);
  // Its piece no longer leads to it.
  await page.goto("/pieces/tanguy-nianzou-fam-medallion", { waitUntil: "load" });
  await expect(page.locator("[data-custom-box]")).toHaveCount(0);
  for (const prefix of ["", "/fr"]) {
    const res = await request.get(prefix + "/boxes/nz-travel-case", { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(new URL(res.headers().location!, "http://x").pathname).toBe(prefix + "/boxes");
  }
});

/* ---------- 5. The home page ---------- */

test("the home page, a little smaller; Explore the Creations: small cards with air, several at once", async ({ page }, info) => {
  const problems = watch(page);
  const phone = info.project.name !== "desktop";
  await skipIntro(page);
  await page.goto("/", { waitUntil: "load" });
  const vp = page.viewportSize()!;
  // The titles of the sections: at most 52 px (64 px before).
  for (const id of ["#special-title", "#collections-title", "#capsules-title", "#players-band-title", "#house-title"]) {
    const size = await page.locator(id).evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    expect(size, id).toBeLessThanOrEqual(52.5);
  }
  // Explore the Creations: the cards side by side, all of them on one screen on a computer, two by two on a phone.
  const section = page.locator("[data-collections]");
  await section.evaluate((e) => e.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(1200);
  const tiles = page.locator("[data-collection-tile]");
  const n = await tiles.count();
  expect(n).toBeGreaterThanOrEqual(3);
  const boxes = await Promise.all((await tiles.all()).map((t) => t.boundingBox()));
  const firstRow = boxes.filter((b) => Math.abs(b!.y - boxes[0]!.y) < 2);
  expect(firstRow.length).toBe(phone ? 2 : n);
  for (const b of boxes) expect(b!.width).toBeLessThan(phone ? vp.width / 2 : vp.width / 3.5);
  // Air between them.
  expect(boxes[1]!.x - (boxes[0]!.x + boxes[0]!.width)).toBeGreaterThanOrEqual(14);
  // The jewel whole in its card (no crop): "contain".
  expect(await tiles.first().locator("img").first().evaluate((e) => getComputedStyle(e).objectFit)).toBe("contain");
  await shot(page, info.project.name + "-accueil-creations");
  // Readable: the texts of 16 px at least, the buttons 48 px high at least.
  const small = await page.evaluate(() =>
    [...document.querySelectorAll("main p, main a, main button, main li span")]
      .filter((e) => (e as HTMLElement).offsetParent !== null && e.textContent!.trim().length > 2 && !e.closest("[data-stories-bar]") && !e.closest(".sr-only"))
      .filter((e) => parseFloat(getComputedStyle(e).fontSize) < 15.9 && getComputedStyle(e).fontSize !== "")
      .map((e) => e.textContent!.trim().slice(0, 40) + " " + getComputedStyle(e).fontSize),
  );
  if (phone) expect(small).toEqual([]);
  const buttons = await page.evaluate(() =>
    [...document.querySelectorAll("main a, main button")]
      .filter((e) => (e as HTMLElement).offsetParent !== null && e.getBoundingClientRect().width > 0 && !e.closest("[data-stories-bar]") && !e.closest("[data-player-card]") && !e.closest("[data-collection-tile]") && !e.closest("[data-pin-wrapper]") && !e.closest(".grid > div") && e.textContent!.trim().length > 0)
      .filter((e) => e.getBoundingClientRect().height < 44)
      .map((e) => e.textContent!.trim().slice(0, 30)),
  );
  expect(buttons).toEqual([]);
  for (const sel of ["[data-special-project]", "[data-pin-wrapper]", "section[aria-labelledby='players-band-title']", "section[aria-labelledby='house-title']"]) {
    await page.locator(sel).first().evaluate((e) => e.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(1200);
    await shot(page, info.project.name + "-accueil-" + sel.replace(/[^a-z]/gi, "").slice(0, 24));
  }
  expect(problems.errors).toEqual([]);
});

/* ---------- 6. The menu ---------- */

test("the menu of the computer: the same on Worn by Icons as on every page, whole from 1260 px, in every language", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "the menu of a computer");
  test.setTimeout(120_000);
  await skipIntro(page);
  for (const width of [1265, 1366, 1425]) {
    await page.setViewportSize({ width, height: 860 });
    for (const path of ["/players", "/", "/creations", "/atelier", "/boxes", "/process", "/about", "/contact", "/players/marcus-thuram", "/pieces/sirius"]) {
      await page.goto(path, { waitUntil: "load" });
      await expect(page.locator("[data-desktop-nav]"), path + " at " + width).toBeVisible();
      await expect(page.locator("button[aria-controls='mobile-menu']"), path + " at " + width).toBeHidden();
    }
  }
  // The narrowest screen with the whole menu, in the six languages: on one line, never under the buttons beside it.
  await page.setViewportSize({ width: 1260, height: 860 });
  for (const lang of ["", "/fr", "/es", "/de", "/nl", "/ar"]) {
    await page.goto(lang + "/players", { waitUntil: "load" });
    const fit = await page.evaluate(() => {
      const nav = document.querySelector("[data-desktop-nav]")!.getBoundingClientRect();
      const logo = document.querySelector("header a")!.getBoundingClientRect();
      const right = document.querySelector("header > div:nth-child(2) > div:last-child")!.getBoundingClientRect();
      const links = [...document.querySelectorAll("[data-desktop-nav] > a, [data-desktop-nav] > div > a")].map((a) => a.getBoundingClientRect().height);
      const rtl = document.documentElement.dir === "rtl";
      return { gapEnd: rtl ? nav.left - right.right : right.left - nav.right, gapStart: rtl ? logo.left - nav.right : nav.left - logo.right, tallest: Math.max(...links), scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    expect(fit.gapEnd, lang + ": room before the buttons").toBeGreaterThanOrEqual(8);
    expect(fit.gapStart, lang + ": room after the logo").toBeGreaterThanOrEqual(8);
    expect(fit.tallest, lang + ": one line").toBeLessThanOrEqual(50);
    expect(fit.scroll).toBe(0);
    if (lang === "" || lang === "/fr") await page.screenshot({ path: DIR + "/menu-1260" + (lang || "/en").replace("/", "-") + ".jpg", type: "jpeg", quality: 70, clip: { x: 0, y: 0, width: 1260, height: 120 } });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/fr/players", { waitUntil: "load" });
  await shot(page, "desktop-worn-by-icons");
});

test("Worn by Icons on a phone: the usual bar with its menu button, as on every page", async ({ page }, info) => {
  test.skip(info.project.name === "desktop", "phones");
  await skipIntro(page);
  await page.goto("/fr/players", { waitUntil: "load" });
  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator("button[aria-controls='mobile-menu']")).toBeVisible();
  await shot(page, info.project.name + "-worn-by-icons");
});

test("admin: the NZ Travel Case kept, unpublished; the size of the piece in the showcase of Dragon Ball", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "the admin, on a computer");
  const password = process.env.ADMIN_PASSWORD;
  test.skip(!password, "ADMIN_PASSWORD (.env) is needed to open the admin");
  test.skip(/vercel\.app/.test(process.env.BASE_URL ?? ""), "the admin needs the server (not on the Vercel version)");
  await page.goto("/admin");
  await expect(page.getByLabel("Mot de passe").or(page.getByRole("tab", { name: "Pièces" }))).toBeVisible({ timeout: 15_000 });
  if (await page.getByLabel("Mot de passe").isVisible()) {
    await page.getByLabel("Mot de passe").fill(password!);
    await page.getByRole("button", { name: "Se connecter" }).click();
  }
  await page.getByRole("tab", { name: "Écrins Signature" }).click();
  const row = page.locator("[data-admin-row='nz-travel-case']");
  await expect(row).toBeVisible();
  await expect(row.locator("[data-row-unpublished]")).toHaveText("Non publié");
  await row.locator("button[aria-label='Modifier']").click();
  await expect(page.getByLabel(/Publié sur le site/)).not.toBeChecked();
  await page.screenshot({ path: DIR + "/admin-ecrin-nz.jpg", type: "jpeg", quality: 70 });
  await page.getByRole("tab", { name: "Pièces" }).click();
  await page.locator("[data-admin-row='" + DRAGON + "'] button[aria-label='Modifier']").click();
  await expect(page.locator("[data-showcase-size='large']")).toBeChecked();
});
