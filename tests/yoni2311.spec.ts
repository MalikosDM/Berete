// The feedback of Yoni (calls of 22–23/11/2026): a calm home page, the whole menu on every computer (Safari too), the name of
// the house, the grid of the creations, capsules without a film at their entrance, the magnifying glass, the galleries
// without descriptive texts, the new worlds, the Bosnia ring, the trunks, the atelier, the journey, the house, the press.
// Computer (Chrome 1440), iPhone (WebKit 390) and Safari on a laptop (WebKit 1280). Silent (tests/fixtures.ts).
import { expect, test, type Page } from "./fixtures";
import { collectionPath, subcategoriesOf, visibleCollections } from "../src/data/collections";
import { defaultCatalogue } from "../src/data/catalogue";
import { RUBY_T_UNIVERSE } from "../src/data/pieces";
import { publicCatalogue } from "../src/data/relations";
import { shotPath, skipIntro, watch } from "./helpers";

const V = "\\.[0-9a-f]{10}\\.";
const desktop = (name: string) => name !== "iphone";

async function open(page: Page, path: string) {
  await skipIntro(page, { films: false });
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load").catch(() => undefined);
}

test("home: calm, one piece, the innovation, the commissions, a balanced selection, the press", async ({ page }, info) => {
  const problems = watch(page);
  await open(page, "/");
  // No bubbles of stories, no film in the background, no universe of a capsule.
  await expect(page.locator("[data-stories-bar], [data-story-bubble]")).toHaveCount(0);
  await expect(page.locator(".universe")).toHaveCount(0);
  // (Since the second call of 23/11/2026: the pencil sketch that becomes the jewel came first; since 24/11/2026 one photo,
  // full screen, still: no film moved by the scroll any more.)
  await expect(page.locator("[data-home-story='house'] video")).toHaveCount(0);
  await expect(page.locator("[data-scroll-video]")).toHaveCount(0);
  await expect(page.locator("[data-home-photo] [data-home-photo-img]")).toBeVisible();
  // One sentence of who Berete is, the hook, two buttons.
  const hero = page.locator("[data-home-story='house']");
  await expect(hero.locator("h1")).toHaveText("We don't begin with what has been done. We begin with what could be.");
  await expect(hero).toContainText("house of bespoke high jewellery");
  // One subject, one way in (24/11/2026): All Creations; since 28/11/2026 The Bespoke Journey (the making of the piece beside
  // it: its sketch, its metal, its setting), All Creations under the selection.
  await expect(hero.locator('a[href="/process"][data-cta]')).toBeVisible();
  await expect(page.locator('[data-home-selection] a[href="/creations"]')).toBeVisible();
  // The Butterfly pendant on its chain, on the black bust, large.
  const jewel = hero.locator("[data-hero-piece] img");
  await expect(jewel).toHaveAttribute("src", /^\/media\/hd\/michy-batshuayi-butterfly-chain\/p54(\.w\d+)?\.webp$/);
  await expect.poll(() => jewel.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const box = (await jewel.boundingBox())!;
  expect(box.height).toBeGreaterThan(desktop(info.project.name) ? 450 : 300);
  await page.screenshot({ path: shotPath(info, "yoni2311-home") });
  // In this order: the photo, the piece, the innovation, the commissions, the selection, the press.
  const order = await page.evaluate(() => ["[data-home-photo]", "[data-home-story='house']", "[data-home-innovation]", "[data-special-ring]", "[data-home-selection]", "[data-home-press]"].map((s) => document.querySelector(s)?.getBoundingClientRect().top ?? -1));
  expect(order.every((y, i) => y >= 0 && (i === 0 || y > order[i - 1]!))).toBe(true);
  // The Dragon Ball: since 24/11/2026 its photo and a circle where only its sphere turns (its film stays on its page), one
  // sentence, its capsule.
  const inno = page.locator("[data-home-innovation]");
  await inno.scrollIntoViewIfNeeded();
  await expect(inno.locator("[data-innovation-link]")).toHaveAttribute("href", "/pieces/kevin-schade-dragon-ball-pendant");
  await expect(inno.locator("[data-feature-film]")).toHaveCount(0);
  await inno.locator("[data-sphere-film]").scrollIntoViewIfNeeded();
  await expect(inno.locator("[data-sphere-film]")).toHaveAttribute("src", new RegExp("^/media/pages/dragon-ball-sphere" + V + "mp4$"), { timeout: 15_000 });
  // The two great commissions.
  await expect(page.locator("[data-special-ring]")).toHaveCount(2);
  // Pendants, chains and rings, not only football.
  const types = await page.locator("[data-home-selection] [data-piece-card]").evaluateAll((cards) => cards.map((c) => c.getAttribute("data-piece-card")));
  expect(types).toEqual(expect.arrayContaining(["the-hand", "butterfly-chain", "oval-eternity-band", "tulips-on-tour-medallion"]));
  // The Safi Link first (24/11/2026).
  expect(types[0]).toBe("the-safi-link");
  // The press: the articles with their link, BILD not yet.
  const outlets = await page.locator("[data-home-press] [data-press-outlet]").evaluateAll((a) => a.map((x) => x.getAttribute("data-press-outlet")));
  expect(outlets).toEqual(["Goal.com Deutschland", "Stuttgarter Nachrichten", "Daily Mail"]);
  await page.locator("[data-home-press]").scrollIntoViewIfNeeded();
  await page.screenshot({ path: shotPath(info, "yoni2311-home-press") });
  expect(problems.errors).toEqual([]);
});

test("menu: the name of the house, the whole menu on a computer, the creations, the press", async ({ page }, info) => {
  await open(page, "/atelier");
  // BERETE JEWELLERS in the letters of the logo, beside the mark.
  // (Since the second call of 23/11/2026: the logo as it was, the name again in the bar; since 24/11/2026 a sharp vector
  // image, smaller, exactly in the middle of the page.)
  const wordmark = page.locator("[data-wordmark] img");
  await expect(wordmark).toBeVisible();
  const mark = (await wordmark.boundingBox())!;
  expect(mark.width).toBeGreaterThan(140);
  expect(Math.abs(mark.x + mark.width / 2 - (await page.evaluate(() => document.documentElement.clientWidth)) / 2)).toBeLessThanOrEqual(2);
  await expect(wordmark).toHaveAttribute("src", new RegExp("wordmark" + V + "svg"));
  const nav = page.locator("[data-desktop-nav]");
  const burger = page.locator('button[aria-controls="mobile-menu"]');
  if (desktop(info.project.name)) {
    // The whole menu (Safari on a laptop too), on one row, the press in it; no menu button.
    await expect(nav).toBeVisible();
    await expect(burger).toBeHidden();
    await expect(nav.locator('a[href="/press"]')).toBeVisible();
    const rows = await nav.locator(":scope > div > a, :scope > a").evaluateAll((links) => new Set(links.map((a) => Math.round(a.getBoundingClientRect().top))).size);
    expect(rows).toBe(1);
    // Under « Creations »: All, Pendants and their categories (Jesus Pieces among them), Chains and theirs, Rings, Watches
    // (the categories since 24/11/2026).
    await nav.locator('a[href="/creations"]').first().hover();
    const menu = page.locator("[data-creations-menu]");
    await expect(menu).toBeVisible();
    const cat = publicCatalogue(defaultCatalogue);
    const hrefs = ["/creations", ...visibleCollections(cat).flatMap(({ collection }) => [collectionPath(collection), ...subcategoriesOf(cat, collection.type).map(collectionPath)])];
    expect(hrefs).toEqual(expect.arrayContaining(["/creations/pendants", "/creations/pendants/jesus-pieces", "/creations/chains", "/creations/rings", "/creations/watches"]));
    expect(await menu.locator("a").evaluateAll((a) => a.map((x) => x.getAttribute("href")))).toEqual(hrefs);
    await page.screenshot({ path: shotPath(info, "yoni2311-menu") });
  } else {
    await expect(nav).toBeHidden();
    await burger.click();
    await expect(page.locator('#mobile-menu a[href="/press"]')).toBeVisible();
    await expect(page.locator('#mobile-menu a[href="/creations/pendants/jesus-pieces"]')).toBeVisible();
  }
});

// (Four by four on a computer since 24/11/2026.)
test("creations: the grid, 4 by 4, the filters and Jesus Pieces", async ({ page }, info) => {
  await open(page, "/creations");
  await expect(page.locator("[data-pieces-view]")).toHaveCount(0);
  const cards = page.locator("[data-creations-grid] > li");
  await expect(cards.first()).toBeVisible();
  const tops = await cards.evaluateAll((li) => li.slice(0, 5).map((x) => Math.round(x.getBoundingClientRect().top)));
  if (desktop(info.project.name)) {
    expect(tops[0]).toBe(tops[1]);
    expect(tops[1]).toBe(tops[2]);
    expect(tops[2]).toBe(tops[3]);
    expect(tops[4]).toBeGreaterThan(tops[0]!);
  }
  await page.locator('[data-filter="pendant"]').click();
  await page.locator('[data-subfilter="jesus-pieces"]').click();
  await expect(cards).toHaveCount(4);
  await page.screenshot({ path: shotPath(info, "yoni2311-creations") });
});

// (24/11/2026: the film of the Inter ring was a 3D render, set to none: no film section on its page.)
test("capsule: the piece at once, no film of a 3D render, the magnifying glass, the gallery without texts, the press", async ({ page }, info) => {
  const problems = watch(page);
  await open(page, "/pieces/campione-d-italia-2023-2024");
  // No film at the entrance.
  await page.waitForTimeout(1500);
  await expect(page.locator("[data-piece-film]")).toHaveCount(0);
  await expect(page.locator("[data-piece-opening] h1")).toBeVisible();
  // The gallery: no text that describes what is seen, a few short captions.
  const angles = page.locator("[data-every-angle]");
  await expect(page.locator("[data-angle-text]")).toHaveCount(0);
  const captions = await angles.locator("[data-angle-title]").allTextContents();
  expect(captions.length).toBeLessThanOrEqual(7);
  for (const c of captions) expect(c.split(/\s+/).length).toBeLessThanOrEqual(6);
  // The magnifying glass: +, −, the photo moved by the mouse or the finger.
  await angles.locator("[data-angle] button").first().click();
  const lb = page.locator("[data-lightbox]");
  await expect(lb).toBeVisible();
  const stage = lb.locator("[data-lightbox-stage]");
  await expect(stage).toHaveAttribute("data-zoom", "1.00");
  await lb.locator("[data-zoom-in]").click();
  await lb.locator("[data-zoom-in]").click();
  await expect.poll(async () => Number(await stage.getAttribute("data-zoom"))).toBeGreaterThan(2.5);
  // The frame of the photo moves (since 24/11/2026 the zoom scales the frame that holds the photo and its loupe copy).
  const img = lb.locator("[data-lightbox-photo]");
  const before = await img.evaluate((el) => (el as HTMLElement).style.transform);
  const s = (await stage.boundingBox())!;
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await page.mouse.down();
  await page.mouse.move(s.x + s.width / 2 + 120, s.y + s.height / 2 + 60, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => img.evaluate((el) => (el as HTMLElement).style.transform)).not.toBe(before);
  await page.screenshot({ path: shotPath(info, "yoni2311-zoom") });
  // − until the whole photo (the button is then off).
  for (let i = 0; i < 6 && (await lb.locator("[data-zoom-out]").isEnabled()); i++) await lb.locator("[data-zoom-out]").click();
  await expect(stage).toHaveAttribute("data-zoom", "1.00");
  await expect(lb.locator("[data-zoom-out]")).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(lb).toHaveCount(0);
  // Its film since 26/11/2026: the final film of Yoni (its 3D render of before never comes back), no "Watch the film".
  await expect(page.locator("[data-feature-video]").first()).toHaveAttribute("poster", /\/yoni-2711\/inter-film\//);
  await expect(page.locator("[data-watch-film]")).toHaveCount(0);
  // Its press: the Daily Mail.
  await expect(page.locator('[data-piece-press] a[href*="dailymail.co.uk"]')).toHaveCount(1);
  expect(problems.errors).toEqual([]);
});

test("capsules: worlds, watermark, Ruby T all black, Dragon Ball, studio photos, the Safi Link", async ({ page }, info) => {
  const phone = !desktop(info.project.name);
  const backdrop = async () => page.locator(".u-backdrop img").first().evaluate((el) => (el as HTMLImageElement).currentSrc);
  // Kenan: its darker stadium (versioned), its piece large.
  await open(page, "/pieces/kenan-yildiz-celebration-pendant");
  await expect.poll(backdrop).toMatch(new RegExp("/media/universes/bianconero-" + (phone ? "m-" : "") + "\\d+" + V + "(avif|webp)$"));
  await expect(page.locator("[data-showcase]")).toHaveAttribute("data-showcase-large", "");
  // The monogram of the house in the depth of the capsule, behind the decor (in place of the name BERETE since 24/11/2026).
  const brand = page.locator(".universe [data-monogram] .monogram-lines");
  await expect(brand).toHaveCount(1);
  expect(await brand.evaluate((el) => Number(getComputedStyle(el).opacity))).toBeLessThan(0.1);
  expect(await page.locator(".universe").getAttribute("aria-hidden")).toBe("true");
  // Noah Okafor: two new worlds.
  await open(page, "/pieces/noah-okafor-jersey-pendant");
  // (Its jersey in The Trophy Room since 27/11/2026, a universe drawn in code: tests/universes2711.spec.ts.)
  await expect(page.locator(".universe")).toHaveAttribute("data-backdrop", "trophy-room");
  await expect(page.locator('[data-worn-with="the-safi-link"]')).toBeVisible();
  // (Yoni's own words since 26/11/2026: « OKA 4 ».)
  await expect(page.locator("main")).toContainText("OKA 4");
  await open(page, "/pieces/the-safi-link");
  await expect(page.locator('[data-worn-with="noah-okafor-jersey-pendant"]')).toBeVisible();
  await open(page, "/pieces/noah-okafor-oka-pendant");
  await expect.poll(backdrop).toContain("/media/universes/okafor-oka-");
  // The T necklace of Marcus Thuram: a very dark gothic since 23/11/2026 (RUBY_T_UNIVERSE: "noir" for all black), its details large.
  await open(page, "/pieces/marcus-thuram-ruby-t-necklace");
  await expect(page.locator(".universe")).toHaveAttribute("data-universe", RUBY_T_UNIVERSE);
  await expect(page.locator("[data-showcase]")).toHaveAttribute("data-showcase", "single");
  await expect(page.locator("[data-showcase-view]").first()).toHaveAttribute("data-showcase-view", "p01");
  await page.screenshot({ path: shotPath(info, "yoni2311-ruby-t") });
  // Dragon Ball: the view with its chain alone and large; its back no longer first; the sphere higher on a phone.
  await open(page, "/pieces/kevin-schade-dragon-ball-pendant");
  await expect(page.locator("[data-showcase]")).toHaveAttribute("data-showcase", "single");
  await expect(page.locator("[data-showcase-view]")).toHaveCount(1);
  await expect(page.locator("[data-showcase-view]").first()).toHaveAttribute("data-showcase-view", "p19");
  const first = await page.locator("[data-angle='1'] img").first().getAttribute("src");
  expect(first).not.toContain("p06");
  // (The blue Genkidama since 26/11/2026 is placed by its own drop above the piece: tests/retours2711b.spec.ts.)
  await page.screenshot({ path: shotPath(info, "yoni2311-dragonball") });
  // The studio image of JL (its real photos). (The images of TM and of the thorned T were AI images: removed on 27/11/2026,
  // never an AI image shown as a piece.)
  for (const slug of ["jamie-leweling-jl-pendant"]) {
    await open(page, "/pieces/" + slug);
    const src = await page.locator("[data-angle='1'] img").first().getAttribute("src");
    // (JL in its real professional photos since the second call of 23/11/2026: its front view.)
    expect(src).toMatch(new RegExp("^/media/extra/" + slug + "/" + (slug === "jamie-leweling-jl-pendant" ? "front" : "studio") + V + "(w\\d+\\.)?webp$"));
  }
});

test("the Bosnia ring, its trunk", async ({ page }, info) => {
  const problems = watch(page);
  await open(page, "/pieces/bosnia-and-herzegovina-world-cup-2026-ring");
  await expect(page.locator("[data-piece-opening] h1")).toHaveText("Bosnia and Herzegovina — World Cup 2026 Ring");
  await expect(page.locator(".universe")).toHaveAttribute("data-universe", "noir");
  await expect(page.locator("main")).toContainText("First World Cup Game");
  await page.locator("[data-angle-more]").click();
  // (25/11/2026: the photos of the whole, the details beside their words, then the others: every photo of the page.)
  await expect(page.locator("[data-angle]")).toHaveCount(17);
  await page.screenshot({ path: shotPath(info, "yoni2311-bosnia") });
  await expect(page.locator('[data-custom-box="world-cup-display"]')).toBeVisible();
  // From its trunk: the way to the piece.
  await open(page, "/boxes");
  // (Its photos first, then, once it is open, the way to its piece: 24/11/2026.)
  await page.emulateMedia({ reducedMotion: "reduce" });
  const cup = page.locator('[data-box="world-cup-display"]');
  await cup.scrollIntoViewIfNeeded();
  await expect(cup.locator("[data-box-photos]")).toBeVisible();
  await cup.locator("[data-trunk-open]").click();
  await expect(page.locator('[data-box-enter="bosnia-and-herzegovina-world-cup-2026-ring"]')).toBeVisible();
  await page.emulateMedia({ reducedMotion: null });
  expect(problems.errors).toEqual([]);
});

test("trunks: the box stays open while its photos are looked at, the magnifying glass, Enter the World", async ({ page }, info) => {
  await open(page, "/boxes");
  const card = page.locator('[data-box="dragon-ball-trunk"]');
  await card.scrollIntoViewIfNeeded();
  const trunk = card.locator(".trunk-reveal");
  await expect(async () => {
    if ((await trunk.getAttribute("data-trunk-state")) === "closed") await card.locator("[data-trunk-open]").click();
    await expect(trunk).toHaveAttribute("data-trunk-state", "open", { timeout: 15_000 });
  }).toPass({ timeout: 45_000 });
  await card.locator("[data-box-photos]").click();
  const lb = page.locator("[data-lightbox]");
  await expect(lb).toBeVisible();
  await lb.locator("[data-zoom-in]").click();
  await expect.poll(async () => Number(await lb.locator("[data-lightbox-stage]").getAttribute("data-zoom"))).toBeGreaterThan(1.5);
  await page.keyboard.press("Escape");
  await expect(lb).toHaveCount(0);
  await expect(trunk).toHaveAttribute("data-trunk-state", "open");
  await expect(card.locator('[data-box-enter="kevin-schade-dragon-ball-pendant"]')).toBeVisible();
  await card.screenshot({ path: shotPath(info, "yoni2311-trunk") });
  // A box whose piece is not known: no way to a piece.
  const other = page.locator('[data-box="brt-coral-case"]');
  await expect(other.locator("[data-box-photos]")).toBeVisible();
  await expect(other.locator("[data-box-enter]")).toHaveCount(0);
});

test("atelier, journey, house, press", async ({ page }, info) => {
  const problems = watch(page);
  await open(page, "/atelier");
  await expect(page.locator("[data-philosophy]")).toContainText("No vision too bold, no detail without purpose.");
  const eng = page.locator("[data-engineering]");
  await eng.scrollIntoViewIfNeeded();
  // The sphere, the top that lifts off, the cross that turns (23/11/2026).
  await expect(eng.locator("[data-mechanism]")).toHaveCount(3);
  await expect(eng.locator("[data-mechanism='sphere'] video")).toHaveAttribute("src", new RegExp("/media/mechanisms/dragon-ball-sphere" + V + "mp4$"));
  await eng.locator("[data-lifting-ring] button").first().click();
  await expect(eng.locator("[data-lifting-ring] button").first()).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: shotPath(info, "yoni2311-atelier") });

  await open(page, "/process");
  // Six steps everywhere since 24/11/2026 (no more journey "in four steps" above them).
  await expect(page.locator("[data-timeline-step]")).toHaveCount(6);
  for (let i = 1; i <= 6; i++) {
    // (Each image loads as it comes near the screen.)
    await page.locator("[data-timeline-step='" + i + "']").scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator("[data-timeline-step='" + i + "'] img").evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await expect(page.locator("[data-journey-time]")).toContainText("around ten weeks");
  await expect(page.locator("[data-journey-order]")).toContainText("How do I order?");
  await page.screenshot({ path: shotPath(info, "yoni2311-journey") });
  await open(page, "/fr/process");
  await expect(page.locator("[data-journey-time]")).toContainText("environ dix semaines");

  await open(page, "/about");
  const chapters = page.locator("[data-house-chapter]");
  await expect(chapters).toHaveCount(12);
  // (24/11/2026: only the photos of Yoni himself, seven chapters.)
  await expect(page.locator("[data-house-chapter] [data-house-photo]")).toHaveCount(7);

  await open(page, "/press");
  const cards = page.locator("[data-press-card]");
  expect(await cards.evaluateAll((c) => c.map((x) => x.getAttribute("data-press-card")))).toEqual(["Goal.com Deutschland", "Stuttgarter Nachrichten", "Daily Mail"]);
  await expect(page.locator("[data-press-card] time")).toHaveCount(3);
  await expect(page.locator("main")).not.toContainText("BILD");
  await page.screenshot({ path: shotPath(info, "yoni2311-press") });
  await open(page, "/pieces/vfb-stuttgart-dfb-pokal-2025");
  await expect(page.locator('[data-piece-press] a[href*="goal.com"]')).toHaveCount(1);
  await expect(page.locator('[data-piece-press] a[href*="stuttgarter-nachrichten.de"]')).toHaveCount(1);
  expect(problems.errors).toEqual([]);
});
