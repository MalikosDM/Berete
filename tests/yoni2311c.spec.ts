// The feedback of Yoni of the evening of 23/11/2026 (WhatsApp, 16 h 25 to 17 h 22, and the end of the call of 22/11): the
// Dragon Ball pendant with its chain larger, the setting of the Butterfly and its trunk, the trunks of Keita and of Malik
// Tillman, Keita at the boutique, the name BERETE in the background. Computer (Chrome 1440), iPhone (WebKit 390), in
// English and in French. Silent (tests/fixtures.ts).
import { expect, test, type Page } from "./fixtures";
import { shotPath, skipIntro, watch } from "./helpers";
import extras from "../src/data/extra.generated.json" with { type: "json" };
import { BOXES } from "../src/data/pieces";

const desktop = (name: string) => name === "desktop" || name === "safari";
const EXTRA = extras as Record<string, Record<string, { src: string }>>;

async function open(page: Page, path: string) {
  await skipIntro(page, { films: false });
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load").catch(() => undefined);
}

test("Dragon Ball: the view with its chain larger on a computer, its chain fading out at the top; no back in the first photos", async ({ page }, info) => {
  const problems = watch(page);
  await open(page, "/pieces/kevin-schade-dragon-ball-pendant");
  await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
  await expect(page.locator("[data-piece-cover] [data-showcase-view]").first()).toHaveAttribute("data-showcase-view", "p19");
  // Since 25/11/2026 (the Genkidama v2): large, under the sphere of its world, whole above the bottom of the screen.
  await expect(page.locator("[data-showcase]")).toHaveAttribute("data-showcase-large", "");
  if (desktop(info.project.name)) {
    const box = (await page.locator("[data-piece-cover] [data-showcase]").boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(900);
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: shotPath(info, "yoni2311c-dragonball"), type: "jpeg", quality: 70 });
  // "Every Angle": the photos of the whole (25/11/2026: its main photo, its front, its back), the back last of them.
  const first = await page.locator("[data-every-angle] [data-angle] img").evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).getAttribute("src") ?? ""));
  expect(first.length).toBeGreaterThanOrEqual(3);
  for (const src of first.slice(0, -1)) expect(src).not.toMatch(/\/p06[.-]/);
  expect(problems.errors).toEqual([]);
});

test("Butterfly: the film of the setting of its wings in its making-of; its trunk open on the chain, the best photo first", async ({ page }, info) => {
  const problems = watch(page);
  for (const lang of ["", "/fr"]) {
    // Its making-of in The Atelier since 24/11/2026: its film opens at once; closed, its steps are there.
    await open(page, lang + "/atelier?piece=michy-batshuayi-butterfly-pendant");
    const room = page.locator("[data-atelier-room]");
    await expect(room).toBeVisible();
    // (Again until it is gone: the page may still be settling when it opens.)
    await expect(async () => {
      if (await room.count()) await page.keyboard.press("Escape");
      await expect(room).toHaveCount(0, { timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    const step = page.locator("[data-atelier-piece='michy-batshuayi-butterfly-pendant'] [data-making-step='setting']");
    await step.scrollIntoViewIfNeeded();
    await expect(step.locator("[data-making-open] video")).toHaveAttribute("src", EXTRA["michy-batshuayi-butterfly-pendant"]!.setting!.src);
    await expect(step.locator("[data-making-more]")).toHaveCount(1);
    await open(page, lang + "/pieces/michy-batshuayi-butterfly-pendant");
    // Its trunk section: all its photos, whole, the trunk open from the front first; the way to it on the page of the trunks.
    const trunk = page.locator("[data-custom-box='butterfly-trunk']");
    await trunk.scrollIntoViewIfNeeded();
    await expect(trunk.locator("[data-box-section-photo]")).toHaveCount(6);
    await expect(trunk.locator("[data-box-section-photo='0'] img")).toHaveAttribute("src", /\/media\/extra\/boxes\/butterfly-trunk\/open-front\./);
    await expect(trunk.locator("[data-box-section-link]")).toHaveAttribute("href", lang + "/boxes#box-butterfly-trunk");
    await page.waitForTimeout(800);
    if (!lang) await page.screenshot({ path: shotPath(info, "yoni2311c-butterfly-ecrin"), type: "jpeg", quality: 70 });
    // A click: full screen.
    await trunk.locator("[data-box-section-photo='0']").click();
    await expect(page.locator("[role='dialog']").first()).toBeVisible();
    await page.keyboard.press("Escape");
  }
  // On the page of the trunks: its gallery starts with the same photo; its film of opening untouched.
  await open(page, "/boxes");
  await page.locator("[data-box-photos='butterfly-trunk']").click();
  await expect(page.locator("[data-lightbox] img").first()).toHaveAttribute("src", new RegExp("/media/extra/boxes/butterfly-trunk/open-front\\."));
  expect(problems.errors).toEqual([]);
});

test("the trunks of Keita and of Malik Tillman: on the panther and on their profiles, not yet on the page of the trunks", async ({ page }, info) => {
  const problems = watch(page);
  expect(BOXES.find((b) => b.slug === "keita-trunk")!.pieceSlug).toBe("panther-champion-pendant");
  expect(BOXES.find((b) => b.slug === "tillman-trunk")!.pieceSlug).toBeNull();
  for (const lang of ["", "/fr"]) {
    await open(page, lang + "/boxes");
    await expect(page.locator("[data-box]").first()).toBeAttached();
    await expect(page.locator("[data-box='keita-trunk'], [data-box='tillman-trunk']")).toHaveCount(0);
    expect(await page.locator("main").innerText()).not.toMatch(/Keita|Tillman/);

    // The panther: its trunk (3 photos, no way to the page of the trunks yet) and Keita at the boutique in "Worn by".
    await open(page, lang + "/pieces/panther-champion-pendant");
    const worn = page.locator("[data-worn-by]");
    await worn.scrollIntoViewIfNeeded();
    await expect(worn.locator("img").first()).toHaveAttribute("src", /\/media\/extra\/players\/keita-losene\/boutique\./);
    const trunk = page.locator("[data-custom-box='keita-trunk']");
    await trunk.scrollIntoViewIfNeeded();
    await expect(trunk.locator("[data-box-section-photo]")).toHaveCount(3);
    await expect(trunk.locator("[data-box-section-link]")).toHaveCount(0);
    // The section is "The Trunk" (24/11/2026), the name of the trunk under it.
    await expect(page.locator("#piece-trunk")).toHaveText(lang ? "L’écrin" : "The Trunk");
    await expect(trunk.locator("h3")).toHaveText(lang ? "Malle de Keita" : "Keita Trunk");
    await page.waitForTimeout(800);
    await page.screenshot({ path: shotPath(info, "yoni2311c-panthere-ecrin" + (lang ? "-fr" : "")), type: "jpeg", quality: 70 });

    // The profile of Keita: his trunk and his photo at the boutique.
    await open(page, lang + "/players/keita-losene");
    await expect(page.locator("[data-custom-box='keita-trunk']")).toHaveCount(1);
    await expect(page.locator("[data-player-photos] img[src*='/media/extra/players/keita-losene/boutique.']")).toHaveCount(1);
    await expect(page.locator("#player-trunks")).toHaveText(lang ? "Son écrin" : "Their Trunk");

    // The profile of Malik Tillman: his trunk (4 photos), tied to him, to no piece.
    await open(page, lang + "/players/malik-tillman");
    const tillman = page.locator("[data-custom-box='tillman-trunk']");
    await tillman.scrollIntoViewIfNeeded();
    await expect(tillman.locator("[data-box-section-photo]")).toHaveCount(4);
    await expect(tillman).toContainText(lang ? "Malle de Tillman" : "Tillman Trunk");
    await page.waitForTimeout(800);
    await page.screenshot({ path: shotPath(info, "yoni2311c-tillman-ecrin" + (lang ? "-fr" : "")), type: "jpeg", quality: 70 });
  }
  expect(problems.errors).toEqual([]);
});

test("the monogram BRT in the background (in place of BERETE since 24/11/2026): home, pieces, circle; under everything; one setting, ?filigrane=0 removes it", async ({ page }, info) => {
  const problems = watch(page);
  const pages: [string, string][] = [
    ["/", "accueil"],
    ["/pieces/campione-d-italia-2023-2024", "piece"],
    ["/players", "cercle"],
  ];
  for (const [path, name] of pages) {
    const piece = path.startsWith("/pieces/");
    const mark = piece ? ".universe [data-monogram]" : "[data-monogram]";
    await open(page, path + "?filigrane=1");
    await expect(page.locator(mark)).toHaveCount(1);
    // Fixed in the middle of the screen (visible while the page scrolls), under the content; its lines at 5 %.
    const style = await page.locator(mark).evaluate((el) => {
      const s = getComputedStyle(el);
      return { position: s.position, z: s.zIndex, opacity: Number(getComputedStyle(el.querySelector(".monogram-lines")!).opacity) };
    });
    expect(style.opacity).toBeLessThan(0.08);
    if (!piece) {
      expect(style.position).toBe("fixed");
      expect(style.z).toBe("-1");
    }
    await page.evaluate(() => window.scrollTo(0, innerHeight * 1.5));
    await page.waitForTimeout(1200);
    await expect(page.locator(mark)).toBeInViewport();
    // The pictures, where it shows (the text of the home page, the opening of the piece, the circle): with, then without.
    const place = async () => {
      await page.evaluate((home) => {
        const hero = home ? document.querySelector("[data-home-story='house']") : null;
        window.scrollTo(0, hero ? hero.getBoundingClientRect().top + window.scrollY : 0);
      }, path === "/");
      await page.waitForTimeout(1500);
    };
    await place();
    await page.screenshot({ path: shotPath(info, "yoni2311c-filigrane-avec-" + name), type: "jpeg", quality: 70 });
    // Removed for the visit.
    await page.goto(path + "?filigrane=0", { waitUntil: "load" });
    await expect(page.locator(mark)).toHaveCount(0);
    await place();
    await page.screenshot({ path: shotPath(info, "yoni2311c-filigrane-sans-" + name), type: "jpeg", quality: 70 });
    await page.goto(path + "?filigrane=1", { waitUntil: "load" });
  }
  // In French too.
  await page.goto("/fr/players/malik-tillman", { waitUntil: "load" });
  await expect(page.locator("[data-monogram]")).toHaveCount(1);
  // Not on the other pages (the house, the trunks...); the name BERETE nowhere.
  await page.goto("/boxes", { waitUntil: "load" });
  await expect(page.locator("[data-monogram]")).toHaveCount(0);
  await expect(page.locator(".u-brand, .brand-mark, [data-brand-mark]")).toHaveCount(0);
  expect(problems.errors).toEqual([]);
});
