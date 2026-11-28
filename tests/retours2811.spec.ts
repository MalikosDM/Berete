import { readFileSync } from "node:fs";
import { expect, test, type Page } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import { publicCatalogue } from "../src/data/relations";

// Yoni's returns of 28/11/2026 and the defects of the audit of 27/11 (B and C of the prompt of 28/11): on every piece page the
// jewel of the opening whole (its bail, never cut by the top of the screen or by the menu; a chain cut by its photo has its cut
// hidden above, its body on the screen); Every Angle the same everywhere (at most four photos of one size, never larger when
// fewer); the first film never opens on a trunk; Samuel Ballet's Jesus Piece and the MT — NEXUS CROSS word for word
// (tests/fixtures/yoni-2811.json); a composition shown only with its figures; the pieces at the end related, never the page's
// own; every name of a piece in capitals, the long dash in the letters of the house; the profiles balanced; the FAM, the TM.
// Computer (1440 and 1920) and iPhone, silent.
const Y = JSON.parse(readFileSync(new URL("./fixtures/yoni-2811.json", import.meta.url), "utf8")) as Record<string, string>;
const cat = publicCatalogue(defaultCatalogue);
const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const groups = (b: string) => b.split("\n\n").map((g) => g.split("\n"));
const BALLET = "samuel-ballet-jesus-piece";
const TILLMAN = "malik-tillman-cross-pendant";
const phone = (name: string) => name.startsWith("iphone");

async function open(page: Page, slug: string, scroll = false) {
  await page.goto("/pieces/" + slug);
  await page.locator("[data-piece-section]").first().waitFor();
  if (!scroll) return;
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

/** Where the jewel of the opening is drawn: its opaque pixels (a cut-out) or its photo, the bottom of the header, the screen. */
async function opening(page: Page) {
  await page.waitForFunction(() => !document.querySelector("[data-entering]"), null, { timeout: 15_000 }).catch(() => undefined);
  return page.evaluate(async () => {
    const hb = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    const cover = document.querySelector("[data-piece-cover]")!;
    const cut = !!cover.querySelector("[data-showcase-cut='top']");
    const imgs = [...cover.querySelectorAll("img")].filter((i) => {
      const b = i.getBoundingClientRect();
      // On a phone, the first view of a showcase (the next ones wait beside it, to be swiped).
      return b.width > 40 && b.height > 40 && b.right > 0 && b.left < innerWidth && i.offsetParent !== null && !i.src.startsWith("data:") && !i.closest('[data-showcase-slide]:not([data-showcase-slide="0"])');
    });
    const area = (i: Element) => i.getBoundingClientRect().width * i.getBoundingClientRect().height;
    const img = imgs.sort((a, b) => area(b) - area(a))[0];
    if (!img) return null;
    await img.decode().catch(() => undefined);
    const b = img.getBoundingClientRect();
    let dx = 0, dy = 0, dw = b.width, dh = b.height;
    if (getComputedStyle(img).objectFit === "contain" && img.naturalWidth) {
      const s = Math.min(b.width / img.naturalWidth, b.height / img.naturalHeight);
      dw = img.naturalWidth * s;
      dh = img.naturalHeight * s;
      // Where object-position puts the picture in its box (a chain cut at the top: drawn from the top).
      const [px, py] = getComputedStyle(img).objectPosition.split(" ");
      const at = (v: string | undefined, room: number) => (!v ? room / 2 : v.endsWith("%") ? (room * parseFloat(v)) / 100 : parseFloat(v));
      dx = at(px, b.width - dw);
      dy = at(py, b.height - dh);
    }
    let box = { x0: 0, y0: 0, x1: 1, y1: 1 };
    if (/\/cutouts\//.test(img.currentSrc || img.src)) {
      const c = document.createElement("canvas");
      const W = 160, H = Math.max(1, Math.round((160 * img.naturalHeight) / img.naturalWidth));
      c.width = W;
      c.height = H;
      const g = c.getContext("2d")!;
      g.drawImage(img, 0, 0, W, H);
      const d = g.getImageData(0, 0, W, H).data;
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3]! > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      box = { x0: x0 / W, y0: y0 / H, x1: (x1 + 1) / W, y1: (y1 + 1) / H };
    }
    return { hb, cut, vw: innerWidth, vh: innerHeight, top: b.top + dy + box.y0 * dh, bottom: b.top + dy + box.y1 * dh, left: b.left + dx + box.x0 * dw, right: b.left + dx + box.x1 * dw };
  });
}

test("every piece: its jewel whole in the first screen, never cut by the top or by the menu", async ({ page }, info) => {
  test.setTimeout(15 * 60_000);
  const sizes = phone(info.project.name) ? [null] : [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }];
  const wrong: string[] = [];
  for (const size of sizes) {
    if (size) await page.setViewportSize(size);
    for (const p of cat.pieces) {
      await open(page, p.slug);
      const r = await opening(page);
      if (!r) continue;
      const where = p.slug + " @" + (size ? size.width : "iphone") + " " + JSON.stringify({ top: Math.round(r.top), bottom: Math.round(r.bottom), header: Math.round(r.hb), cut: r.cut });
      // Sideways and at the bottom: always on the screen.
      if (r.left < -2 || r.right > r.vw + 2 || r.bottom > r.vh + 2) wrong.push(where);
      // A whole jewel starts under the menu; a chain cut by its photo hides its cut above (under the menu or off the screen).
      else if (r.cut ? r.top > r.hb + 2 : r.top < r.hb - 2) wrong.push(where);
    }
  }
  expect(wrong, "jewels cut at the opening").toEqual([]);
});

test("Every Angle on every page: at most four photos of the same size, never larger when fewer", async ({ page }, info) => {
  test.setTimeout(10 * 60_000);
  const wrong: string[] = [];
  for (const p of cat.pieces) {
    await open(page, p.slug);
    const ea = page.locator("[data-every-angle]");
    if ((await ea.count()) === 0) continue;
    await ea.scrollIntoViewIfNeeded();
    const r = await ea.evaluate((el) => {
      const ol = el.querySelector("ol:not([data-angle-rest])")!;
      const items = [...ol.children].map((li) => li.getBoundingClientRect().width);
      return { n: items.length, widths: items, row: ol.getBoundingClientRect().width };
    });
    const cols = phone(info.project.name) ? 2 : 4;
    const most = Math.max(...r.widths), least = Math.min(...r.widths);
    if (r.n > 4 || most - least > 2 || most > r.row / cols + 2) wrong.push(p.slug + " " + JSON.stringify(r));
  }
  expect(wrong).toEqual([]);
});

test("the first film of a page never opens on a trunk; the VfB ring plays from the ring", async ({ page }) => {
  test.setTimeout(6 * 60_000);
  const wrong: string[] = [];
  for (const p of cat.pieces) {
    await open(page, p.slug);
    const film = page.locator("[data-feature-film] video").first();
    if ((await film.count()) === 0) continue;
    const poster = (await film.getAttribute("poster")) ?? "";
    if (!poster || /\/trunks\//.test(poster)) wrong.push(p.slug + " " + poster);
  }
  expect(wrong).toEqual([]);
  await open(page, "vfb-stuttgart-dfb-pokal-2025");
  expect(Number(await page.locator("[data-feature-film] video").first().getAttribute("data-start"))).toBeGreaterThanOrEqual(6.5);
});

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
    await expect(b.locator("[data-magazine-photo] img").first()).toHaveAttribute("src", new RegExp("/" + photos[i] + "[.]"));
  }
}

const sequence = (all: (string | null)[], want: string[]) => all.filter((s): s is string => !!s && want.includes(s));

test("Samuel Ballet's Jesus Piece: its film, its words, Every Angle, its composition, its four details, its circle", async ({ page }) => {
  await open(page, BALLET, true);
  expect(sequence(await order(page), ["film", "angles", "composition", "details", "circle", "atelier"])).toEqual(["film", "angles", "composition", "details", "circle", "atelier"]);
  await expect(page.locator("[data-feature-film] video").first()).toHaveAttribute("src", /\/yoni-2711\/ballet-film\//);
  await vision(page, "ballet-vision");
  await expect(page.locator("[data-every-angle] ol:not([data-angle-rest]) > li")).toHaveCount(4);
  await expect(page.locator("[data-angle-more]")).toBeVisible();
  await composition(page, "ballet-composition");
  await details(page, "ballet-details", ["crown-macro", "claws", "face-mosaic", "crown-face"]);
  await expect(page.locator("#circle-title")).toHaveText(/created exclusively for samuel ballet/i);
  await expect(page.locator("[data-circle-link]")).toHaveText(/discover his world/i);
  // One photo once on the page: never the same in Every Angle and beside a detail.
  const ea = await page.locator("[data-every-angle] ol:not([data-angle-rest]) img").evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute("src")));
  const det = await page.locator("[data-magazine-photo] img").evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute("src")));
  expect(ea.filter((s) => det.includes(s))).toEqual([]);
});

test("MT — NEXUS CROSS: its name, its words under it, its film, its words, its composition, its six details, his first pendant", async ({ page }) => {
  await open(page, TILLMAN, true);
  const [[name, tagline], [dedication]] = groups(Y["tillman-hero"]!);
  await expect(page.locator("#piece-title")).toHaveText(name!, { ignoreCase: true });
  await expect(page.locator("[data-hero-tagline]")).toHaveText(tagline!);
  await expect(page.locator("[data-hero-dedication]")).toHaveText(dedication!);
  expect(sequence(await order(page), ["film", "angles", "composition", "details", "circle", "atelier"])).toEqual(["film", "angles", "composition", "details", "circle", "atelier"]);
  await expect(page.locator("[data-feature-film] video").first()).toHaveAttribute("src", /\/yoni-2711\/tillman-film\//);
  await vision(page, "tillman-vision");
  await expect(page.locator("[data-every-angle] ol:not([data-angle-rest]) > li")).toHaveCount(4);
  await composition(page, "tillman-composition");
  await details(page, "tillman-details", ["p08", "p13", "p11", "p10", "p19", "p14"]);
  // The centre that spins, small in the corner of its close-up, silent.
  const loop = page.locator("[data-magazine-block='2'] [data-detail-loop] video");
  await expect(loop).toHaveCount(1);
  expect(await loop.evaluate((v: HTMLVideoElement) => v.muted && v.loop)).toBe(true);
  await expect(page.locator("#circle-title")).toHaveText(/created exclusively for malik tillman/i);
  await expect(page.locator("[data-circle-earlier]")).toHaveAttribute("href", /malik-tillman-tm-pendant/);
  // « Cross Pendant & Infinity Chain » only in its composition, never as its name.
  await expect(page.locator("#piece-title")).not.toContainText(/Infinity Chain/i);
  // Its name everywhere: the cards of The Creations.
  await page.goto("/creations");
  await expect(page.locator("[data-piece-name]").filter({ hasText: /MT — NEXUS CROSS/i }).first()).toBeVisible();
});

test("the jersey of Noah Okafor: its new film plays from the piece; the FAM and the TM without their story photos", async ({ page }) => {
  await open(page, "noah-okafor-jersey-pendant");
  const film = page.locator("[data-feature-film] video").first();
  await expect(film).toHaveAttribute("src", /\/yoni-2711\/jersey-film\//);
  expect(Number(await film.getAttribute("data-start"))).toBeGreaterThanOrEqual(4.5);
  expect(await film.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
  await open(page, "tanguy-nianzou-fam-medallion", true);
  const fam = await page.locator("main img").evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute("src") ?? ""));
  expect(fam.filter((s) => /\/stories\/nz\//.test(s))).toEqual([]);
  await expect(page.locator("[data-every-angle] ol:not([data-angle-rest]) > li")).toHaveCount(4);
  await expect(page.locator("[data-worn-by] li")).toHaveCount(2);
  await open(page, "malik-tillman-tm-pendant", true);
  const tm = await page.locator("main img").evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute("src") ?? ""));
  expect(tm.filter((s) => /\/stories\/malik-tillman-ii\/01[.]/.test(s))).toEqual([]);
});

test("a composition that says almost nothing waits for its figures; the pieces at the end are related, never the page's own", async ({ page }) => {
  for (const p of cat.pieces) {
    const own = p.specs.some((s) => s.label === s.label.toUpperCase() && /[A-Z]/.test(s.label));
    const figures = p.specs.some((s) => /gold weight|diamond weight|carat/i.test(s.label) && s.value.trim()) || p.specs.some((s) => /\d\s*(ct|carats?)\b/i.test(s.value));
    if (own || figures) continue;
    await open(page, p.slug);
    await expect(page.locator("[data-piece-section='composition']"), p.slug).toHaveCount(0);
  }
  const shown = new Map<string, string[]>();
  for (const slug of [BALLET, TILLMAN, "tanguy-nianzou-fam-medallion", "baguette-cuban-chain", "angelo-stiller-as-pendant"]) {
    await open(page, slug);
    const links = await page.locator("[data-similar] a[href*='/pieces/']").evaluateAll((els) => [...new Set(els.map((e) => (e.getAttribute("href") ?? "").split("/pieces/")[1]!))]);
    expect(links, slug).not.toContain(slug);
    shown.set(slug, links);
  }
  // Never the same four everywhere.
  expect(new Set([...shown.values()].map((l) => l.join("|"))).size).toBeGreaterThan(3);
  // The MT — NEXUS CROSS leads to his other piece, the TM.
  expect(shown.get(TILLMAN)).toContain("malik-tillman-tm-pendant");
});

test("every name of a piece in capitals; the long dash of the watches in the letters of the house", async ({ page }) => {
  for (const slug of ["rose-iced-cuban-chain", "wide-rose-iced-cuban-chain", "the-safi-link", "marcus-thuram-skeleton-watch", "vfb-stuttgart-dfb-pokal-2025"]) {
    await open(page, slug);
    expect(await page.locator("#piece-title").evaluate((e) => getComputedStyle(e).textTransform), slug).toBe("uppercase");
  }
  await open(page, "marcus-thuram-skeleton-watch");
  const dash = page.locator("#piece-title [data-title-dash]");
  await expect(dash).toHaveText(" — ");
  expect(await dash.evaluate((e) => getComputedStyle(e).fontFamily)).toMatch(/Cormorant/);
});

test("a profile: beside the portrait, who they are and the names of their pieces (no empty half)", async ({ page }, info) => {
  await page.goto("/players/marcus-thuram");
  const summary = page.locator("[data-player-summary]");
  await expect(summary).toBeVisible();
  await expect(summary.locator("a[href*='/pieces/']").first()).toBeVisible();
  if (!phone(info.project.name)) {
    const portrait = await page.locator("[data-player-portrait]").boundingBox();
    const intro = await page.locator("[data-player-intro]").boundingBox();
    // Side by side, the words in the middle of the height of the portrait.
    expect(intro!.x).toBeGreaterThan(portrait!.x + portrait!.width);
    expect(Math.abs(intro!.y + intro!.height / 2 - (portrait!.y + portrait!.height / 2))).toBeLessThan(portrait!.height * 0.2);
  }
});

test("the universes: VfB vertical on a phone, more constellations on the left of the N14, no green halo on the clover", async ({ page }, info) => {
  await open(page, "vfb-stuttgart-dfb-pokal-2025");
  const img = await page.locator("[data-universe] picture img").first().evaluate((e: HTMLImageElement) => e.currentSrc);
  // The phone: the stadium at night drawn upright (« vfb », since the evening of 28/11/2026: tests/corrections2811.spec.ts);
  // the computer: the new one, unchanged.
  if (phone(info.project.name)) expect(img).toMatch(/\/vfb-m-/);
  else expect(img).toMatch(/vfb-victoire-v2-/);
  await open(page, "celestial-initial-medallion");
  const side = phone(info.project.name) ? "--mx" : "--dx";
  // Left of the jewel (at 0.66 of the width of the image on a computer; the left of the image on a phone).
  const edge = phone(info.project.name) ? 0.3 : 0.53;
  const left = await page.locator(".u-spot[data-kind='link'], .u-spot[data-kind='star']").evaluateAll((els, [v, e]) => els.filter((el) => parseFloat((el as HTMLElement).style.getPropertyValue(v as string) || "1") < (e as number)).length, [side, edge] as const);
  expect(left).toBeGreaterThanOrEqual(phone(info.project.name) ? 4 : 8);
  await open(page, "eljero-elia-clover-medallion");
  await expect(page.locator("[data-jewel-halo='jewel-halo'], [data-jewel='jewel-halo']")).toHaveCount(0);
});
