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
  await expect(page.locator("[data-showcase]")).toHaveAttribute("data-showcase-xl", "");
  if (desktop(info.project.name)) {
    // A fifth larger than the frame, the jewel itself above the bottom of the screen.
    const view = page.locator(".sv-xl");
    await expect(view).toHaveCount(1);
    const frame = (await page.locator("[data-piece-cover]").boundingBox())!;
    const box = (await view.boundingBox())!;
    expect(box.height).toBeGreaterThan((frame.height - 184) * 1.15);
    expect(box.y + box.height).toBeLessThanOrEqual(900);
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: shotPath(info, "yoni2311c-dragonball"), type: "jpeg", quality: 70 });
  // "Every Angle": its back is not among the first three photos.
  const first = await page.locator("[data-every-angle] [data-angle] img").evaluateAll((imgs) => imgs.slice(0, 3).map((i) => (i as HTMLImageElement).getAttribute("src") ?? ""));
  expect(first.length).toBe(3);
  for (const src of first) expect(src).not.toMatch(/\/p06[.-]/);
  expect(problems.errors).toEqual([]);
});

test("Butterfly: the film of the setting of its wings in its making-of; its trunk open on the chain, the best photo first", async ({ page }, info) => {
  const problems = watch(page);
  for (const lang of ["", "/fr"]) {
    await open(page, lang + "/pieces/michy-batshuayi-butterfly-pendant");
    const step = page.locator("[data-making-step='setting']");
    await step.scrollIntoViewIfNeeded();
    await expect(step.locator("[data-making-open] video")).toHaveAttribute("src", EXTRA["michy-batshuayi-butterfly-pendant"]!.setting!.src);
    await expect(step.locator("[data-making-more]")).toHaveCount(1);
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
  await expect(page.locator("[data-box-gallery='butterfly-trunk'] [data-box-photo='0'] img")).toHaveAttribute("src", new RegExp("/media/extra/boxes/butterfly-trunk/open-front\\."));
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
    await expect(page.locator("#piece-trunk")).toHaveText(lang ? "Malle de Keita" : "Keita Trunk");
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

test("the name BERETE in the background: home, pieces, circle; under everything; one setting, ?filigrane=0 removes it", async ({ page }, info) => {
  const problems = watch(page);
  const pages: [string, string][] = [
    ["/", "accueil"],
    ["/pieces/campione-d-italia-2023-2024", "piece"],
    ["/players", "cercle"],
  ];
  for (const [path, name] of pages) {
    const piece = path.startsWith("/pieces/");
    const mark = piece ? ".u-brand" : "[data-brand-mark]";
    await open(page, path + "?filigrane=1");
    await expect(page.locator(mark)).toHaveCount(1);
    // Fixed at the bottom of the screen (visible while the page scrolls), under the content.
    const style = await page.locator(mark).evaluate((el) => {
      const s = getComputedStyle(el);
      return { position: s.position, z: s.zIndex, opacity: Number(s.opacity) };
    });
    expect(style.opacity).toBeLessThan(0.08);
    if (!piece) {
      expect(style.position).toBe("fixed");
      expect(style.z).toBe("-1");
    }
    await page.evaluate(() => window.scrollTo(0, innerHeight * 1.5));
    await page.waitForTimeout(1200);
    await expect(page.locator(mark)).toBeInViewport();
    await page.screenshot({ path: shotPath(info, "yoni2311c-filigrane-avec-" + name), type: "jpeg", quality: 70 });
    // Removed for the visit.
    await page.goto(path + "?filigrane=0", { waitUntil: "load" });
    await expect(page.locator(mark)).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, innerHeight * 1.5));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: shotPath(info, "yoni2311c-filigrane-sans-" + name), type: "jpeg", quality: 70 });
    await page.goto(path + "?filigrane=1", { waitUntil: "load" });
  }
  // In French too.
  await page.goto("/fr/players/malik-tillman", { waitUntil: "load" });
  await expect(page.locator("[data-brand-mark]")).toHaveCount(1);
  // Not on the other pages (the house, the trunks...).
  await page.goto("/boxes", { waitUntil: "load" });
  await expect(page.locator("[data-brand-mark]")).toHaveCount(0);
  expect(problems.errors).toEqual([]);
});
