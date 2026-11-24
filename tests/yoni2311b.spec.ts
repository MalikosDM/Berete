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
  // The panther pendant on the page of Losene Keita.
  await open(page, "/players/keita-losene");
  await expect(page.locator('[data-player-piece="panther-champion-pendant"]')).toBeVisible();
});

// (24/11/2026: the logo and the name as sharp vector images, src/components/Logo.tsx; the name smaller, in the middle.)
test("the header: the logo as it was and the name of the house, always in view", async ({ page }, info) => {
  await open(page, "/fr/creations");
  const logo = page.locator("header a[data-brand] img");
  await expect(logo).toHaveAttribute("src", new RegExp("/media/brand/logo-sharp" + V + "svg$"));
  const name = page.locator("header [data-wordmark] img");
  // (Once the page is settled: it may draw its header again when its language has loaded.)
  await expect(name).toBeVisible();
  await expect.poll(async () => (await name.boundingBox())?.width ?? 0).toBeGreaterThan(desktop(info.project.name) ? 180 : 140);
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.waitForTimeout(700);
  await expect(name).toBeInViewport();
  await page.screenshot({ path: shotPath(info, "yoni2311b-entete") });
});

// 24/11/2026 (Yoni): the film of the sketch that becomes the jewel left the home page; one photo, full screen, first.
test("home: one photo full screen first, then the Butterfly on its chain", async ({ page }, info) => {
  const problems = watch(page);
  await open(page, "/");
  await expect(page.locator("[data-scroll-video]")).toHaveCount(0);
  const photo = page.locator("[data-home-photo]");
  await expect(photo).toHaveCount(1);
  const [photoTop, heroTop] = await page.evaluate(() => [document.querySelector("[data-home-photo]")!.getBoundingClientRect().top, document.querySelector("[data-home-story='house']")!.getBoundingClientRect().top]);
  expect(photoTop).toBeLessThan(heroTop);
  await expect(page.locator("[data-hero-piece]")).toHaveAttribute("data-hero-photo", "chain");
  await expect(page.locator("[data-hero-piece] img")).toHaveAttribute("src", /\/media\/hd\/michy-batshuayi-butterfly-chain\/p54/);
  await page.screenshot({ path: shotPath(info, "yoni2311b-accueil") });
  await page.locator("[data-home-story='house']").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: shotPath(info, "yoni2311b-accueil-hero") });
  expect(problems.errors).toEqual([]);
});

test("the heroes asked by Yoni, and the covers", async ({ page }, info) => {
  const hero = async (slug: string, id: string, large = true) => {
    await open(page, "/pieces/" + slug);
    await expect(page.locator("[data-piece-cover] [data-showcase-view]").first()).toHaveAttribute("data-showcase-view", id);
    if (large) await expect(page.locator("[data-showcase]")).toHaveAttribute("data-showcase-large", "");
    else await expect(page.locator("[data-showcase]")).not.toHaveAttribute("data-showcase-large", "");
  };
  await hero("michy-batshuayi-butterfly-pendant", "p54");
  // Every Angle never shows again the photo of the opening (24/11/2026: each photo once on the page).
  await expect(page.locator("[data-every-angle] img[src*='michy-batshuayi-butterfly-chain/p54.']")).toHaveCount(0);
  await hero("marcus-thuram-ruby-t-necklace", "p01");
  await hero("noah-okafor-jersey-pendant", "p20");
  // (The rings of Inter and VfB no longer large since 24/11/2026: their universes v2, the squad on each side.)
  await hero("campione-d-italia-2023-2024", "p08", false);
  await hero("vfb-stuttgart-dfb-pokal-2025", "p13", false);
  await open(page, "/pieces/sirius");
  await expect(page.locator("[data-piece-cover] [data-showcase-view]").first()).toHaveAttribute("data-showcase-view", "p28");
  await open(page, "/pieces/marcus-thuram-t-serpent-pendant");
  // Its cover is p08 (the cards); on its page, each photo once.
  await expect(page.locator("[data-every-angle] img[src*='t-serpent-pendant/p08.']")).toHaveCount(await page.locator("[data-piece-cover] [data-showcase-view='p08']").count() ? 0 : 1);
  await page.screenshot({ path: shotPath(info, "yoni2311b-t-serpent") });
});

// 24/11/2026 (Yoni): no magnifying glass over the page any more (src/components/Loupe.tsx deleted); a click on the piece of
// the opening opens it full screen, where the magnifying glass lives (src/components/Lightbox.tsx).
test("Dragon Ball: a click on the piece opens it full screen with the magnifying glass, photos only", async ({ page }, info) => {
  await open(page, "/pieces/kevin-schade-dragon-ball-pendant");
  const showcase = page.locator("[data-piece-cover] [data-showcase]");
  await expect(showcase).toBeVisible();
  // Never a film in the opening (the sphere turns in its own film, under the opening: tests/yoni2311d.spec.ts).
  await expect(page.locator("[data-piece-cover] video")).toHaveCount(0);
  await expect(page.locator("[data-piece-lens], canvas[data-piece-lens], [data-loupe], [data-loupe-control]")).toHaveCount(0);
  const lb = page.locator("[data-lightbox]");
  if (desktop(info.project.name)) {
    const img = page.locator("[data-piece-cover] [data-place='0'] img");
    await expect.poll(() => img.evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.locator("[data-piece-cover] [data-place='0']").click();
    await expect(lb).toBeVisible();
    await lb.locator("[data-zoom-in]").click();
    await expect.poll(async () => Number(await lb.locator("[data-lightbox-stage]").getAttribute("data-zoom"))).toBeGreaterThan(1);
    await page.waitForTimeout(500);
    await page.screenshot({ path: shotPath(info, "yoni2311b-dragonball-loupe") });
    await page.keyboard.press("Escape");
    await expect(lb).toHaveCount(0);
    // The same on a showcase of several views: the middle of the main view opens it.
    await open(page, "/pieces/campione-d-italia-2023-2024");
    const ring = page.locator("[data-piece-cover] [data-place='0'] img");
    await expect.poll(() => ring.evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const r = (await ring.boundingBox())!;
    await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
    await expect(lb).toBeVisible();
    await expect(lb.locator("[data-zoom-in]")).toBeVisible();
  } else {
    // A touch: the view full screen, where two fingers zoom.
    await page.locator("[data-piece-cover] [data-showcase-slide='0'] button").tap();
    await expect(lb).toBeVisible();
  }
});

test("the Inter pendant, JL in its real photos, every gallery on black with its worn photos apart", async ({ page }, info) => {
  const problems = watch(page);
  // The Inter pendant is the top of the ring, on its page since 24/11/2026 ("Portée en pendentif"), its old address leads there.
  await open(page, "/fr/pieces/campione-d-italia-pendant");
  await expect(page).toHaveURL(/\/fr\/pieces\/campione-d-italia-2023-2024/);
  await expect(page.locator("#worn-as-pendant")).toBeVisible();
  await expect(page.locator("#worn-as-pendant h2")).toHaveText(/Portée en pendentif/i);
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
  await expect(card.locator("[data-press-piece]")).toContainText("Entrer dans l’univers");
  // The trunks: the Dragon Ball trunk large first, then the selection; the real photos of the Campione case.
  await open(page, "/boxes");
  const hero = page.locator("[data-boxes-hero] img");
  await expect(hero).toHaveAttribute("src", new RegExp("/media/extra/boxes/hero/dragon-ball-closed" + V));
  await page.screenshot({ path: shotPath(info, "yoni2311b-ecrins") });
  // The Campione case waits for its v3 files (off the page of the trunks): its real photos on the page of the ring.
  await open(page, "/pieces/campione-d-italia-2023-2024");
  await expect(page.locator("[data-custom-box='campione-d-italia-case'] [data-box-section-photo]")).toHaveCount(10);
  // The house: the photos of Yoni in his chapters (24/11/2026: five of his WhatsApp photos, none of a jewel).
  await open(page, "/about");
  await expect(page.locator("[data-house-chapter] img[src*='/media/extra/house/']")).toHaveCount(5);
  await page.locator("[data-house-chapter='9']").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: shotPath(info, "yoni2311b-maison") });
  // The step « imagine your creation » hides where there is no server.
  await open(page, "/contact");
  const imagine = page.locator("#imagine");
  if ((await page.request.get("/api/imagine/status")).status() !== 200) await expect(imagine).toHaveCount(0);
  expect(problems.errors).toEqual([]);
});
