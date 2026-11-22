// The official text of Yoni for the Dragon Ball pendant (22/11/2026): word for word, in two parts with their titles, its last
// words set apart as a closing quote and as the line under the title; its technical sheet only what the text says;
// translated (French checked here, the other languages by scripts/i18n-check.ts). Computer and iPhone, English and French,
// silent. Screenshots go to verification/dragonball/.
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "./fixtures";
import { PIECES } from "../src/data/pieces";
import { storyBlocks } from "../src/data/story";
import { skipIntro, watch } from "./helpers";

const DIR = "verification/dragonball";
mkdirSync(DIR, { recursive: true });
const SLUG = "kevin-schade-dragon-ball-pendant";

/** The text of Yoni, as he sent it. */
const VISION = [
  "A lifelong admirer of Dragon Ball Z, Kevin Schade challenged Berete to create an extraordinary, never-before-seen piece inspired by Goku and his iconic Genki Dama — a technique Kevin himself had celebrated on the football pitch.",
  "In the Dragon Ball universe, the Spirit Bomb gathers energy from the world around Goku — humans, animals, plants, and even the atmosphere — uniting these different sources into one immense sphere.",
  "We translated this principle into diamonds.",
  "Different cuts, settings and orientations represent the diversity of energy sources contributing to a single collective force.",
  "But to us, energy was never meant to remain still.",
  "We therefore engineered the diamond-set Spirit Bomb to rotate, bringing movement to the very heart of the creation.",
  "Every detail has a purpose. Nothing is accidental.",
];
const CRAFT = [
  "The rotating Spirit Bomb combines round, emerald and princess-cut diamonds through multiple setting techniques, including prong, bezel, channel and reverse settings.",
  "Even the inverted diamonds carry meaning, symbolising the unseen contributions that form a greater whole.",
  "Beneath the sphere, Goku channels the gathered energy, surrounded by the seven iconic Dragon Balls, each distinguished by its number of stars.",
  "A creation where symbolism, engineering and high jewellery become one.",
];
const LAST = "Not power taken, but power entrusted.";
const SHEET: [string, string][] = [
  ["Motif", "Goku and the Spirit Bomb, surrounded by the seven Dragon Balls"],
  ["Spirit Bomb", "Rotating, diamond-set"],
  ["Diamond cuts", "Round, emerald, princess"],
  ["Settings", "Prong, bezel, channel, reverse"],
];

/** The same in French. */
const FR = {
  titles: ["La vision derrière la création", "L’art du savoir-faire"],
  first: "Admirateur de toujours de Dragon Ball Z, Kevin Schade a lancé un défi à Berete : créer une pièce extraordinaire, jamais vue, inspirée de Goku et de son emblématique Genki Dama — une technique que Kevin avait lui-même célébrée sur le terrain de football.",
  last: "Non pas un pouvoir pris, mais un pouvoir confié.",
  sheet: [
    ["Motif", "Goku et la Spirit Bomb, entourés des sept boules de cristal"],
    ["Spirit Bomb", "Rotative, sertie de diamants"],
    ["Tailles des diamants", "Ronde, émeraude, princesse"],
    ["Sertis", "Griffes, clos, rail, inversé"],
  ],
};

test("the data: the text of Yoni word for word, its line, its sheet, nothing else", () => {
  const piece = PIECES.find((p) => p.slug === SLUG)!;
  expect(storyBlocks(piece.story)).toEqual([
    { kind: "title", text: "The Vision Behind the Creation" },
    ...VISION.map((text) => ({ kind: "paragraph", text })),
    { kind: "title", text: "The Art of Craftsmanship" },
    ...CRAFT.map((text) => ({ kind: "paragraph", text })),
    { kind: "quote", text: LAST },
  ]);
  expect(piece.line).toBe(LAST);
  expect(piece.specs.map((s) => [s.label, s.value])).toEqual(SHEET);
  expect(piece.seen).toBeUndefined();
  // No annotations of details to align (The Art of Detail): none on this piece.
  expect(piece.details).toEqual([]);
});

async function story(page: Page) {
  const section = page.locator("[data-story-title]").first().locator("xpath=..");
  return {
    titles: await page.locator("[data-story-title]").allInnerTexts(),
    paragraphs: await section.locator("[data-story-paragraph]").allInnerTexts(),
    // (The French quotes hold their thin spaces.)
    quote: (await page.locator("[data-story-quote]").innerText()).trim().replace(/[\u00a0\u202f]/g, " "),
    lines: await section.locator("h3:not([data-story-title])").count(),
  };
}

for (const lang of ["en", "fr"] as const) {
  test("its page in " + lang + ": the text in two parts, the closing quote, the line, the sheet", async ({ page }, info) => {
    const problems = watch(page);
    await skipIntro(page);
    await page.goto((lang === "fr" ? "/fr" : "") + "/pieces/" + SLUG, { waitUntil: "domcontentloaded" });
    await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
    // The line under the title.
    await expect(page.locator("[data-piece-intro]")).toContainText(lang === "fr" ? FR.last : LAST);
    const s = await story(page);
    if (lang === "en") {
      expect(s.titles.map((t) => t.toLowerCase())).toEqual(["the vision behind the creation", "the art of craftsmanship"]);
      expect(s.paragraphs).toEqual([...VISION, ...CRAFT]);
      expect(s.quote).toBe("“" + LAST + "”");
    } else {
      expect(s.titles.map((t) => t.toLowerCase())).toEqual(FR.titles.map((t) => t.toLowerCase()));
      expect(s.paragraphs[0]).toBe(FR.first);
      expect(s.paragraphs).toHaveLength(11);
      expect(s.quote).toBe("« " + FR.last + " »");
    }
    // The line is not written again at the top of the text (its titles stand there).
    expect(s.lines).toBe(0);
    // The closing quote, larger than the text, in the italic of the quotes of the site.
    const look = await page.locator("[data-story-quote] p").evaluate((e) => ({ size: parseFloat(getComputedStyle(e).fontSize), style: getComputedStyle(e).fontStyle }));
    expect(look.style).toBe("italic");
    expect(look.size).toBeGreaterThan(26);
    await page.locator("[data-story-title]").first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: DIR + "/" + info.project.name + "-" + lang + "-texte.jpg", type: "jpeg", quality: 68 });
    await page.locator("[data-story-quote]").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: DIR + "/" + info.project.name + "-" + lang + "-citation.jpg", type: "jpeg", quality: 68 });
    // The sheet: only what the text says.
    const rows = await page.locator("#sheet-title ~ dl > div").evaluateAll((els) => els.map((e) => [e.querySelector("dt")!.textContent!.trim(), e.querySelector("dd")!.textContent!.trim()]));
    const want = lang === "fr" ? FR.sheet : SHEET;
    expect(rows.map(([l, v]) => [l.toLowerCase(), v])).toEqual(want.map(([l, v]) => [l.toLowerCase(), v]));
    await page.locator("#sheet-title").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: DIR + "/" + info.project.name + "-" + lang + "-fiche.jpg", type: "jpeg", quality: 68 });
    // Every text readable: 16 px at least.
    for (const el of await page.locator("[data-story-paragraph], [data-story-title]").all()) expect(parseFloat(await el.evaluate((e) => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
    expect(problems.errors).toEqual([]);
  });
}
