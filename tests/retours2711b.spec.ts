import { readFileSync } from "node:fs";
import { expect, test, type Page } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import { publicCatalogue } from "../src/data/relations";
import { YONI_MEDIA } from "../src/data/yoniMedia";

// Yoni's returns of 27/11/2026 (afternoon), part A: the vision second on every piece page, then Every Angle; the Genki Dama
// (its name, its words under it, its sphere higher); the Inter page in yellow gold; the AngeL Pendant of Deniz Undav and the AS
// Pendant of Angelo Stiller word for word (tests/fixtures/yoni-2711b.json); the JL pendant worn on its Cuban chain. Computer and
// iPhone, silent. (The circle of the home page: tests/home2711.spec.ts; the universe of the AS: tests/universes2711b.spec.ts.)
const Y = JSON.parse(readFileSync(new URL("./fixtures/yoni-2711b.json", import.meta.url), "utf8")) as Record<string, string>;
const cat = publicCatalogue(defaultCatalogue);
const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const groups = (b: string) => b.split("\n\n").map((g) => g.split("\n"));
const ANGEL = "deniz-undav-l-pendant";
const AS = "angelo-stiller-as-pendant";

async function open(page: Page, slug: string, lang = "") {
  await page.goto((lang ? "/" + lang : "") + "/pieces/" + slug);
  await page.locator("[data-piece-section]").first().waitFor();
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 900) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
}

const order = (page: Page) => page.locator("[data-piece-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-piece-section")));
const texts = (page: Page, sel: string) => page.locator(sel).evaluateAll((els) => els.map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim()));

async function vision(page: Page, key: string) {
  const [title, ...pars] = Y[key]!.split("\n\n");
  await expect(page.locator("#piece-story-title")).toHaveText(new RegExp("^" + title + "$", "i"));
  expect(await texts(page, "[data-piece-story] [data-story-paragraph]")).toEqual(pars.map(norm));
}

async function composition(page: Page, key: string) {
  const shown = norm((await page.locator("[data-composition]").textContent()) ?? "");
  for (const line of Y[key]!.split("\n").map(norm).filter(Boolean)) {
    const caps = line === line.toUpperCase();
    expect(caps ? shown.toUpperCase().indexOf(line) : shown.indexOf(line), "« " + line + " » in the composition").toBeGreaterThanOrEqual(0);
  }
}

async function details(page: Page, key: string, photos: string[]) {
  const blocks = groups(Y[key]!);
  const shown = page.locator("[data-magazine-block]");
  await expect(shown).toHaveCount(blocks.length);
  for (const [i, [title, ...words]] of blocks.entries()) {
    const b = shown.nth(i);
    expect(norm((await b.locator("h3").textContent()) ?? "")).toBe(norm(title!));
    expect(norm((await b.locator("[data-magazine-text] p").textContent()) ?? "")).toBe(norm(words.join("\n")));
    // Each beside the close-up that shows what it says (chosen photo by photo, src/data/magazine.ts).
    await expect(b.locator("[data-magazine-photo] img").first()).toHaveAttribute("src", new RegExp("/" + photos[i] + "[.]"));
  }
}

test("on every piece page: the piece in its universe, then The Vision Behind the Creation, then Every Angle", async ({ page }) => {
  test.slow();
  for (const p of cat.pieces) {
    await page.goto("/pieces/" + p.slug);
    await page.locator("[data-piece-section]").first().waitFor();
    const o = await order(page);
    expect(o[0], p.slug).toBe("opening");
    expect(["film", "story"], p.slug + " " + o.join(",")).toContain(o[1]);
    if (o.includes("angles")) expect(o[2], p.slug + " " + o.join(",")).toBe("angles");
  }
});

test("the Genki Dama: its name and its words as on Yoni's mock-up, its sphere 15 % higher", async ({ page }) => {
  await open(page, "kevin-schade-dragon-ball-pendant");
  await expect(page.locator("[data-piece-eyebrow]")).toHaveText(/^Pendants$/i);
  expect(await page.locator("[data-piece-eyebrow]").evaluate((e) => getComputedStyle(e).textTransform)).toBe("uppercase");
  await expect(page.locator("#piece-title")).toHaveText("Genki Dama");
  await expect(page.locator("[data-hero-tagline]")).toHaveText("The Energy of All");
  expect(await page.locator("[data-hero-tagline]").evaluate((e) => getComputedStyle(e).fontStyle)).toBe("italic");
  await expect(page.locator("[data-hero-rule]")).toBeVisible();
  await expect(page.locator("[data-hero-dedication]")).toHaveText("A one-of-one creation for Kevin Schade");
  await expect(page.locator("[data-made-for-line]")).toHaveCount(0);
  // Its sphere: the image placed 15 % of the height of the universe higher than before (5 % above its top on a computer, 10 % on
  // a phone, instead of 10 % and 5 % under it).
  const u = page.locator(".universe");
  await expect(u).toHaveAttribute("data-free", "");
  const m = await u.evaluate((e) => ({ t: parseFloat(getComputedStyle(e).getPropertyValue("--u-img-t")), h: e.getBoundingClientRect().height, tall: e.getAttribute("data-anchored") === "tall" }));
  const sh = await page.evaluate(() => window.innerHeight);
  expect(m.t / sh).toBeCloseTo(m.tall ? -0.1 : -0.05, 2);
  // Its name everywhere: the cards of the creations, in every language.
  await page.goto("/fr/creations");
  await expect(page.locator("[data-piece-name]", { hasText: /^Genki Dama$/ }).first()).toBeVisible();
});

test("the Inter ring: its name and every title of its sections in the first gold (28/11/2026: never the yellow one), readable", async ({ page }) => {
  await open(page, "campione-d-italia-2023-2024");
  const titles = page.locator("[data-piece-section]:not([data-piece-section='end']) h2, #piece-title");
  const n = await titles.count();
  expect(n).toBeGreaterThanOrEqual(9);
  for (let i = 0; i < n; i++) {
    const s = await titles.nth(i).evaluate((e) => ({ bg: getComputedStyle(e).backgroundImage, color: getComputedStyle(e).color, text: e.textContent }));
    expect(s.bg, s.text ?? "").toContain("linear-gradient");
    expect(s.bg).toContain("rgb(207, 168, 98)");
    expect(s.bg).not.toContain("rgb(220, 174, 74)");
    expect(s.color).toBe("rgba(0, 0, 0, 0)");
  }
  // The closing block keeps the titles of the house.
  expect(await page.locator("#want-title").evaluate((e) => getComputedStyle(e).backgroundImage)).toBe("none");
});

test("the AngeL Pendant: its name, its film and words, Every Angle, its composition, five details, Deniz Undav with it", async ({ page }) => {
  await open(page, ANGEL);
  await expect(page.locator("#piece-title")).toHaveText("Deniz Undav — AngeL Pendant");
  // « AngeL » keeps its capitals where the names are drawn in capitals.
  expect(await page.locator("#piece-title [data-own-case]").evaluate((e) => getComputedStyle(e).textTransform)).toBe("none");
  expect(await order(page)).toEqual(["opening", "film", "angles", "composition", "details", "circle", "atelier", "end"]);
  // No dark contour around the L: no dark light behind it on its sky.
  expect(await page.locator("[data-piece-cover]").evaluate((e) => getComputedStyle(e).backgroundImage)).toBe("none");
  // Its film: the film of the album of Yoni, with its image and its play button, never its sound by itself.
  const film = page.locator("[data-piece-spread] [data-feature-video]");
  await expect(film).toHaveAttribute("poster", /\/yoni-2711\/angel-film\//);
  expect(await film.evaluate((v: HTMLVideoElement) => v.paused || v.muted)).toBe(true);
  await vision(page, "angel-vision");
  // Every Angle: the front with its angel, three-quarters, the mosaic up close, the angel up close; then See More.
  const srcs = await page.locator("[data-every-angle] > ol > li img").evaluateAll((els) => els.map((e) => e.getAttribute("src") ?? ""));
  expect(srcs.map((s) => /\/(p\d+)\./.exec(s)?.[1])).toEqual(["p10", "p08", "p05", "p04"]);
  await expect(page.locator("[data-every-angle] [data-angle-more]")).toBeVisible();
  await composition(page, "angel-composition");
  await details(page, "angel-details", ["p03", "p06", "p07", "p01", "p09"]);
  // Deniz Undav / The Berete Circle: « Created exclusively for Deniz Undav », his photo with the pendant, « Discover His World ».
  await expect(page.locator("#circle-title")).toHaveText(/^Created exclusively for Deniz Undav$/i);
  await expect(page.locator("[data-circle] img").first()).toHaveAttribute("src", /\/yoni-2711\/worn\/angel-undav\./);
  await expect(page.locator("[data-circle-link]")).toHaveAttribute("href", /\/players\/deniz-undav$/);
  await expect(page.locator("[data-circle-link]")).toHaveText(/Discover His World/i);
  // Nothing more about the story of his family than Yoni's words.
  const body = (await page.locator("article").textContent()) ?? "";
  expect(body).not.toContain("cherub");
  // In French too, its capitals kept.
  await open(page, ANGEL, "fr");
  await expect(page.locator("#piece-title")).toHaveText("Deniz Undav — Pendentif AngeL");
});

test("the AS Pendant: its universe, words, composition of the pendant and of its chain, three details, its tennis chain, the way to the Stuttgart ring", async ({ page }) => {
  await open(page, AS);
  await expect(page.locator(".universe")).toHaveAttribute("data-backdrop", "as-signature");
  await expect(page.locator("#piece-title")).toHaveText("Angelo Stiller — AS Pendant");
  expect(await order(page)).toEqual(["opening", "film", "angles", "composition", "details", "chain", "as-victory", "circle", "atelier", "end"]);
  await vision(page, "as-vision");
  await composition(page, "as-composition");
  // The pendant and its chain apart: two groups, each with its own figures.
  await expect(page.locator("[data-composition-heading]")).toHaveText([/^AS PENDANT$/i, /^ACCOMPANYING TENNIS CHAIN$/i]);
  await expect(page.locator("[data-composition-group]")).toHaveCount(2);
  await details(page, "as-details", ["p08", "p07", "p01"]);
  // Its tennis chain, whole then up close, never in Every Angle; no figure again.
  const chain = page.locator("[data-chain-section]");
  await expect(chain.locator("h2")).toHaveText(/^The Accompanying Tennis Chain$/i);
  const chainSrcs = await chain.locator("img").evaluateAll((els) => els.map((e) => /\/(p\d+)\./.exec(e.getAttribute("src") ?? "")?.[1]));
  expect(chainSrcs).toEqual(["p03", "p02", "p04"]);
  expect(norm((await chain.textContent()) ?? "")).not.toMatch(/\d+(\.\d+)? (g|ct|cm)/);
  const angles = await page.locator("[data-every-angle] img").evaluateAll((els) => els.map((e) => /\/(p\d+)\./.exec(e.getAttribute("src") ?? "")?.[1]));
  for (const f of chainSrcs) expect(angles).not.toContain(f);
  // From a shared victory to a personal creation, and the way to the ring of Stuttgart.
  const [title, text] = Y["as-victory"]!.split("\n\n");
  await expect(page.locator("#as-victory-title")).toHaveText(title!);
  await expect(page.locator("[data-as-victory-text]")).toHaveText(text!);
  await expect(page.locator("[data-as-victory-link]")).toHaveAttribute("href", /\/pieces\/vfb-stuttgart-dfb-pokal-2025$/);
  await expect(page.locator("[data-as-victory-link]")).toHaveText(/Discover the Stuttgart Championship Ring/i);
  await expect(page.locator("[data-circle-link]")).toHaveAttribute("href", /\/players\/angelo-stiller$/);
  // Its baguettes are invisible-set, written so on the whole page.
  const body = (await page.locator("article").textContent()) ?? "";
  expect(body).toContain("Invisible Setting");
  expect(body).not.toMatch(/herringbone|channel/i);
});

test("the JL pendant: worn on the 14 mm Cuban chain, with Yoni's caption", async ({ page }) => {
  await open(page, "jamie-leweling-jl-pendant");
  const first = page.locator("[data-made-for] [data-worn-by] > li").first();
  expect(YONI_MEDIA.worn?.jlCuban?.caption).toBe("JL + 14 mm Cuban");
  await expect(first.locator("img")).toHaveAttribute("src", /\/yoni-2711\/worn\/jl-cuban\./);
  await expect(first.locator("[data-worn-caption]")).toHaveText("JL + 14 mm Cuban");
});
