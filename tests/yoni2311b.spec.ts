// The second feedback of Yoni of 23/11/2026 (WhatsApp: a voice message, 5 videos, 13 screenshots, 29 photos, 1 3D file) and the
// audit of the whole site: one model everywhere. Computer (Chrome 1440), iPhone (WebKit 390), in English and in French.
// Silent (tests/fixtures.ts).
import { expect, test, type Page } from "./fixtures";
import { shotPath, skipIntro, watch } from "./helpers";
import { defaultCatalogue } from "../src/data/catalogue";
import { publicCatalogue } from "../src/data/relations";

const V = "\\.[0-9a-f]{10}\\.";
const desktop = (name: string) => name === "desktop" || name === "safari";
const cat = publicCatalogue(defaultCatalogue);

async function open(page: Page, path: string) {
  await skipIntro(page, { films: false });
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load").catch(() => undefined);
}

test("the circle: every card opens the profile of its person", async ({ page }) => {
  await open(page, "/players");
  const links = await page.locator("[data-player-card] [data-player-link]").evaluateAll((a) => a.map((x) => [x.closest("[data-player-card]")!.getAttribute("data-player-card"), x.getAttribute("href")]));
  expect(links.length).toBe(cat.people.length);
  for (const [slug, href] of links) expect(href, slug!).toBe("/players/" + slug);
});

test("profiles: one model, the known data everywhere, nothing generic, nothing empty", async ({ page }, info) => {
  for (const lang of ["", "/fr"]) {
    for (const person of cat.people) {
      await open(page, lang + "/players/" + person.slug);
      const hero = page.locator("[data-player-hero]");
      await expect(hero.locator("h1")).toBeVisible();
      // The portrait large (or the initials, large, when no photo exists).
      const portrait = hero.locator("[data-player-portrait] > *").first();
      expect((await portrait.boundingBox())!.width, person.slug).toBeGreaterThan(desktop(info.project.name) ? 300 : 280);
      // No generic sentence, no empty block.
      await expect(page.locator("main")).not.toContainText("moments shared on our Instagram");
      await expect(page.locator("main")).not.toContainText("partagés sur notre Instagram");
      await expect(page.locator("[data-player-bio]")).toHaveCount(person.bio ? 1 : 0);
      await expect(page.locator("[data-player-instagram]")).toHaveCount(person.instagram ? 1 : 0);
      if (person.number !== null) await expect(page.locator("[data-player-number]")).toContainText(String(person.number));
    }
    if (lang) break;
  }
  // What was known somewhere is shown everywhere.
  await open(page, "/players/atakan-karazor");
  await expect(page.locator("[data-player-number]")).toContainText("16");
  await open(page, "/players/marcus-thuram");
  await expect(page.locator("[data-player-number]")).toContainText("9");
  await open(page, "/players/angelo-stiller");
  await expect(page.locator("[data-player-portrait] img")).toHaveAttribute("src", /\/media\/players\/angelo-stiller/);
  await page.screenshot({ path: shotPath(info, "yoni2311b-profil-stiller") });
  // The panther pendant on the page of Keita Losene.
  await open(page, "/players/keita-losene");
  await expect(page.locator('[data-player-piece="panther-champion-pendant"]')).toBeVisible();
});

test("the header: the logo as it was and the name of the house, large, always in view", async ({ page }, info) => {
  await open(page, "/fr/creations");
  const logo = page.locator('header a[data-brand] span');
  await expect(logo).toHaveCSS("mask-image", /logo\.svg/);
  const name = page.locator("header [data-wordmark] span");
  expect((await name.boundingBox())!.width).toBeGreaterThan(desktop(info.project.name) ? 300 : 160);
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.waitForTimeout(700);
  await expect(name).toBeInViewport();
  await page.screenshot({ path: shotPath(info, "yoni2311b-entete") });
});

test("home: the sketch becomes the jewel first, then the Butterfly on its chain", async ({ page }, info) => {
  const problems = watch(page);
  await open(page, "/");
  const film = page.locator("[data-scroll-video]");
  await expect(film).toHaveCount(1);
  const [filmTop, heroTop] = await page.evaluate(() => [document.querySelector("[data-scroll-video]")!.getBoundingClientRect().top, document.querySelector("[data-home-hero]")!.getBoundingClientRect().top]);
  expect(filmTop).toBeLessThan(heroTop);
  await expect(page.locator("[data-hero-piece]")).toHaveAttribute("data-hero-photo", "chain");
  await expect(page.locator("[data-hero-piece] img")).toHaveAttribute("src", /\/media\/hd\/michy-batshuayi-butterfly-chain\/p54/);
  await page.screenshot({ path: shotPath(info, "yoni2311b-accueil") });
  await page.locator("[data-home-hero]").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: shotPath(info, "yoni2311b-accueil-hero") });
  expect(problems.errors).toEqual([]);
});

test("the heroes asked by Yoni, and the covers", async ({ page }, info) => {
  const hero = async (slug: string, id: string) => {
    await open(page, "/pieces/" + slug);
    await expect(page.locator("[data-piece-cover] [data-showcase-view]").first()).toHaveAttribute("data-showcase-view", id);
    await expect(page.locator("[data-showcase]")).toHaveAttribute("data-showcase-large", "");
  };
  await hero("michy-batshuayi-butterfly-pendant", "p54");
  await expect(page.locator("[data-angle='1'] img").first()).toHaveAttribute("src", /michy-batshuayi-butterfly-chain\/p54/);
  await hero("marcus-thuram-ruby-t-necklace", "p01");
  await hero("noah-okafor-jersey-pendant", "p20");
  await hero("campione-d-italia-2023-2024", "p08");
  await hero("vfb-stuttgart-dfb-pokal-2025", "p13");
  await open(page, "/pieces/sirius");
  await expect(page.locator("[data-piece-cover] [data-showcase-view]").first()).toHaveAttribute("data-showcase-view", "p28");
  await open(page, "/pieces/marcus-thuram-t-serpent-pendant");
  await expect(page.locator("[data-angle='1'] img").first()).toHaveAttribute("src", /t-serpent-pendant\/p08/);
  await page.screenshot({ path: shotPath(info, "yoni2311b-t-serpent") });
});

test("Dragon Ball: the magnifying glass follows the pointer; the sphere turns while hovered", async ({ page }, info) => {
  await open(page, "/pieces/kevin-schade-dragon-ball-pendant");
  const showcase = page.locator("[data-piece-cover] [data-showcase]");
  await expect(showcase).toBeVisible();
  if (desktop(info.project.name)) {
    const img = page.locator("[data-piece-cover] [data-place='0'] img");
    await expect.poll(() => img.evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const b = (await img.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height * 0.35, { steps: 4 });
    await expect(showcase).toHaveAttribute("data-spinning", "");
    const video = page.locator("[data-piece-cover] [data-place='0'] [data-showcase-spin]");
    await expect(video).toHaveAttribute("src", new RegExp("/media/mechanisms/dragon-ball-spin" + V + "mp4$"));
    await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime), { timeout: 20_000 }).toBeGreaterThan(0.3);
    const lens = page.locator("[data-piece-lens]");
    await page.mouse.move(b.x + b.width / 2 + 10, b.y + b.height * 0.4, { steps: 3 });
    await expect(lens).toHaveAttribute("data-on", "");
    // Never beyond the pixels of the file.
    expect(Number(await lens.getAttribute("data-zoom"))).toBeGreaterThan(1);
    await page.waitForTimeout(500);
    await page.screenshot({ path: shotPath(info, "yoni2311b-dragonball-loupe") });
    await page.mouse.move(5, 300, { steps: 3 });
    await expect(showcase).not.toHaveAttribute("data-spinning", "");
    await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).paused)).toBe(true);
    // The same glass on another piece.
    await open(page, "/pieces/campione-d-italia-2023-2024");
    const ring = page.locator("[data-piece-cover] [data-place='0'] img");
    await expect.poll(() => ring.evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const r = (await ring.boundingBox())!;
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2, { steps: 4 });
    await expect(page.locator("[data-piece-lens]")).toHaveAttribute("data-on", "");
  } else {
    // A touch makes it turn, another one stops it.
    const button = page.locator("[data-piece-cover] [data-showcase-slide='0'] button");
    await button.tap();
    await expect(showcase).toHaveAttribute("data-spinning", "");
    await button.tap();
    await expect(showcase).not.toHaveAttribute("data-spinning", "");
  }
});

test("the Inter pendant, JL in its real photos, every gallery on black with its worn photos apart", async ({ page }, info) => {
  const problems = watch(page);
  await open(page, "/fr/pieces/campione-d-italia-pendant");
  await expect(page.locator("[data-piece-opening] h1")).toContainText("Pendentif Campione");
  await expect(page.locator(".universe")).toHaveAttribute("data-universe", "victoire-nuit");
  await expect(page.locator("[data-worn-by]")).toBeVisible();
  await expect(page.locator('[data-made-for] a[href="/fr/players/inter-milan"]').first()).toBeVisible();
  await page.screenshot({ path: shotPath(info, "yoni2311b-pendentif-inter") });
  await open(page, "/pieces/jamie-leweling-jl-pendant");
  await expect(page.locator("[data-angle='1'] img").first()).toHaveAttribute("src", new RegExp("/media/extra/jamie-leweling-jl-pendant/front" + V));
  await expect(page.locator("main img[src*='studio']")).toHaveCount(0);
  await expect(page.locator("[data-worn-by]")).toBeVisible();
  // Worn photos are out of "Every Angle", in "Worn by".
  for (const slug of ["kenan-yildiz-celebration-pendant", "eljero-elia-clover-medallion", "samuel-ballet-jesus-piece", "tajon-buchanan-iced-watch", "kevin-schade-twisted-chain", "michy-batshuayi-butterfly-pendant"]) {
    await open(page, "/pieces/" + slug);
    await expect(page.locator("[data-worn-by]"), slug).toBeVisible();
    // (Leave each page once its own scripts have loaded: Safari reports an import cut short by leaving as an error.)
    await page.waitForTimeout(1200);
  }
  // The two watches now open on their jewel alone.
  for (const slug of ["marcus-thuram-skeleton-watch", "tajon-buchanan-iced-watch"]) {
    await open(page, "/pieces/" + slug);
    await expect(page.locator("[data-piece-cover] [data-showcase]"), slug).toHaveCount(1);
    await page.waitForTimeout(1200);
  }
  expect(problems.errors).toEqual([]);
});

test("Jesus Pieces, the press, the trunks, the house", async ({ page }, info) => {
  const problems = watch(page);
  await open(page, "/creations/pendants/jesus-pieces");
  await expect(page.locator("main")).toContainText("From the streets of New York to Biggie making it legendary");
  await open(page, "/fr/creations/pendants/jesus-pieces");
  await expect(page.locator("main")).toContainText("Des rues de New York à Biggie");
  // Press: the card opens the article in a new tab; a way to the world of the piece under it.
  await open(page, "/fr/press");
  const card = page.locator("[data-press-card]").first();
  await expect(card.locator("a[data-press-link]")).toHaveAttribute("target", "_blank");
  await expect(card.locator("[data-press-piece]")).toContainText("Découvrir l’univers de la création");
  // The trunks: the Dragon Ball trunk large first, then the selection; the real photos of the Campione case.
  await open(page, "/boxes");
  const hero = page.locator("[data-boxes-hero] img");
  await expect(hero).toHaveAttribute("src", new RegExp("/media/extra/boxes/hero/dragon-ball-closed" + V));
  await page.screenshot({ path: shotPath(info, "yoni2311b-ecrins") });
  // The Campione case waits for its v3 files (off the page of the trunks): its real photos on the page of the ring.
  await open(page, "/pieces/campione-d-italia-2023-2024");
  await expect(page.locator("[data-custom-box='campione-d-italia-case'] [data-box-section-photo]")).toHaveCount(10);
  // The house: the photos of Yoni in his chapters.
  await open(page, "/about");
  await expect(page.locator("[data-house-chapter] img[src*='/media/extra/house/']")).toHaveCount(9);
  await page.locator("[data-house-chapter='9']").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: shotPath(info, "yoni2311b-maison") });
  // The step « imagine your creation » hides where there is no server.
  await open(page, "/contact");
  const imagine = page.locator("#imagine");
  if ((await page.request.get("/api/imagine/status")).status() !== 200) await expect(imagine).toHaveCount(0);
  expect(problems.errors).toEqual([]);
});
