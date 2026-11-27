import { readFileSync } from "node:fs";
import { expect, test, type Page } from "./fixtures";

// The definitive contents of Yoni (26-27/11/2026): every English text shown on the 9 pages is compared, character for
// character (spaces aside), with his text as it came in the brief (tests/fixtures/yoni-2711.json); the order of the sections;
// Every Angle (4 photos chosen, See More); the old texts gone in the 6 languages; no film with sound by itself; every film has
// its image; the links of the new sections.
const Y = JSON.parse(readFileSync(new URL("./fixtures/yoni-2711.json", import.meta.url), "utf8")) as Record<string, string>;
const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const groups = (b: string) => b.split("\n\n").map((g) => g.split("\n"));

const PIECES = {
  db: "kevin-schade-dragon-ball-pendant",
  vfb: "vfb-stuttgart-dfb-pokal-2025",
  inter: "campione-d-italia-2023-2024",
  kenan: "kenan-yildiz-celebration-pendant",
  oka: "noah-okafor-oka-pendant",
  jersey: "noah-okafor-jersey-pendant",
  octagon: "noah-okafor-octagon-pendant",
  t9: "marcus-thuram-t-serpent-pendant",
} as const;

async function open(page: Page, slug: string, lang = "") {
  await page.goto((lang ? "/" + lang : "") + "/pieces/" + slug);
  await page.locator("[data-piece-section]").first().waitFor();
  // Every section mounted (the photos come as the page scrolls).
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 900) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
}

const texts = (page: Page, sel: string) => page.locator(sel).evaluateAll((els) => els.map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim()));

/** « The Vision Behind the Creation »: its title, then its paragraphs as Yoni wrote them, in their order. */
async function vision(page: Page, key: string) {
  const [title, ...pars] = Y[key]!.split("\n\n");
  await expect(page.locator("#piece-story-title")).toHaveText(new RegExp("^" + title + "$", "i"));
  expect(await texts(page, "[data-piece-story] [data-story-paragraph]")).toEqual(pars.map(norm));
}

/** The composition: every line of Yoni's block shown, in its order (a label in capitals: its letters, the case aside). */
async function composition(page: Page, key: string, extra = "", hidden: string[] = []) {
  const shown = norm((await page.locator("[data-composition]").textContent()) ?? "");
  const lines = (Y[key]! + (extra ? "\n\n" + Y[extra]! : ""))
    .split("\n")
    .map(norm)
    .filter((l) => l && l !== "⸻" && l !== "COMPOSITION & CRAFTSMANSHIP" && !hidden.includes(l));
  for (const line of lines) {
    // A label in capitals: its letters as written (its capitals are the CSS); every other line exactly as written.
    const caps = line === line.toUpperCase();
    const i = caps ? shown.toUpperCase().indexOf(line) : shown.indexOf(line);
    expect(i, "« " + line + " » shown in the composition").toBeGreaterThanOrEqual(0);
  }
}

/** The Art of Detail: each title and its words, in Yoni's order, each beside its photo. */
async function details(page: Page, key: string) {
  const blocks = groups(Y[key]!).filter((g) => g[0] !== "THE ART OF DETAIL");
  const shown = page.locator("[data-magazine-block]");
  await expect(shown).toHaveCount(blocks.length);
  for (const [i, [title, ...words]] of blocks.entries()) {
    const b = shown.nth(i);
    expect(norm((await b.locator("h3").textContent()) ?? "")).toBe(norm(title!));
    expect(norm((await b.locator("[data-magazine-text] p").textContent()) ?? "")).toBe(norm(words.join("\n")));
    await expect(b.locator("[data-magazine-photo] img, [data-magazine-photo] video").first()).toBeVisible();
  }
}

const order = (page: Page) => page.locator("[data-piece-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-piece-section")));

test.describe("Yoni's definitive contents (26-27/11/2026)", () => {
  test("Dragon Ball: title without the client, vision, composition in two columns, its figures beneath, its details", async ({ page }) => {
    await open(page, PIECES.db);
    // Its name since 27/11/2026 (Yoni's mock-up): GENKI DAMA, « The Energy of All », a fine rule, for whom (tests/retours2711b.spec.ts).
    await expect(page.locator("#piece-title")).toHaveText("Genki Dama");
    await expect(page.locator("[data-piece]")).toHaveAttribute("data-font", "pinceau");
    await vision(page, "db-vision");
    // « Created Exclusively for Kevin Schade. » closes the composition and titles the section right under it: said once.
    await composition(page, "db-composition", "", ["Created Exclusively for Kevin Schade."]);
    await expect(page.locator("#made-for-title")).toHaveText(/^Created Exclusively for Kevin Schade$/i);
    await expect(page.locator("[data-composition-rows]")).toHaveCount(2);
    // Its details back after its composition (27/11/2026, tests/corrections2711.spec.ts).
    await expect(page.locator("[data-magazine-block]")).toHaveCount(4);
    await expect(page.locator(".universe")).toHaveAttribute("data-free", "");
  });

  test("VfB: its vision, three details, its figures; Every Angle opens on the ring whole, from the front", async ({ page }) => {
    await open(page, PIECES.vfb);
    await expect(page.locator("[data-piece]")).toHaveAttribute("data-font", "gothique-allemande");
    await vision(page, "vfb-vision");
    await details(page, "vfb-details");
    await composition(page, "vfb-composition");
    await expect(page.locator("[data-composition-figure]")).toHaveCount(3);
    const first = page.locator("[data-every-angle] [data-angle='1'] img").first();
    await expect(first).toHaveAttribute("src", /\/vfb-stuttgart-dfb-pokal-2025\/p17\./);
    await expect(page.locator("[data-every-angle] > ol > li")).toHaveCount(4);
    await expect(page.locator("[data-every-angle] [data-angle-more]")).toBeVisible();
  });

  test("Inter: gold title, its film first, vision, composition, six details, then the story, the champions, the case, Behind the Creation, the press", async ({ page }) => {
    await open(page, PIECES.inter);
    await expect(page.locator("[data-piece]")).toHaveAttribute("data-font", "trophee");
    await expect(page.locator("[data-feature-video]").first()).toHaveAttribute("poster", /yoni-2711\/inter-film\//);
    await vision(page, "inter-vision");
    await composition(page, "inter-composition");
    await details(page, "inter-details");
    await expect(page.locator("[data-magazine-block][data-big]")).toHaveCount(1);
    await expect(page.getByText("Six Months of Craftsmanship")).toHaveCount(0);
    const story = groups(Y["inter-story"]!);
    await expect(page.locator("#story-ring-title")).toHaveText(new RegExp("^" + story[0]![0] + "$", "i"));
    const shown = norm((await page.locator("[data-story-ring]").textContent()) ?? "");
    for (const g of story.slice(1)) expect(shown).toContain(norm(g.join(" ")));
    await expect(page.locator("#champions-title")).toHaveText(/^In the Hands of the Champions$/i);
    await expect(page.locator("[data-champions] [data-film-start]")).toBeVisible();
    await expect(page.locator("[data-champions] [data-photo-row] > li")).toHaveCount(4);
    await expect(page.locator("[data-champions] [data-photo-more-button]")).toHaveText(/View All Moments/i);
    await expect(page.locator("[data-box-section] h2")).toHaveText(/^The Art of Presentation$/i);
    await expect(page.locator("[data-box-section] [data-box-section-link]")).toHaveAttribute("href", /\/boxes/);
    await expect(page.locator("[data-atelier-text]")).toHaveText("Discover the craftsmanship behind Inter Milan's historic championship rings.");
    await expect(page.locator("[data-enter-atelier-link]")).toHaveText(/Watch the Making Of/i);
    expect(await order(page)).toEqual(["opening", "film", "angles", "composition", "details", "story-ring", "champions", "trunk", "atelier", "press", "end"]);
  });

  test("Kenan Yildiz: its new vision", async ({ page }) => {
    await open(page, PIECES.kenan);
    await vision(page, "kenan-vision");
  });

  test("OKA: the vision, Every Angle, the composition, five details, its Cuban chain, the Atelier", async ({ page }) => {
    await open(page, PIECES.oka);
    await vision(page, "oka-vision");
    await composition(page, "oka-composition");
    await details(page, "oka-details");
    await expect(page.getByText("A Friend's Military Service")).toHaveCount(0);
    await expect(page.getByText("Gold Over Diamonds")).toHaveCount(0);
    const cuban = page.locator("[data-piece-section='worn-with'] [data-worn-with]");
    await expect(cuban).toContainText(/Worn on/i);
    await expect(cuban).toContainText(/The Two-Tone Baguette Cuban/i);
    await expect(cuban).toHaveAttribute("href", /\/pieces\/baguette-cuban-chain$/);
    // The vision second on every page (Yoni, 27/11/2026 afternoon), then Every Angle.
    expect((await order(page)).slice(0, 7)).toEqual(["opening", "film", "angles", "composition", "details", "worn-with", "created-for"]);
  });

  test("The jersey of Noah Okafor: the Trophy Room, its vision, its composition and notes, eight details, the Safi Link, the moment of reveal", async ({ page }) => {
    await open(page, PIECES.jersey);
    await vision(page, "jersey-vision");
    await composition(page, "jersey-composition", "jersey-notes");
    await details(page, "jersey-details");
    const reveal = groups(Y["jersey-reveal"]!);
    await expect(page.locator("#reveal-title")).toHaveText(new RegExp("^" + reveal[0]![0] + "$", "i"));
    const shown = norm((await page.locator("[data-reveal]").textContent()) ?? "");
    for (const g of reveal.slice(1)) expect(shown).toContain(norm(g.join(" ")));
    expect(await order(page)).toEqual(["opening", "film", "angles", "composition", "details", "worn-with", "reveal", "created-for", "atelier", "end"]);
    await expect(page.locator("[data-made-for] [data-worn-by]")).toHaveCount(0);
  });

  test("The octagon of Noah Okafor: its vision, composition, four details, its tennis chains, The Berete Circle", async ({ page }) => {
    await open(page, PIECES.octagon);
    await vision(page, "octagon-vision");
    await composition(page, "octagon-composition");
    await details(page, "octagon-details");
    await expect(page.locator("[data-worn-as] h2")).toHaveText(/^The Accompanying Chains$/i);
    await expect(page.locator("[data-circle-link]")).toHaveAttribute("href", /\/players\/noah-okafor$/);
    await expect(page.locator("[data-circle-link]")).toHaveText(/Discover His World/i);
  });

  test("T9: its name, Every Angle (front, three-quarters, back, macro), vision, composition, five details, the evolution of the T", async ({ page }) => {
    await open(page, PIECES.t9);
    await expect(page.locator("#piece-title")).toHaveText("Marcus Thuram — T9 Pendant");
    const srcs = await page.locator("[data-every-angle] > ol > li img").evaluateAll((els) => els.map((e) => e.getAttribute("src") ?? ""));
    expect(srcs.map((s) => /\/(p\d+)\./.exec(s)?.[1])).toEqual(["p08", "p17", "p04", "p01"]);
    await vision(page, "t9-vision");
    await composition(page, "t9-composition");
    await details(page, "t9-details");
    const ev = groups(Y["t9-evolution"]!);
    await expect(page.locator("#evolution-title")).toHaveText(new RegExp("^" + ev[0]![0] + "$", "i"));
    expect(await texts(page, "[data-evolution-step] p")).toEqual(ev[2]!.map(norm));
    await expect(page.locator("[data-circle-link]")).toHaveAttribute("href", /\/players\/marcus-thuram$/);
    expect(await order(page)).toEqual(["opening", "film", "angles", "composition", "details", "evolution", "circle", "atelier", "end"]);
  });

  test("No film plays with its sound by itself; every film has its image", async ({ page }) => {
    for (const slug of Object.values(PIECES)) {
      await open(page, slug);
      await page.waitForTimeout(800);
      const films = await page.locator("video").evaluateAll((els) => (els as HTMLVideoElement[]).map((v) => ({ sound: !v.paused && !v.muted, poster: Boolean(v.getAttribute("poster")) || Boolean(v.closest("[data-feature-frame]")) })));
      for (const f of films) {
        expect(f.sound, slug).toBe(false);
        expect(f.poster, slug).toBe(true);
      }
    }
  });
});

// The old texts that Yoni's replaced never show, in any language.
const OLD = [
  "Not power taken, but power entrusted",
  "Six Months of Craftsmanship",
  "A Friend's Military Service",
  "Gold Over Diamonds",
  "Half Swiss, Half Nigerian",
  "One T After Another",
  "Winners of the 2025 DFB-Pokal",
  "The Twentieth Title",
  "His celebration, crossed in diamonds",
  "Kevin Schade — Dragon Ball Pendant",
  "T-Serpent Pendant",
];
for (const lang of ["", "fr", "es", "de", "nl", "ar"]) {
  test("No old text of the 9 pages in " + (lang || "en"), async ({ page }) => {
    for (const slug of Object.values(PIECES)) {
      await open(page, slug, lang);
      const body = (await page.locator("main, article").first().textContent()) ?? "";
      for (const old of OLD) expect(body, slug + " · " + old).not.toContain(old);
      // The page speaks its language: the vision is translated (never the English paragraph).
      if (lang) {
        const first = norm((await page.locator("[data-piece-story] [data-story-paragraph]").first().textContent()) ?? "");
        const key = Object.entries(PIECES).find(([, s]) => s === slug)![0];
        const english = norm(Y[key + "-vision"]!.split("\n\n")[1]!);
        expect(first, slug).not.toBe(english);
      }
    }
  });
}
