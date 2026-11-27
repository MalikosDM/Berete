// Everything said in the three calls with Yoni (22-23/11/2026) not yet online, the new worlds of Inter Milan and VfB
// Stuttgart, the new text of the Dragon Ball pendant: the magnifying glass (photos only, everywhere), the film of the
// Dragon Ball pendant, the cross that turns, the sky of the L, the gothic of the T necklace, the studio photos, Marcus Thuram
// with Kanye West, the order of the galleries. Computer (Chrome 1440), iPhone (WebKit 390), in English and in French.
// Silent (tests/fixtures.ts).
import { expect, test, type Page } from "./fixtures";
import { shotPath, skipIntro, watch } from "./helpers";
import { defaultCatalogue } from "../src/data/catalogue";
import { anglePhotos, wornSet } from "../src/data/angles";
import { publicCatalogue } from "../src/data/relations";
import { resolveShowcase } from "../src/data/showcase";
import { INTER_VICTORY, VFB_VICTORY } from "../src/data/themes";

const V = "\\.[0-9a-f]{10}\\.";
const desktop = (name: string) => name === "desktop" || name === "safari";
const cat = publicCatalogue(defaultCatalogue);

async function open(page: Page, path: string) {
  await skipIntro(page, { films: false });
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load").catch(() => undefined);
}

// 24/11/2026 (Yoni): no magnifying glass over the pages any more (src/components/Loupe.tsx deleted: no lens that follows the
// pointer, no + / − on the photos of the pages). It lives in the full screen only (src/components/Lightbox.tsx): the wheel
// zooms where the pointer is, + and −, two fingers; never on a film. A click on the piece of the opening opens it there.
test("the magnifying glass: in the full screen only, photos only, never a film; the opening, the galleries, the trunks", async ({ page }, info) => {
  const problems = watch(page);
  const lb = page.locator("[data-lightbox]");
  const zoom = async () => Number(await lb.locator("[data-lightbox-stage]").getAttribute("data-zoom"));
  // (The L of Deniz Undav opens on its photo since 25/11/2026, no cut-out view to click: tests/retours2511.spec.ts.)
  const pieces = ["kevin-schade-dragon-ball-pendant", "campione-d-italia-2023-2024", "vfb-stuttgart-dfb-pokal-2025", "michy-batshuayi-butterfly-pendant", "the-hand"];
  for (const slug of pieces) {
    await open(page, "/pieces/" + slug);
    await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
    // No film in the opening, no lens over the page.
    await expect(page.locator("[data-piece-cover] video")).toHaveCount(0);
    await expect(page.locator("[data-piece-lens], [data-loupe], [data-loupe-control]")).toHaveCount(0);
    if (!desktop(info.project.name)) continue;
    // A click on the piece of the opening: full screen, where the glass lives.
    const main = page.locator("[data-piece-cover] [data-place='0'] img");
    await expect.poll(() => main.evaluate((i) => (i as HTMLImageElement).naturalWidth), { timeout: 15_000 }).toBeGreaterThan(0);
    const b = (await main.boundingBox())!;
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await expect(lb, slug).toBeVisible();
    await expect(lb.locator("[data-zoom-in]")).toBeVisible();
    if (slug === "kevin-schade-dragon-ball-pendant") {
      // A pinch of the trackpad (the wheel with Ctrl) brings it closer where the pointer is, + and − too; the wheel alone makes
      // the magnifying glass stronger (25/11/2026).
      const s = (await lb.locator("[data-lightbox-stage]").boundingBox())!;
      await page.mouse.move(s.x + s.width * 0.55, s.y + s.height * 0.5);
      await page.keyboard.down("Control");
      await page.mouse.wheel(0, -300);
      await page.keyboard.up("Control");
      await expect.poll(zoom).toBeGreaterThan(1);
      await page.waitForTimeout(400);
      await page.screenshot({ path: shotPath(info, "yoni2311d-loupe-dragonball") });
    }
    await page.keyboard.press("Escape");
    await expect(lb).toHaveCount(0);
    if (slug === "kevin-schade-dragon-ball-pendant") {
      // Its gallery: a photo opens full screen, with the glass.
      await page.locator("[data-every-angle] [data-angle='1'] button").click();
      await expect(lb).toBeVisible();
      await lb.locator("[data-zoom-in]").click();
      await expect.poll(zoom).toBeGreaterThan(1);
      await page.screenshot({ path: shotPath(info, "yoni2311d-loupe-galerie") });
      await page.keyboard.press("Escape");
    }
    if (slug === "campione-d-italia-2023-2024") {
      // A film of the gallery (the films come last, after "See more") full screen: no glass, no zoom.
      // (25/11/2026: See more after the photos of the details.)
      await page.locator("[data-angle-more]").click();
      await page.locator("[data-angle-type='video'] button").first().click();
      await expect(lb).toBeVisible();
      await expect(lb.locator("video")).toHaveCount(1);
      await expect(lb.locator("[data-zoom-in], [data-zoom-out]")).toHaveCount(0);
      await page.keyboard.press("Escape");
    }
  }
  if (desktop(info.project.name)) {
    // The creations: no glass over the cards (a card is a way into the piece).
    await open(page, "/creations");
    await expect(page.locator("[data-piece-lens], [data-loupe], [data-loupe-in]")).toHaveCount(0);
    await expect(page.locator("main video")).toHaveCount(0);
    await page.screenshot({ path: shotPath(info, "yoni2311d-loupe-creations") });
    // The photos of a trunk: full screen, with the glass.
    await open(page, "/boxes");
    await page.locator("[data-box-photos='sirius']").click();
    await expect(lb).toBeVisible();
    await lb.locator("[data-zoom-in]").click();
    await expect.poll(zoom).toBeGreaterThan(1);
  } else {
    // A phone: a touch on the jewel opens it full screen, two fingers to zoom.
    await open(page, "/pieces/kevin-schade-dragon-ball-pendant");
    await page.locator("[data-piece-cover] [data-showcase-slide='0'] button").tap();
    await expect(lb).toBeVisible();
    await expect(page.locator("[data-lightbox] img").first()).toHaveAttribute("src", /\/media\/cutouts\/kevin-schade-dragon-ball-pendant\//);
  }
  expect(problems.errors).toEqual([]);
});

// 24/11/2026 (Yoni: "the immersive part is not for the home page"): on the home page, its photo and a circle where only its
// sphere turns (silent, in a loop, while on screen), one sentence, "Enter the World"; its film stays at the top of its page.
test("the Dragon Ball pendant: its sphere turning in a circle on the home page; its film at the top of its page, silent in a loop", async ({ page }, info) => {
  const problems = watch(page);
  for (const lang of ["", "/fr"]) {
    await open(page, lang + "/");
    // The page settles first (its language loaded, it may come back to its top once).
    await page.waitForTimeout(2500);
    await expect(page.locator("[data-feature-film]")).toHaveCount(0);
    const section = page.locator("[data-home-innovation]");
    // Right after the piece of the opening, before the great commissions.
    const order = await page.evaluate(() => ["[data-home-story='house']", "[data-home-innovation]", "[data-special-ring]"].map((s) => document.querySelector(s)?.getBoundingClientRect().top ?? -1));
    expect(order[0]!).toBeLessThan(order[1]!);
    expect(order[1]!).toBeLessThan(order[2]!);
    const video = section.locator("[data-sphere-film]");
    // (Scrolled again until it is on screen: the page may come back to its top while it settles.)
    await expect(async () => {
      await video.scrollIntoViewIfNeeded();
      await expect(video).toBeInViewport({ ratio: 0.5, timeout: 1_500 });
    }).toPass({ timeout: 20_000 });
    await expect(video).toHaveAttribute("src", new RegExp("^/media/pages/dragon-ball-sphere" + V + "mp4$"), { timeout: 15_000 });
    await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime), { timeout: 20_000 }).toBeGreaterThan(0.3);
    // (A film that fades in from black loops back past its black: `data-start`, never `loop`.)
  expect(await video.evaluate((v) => ({ muted: (v as HTMLVideoElement).muted, loop: (v as HTMLVideoElement).loop || Boolean((v as HTMLVideoElement).dataset.start) }))).toEqual({ muted: true, loop: true });
    // Since 27/11/2026 (Yoni): its short text beside it (src/data/homeTexts.ts; tests/home2711.spec.ts).
    await expect(section.locator('[data-home-text="mechanism"]')).not.toBeEmpty();
    await expect(section.locator("a[data-innovation-link]")).toHaveAttribute("href", lang + "/pieces/kevin-schade-dragon-ball-pendant");
    await page.waitForTimeout(500);
    if (!lang) await page.screenshot({ path: shotPath(info, "yoni2311d-accueil-film") });
  }
  // At the top of its page, right after its opening (not a film that blocks the entrance).
  await open(page, "/pieces/kevin-schade-dragon-ball-pendant");
  const top = page.locator("[data-feature-film='kevin-schade-dragon-ball-pendant']");
  const next = await page.locator("[data-piece-opening]").evaluate((el) => el.nextElementSibling?.getAttribute("data-feature-film"));
  expect(next).toBe("kevin-schade-dragon-ball-pendant");
  await top.scrollIntoViewIfNeeded();
  await expect(top.locator("[data-feature-video]")).toHaveAttribute("src", /dragon-ball-hero/, { timeout: 15_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: shotPath(info, "yoni2311d-dragonball-film") });
  // Its film silent, in a loop, its sound and full screen at buttons.
  const video = top.locator("[data-feature-video]");
  await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime), { timeout: 20_000 }).toBeGreaterThan(0.3);
  expect(await video.evaluate((v) => ({ muted: (v as HTMLVideoElement).muted, loop: (v as HTMLVideoElement).loop || Boolean((v as HTMLVideoElement).dataset.start) }))).toEqual({ muted: true, loop: true });
  await expect(top.locator("[data-feature-fullscreen]")).toBeVisible();
  await top.locator("[data-feature-sound]").click();
  await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).muted)).toBe(false);
  await top.locator("[data-feature-sound]").click();
  // The making-of lives in The Atelier since 24/11/2026: a way there.
  await expect(page.locator("[data-making]")).toHaveCount(0);
  await expect(page.locator("[data-enter-atelier-link]")).toHaveAttribute("href", "/atelier?piece=kevin-schade-dragon-ball-pendant");
  expect(problems.errors).toEqual([]);
});

test("the cross of Malik Tillman that turns: its mechanism after its opening, and the third one of The Atelier", async ({ page }, info) => {
  const problems = watch(page);
  for (const lang of ["", "/fr"]) {
    await open(page, lang + "/pieces/malik-tillman-cross-pendant");
    const section = page.locator("[data-feature-film='malik-tillman-cross-pendant']");
    expect(await page.locator("[data-piece-opening]").evaluate((el) => el.nextElementSibling?.getAttribute("data-feature-film"))).toBe("malik-tillman-cross-pendant");
    await expect(section).toContainText(lang ? "Le mécanisme" : "The Mechanism");
    await section.scrollIntoViewIfNeeded();
    const video = section.locator("[data-feature-video]");
    await expect(video).toHaveAttribute("src", new RegExp("^/media/mechanisms/tillman-cross-spin(-mobile)?" + V + "mp4$"), { timeout: 15_000 });
    await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime), { timeout: 20_000 }).toBeGreaterThan(0.3);
    expect(await video.evaluate((v) => (v as HTMLVideoElement).muted)).toBe(true);
    await expect(section.locator("[data-feature-sound]")).toHaveCount(0);
    await expect(section.locator("[data-feature-fullscreen]")).toBeVisible();
    if (!lang) await page.screenshot({ path: shotPath(info, "yoni2311d-croix-mecanisme") });
  }
  await open(page, "/fr/atelier");
  const mechanisms = await page.locator("[data-engineering] [data-mechanism]").evaluateAll((els) => els.map((e) => e.getAttribute("data-mechanism")));
  expect(mechanisms).toEqual(["sphere", "lift", "cross"]);
  await expect(page.locator("[data-mechanism='cross']")).toContainText("La croix tournante");
  expect(problems.errors).toEqual([]);
});

test("the worlds: the sky of the L, the victory of Inter and of VfB (the squad behind the ring), the gothic of the T necklace", async ({ page }, info) => {
  const problems = watch(page);
  const phone = !desktop(info.project.name);
  const backdrop = () => page.locator(".u-backdrop img").first().evaluate((el) => (el as HTMLImageElement).currentSrc);
  const worlds: [string, string, string][] = [
    ["deniz-undav-l-pendant", "ciel", "ciel"],
    // (The versions v2 since 24/11/2026: INTER_VICTORY and VFB_VICTORY of src/data/themes.ts.)
    ["campione-d-italia-2023-2024", "victoire-nuit", INTER_VICTORY],
    ["vfb-stuttgart-dfb-pokal-2025", "victoire-rouge", VFB_VICTORY],
    ["marcus-thuram-ruby-t-necklace", "gothique", "gothique"],
  ];
  for (const [slug, preset, file] of worlds) {
    await open(page, "/pieces/" + slug);
    await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
    await expect(page.locator(".universe")).toHaveAttribute("data-universe", preset);
    await expect.poll(backdrop, { timeout: 15_000 }).toMatch(new RegExp("/media/universes/" + file + "-" + (phone ? "m-" : "")));
    // The piece first: its jewel larger than a third of the frame.
    const jewel = (await page.locator("[data-piece-cover] img:visible").first().boundingBox())!;
    expect(jewel.height).toBeGreaterThan(phone ? 200 : 300);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: shotPath(info, "yoni2311d-univers-" + slug) });
  }
  // The confetti of the victories fall behind the ring (the world is behind the page).
  await open(page, "/pieces/vfb-stuttgart-dfb-pokal-2025");
  await expect(page.locator(".universe .u-fx")).toHaveAttribute("data-running", "", { timeout: 10_000 });
  expect(problems.errors).toEqual([]);
});

test("the studio photos first, the L cut out cleanly; Marcus Thuram with Kanye West on his profile; the galleries open on their best photos", async ({ page }, info) => {
  const problems = watch(page);
  // Since 26/11/2026 (Yoni: « aucune image IA présentée comme une vraie pièce »): their real photo first, never their studio image
  // made by AI, in their cover, their gallery and their opening.
  for (const slug of ["radja-nainggolan-iced-watch", "tajon-buchanan-iced-watch", "marcus-thuram-skeleton-watch", "tanguy-nianzou-fam-medallion", "malik-tillman-tm-pendant", "marcus-thuram-thorned-t-pendant"]) {
    const piece = cat.pieces.find((p) => p.slug === slug)!;
    expect(piece.cover.src, slug).not.toMatch(/studio/);
    expect(piece.gallery.some((m) => m.src.includes("/studio")), slug).toBe(false);
    const shown = resolveShowcase(slug, piece.showcase);
    expect(shown.views.some((v) => /studio/.test(v.id)), slug).toBe(false);
  }
  // The order of a few galleries (the whole piece first).
  const first = (slug: string) => {
    const piece = cat.pieces.find((p) => p.slug === slug)!;
    return anglePhotos(piece, resolveShowcase(slug, piece.showcase).mode === "photo", wornSet(piece))[0]!.src;
  };
  expect(first("vfb-stuttgart-dfb-pokal-2025")).toMatch(/\/p13\./);
  expect(first("noah-okafor-jersey-pendant")).toMatch(/\/p20\./);
  expect(first("tulips-on-tour-medallion")).toMatch(/\/p22\./);
  expect(first("sirius")).toMatch(/\/p27\./);
  // The L on the site: its real photo, in the sky (25/11/2026).
  await open(page, "/pieces/deniz-undav-l-pendant");
  await expect(page.locator("[data-opening-fade] img").first()).toHaveAttribute("src", /\/media\/hd\/deniz-undav-l-pendant\/p10/);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: shotPath(info, "yoni2311d-l-ange-ciel") });
  // Marcus Thuram with Kanye West, on his profile only.
  for (const lang of ["", "/fr"]) {
    await open(page, lang + "/players/marcus-thuram");
    const photo = page.locator("[data-player-photos] img[src*='/media/extra/players/marcus-thuram/kanye.']");
    await expect(photo).toHaveCount(1);
    await expect(photo).toHaveAttribute("alt", lang ? "Marcus Thuram avec Kanye West" : "Marcus Thuram with Kanye West");
    if (!lang) {
      await photo.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await page.screenshot({ path: shotPath(info, "yoni2311d-thuram-kanye") });
    }
  }
  expect(problems.errors).toEqual([]);
});
