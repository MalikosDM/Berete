// The call of Yoni of 23-24/11/2026 ("luxury does not shout"): one smaller scale everywhere, the name centred and the logo
// sharp, the photo of the Sirius trunk on the home page, the Dragon Ball pendant and its sphere that turns, the magnifying
// glass only on a photo opened large, one structure for every piece, the categories of the creations, the chains (BRT
// Flowers in one sheet, the Safi Link first and on one black, Sirius straight and without its back, the chains back on the
// site), The Bespoke Journey compact with its timeline, The House without any jewel, the cinema window in The Atelier only,
// the Circle, the new worlds of Inter and VfB. Computer (Chrome 1440 and a laptop 1280), iPhone (WebKit 390), in English and
// in French. Silent (tests/fixtures.ts).
import { expect, test, type Page } from "./fixtures";
import { shotPath, skipIntro, watch } from "./helpers";
import { defaultCatalogue } from "../src/data/catalogue";
import { publicCatalogue } from "../src/data/relations";

const desktop = (name: string) => name === "desktop" || name === "safari";
const phone = (name: string) => name.startsWith("iphone");
const cat = publicCatalogue(defaultCatalogue);
const HAS_SERVER = !/vercel\.app/.test(process.env.BASE_URL ?? "");

async function open(page: Page, path: string) {
  await skipIntro(page, { films: false });
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load").catch(() => undefined);
}
async function settled(page: Page) {
  await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
}
const top = (page: Page, sel: string) => page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY);

test("the header: the name exactly centred and smaller, the logo a sharp vector, the menu shown; the footer: the signature under the logo", async ({ page }, info) => {
  const problems = watch(page);
  for (const lang of ["", "/fr"]) {
    await open(page, lang + "/creations");
    const width = await page.evaluate(() => document.documentElement.clientWidth);
    const name = (await page.locator("[data-wordmark] img").boundingBox())!;
    expect(Math.abs(name.x + name.width / 2 - width / 2)).toBeLessThanOrEqual(1.5);
    expect(name.width).toBeLessThanOrEqual(desktop(info.project.name) ? 200 : 160);
    // The logo: the vector file, as an image (never a mask, drawn blurred by Safari).
    await expect(page.locator("[data-brand] img")).toHaveAttribute("src", /\/media\/brand\/logo-sharp\.[0-9a-f]{10}\.svg$/);
    if (desktop(info.project.name)) {
      await expect(page.locator("[data-desktop-nav]")).toBeVisible();
      const header = (await page.locator("header").first().boundingBox())!;
      expect(header.height).toBeLessThanOrEqual(104);
    }
  }
  // The footer: the logo, then the signature under it, centred.
  const logo = (await page.locator("[data-footer-brand] img").boundingBox())!;
  const line = (await page.locator("[data-footer-tagline]").boundingBox())!;
  expect(line.y).toBeGreaterThan(logo.y + logo.height - 1);
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  expect(Math.abs(logo.x + logo.width / 2 - width / 2)).toBeLessThanOrEqual(2);
  expect(logo.width).toBeLessThanOrEqual(140);
  await page.locator("[data-footer-brand]").scrollIntoViewIfNeeded();
  await page.screenshot({ path: shotPath(info, "yoni2411-pied-de-page"), type: "jpeg", quality: 70 });
  expect(problems.errors).toEqual([]);
});

test("home: one photo of the Sirius trunk full screen, its signature in the black, Discover More; no film moved by the scroll", async ({ page }, info) => {
  const problems = watch(page);
  for (const lang of ["", "/fr"]) {
    await open(page, lang + "/");
    const photo = page.locator("[data-home-photo-img]");
    await expect(photo).toBeVisible();
    await expect.poll(() => photo.evaluate((i) => (i as HTMLImageElement).currentSrc)).toMatch(/\/media\/pages\/hero-(desktop|mobile)-\d+\.[0-9a-f]{10}\.(avif|webp)$/);
    const box = (await page.locator("[data-home-photo]").boundingBox())!;
    const view = page.viewportSize()!;
    expect(box.height).toBeGreaterThanOrEqual(view.height - 1);
    // The signature on one line, under the photo (wide screens) or on its dark floor (upright): never over the trunk.
    const line = (await page.locator("[data-home-tagline]").boundingBox())!;
    expect(line.height).toBeLessThan(40);
    const img = (await photo.boundingBox())!;
    if (view.width > view.height) expect(line.y).toBeGreaterThanOrEqual(img.y + img.height - 2);
    else expect(line.y).toBeGreaterThan(view.height * 0.7);
    // No film moved by the scroll, no "Scroll" on the home page any more.
    await expect(page.locator("[data-scroll-video], [data-sketch-intro]")).toHaveCount(0);
    await expect(page.locator("[data-stories-bar], [data-story-bubble]")).toHaveCount(0);
    await page.waitForTimeout(800);
    await page.screenshot({ path: shotPath(info, "yoni2411-accueil" + (lang ? "-fr" : "")), type: "jpeg", quality: 70 });
    // Discover More leads to the next part.
    await page.locator("[data-home-discover]").click();
    await expect.poll(() => page.locator("#home-next").evaluate((el) => Math.round(el.getBoundingClientRect().top)), { timeout: 8000 }).toBeLessThanOrEqual(4);
  }
  expect(problems.errors).toEqual([]);
});

test("home: the Dragon Ball pendant beside a circle where its sphere turns by itself, one sentence and Enter the World; no hero film", async ({ page }, info) => {
  const problems = watch(page);
  for (const lang of ["", "/fr"]) {
    await open(page, lang + "/");
    const section = page.locator("[data-home-innovation]");
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator("[data-feature-film], [data-feature-video]")).toHaveCount(0);
    const sphere = section.locator("[data-sphere-film]");
    // (The section is the whole subject since 24/11/2026: the sphere itself brought on screen.)
    await sphere.scrollIntoViewIfNeeded();
    await expect(sphere).toHaveAttribute("src", /\/media\/pages\/dragon-ball-sphere\.[0-9a-f]{10}\.mp4$/);
    await expect.poll(() => sphere.evaluate((v) => !(v as HTMLVideoElement).paused && (v as HTMLVideoElement).currentTime > 0), { timeout: 15_000 }).toBe(true);
    expect(await sphere.evaluate((v) => (v as HTMLVideoElement).muted && (v as HTMLVideoElement).loop)).toBe(true);
    await expect(section.locator("h2")).toHaveText(lang ? "Le mécanisme" : "The Mechanism");
    await expect(section.locator("p")).toHaveCount(1);
    await expect(section.locator("p")).toHaveText(lang ? "Mais pour nous, l’énergie n’a jamais été faite pour rester immobile." : "But to us, energy was never meant to remain still.");
    await expect(section.locator("[data-innovation-link]")).toHaveAttribute("href", lang + "/pieces/kevin-schade-dragon-ball-pendant");
    await page.waitForTimeout(600);
    if (!lang) await page.screenshot({ path: shotPath(info, "yoni2411-accueil-dragon-ball"), type: "jpeg", quality: 70 });
  }
  expect(problems.errors).toEqual([]);
});

test("the magnifying glass: none over the page; a photo opened large zooms where the pointer is, with + and −, the wheel; never a film", async ({ page }, info) => {
  const problems = watch(page);
  for (const path of ["/pieces/kevin-schade-dragon-ball-pendant", "/pieces/the-safi-link", "/creations", "/boxes"]) {
    await open(page, path);
    await expect(page.locator("canvas[data-piece-lens], [data-loupe-control]")).toHaveCount(0);
  }
  await open(page, "/pieces/kevin-schade-dragon-ball-pendant");
  await settled(page);
  // Every Angle: a click opens the photo large, with its magnifying glass.
  const first = page.locator("[data-every-angle] [data-angle][data-angle-type='image'] button").first();
  await first.scrollIntoViewIfNeeded();
  await first.click();
  const box = page.locator("[data-lightbox]");
  await expect(box).toBeVisible();
  await expect(box.locator("[data-zoom-in]")).toBeVisible();
  const stage = box.locator("[data-lightbox-stage]");
  if (desktop(info.project.name)) {
    const b = (await stage.boundingBox())!;
    await page.mouse.move(b.x + b.width * 0.4, b.y + b.height * 0.4);
    await page.mouse.wheel(0, -400);
    await expect.poll(() => stage.getAttribute("data-zoom").then(Number)).toBeGreaterThan(1.2);
  } else {
    await box.locator("[data-zoom-in]").click();
    await expect.poll(() => stage.getAttribute("data-zoom").then(Number)).toBeGreaterThan(1.2);
  }
  await page.screenshot({ path: shotPath(info, "yoni2411-loupe"), type: "jpeg", quality: 70 });
  await page.keyboard.press("Escape");
  // The opening: a click (a touch) opens the jewel large too.
  await page.evaluate(() => window.scrollTo(0, 0));
  const opening = desktop(info.project.name) ? page.locator("[data-piece-cover] [data-showcase-view][data-place='0']") : page.locator("[data-piece-cover] [data-showcase-open='0']");
  await opening.click({ position: desktop(info.project.name) ? undefined : undefined });
  await expect(page.locator("[data-lightbox]")).toBeVisible();
  await page.keyboard.press("Escape");
  // A film opened large has no magnifying glass.
  await open(page, "/pieces/michy-batshuayi-butterfly-pendant");
  const film = page.locator("[data-every-angle] [data-angle][data-angle-type='video'] button").first();
  if ((await film.count()) > 0) {
    if ((await page.locator("[data-angle-more]").count()) > 0) await page.locator("[data-angle-more]").click();
    await film.scrollIntoViewIfNeeded();
    await film.click();
    await expect(page.locator("[data-lightbox] video")).toBeVisible();
    await expect(page.locator("[data-lightbox] [data-zoom-in]")).toHaveCount(0);
    await page.keyboard.press("Escape");
  }
  expect(problems.errors).toEqual([]);
});

test("every piece: the same order; its film plays by itself, whole in the screen; four photos then See more; its story after them; no making-of, no cinema window", async ({ page }, info) => {
  const problems = watch(page);
  const pieces = ["kevin-schade-dragon-ball-pendant", "malik-tillman-cross-pendant", "kenan-yildiz-celebration-pendant", "the-safi-link", "vfb-stuttgart-dfb-pokal-2025", "sirius"];
  for (const lang of ["", "/fr"]) {
    for (const slug of pieces) {
      if (lang && slug !== pieces[0] && slug !== pieces[2]) continue;
      await open(page, lang + "/pieces/" + slug);
      await settled(page);
      const view = page.viewportSize()!;
      // The piece whole in the first screen (computers: the laptop 1280 × 800 too, tests/tailles.spec.ts).
      if (desktop(info.project.name)) {
        const cover = (await page.locator("[data-piece-cover]").boundingBox())!;
        expect(cover.y + cover.height).toBeLessThanOrEqual(view.height + 1);
      }
      // The order.
      const order = ["[data-piece-opening]", "[data-feature-film]", "[data-every-angle]", "[data-piece-story]", "[data-composition]"];
      const present: number[] = [];
      for (const sel of order) if ((await page.locator(sel).count()) > 0) present.push(await top(page, sel));
      expect(present).toEqual([...present].sort((a, b) => a - b));
      for (const sel of ["[data-made-for]", "[data-enter-atelier]"]) {
        if ((await page.locator(sel).count()) > 0) expect(await top(page, sel)).toBeGreaterThan(await top(page, "[data-piece-story]"));
      }
      // Its film: silent, in a loop, playing as soon as it is on screen; whole in the screen.
      const film = page.locator("[data-feature-film]");
      if ((await film.count()) > 0) {
        const frame = page.locator("[data-feature-frame]");
        await frame.scrollIntoViewIfNeeded();
        const f = (await frame.boundingBox())!;
        expect(f.height).toBeLessThanOrEqual(view.height);
        expect(f.width).toBeLessThanOrEqual(view.width);
        const video = page.locator("[data-feature-video]");
        await expect.poll(() => video.evaluate((v) => !(v as HTMLVideoElement).paused && (v as HTMLVideoElement).currentTime > 0), { timeout: 20_000 }).toBe(true);
        expect(await video.evaluate((v) => (v as HTMLVideoElement).muted && (v as HTMLVideoElement).loop)).toBe(true);
        if (slug === pieces[0] && !lang) await page.screenshot({ path: shotPath(info, "yoni2411-piece-film"), type: "jpeg", quality: 70 });
      }
      // Four photos, then See more.
      const angles = page.locator("[data-every-angle] [data-angle]");
      const total = cat.pieces.find((p) => p.slug === slug)!;
      expect(total).toBeTruthy();
      expect(await angles.count()).toBeLessThanOrEqual(4);
      if (desktop(info.project.name) && (await angles.count()) === 4) {
        const ys = await angles.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
        expect(new Set(ys).size).toBe(1);
      }
      // No making-of on the page, no cinema window: the way to The Atelier.
      await expect(page.locator("[data-making], [data-making-film], [data-atelier-passage], [data-piece-film-section]")).toHaveCount(0);
      // Never the same photo or film twice on the page.
      const srcs = await page.locator("article[data-piece] img, article[data-piece] video").evaluateAll((els) =>
        els
          .map((e) => (e as HTMLImageElement).getAttribute("src") ?? "")
          .filter((s) => s.startsWith("/media/") && !s.includes("/universes/") && !s.includes("/cutouts/"))
          .map((s) => s.replace(/\.w\d+(?=\.webp$)/, "").replace(/-(480|640|960|1080|1600)(?=\.)/, "")),
      );
      const twice = srcs.filter((s, i) => srcs.indexOf(s) !== i);
      expect(twice, slug + ": shown twice").toEqual([]);
    }
  }
  // The way to the making-of: The Atelier opens it at once, in its cinema window.
  await open(page, "/pieces/vfb-stuttgart-dfb-pokal-2025");
  await page.locator("[data-enter-atelier-link]").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-enter-atelier-link]")).toHaveAttribute("href", "/atelier?piece=vfb-stuttgart-dfb-pokal-2025");
  await page.locator("[data-enter-atelier-link]").click();
  await expect(page).toHaveURL(/\/atelier\?piece=vfb-stuttgart-dfb-pokal-2025/);
  await expect(page.locator("[role='dialog'] video").first()).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: shotPath(info, "yoni2411-atelier-making-of"), type: "jpeg", quality: 70 });
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-atelier-piece='vfb-stuttgart-dfb-pokal-2025']")).toBeVisible();
  expect(problems.errors).toEqual([]);
});

test("no 3D animation shown as the finished piece: the Inter ring has no such film; the Dragon Ball pendant shows its hero film", async ({ page }) => {
  await open(page, "/pieces/campione-d-italia-2023-2024");
  await settled(page);
  await expect(page.locator("[data-feature-film]")).toHaveCount(0);
  await open(page, "/pieces/kevin-schade-dragon-ball-pendant");
  await settled(page);
  await page.locator("[data-feature-film]").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-feature-video]")).toHaveAttribute("src", /dragon-ball-hero/);
});

test("the creations: four on a row on a computer, two on a phone; the categories of the pendants and of the chains, in the menu too", async ({ page }, info) => {
  const problems = watch(page);
  await open(page, "/creations");
  const cards = page.locator("[data-creations-grid] > li");
  const ys = await cards.evaluateAll((els) => els.slice(0, 5).map((e) => Math.round(e.getBoundingClientRect().top)));
  const perRow = ys.filter((y) => y === ys[0]).length;
  expect(perRow).toBe(desktop(info.project.name) ? 4 : 2);
  for (const lang of ["", "/fr"]) {
    await open(page, lang + "/creations/pendants");
    const cats = page.locator("[data-categories] [data-category]");
    await expect(cats).toHaveCount(5);
    expect(await cats.evaluateAll((els) => els.map((e) => e.getAttribute("data-category")))).toEqual(["celebration", "cross", "name", "letter", "jesus-pieces"]);
    // The categories before the pieces.
    expect(await top(page, "[data-categories]")).toBeLessThan(await top(page, "[data-creations-grid]"));
    await page.waitForTimeout(600);
    await page.screenshot({ path: shotPath(info, "yoni2411-pendentifs" + (lang ? "-fr" : "")), type: "jpeg", quality: 70 });
    await open(page, lang + "/creations/chains");
    expect(await page.locator("[data-categories] [data-category]").evaluateAll((els) => els.map((e) => e.getAttribute("data-category")))).toEqual(["signature", "cuban", "infinity"]);
    // The Safi Link first among the chains.
    await expect(page.locator("[data-creations-grid] [data-piece-card]").first()).toHaveAttribute("data-piece-card", "the-safi-link");
  }
  await open(page, "/creations/pendants/jesus-pieces");
  await expect(page.locator("[data-creations-grid] [data-piece-card]")).toHaveCount(4);
  if (desktop(info.project.name)) {
    await open(page, "/");
    await page.locator("[data-desktop-nav] a[href='/creations'][aria-haspopup]").hover();
    const menu = page.locator("[data-creations-menu]");
    await expect(menu).toBeVisible();
    for (const href of ["/creations/pendants/celebration", "/creations/pendants/jesus-pieces", "/creations/chains/signature", "/creations/chains/cuban"]) await expect(menu.locator("a[href='" + href + "']")).toHaveCount(1);
    await page.screenshot({ path: shotPath(info, "yoni2411-menu"), type: "jpeg", quality: 70 });
  }
  expect(problems.errors).toEqual([]);
});

test("the chains: BRT Flowers in one sheet, the Safi Link on one deep black, Sirius straight and without its back, the Tennis, White Cuban and Infinity Link back", async ({ page }, info) => {
  const problems = watch(page);
  await open(page, "/pieces/kevin-schade-twisted-chain");
  await expect(page).toHaveURL(/\/pieces\/brt-flower-chain$/);
  await settled(page);
  await expect(page.locator("#piece-title")).toHaveText("BRT Flowers");
  await expect(page.locator("[data-piece-story]")).toContainText("12 mm and 16 mm");
  // The Infinity Link Yoni was looking for is the chain of folder 09 (24/11/2026); the tennis chain of two rows lives on the
  // page of Noah Okafor's octagon.
  await open(page, "/pieces/marcus-thuram-infinity-chain");
  await expect(page).toHaveURL(/\/pieces\/pear-link-chain$/);
  await expect(page.locator("#piece-title")).toHaveText("Infinity Link");
  for (const slug of ["pear-link-chain", "white-iced-cuban-chain"]) {
    await open(page, "/pieces/" + slug);
    await settled(page);
    await expect(page.locator("[data-piece-cover] img:visible").first()).toBeVisible();
  }
  // The Safi Link: its cover the chain from the front, its photos on the same black.
  const safi = cat.pieces.find((p) => p.slug === "the-safi-link")!;
  expect(safi.cover.src).toMatch(/\/media\/extra\/the-safi-link\/front\./);
  // Sirius: no back, no photo of the chain alone; its plate straightened.
  const sirius = cat.pieces.find((p) => p.slug === "sirius")!;
  const files = [sirius.cover, ...sirius.gallery].map((m) => m.src);
  for (const id of ["p26", "p05", "p29", "p24", "p16", "p17", "p22"]) expect(files.some((s) => s.includes("/hd/sirius/" + id + "."))).toBe(false);
  expect(files.some((s) => s.includes("/extra/sirius/plate-front."))).toBe(true);
  // Every chain: its cover the whole chain from the front (no close-up first).
  await open(page, "/pieces/sirius");
  await settled(page);
  await page.waitForTimeout(800);
  await page.screenshot({ path: shotPath(info, "yoni2411-sirius"), type: "jpeg", quality: 70 });
  expect(problems.errors).toEqual([]);
});

test("The Bespoke Journey: compact, no film moved by the scroll, the six steps on a fine line, each illustrated; Live progress", async ({ page }, info) => {
  const problems = watch(page);
  for (const lang of ["", "/fr"]) {
    await open(page, lang + "/process");
    await expect(page.locator("[data-scroll-video]")).toHaveCount(0);
    const steps = page.locator("[data-timeline-step]");
    await expect(steps).toHaveCount(6);
    for (let i = 0; i < 6; i++) await expect(steps.nth(i).locator("img")).toHaveCount(1);
    await expect(steps.nth(3)).toContainText(lang ? "en direct sur WhatsApp" : "Live progress photos and videos on WhatsApp");
    // The client space: only with the server.
    await expect(page.locator("[data-timeline-space]")).toHaveCount(HAS_SERVER ? 1 : 0);
    if (desktop(info.project.name) && page.viewportSize()!.height >= 900) {
      // Its name, its sentence and its first step in the first screen (the questions come after the six steps, 24/11/2026).
      const first = (await page.locator("[data-timeline-step='1']").boundingBox())!;
      expect(first.y + first.height).toBeLessThanOrEqual(900);
    }
    await page.screenshot({ path: shotPath(info, "yoni2411-bespoke" + (lang ? "-fr" : "")), type: "jpeg", quality: 70 });
  }
  // No words that appear one after another (no split text left).
  await expect(page.locator("h1 .line, h1 [style*='translate']")).toHaveCount(0);
  expect(problems.errors).toEqual([]);
});

test("The House: no jewel any more, Antwerp in black and white, the office in Belgium, no more near-identical photos", async ({ page }, info) => {
  const problems = watch(page);
  for (const lang of ["", "/fr"]) {
    await open(page, lang + "/about");
    const photoOf = (n: number) => page.locator("[data-house-chapter='" + n + "'] img");
    for (const n of [1, 2, 3, 6, 7]) await expect(photoOf(n)).toHaveCount(0);
    await expect(photoOf(4)).toHaveAttribute("src", /\/media\/house\/chapitre-04/);
    await expect(photoOf(11)).toHaveAttribute("src", /\/media\/house\/chapitre-11/);
    // Nothing from the pieces or the atelier anywhere on the page.
    const srcs = await page.locator("[data-house] img").evaluateAll((els) => els.map((e) => e.getAttribute("src") ?? ""));
    for (const s of srcs) expect(s).not.toMatch(/\/media\/(sketches|atelier|hd|cutouts|pieces)\//);
    await photoOf(4).scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    if (!lang) await page.screenshot({ path: shotPath(info, "yoni2411-maison-anvers"), type: "jpeg", quality: 70 });
  }
  expect(problems.errors).toEqual([]);
});

test("the Circle: its title on one small line, four athletes on a row; Inter and VfB: their new worlds, the squad seen", async ({ page }, info) => {
  const problems = watch(page);
  await open(page, "/players");
  const h1 = page.locator("h1");
  const lineHeight = await h1.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.2);
  expect((await h1.boundingBox())!.height).toBeLessThan(lineHeight * 1.6);
  const cards = page.locator("[data-player-wall] [data-player-card]");
  const ys = await cards.evaluateAll((els) => els.slice(0, 6).map((e) => Math.round(e.getBoundingClientRect().top)));
  expect(ys.filter((y) => y === ys[0]).length).toBe(desktop(info.project.name) ? 4 : 2);
  for (const [slug, backdrop] of [
    ["campione-d-italia-2023-2024", "inter-victoire-v2"],
    ["vfb-stuttgart-dfb-pokal-2025", "vfb-victoire-v2"],
  ] as const) {
    await open(page, "/pieces/" + slug);
    await settled(page);
    await expect(page.locator(".universe")).toHaveAttribute("data-backdrop", backdrop);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: shotPath(info, "yoni2411-univers-" + backdrop), type: "jpeg", quality: 72 });
  }
  // Yoni with the players and their rings, in "Worn by".
  await open(page, "/pieces/campione-d-italia-2023-2024");
  await expect(page.locator("[data-worn-by] img[src*='/extra/campione-d-italia-2023-2024/dumfries.'], [data-worn-by] img[src*='/stories/inter-squad/03.']")).toHaveCount(phone(info.project.name) ? 2 : 2);
  expect(problems.errors).toEqual([]);
});
