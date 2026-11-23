// The feedback of Yoni (calls of 22–23/11/2026): a calm home page, the whole menu on every computer (Safari too), the name of
// the house, the grid of the creations, capsules without a film at their entrance, the magnifying glass, the galleries
// without descriptive texts, the new worlds, the Bosnia ring, the trunks, the atelier, the journey, the house, the press.
// Computer (Chrome 1440), iPhone (WebKit 390) and Safari on a laptop (WebKit 1280). Silent (tests/fixtures.ts).
import { expect, test, type Page } from "./fixtures";
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
  // (Since the second call of 23/11/2026: the pencil sketch that becomes the jewel comes first, moved by the scroll only.)
  await expect(page.locator("[data-home-hero] video")).toHaveCount(0);
  await expect(page.locator("[data-scroll-video]")).toHaveCount(1);
  // One sentence of who Berete is, the hook, two buttons.
  const hero = page.locator("[data-home-hero]");
  await expect(hero.locator("h1")).toHaveText("We don't begin with what has been done. We begin with what could be.");
  await expect(hero).toContainText("house of bespoke high jewellery");
  await expect(hero.locator('a[href="/contact"]')).toBeVisible();
  await expect(hero.locator('a[href="/creations"]')).toBeVisible();
  // The Butterfly pendant on its chain, on the black bust, large.
  const jewel = hero.locator("[data-hero-piece] img");
  await expect(jewel).toHaveAttribute("src", /^\/media\/hd\/michy-batshuayi-butterfly-chain\/p54(\.w\d+)?\.webp$/);
  await expect.poll(() => jewel.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const box = (await jewel.boundingBox())!;
  expect(box.height).toBeGreaterThan(desktop(info.project.name) ? 450 : 300);
  await page.screenshot({ path: shotPath(info, "yoni2311-home") });
  // In this order: the innovation, the commissions, the selection, the press.
  const order = await page.evaluate(() => ["[data-scroll-video]", "[data-home-hero]", "[data-home-innovation]", "[data-special-project]", "[data-home-selection]", "[data-home-press]"].map((s) => document.querySelector(s)?.getBoundingClientRect().top ?? -1));
  expect(order.every((y, i) => y >= 0 && (i === 0 || y > order[i - 1]!))).toBe(true);
  // The Dragon Ball: its sphere turns at a click (never by itself), its capsule.
  const inno = page.locator("[data-home-innovation]");
  await inno.scrollIntoViewIfNeeded();
  await expect(inno.locator('a[href="/pieces/kevin-schade-dragon-ball-pendant"]')).toBeVisible();
  const film = inno.locator("[data-sphere-film]");
  expect(await film.getAttribute("src")).toBeNull();
  await inno.locator("[data-sphere-play]").click();
  await expect(film).toHaveAttribute("src", new RegExp("^/media/mechanisms/dragon-ball-sphere" + V + "mp4$"));
  await expect.poll(() => film.evaluate((v) => (v as HTMLVideoElement).currentTime), { timeout: 20_000 }).toBeGreaterThan(0.2);
  // The two great commissions.
  await expect(page.locator("[data-special-ring]")).toHaveCount(2);
  // Pendants, chains and rings, not only football.
  const types = await page.locator("[data-home-selection] [data-piece-card]").evaluateAll((cards) => cards.map((c) => c.getAttribute("data-piece-card")));
  expect(types).toEqual(expect.arrayContaining(["the-hand", "butterfly-chain", "oval-eternity-band", "tulips-on-tour-medallion"]));
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
  // (Since the second call of 23/11/2026: the logo as it was, the name again, large, in the middle of the bar.)
  const wordmark = page.locator("[data-wordmark] span");
  await expect(wordmark).toBeVisible();
  expect((await wordmark.boundingBox())!.width).toBeGreaterThan(150);
  expect(await wordmark.evaluate((el) => getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage)).toMatch(new RegExp("wordmark" + V + "svg"));
  const nav = page.locator("[data-desktop-nav]");
  const burger = page.locator('button[aria-controls="mobile-menu"]');
  if (desktop(info.project.name)) {
    // The whole menu (Safari on a laptop too), on one row, the press in it; no menu button.
    await expect(nav).toBeVisible();
    await expect(burger).toBeHidden();
    await expect(nav.locator('a[href="/press"]')).toBeVisible();
    const rows = await nav.locator(":scope > div > a, :scope > a").evaluateAll((links) => new Set(links.map((a) => Math.round(a.getBoundingClientRect().top))).size);
    expect(rows).toBe(1);
    // Under « Creations »: All, Pendants (and Jesus Pieces), Chains, Rings, Watches.
    await nav.locator('a[href="/creations"]').first().hover();
    const menu = page.locator("[data-creations-menu]");
    await expect(menu).toBeVisible();
    expect(await menu.locator("a").evaluateAll((a) => a.map((x) => x.getAttribute("href")))).toEqual([
      "/creations",
      "/creations/pendants",
      "/creations/pendants/jesus-pieces",
      "/creations/chains",
      "/creations/rings",
      "/creations/watches",
    ]);
    await page.screenshot({ path: shotPath(info, "yoni2311-menu") });
  } else {
    await expect(nav).toBeHidden();
    await burger.click();
    await expect(page.locator('#mobile-menu a[href="/press"]')).toBeVisible();
    await expect(page.locator('#mobile-menu a[href="/creations/pendants/jesus-pieces"]')).toBeVisible();
  }
});

test("creations: the grid, 3 by 3, the filters and Jesus Pieces", async ({ page }, info) => {
  await open(page, "/creations");
  await expect(page.locator("[data-pieces-view]")).toHaveCount(0);
  const cards = page.locator("[data-creations-grid] > li");
  await expect(cards.first()).toBeVisible();
  const tops = await cards.evaluateAll((li) => li.slice(0, 4).map((x) => Math.round(x.getBoundingClientRect().top)));
  if (desktop(info.project.name)) {
    expect(tops[0]).toBe(tops[1]);
    expect(tops[1]).toBe(tops[2]);
    expect(tops[3]).toBeGreaterThan(tops[0]!);
  }
  await page.locator('[data-filter="pendant"]').click();
  await page.locator('[data-subfilter="jesus-pieces"]').click();
  await expect(cards).toHaveCount(4);
  await page.screenshot({ path: shotPath(info, "yoni2311-creations") });
});

test("capsule: the piece at once, its film lower, the magnifying glass, the gallery without texts, the press", async ({ page }, info) => {
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
  const img = lb.locator("[data-lightbox-image]");
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
  // Its film, in its own section, full screen at a click.
  const section = page.locator("[data-piece-film-section]");
  await section.scrollIntoViewIfNeeded();
  await section.locator("[data-watch-film-section]").click();
  await expect(page.locator("[data-piece-film]")).toBeVisible();
  await page.keyboard.press("Escape");
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
  // The name of the house in the depth of the capsule, behind the decor.
  const brand = page.locator(".universe .u-brand");
  await expect(brand).toHaveCount(1);
  expect(await brand.evaluate((el) => Number(getComputedStyle(el).opacity))).toBeLessThan(0.1);
  expect(await page.locator(".universe").getAttribute("aria-hidden")).toBe("true");
  // Noah Okafor: two new worlds.
  await open(page, "/pieces/noah-okafor-jersey-pendant");
  await expect.poll(backdrop).toContain("/media/universes/okafor-jersey-");
  await expect(page.locator('[data-worn-with="the-safi-link"]')).toBeVisible();
  await expect(page.locator("main")).toContainText("Oka4");
  await open(page, "/pieces/the-safi-link");
  await expect(page.locator('[data-worn-with="noah-okafor-jersey-pendant"]')).toBeVisible();
  await open(page, "/pieces/noah-okafor-oka-pendant");
  await expect.poll(backdrop).toContain("/media/universes/okafor-oka-");
  // The T necklace of Marcus Thuram: no universe, all black, its details large.
  await open(page, "/pieces/marcus-thuram-ruby-t-necklace");
  await expect(page.locator(".universe")).toHaveAttribute("data-universe", "noir");
  await expect(page.locator(".u-backdrop")).toHaveCount(0);
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
  if (phone) expect(await page.locator(".u-backdrop").first().evaluate((el) => getComputedStyle(el).translate)).toMatch(/^0px -\d/);
  await page.screenshot({ path: shotPath(info, "yoni2311-dragonball") });
  // The studio images: the cover and the first photo of JL, TM and the thorned T.
  for (const slug of ["jamie-leweling-jl-pendant", "malik-tillman-tm-pendant", "marcus-thuram-thorned-t-pendant"]) {
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
  await expect(page.locator("[data-every-angle] [data-angle]")).toHaveCount(17);
  await page.screenshot({ path: shotPath(info, "yoni2311-bosnia") });
  await expect(page.locator('[data-custom-box="world-cup-display"]')).toBeVisible();
  // From its trunk: the way to the piece.
  await open(page, "/boxes");
  await expect(page.locator('[data-box="world-cup-display"] [data-trunk-actions], [data-box="world-cup-display"] [data-box-photos]').first()).toBeAttached();
  await page.locator('[data-box-photos="world-cup-display"]').click();
  await expect(page.locator('[data-box-enter="bosnia-and-herzegovina-world-cup-2026-ring"]')).toBeVisible();
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
  await expect(card.locator("[data-box-photo]").first()).toBeVisible();
  await expect(trunk).toHaveAttribute("data-trunk-state", "open");
  await card.locator("[data-box-photo]").first().click();
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
  const other = page.locator('[data-box="photo-case"]');
  await other.locator("[data-box-photos]").click();
  await expect(other.locator("[data-box-enter]")).toHaveCount(0);
});

test("atelier, journey, house, press", async ({ page }, info) => {
  const problems = watch(page);
  await open(page, "/atelier");
  await expect(page.locator("[data-philosophy]")).toContainText("No vision too bold, no detail without purpose.");
  const eng = page.locator("[data-engineering]");
  await eng.scrollIntoViewIfNeeded();
  await expect(eng.locator("[data-mechanism]")).toHaveCount(2);
  await expect(eng.locator("[data-mechanism='sphere'] video")).toHaveAttribute("src", new RegExp("/media/mechanisms/dragon-ball-sphere" + V + "mp4$"));
  await eng.locator("[data-lifting-ring] button").first().click();
  await expect(eng.locator("[data-lifting-ring] button").first()).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: shotPath(info, "yoni2311-atelier") });

  await open(page, "/process");
  const journey = page.locator("[data-journey]");
  await expect(journey.locator("[data-journey-step]")).toHaveCount(4);
  for (let i = 1; i <= 4; i++) await expect.poll(() => journey.locator("[data-journey-step='" + i + "'] img").evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(journey.locator("[data-journey-time]")).toContainText("around ten weeks");
  await expect(journey.locator("[data-journey-order]")).toContainText("How do I order?");
  await page.screenshot({ path: shotPath(info, "yoni2311-journey") });
  await open(page, "/fr/process");
  await expect(page.locator("[data-journey-time]")).toContainText("environ dix semaines");

  await open(page, "/about");
  const chapters = page.locator("[data-house-chapter]");
  await expect(chapters).toHaveCount(12);
  await expect(page.locator("[data-house-chapter] [data-house-photo]")).toHaveCount(12);

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
