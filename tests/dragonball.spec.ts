// The official text of Yoni for the Dragon Ball pendant (23/11/2026): word for word, under its title, its last words set apart
// as a closing quote and as the line under the title; its technical sheet only what the text says;
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

/**
 * The text (23/11/2026): the challenge of Kevin Schade, then the text of Yoni word for word (only the spaces before ";"
 * and "," removed, a full stop at its end; its line breaks kept), with the two sentences of the sphere that turns after
 * the cuts of the diamonds.
 */
const VISION = [
  "A lifelong admirer of Dragon Ball Z, Kevin Schade challenged Berete to create an extraordinary, never-before-seen piece inspired by Goku and his iconic Genki Dama — a technique Kevin himself had celebrated on the football pitch.",
  "In the Dragon Ball universe, the Genki Dama (Spirit Bomb) is not born from force, but from unity.\nIt is an energy sphere formed by gathering life force from every living being; humans, animals, nature, and worlds beyond.",
  "This philosophy guided the creation of this piece.",
  "At its center, the energy sphere is composed of multiple diamond cuts; round, emerald, and princess, set through different techniques: classic, bezel, channel, and reverse settings.",
  "But to us, energy was never meant to remain still.",
  "We therefore engineered the diamond-set Spirit Bomb to rotate, bringing movement to the very heart of the creation.",
  "Each cut, each orientation, represents a different form of life contributing its energy.\nEven the reverse-set stones placed upside down reflect the unseen forces that give without being visible.",
  "Beneath the sphere stands Goku, the conduit rather than the source.\nSurrounding him are the seven Dragon Balls, completing the universe — symbols of balance, destiny, and collective hope.",
  "Crafted in precious metals and diamonds, this piece translates a universal story into high jewellery:\nnot power taken, but power entrusted.",
  "A tribute to imagination, craftsmanship, and the legacy of Akira Toriyama, whose universe taught generations that true strength is never singular.",
];
const LAST = "Not power taken, but power entrusted.";
const SHEET: [string, string][] = [
  ["Motif", "Goku and the Spirit Bomb, surrounded by the seven Dragon Balls"],
  ["Spirit Bomb", "Rotating, diamond-set"],
  ["Diamond cuts", "Round, emerald, princess"],
  ["Settings", "Classic, bezel, channel, reverse"],
];

/** The same in French. */
const FR = {
  titles: ["La vision derrière la création"],
  first: "Admirateur de toujours de Dragon Ball Z, Kevin Schade a lancé un défi à Berete : créer une pièce extraordinaire, jamais vue, inspirée de Goku et de son emblématique Genki Dama — une technique que Kevin avait lui-même célébrée sur le terrain de football.",
  second: "Dans l’univers de Dragon Ball, le Genki Dama ne naît pas de la force, mais de l’unité.\nC’est une sphère d’énergie formée en rassemblant la force vitale de chaque être vivant ; les humains, les animaux, la nature et les mondes au-delà.",
  reverse: "sertissage inversé",
  tribute: "Un hommage à l’imagination, au savoir-faire et à l’héritage d’Akira Toriyama, dont l’univers a appris à des générations que la vraie force n’est jamais solitaire.",
  last: "Non pas un pouvoir pris, mais un pouvoir confié.",
  sheet: [
    ["Motif", "Goku et le Genkidama, entourés des sept boules de cristal"],
    ["Genkidama", "Rotatif, serti de diamants"],
    ["Tailles des diamants", "Ronde, émeraude, princesse"],
    ["Sertis", "Classique, clos, rail, inversé"],
  ],
};

test("the data: the text of Yoni word for word, its line, its sheet, nothing else", () => {
  const piece = PIECES.find((p) => p.slug === SLUG)!;
  expect(storyBlocks(piece.story)).toEqual([
    { kind: "title", text: "The Vision Behind the Creation" },
    ...VISION.map((text) => ({ kind: "paragraph", text })),
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
    // Its last words once on the page (24/11/2026): the closing quote of its story, not again under the title.
    await expect(page.locator("[data-piece-intro]")).not.toContainText(lang === "fr" ? FR.last : LAST);
    await expect(page.locator("[data-story-quote]")).toContainText(lang === "fr" ? FR.last : LAST);
    const s = await story(page);
    if (lang === "en") {
      expect(s.titles.map((t) => t.toLowerCase())).toEqual(["the vision behind the creation"]);
      // Whole, its line breaks kept.
      expect(s.paragraphs).toEqual(VISION);
      expect(s.quote).toBe("“" + LAST + "”");
    } else {
      expect(s.titles.map((t) => t.toLowerCase())).toEqual(FR.titles.map((t) => t.toLowerCase()));
      expect(s.paragraphs[0]).toBe(FR.first);
      expect(s.paragraphs[1]).toBe(FR.second);
      expect(s.paragraphs.join(" ")).toContain(FR.reverse);
      expect(s.paragraphs[s.paragraphs.length - 1]).toBe(FR.tribute);
      expect(s.paragraphs).toHaveLength(VISION.length);
      expect(s.quote).toBe("« " + FR.last + " »");
    }
    // The line is not written again at the top of the text (its titles stand there).
    expect(s.lines).toBe(0);
    // The closing quote, larger than the text, in the italic of the quotes of the site (24/11/2026: the smaller scale, t-lead).
    const look = await page.locator("[data-story-quote] p").evaluate((e) => ({ size: parseFloat(getComputedStyle(e).fontSize), style: getComputedStyle(e).fontStyle }));
    const textSize = parseFloat(await page.locator("[data-story-paragraph]").first().evaluate((e) => getComputedStyle(e).fontSize));
    expect(look.style).toBe("italic");
    expect(look.size).toBeGreaterThan(textSize * 1.15);
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
    // Every text readable: 16 px at least on a phone (a computer draws the site smaller since 24/11/2026: 14 px at least).
    const least = info.project.name === "desktop" ? 14 : 16;
    for (const el of await page.locator("[data-story-paragraph], [data-story-title]").all()) expect(parseFloat(await el.evaluate((e) => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(least);
    expect(problems.errors).toEqual([]);
  });
}
