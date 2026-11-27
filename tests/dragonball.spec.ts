// The definitive text of Yoni for the Dragon Ball pendant (26/11/2026, src/data/yoni2711.ts): « The Vision Behind the
// Creation » word for word beside its film, its composition in two columns with its weights and carats beneath, its title
// without the name of the client; translated (French checked here, the other languages by scripts/i18n-check.ts; the words of
// every page by tests/contenus2711.spec.ts). Computer and iPhone, English and French, silent. Screenshots: verification/dragonball/.
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "./fixtures";
import { PIECES } from "../src/data/pieces";
import { storyBlocks } from "../src/data/story";
import { YONI } from "../src/data/yoni2711";
import { skipIntro, watch } from "./helpers";

const DIR = "verification/dragonball";
mkdirSync(DIR, { recursive: true });
const SLUG = "kevin-schade-dragon-ball-pendant";
const TEXTS = YONI[SLUG]!;
const LAST = "Every stone, every setting, every movement has a purpose.";

test("the data: the text of Yoni word for word, its line, its composition, no detail, its title without the client", () => {
  const piece = PIECES.find((p) => p.slug === SLUG)!;
  expect(piece.title).toBe("Dragon Ball Pendant");
  expect(storyBlocks(piece.story)).toEqual(TEXTS.story.map((text) => ({ kind: "paragraph", text })));
  expect(piece.line).toBe(LAST);
  expect(piece.specs.map((s) => [s.label, s.value])).toEqual(TEXTS.specs);
  expect(piece.details).toEqual([]);
});

const norm = (x: string) => x.replace(/\s+/g, " ").trim();
const paragraphs = (page: Page) => page.locator("[data-piece-story] [data-story-paragraph]").allTextContents();

for (const lang of ["en", "fr"] as const) {
  test("its page in " + lang + ": its vision whole, its last words as its closing, its composition", async ({ page }, info) => {
    const problems = watch(page);
    await skipIntro(page);
    await page.goto((lang === "fr" ? "/fr" : "") + "/pieces/" + SLUG, { waitUntil: "domcontentloaded" });
    await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
    const shown = (await paragraphs(page)).map(norm);
    if (lang === "en") {
      expect(shown).toEqual(TEXTS.story.map(norm));
      await expect(page.locator("[data-story-closing]")).toHaveText(LAST);
    } else {
      // Translated, paragraph by paragraph (never the English), with the French name of the technique.
      expect(shown).toHaveLength(TEXTS.story.length);
      for (const [i, p] of shown.entries()) expect(p, "paragraph " + (i + 1)).not.toBe(norm(TEXTS.story[i]!));
      expect(shown.join(" ")).not.toContain("Spirit Bomb");
      await expect(page.locator("#piece-story-title")).toHaveText(/La vision derrière la création/i);
    }
    // Its last words once on the page: the closing of its vision, not under its title.
    await expect(page.locator("[data-piece-intro] [data-piece-line]")).toHaveCount(0);
    await page.locator("#piece-story-title").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: DIR + "/" + info.project.name + "-" + lang + "-texte.jpg", type: "jpeg", quality: 68 });
    // The composition: two columns of four lines, a rule, its weights and carats beneath.
    await expect(page.locator("[data-composition-rows]").first().locator("> div")).toHaveCount(4);
    await expect(page.locator("[data-composition-rule]")).toHaveCount(1);
    await page.locator("#sheet-title").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: DIR + "/" + info.project.name + "-" + lang + "-composition.jpg", type: "jpeg", quality: 68 });
    // Every text readable: 16 px at least on a phone (a computer draws the site smaller: 14 px at least).
    const least = info.project.name === "desktop" ? 14 : 16;
    for (const el of await page.locator("[data-story-paragraph], [data-composition-rows] dd").all()) expect(parseFloat(await el.evaluate((e) => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(least);
    expect(problems.errors).toEqual([]);
  });
}
