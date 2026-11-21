// The answers of Yoni to the 20 doubts of the making-of (21/11/2026, the sheet _verif/making-of-doutes.jpg): the confirmed
// steps are on the pages of their 8 pieces, under the names asked; the rejected ones nowhere. Computer and iPhone, silent.
// Screenshots go to verification/doutes/.
import { mkdirSync } from "node:fs";
import { expect, test } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import { completeMakingOf, makingSteps } from "../src/data/making";
import { publicCatalogue } from "../src/data/relations";
import type { MakingStep } from "../src/data/types";
import { skipIntro, watch } from "./helpers";

const DIR = "verification/doutes";
mkdirSync(DIR, { recursive: true });
const CAT = publicCatalogue(defaultCatalogue);
const pieceOf = (slug: string) => CAT.pieces.find((p) => p.slug === slug)!;
const boxOf = (slug: string) => {
  const p = pieceOf(slug);
  return p.boxSlug ? CAT.boxes.find((b) => b.slug === p.boxSlug)?.images[0] : undefined;
};

/** Each confirmed doubt: its piece, its step, the title of the step in French, its file, and whether it is the second photo of the step. */
const CONFIRMED: { n: number; slug: string; step: MakingStep; title: string; src: string; second?: boolean }[] = [
  { n: 1, slug: "noah-okafor-octagon-pendant", step: "delivery", title: "La Révélation finale", src: "/media/stories/noah-okafor-ii/05.webp" },
  { n: 3, slug: "angelo-stiller-as-pendant", step: "preparation", title: "Préparation du sertissage", src: "/media/hd/angelo-stiller-as-pendant/v04-2s.webp" },
  { n: 4, slug: "panther-champion-pendant", step: "assembly", title: "Assemblage", src: "/media/hd/panther-champion-pendant/08-v08-1s.webp" },
  { n: 5, slug: "panther-champion-pendant", step: "parts", title: "Les pièces avant assemblage", src: "/media/hd/panther-champion-pendant/08-p01.webp" },
  { n: 9, slug: "marcus-thuram-t-serpent-pendant", step: "setting", title: "L’Art du sertissage", src: "/media/hd/marcus-thuram-t-serpent-pendant/08-v19-2s.webp", second: true },
  { n: 10, slug: "campione-d-italia-2023-2024", step: "setting", title: "L’Art du sertissage", src: "/media/hd/campione-d-italia-2023-2024/08-v25-3s.webp", second: true },
  { n: 16, slug: "kevin-schade-twisted-chain", step: "delivery", title: "La Révélation finale", src: "/media/stories/kevin-schade/02.webp" },
  { n: 18, slug: "samuel-ballet-jesus-piece", step: "worn", title: "La pièce portée", src: "/media/pieces/samuel-ballet-jesus-piece/worn.webp" },
  { n: 19, slug: "tulips-on-tour-medallion", step: "finishing", title: "Finition", src: "/media/hd/tulips-on-tour-medallion/v13-0_5s.webp" },
];

test("the data: each confirmed step on its piece; the rejected ones nowhere", () => {
  for (const c of CONFIRMED) {
    const steps = makingSteps(pieceOf(c.slug), boxOf(c.slug));
    const step = steps.find((s) => s.step === c.step);
    expect(step, c.n + " " + c.slug).toBeTruthy();
    expect((c.second ? step!.more : step!.item)?.src, String(c.n)).toBe(c.src);
  }
  const all = CAT.pieces.flatMap((p) => makingSteps(p, boxOf(p.slug)).flatMap((s) => [s.item.src, s.more?.src ?? ""]));
  // 2: the travel case of NZ (off the site); 6, 8, 11 to 14: pieces not identified; 7: BRT Flower or Sirius; 15: the flower
  // links of the film of the jersey of Okafor.
  for (const rejected of ["/media/stories/nz/03", "08-v18", "08-v03", "08-v10", "08-v02", "08-p05", "08-p06", "08-p07"]) expect(all.some((s) => s.includes(rejected)), rejected).toBe(false);
  expect(all.some((s) => /noah-okafor-jersey-pendant\/v02-1[45]/.test(s)), "15").toBe(false);
  // 17: the making-of 36/v02 stays on the BRT Flower only.
  expect(completeMakingOf("kevin-schade-twisted-chain", pieceOf("kevin-schade-twisted-chain").atelier)).toBeNull();
  expect(completeMakingOf("brt-flower-chain", pieceOf("brt-flower-chain").atelier)).not.toBeNull();
  // 18: worn for the Jesus piece of Samuel Ballet only, never for the BRT Flower.
  expect(makingSteps(pieceOf("brt-flower-chain")).some((s) => s.step === "worn")).toBe(false);
  // 20: the making-of of the Rose 14 mm Cuban chain stays.
  expect(completeMakingOf("rose-iced-cuban-chain", pieceOf("rose-iced-cuban-chain").atelier)).not.toBeNull();
});

const SLUGS = [...new Set(CONFIRMED.map((c) => c.slug))];
for (const slug of SLUGS) {
  test(slug + ": its confirmed steps in its Making of, under their names", async ({ page }, info) => {
    const problems = watch(page);
    await skipIntro(page);
    await page.goto("/fr/pieces/" + slug, { waitUntil: "load" });
    await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
    const section = page.locator("[data-making]");
    await section.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(1000);
    const steps = makingSteps(pieceOf(slug), boxOf(slug));
    await expect(section.locator("[data-making-step]")).toHaveCount(steps.length);
    for (const c of CONFIRMED.filter((x) => x.slug === slug)) {
      const card = section.locator("[data-making-step='" + c.step + "']");
      await expect(card, String(c.n)).toHaveCount(1);
      await expect(card.locator(".title-caps")).toHaveText(c.title);
      const opener = card.locator(c.second ? "[data-making-more]" : "[data-making-open]");
      const img = opener.locator("img").first();
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((e) => new URL((e as HTMLImageElement).currentSrc || (e as HTMLImageElement).src).pathname.replace(/\.w\d+\.webp$/, ".webp")), { timeout: 15_000 }).toBe(c.src);
      await expect.poll(() => img.evaluate((e) => (e as HTMLImageElement).naturalWidth), { timeout: 15_000 }).toBeGreaterThan(0);
      // It opens full screen.
      await opener.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await page.waitForTimeout(500);
      await page.screenshot({ path: DIR + "/" + info.project.name + "-" + slug + "-" + c.n + "-plein-ecran.jpg", type: "jpeg", quality: 66 });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    }
    await section.evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.waitForTimeout(700);
    await page.screenshot({ path: DIR + "/" + info.project.name + "-" + slug + ".jpg", type: "jpeg", quality: 66, fullPage: false });
    if (info.project.name !== "desktop") {
      // On a phone the cards slide sideways: the new one in view, its title 16 px at least.
      const c = CONFIRMED.find((x) => x.slug === slug)!;
      const card = section.locator("[data-making-step='" + c.step + "']");
      await card.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center" }));
      await page.waitForTimeout(600);
      expect(await card.locator(".title-caps").evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
      await page.screenshot({ path: DIR + "/" + info.project.name + "-" + slug + "-etape.jpg", type: "jpeg", quality: 66 });
    }
    expect(problems.errors).toEqual([]);
  });
}
