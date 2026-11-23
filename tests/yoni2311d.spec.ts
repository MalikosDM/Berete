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

const V = "\\.[0-9a-f]{10}\\.";
const desktop = (name: string) => name === "desktop" || name === "safari";
const cat = publicCatalogue(defaultCatalogue);

async function open(page: Page, path: string) {
  await skipIntro(page, { films: false });
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load").catch(() => undefined);
}

/** The pointer over the photo of an element, then the lens shown over it (computers). */
async function hover(page: Page, img: ReturnType<Page["locator"]>, at = 0.5) {
  await img.scrollIntoViewIfNeeded();
  await expect.poll(() => img.evaluate((i) => (i as HTMLImageElement).naturalWidth), { timeout: 15_000 }).toBeGreaterThan(0);
  const b = (await img.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height * at, { steps: 5 });
}

test("the magnifying glass: photos only, never a film, on Dragon Ball and five other pieces, in their galleries, the creations, the trunks", async ({ page }, info) => {
  const problems = watch(page);
  const pieces = ["kevin-schade-dragon-ball-pendant", "campione-d-italia-2023-2024", "vfb-stuttgart-dfb-pokal-2025", "michy-batshuayi-butterfly-pendant", "the-hand", "deniz-undav-l-pendant"];
  for (const slug of pieces) {
    await open(page, "/pieces/" + slug);
    await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
    // No film under the pointer, anywhere in the opening.
    await expect(page.locator("[data-piece-cover] video")).toHaveCount(0);
    if (!desktop(info.project.name)) continue;
    const lens = page.locator("[data-piece-cover] [data-piece-lens]");
    await hover(page, page.locator("[data-piece-cover] [data-place='0'] img"), 0.55);
    await expect(lens, slug).toHaveAttribute("data-on", "");
    await expect(page.locator("[data-piece-cover] video")).toHaveCount(0);
    if (slug === "kevin-schade-dragon-ball-pendant") {
      // The wheel brings it closer, + and − too, never beyond the pixels of the file.
      const before = Number(await lens.getAttribute("data-zoom"));
      await page.mouse.wheel(0, -300);
      await expect.poll(async () => Number(await lens.getAttribute("data-zoom"))).not.toBe(before);
      await expect(page.locator("[data-piece-cover] [data-loupe-control]")).toBeVisible();
      await page.waitForTimeout(400);
      await page.screenshot({ path: shotPath(info, "yoni2311d-loupe-dragonball") });
      // Its gallery: the same glass over a photo.
      const first = page.locator("[data-every-angle] [data-angle='1'] [data-loupe] img");
      await hover(page, first, 0.5);
      await expect(page.locator("[data-every-angle] [data-piece-lens]")).toHaveAttribute("data-on", "");
      const zoomIn = page.locator("[data-every-angle] [data-loupe-in]");
      await expect(zoomIn).toBeVisible();
      await page.screenshot({ path: shotPath(info, "yoni2311d-loupe-galerie") });
    }
  }
  if (desktop(info.project.name)) {
    // The creations: over the piece itself; + and − never follow the link of the card.
    await open(page, "/creations");
    const card = page.locator("[data-piece-card='kevin-schade-dragon-ball-pendant'] [data-loupe] img");
    await hover(page, card, 0.5);
    await expect(page.locator("[data-creations-grid] ~ [data-piece-lens], [data-piece-lens]").first()).toHaveAttribute("data-on", "");
    await expect(page.locator("main video")).toHaveCount(0);
    await page.screenshot({ path: shotPath(info, "yoni2311d-loupe-creations") });
    await page.locator("[data-loupe-in]").first().click();
    await expect(page).toHaveURL(/\/creations$/);
    // The photos of a trunk.
    await open(page, "/boxes");
    await page.locator("[data-box-photos='sirius']").click();
    await hover(page, page.locator("[data-box-gallery='sirius'] [data-box-photo='0'] img"), 0.5);
    await expect(page.locator("[data-box-gallery='sirius'] [data-piece-lens]")).toHaveAttribute("data-on", "");
  } else {
    // A phone: a touch on the jewel opens it full screen, two fingers to zoom.
    await open(page, "/pieces/kevin-schade-dragon-ball-pendant");
    await page.locator("[data-piece-cover] [data-showcase-slide='0'] button").tap();
    await expect(page.locator("[data-lightbox]")).toBeVisible();
    await expect(page.locator("[data-lightbox] img").first()).toHaveAttribute("src", /\/media\/cutouts\/kevin-schade-dragon-ball-pendant\//);
  }
  expect(problems.errors).toEqual([]);
});

test("the film of the Dragon Ball pendant: on the home page after its opening, at the top of its page; silent in a loop, its sound and full screen", async ({ page }, info) => {
  const problems = watch(page);
  for (const lang of ["", "/fr"]) {
    await open(page, lang + "/");
    const section = page.locator("[data-feature-film='home']");
    // Right after the opening of the home page.
    const order = await page.evaluate(() => ["[data-home-hero]", "[data-feature-film='home']", "[data-special-project]"].map((s) => document.querySelector(s)?.getBoundingClientRect().top ?? -1));
    expect(order[0]!).toBeLessThan(order[1]!);
    expect(order[1]!).toBeLessThan(order[2]!);
    await section.scrollIntoViewIfNeeded();
    const video = section.locator("[data-feature-video]");
    await expect(video).toHaveAttribute("src", new RegExp("^/media/mechanisms/dragon-ball-hero" + (desktop(info.project.name) ? "" : "-mobile") + V + "mp4$"), { timeout: 15_000 });
    await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime), { timeout: 20_000 }).toBeGreaterThan(0.3);
    expect(await video.evaluate((v) => ({ muted: (v as HTMLVideoElement).muted, loop: (v as HTMLVideoElement).loop }))).toEqual({ muted: true, loop: true });
    await expect(section.locator("[data-feature-fullscreen]")).toBeVisible();
    // Its sound at a button.
    await section.locator("[data-feature-sound]").click();
    await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).muted)).toBe(false);
    await section.locator("[data-feature-sound]").click();
    await expect(section).toContainText(lang ? "Mais pour nous, l’énergie n’a jamais été faite pour rester immobile." : "But to us, energy was never meant to remain still.");
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
  // The making-of keeps its place.
  await expect(page.locator("[data-making]")).toBeAttached();
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
  await expect(page.locator("[data-mechanism='cross']")).toContainText("La croix qui tourne");
  expect(problems.errors).toEqual([]);
});

test("the worlds: the sky of the L, the victory of Inter and of VfB (the squad behind the ring), the gothic of the T necklace", async ({ page }, info) => {
  const problems = watch(page);
  const phone = !desktop(info.project.name);
  const backdrop = () => page.locator(".u-backdrop img").first().evaluate((el) => (el as HTMLImageElement).currentSrc);
  const worlds: [string, string, string][] = [
    ["deniz-undav-l-pendant", "ciel", "ciel"],
    ["campione-d-italia-2023-2024", "victoire-nuit", "inter-victoire"],
    ["campione-d-italia-pendant", "victoire-nuit", "inter-victoire"],
    ["vfb-stuttgart-dfb-pokal-2025", "victoire-rouge", "vfb-victoire"],
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
  // Data: their studio photo first in "Every Angle", their worn ones in "Worn by".
  for (const slug of ["kevin-schade-twisted-chain", "radja-nainggolan-iced-watch", "tajon-buchanan-iced-watch", "marcus-thuram-skeleton-watch", "tanguy-nianzou-fam-medallion", "deniz-undav-l-pendant"]) {
    const piece = cat.pieces.find((p) => p.slug === slug)!;
    expect(piece.cover.src, slug).toMatch(new RegExp("^/media/extra/" + slug + "/studio" + V + "webp$"));
    const shown = resolveShowcase(slug, piece.showcase);
    const items = anglePhotos(piece, shown.mode === "photo", wornSet(piece));
    expect(items[0]!.src, slug).toBe(piece.cover.src);
    expect(shown.mode, slug).not.toBe("photo");
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
  // The L on the site: its studio view, in the sky.
  await open(page, "/pieces/deniz-undav-l-pendant");
  await expect(page.locator("[data-piece-cover] [data-showcase-view]").first()).toHaveAttribute("data-showcase-view", "studio");
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
