import { expect, test, type Page } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import { publicCatalogue } from "../src/data/relations";
import { BAIL_TOP } from "../src/data/showcase";

// The corrections after the pass of 28/11/2026 (Malik's review of the evening): the top of every piece under the menu at its
// opening (its bail; a chain alone keeps its U, its cut hidden above), on a computer (1440, 1920) and an iPhone; the VfB stadium
// on a phone; the first image of every first film bright (its poster and the frame it starts on); the watches; never the same
// photo twice on a page; the clasp first in The Art of Detail of the Cuban chains. Silent.
const cat = publicCatalogue(defaultCatalogue);
const phone = (name: string) => name.startsWith("iphone");

async function open(page: Page, slug: string) {
  await page.goto("/pieces/" + slug);
  await page.locator("[data-piece-section]").first().waitFor();
  await page.waitForFunction(() => !document.querySelector("[data-entering]"), null, { timeout: 15_000 }).catch(() => undefined);
}

/** The jewel of the opening: the box of its image, where the picture is drawn in it, its opaque pixels, the menu. */
function measure(page: Page) {
  return page.evaluate(async () => {
    const hb = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    const cover = document.querySelector("[data-piece-cover]")!;
    const cut = !!cover.querySelector("[data-showcase-cut='top']");
    const imgs = [...cover.querySelectorAll("img")].filter((i) => {
      const b = i.getBoundingClientRect();
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
      const [px, py] = getComputedStyle(img).objectPosition.split(" ");
      const at = (v: string | undefined, room: number) => (!v ? room / 2 : v.endsWith("%") ? (room * parseFloat(v)) / 100 : parseFloat(v));
      dx = at(px, b.width - dw);
      dy = at(py, b.height - dh);
    }
    let box = { y0: 0, y1: 1 };
    const src = img.currentSrc || img.src;
    if (/\/cutouts\//.test(src)) {
      const c = document.createElement("canvas");
      const W = 160, H = Math.max(1, Math.round((160 * img.naturalHeight) / img.naturalWidth));
      c.width = W;
      c.height = H;
      const g = c.getContext("2d")!;
      g.drawImage(img, 0, 0, W, H);
      const d = g.getImageData(0, 0, W, H).data;
      let y0 = H, y1 = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3]! > 40) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      box = { y0: y0 / H, y1: (y1 + 1) / H };
    }
    const view = /\/cutouts\/[^/]+\/([a-z0-9-]+?)-\d+\./.exec(src)?.[1] ?? null;
    return { hb, cut, view, imageTop: b.top + dy, drawn: dh, top: b.top + dy + box.y0 * dh, bottom: b.top + dy + box.y1 * dh, vh: innerHeight };
  });
}

test("1. every universe: the top of its piece under the menu (its bail), at 1440, 1920 and on an iPhone", async ({ page }, info) => {
  test.setTimeout(15 * 60_000);
  const sizes = phone(info.project.name) ? [null] : [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }];
  const wrong: string[] = [];
  for (const size of sizes) {
    if (size) await page.setViewportSize(size);
    for (const p of cat.pieces) {
      await open(page, p.slug);
      const r = await measure(page);
      if (!r) continue;
      const bail = r.view ? BAIL_TOP[p.slug + "/" + r.view] : undefined;
      const where = p.slug + "/" + r.view + " @" + (size ? size.width : "iphone");
      if (r.bottom > r.vh + 2) wrong.push(where + " bottom " + Math.round(r.bottom));
      if (!r.cut) {
        // A whole piece: its first opaque pixel under the menu.
        if (r.top < r.hb - 1) wrong.push(where + " top " + Math.round(r.top) + " < menu " + Math.round(r.hb));
      } else {
        // Cut by its photo: the cut hidden under the menu…
        if (r.imageTop > r.hb + 1) wrong.push(where + " cut seen at " + Math.round(r.imageTop));
        // …a pendant on its chain: its bail under the menu; a chain alone (its U) has no bail.
        if (p.type !== "chain") {
          if (bail === undefined) wrong.push(where + ": a pendant cut at the top without its BAIL_TOP");
          else if (r.imageTop + bail * r.drawn < r.hb + 4) wrong.push(where + " bail " + Math.round(r.imageTop + bail * r.drawn) + " < menu " + Math.round(r.hb));
        }
      }
    }
  }
  expect(wrong).toEqual([]);
});

test("1. MT — NEXUS CROSS: the cross alone, its diamond-shaped bail whole under the menu", async ({ page }) => {
  await open(page, "malik-tillman-cross-pendant");
  const r = (await measure(page))!;
  expect(r.view).toBe("alone");
  expect(r.cut).toBe(false);
  expect(r.top).toBeGreaterThan(r.hb + 4);
});

test("2. VfB on a phone: the stadium at night (its roof, its lights), the computer unchanged", async ({ page }, info) => {
  await open(page, "vfb-stuttgart-dfb-pokal-2025");
  const img = page.locator("[data-universe] picture img").first();
  await expect.poll(() => img.evaluate((e: HTMLImageElement) => e.currentSrc), { timeout: 15_000 }).toMatch(phone(info.project.name) ? /\/media\/universes\/vfb-m-/ : /\/media\/universes\/vfb-victoire-v2-\d/);
});

test("3. the first film of every page: its poster and the image it starts on are bright, the piece seen", async ({ page }, info) => {
  test.setTimeout(10 * 60_000);
  const wrong: string[] = [];
  for (const p of cat.pieces) {
    await open(page, p.slug);
    const film = page.locator("[data-feature-film] video").first();
    if ((await film.count()) === 0) continue;
    const r = await film.evaluate(async (v: HTMLVideoElement) => {
      const lum = (draw: (g: CanvasRenderingContext2D) => void) => {
        const c = document.createElement("canvas");
        c.width = 48;
        c.height = 86;
        const g = c.getContext("2d")!;
        draw(g);
        const d = g.getImageData(0, 0, 48, 86).data;
        let s = 0;
        for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!;
        return s / (d.length / 4);
      };
      const img = new Image();
      img.src = v.poster;
      await img.decode();
      const poster = lum((g) => g.drawImage(img, 0, 0, 48, 86));
      // The image it starts on (past its black opening, `start`): loaded, paused there, never played aloud.
      v.muted = true;
      v.preload = "auto";
      v.load();
      await new Promise((res) => v.addEventListener("loadeddata", res, { once: true }));
      const start = Number(v.dataset.start ?? 0);
      v.pause();
      v.currentTime = start || 0.05;
      await new Promise((res) => v.addEventListener("seeked", res, { once: true }));
      // WebKit may draw the frame a moment after « seeked »: measured again until it is there.
      let first = 0;
      for (let k = 0; k < 6 && first < 25; k++) {
        await new Promise((res) => setTimeout(res, 150 + k * 150));
        first = Math.max(first, lum((g) => g.drawImage(v, 0, 0, 48, 86)));
      }
      return { poster: Math.round(poster), first: Math.round(first), start };
    });
    // Its image before it plays (jewels on black: a bright piece on a dark ground) and the image it starts on: never almost
    // black (the jersey measured at 43/255 on the evening of 28/11/2026).
    if (r.poster < 55 || r.first < 25) wrong.push(p.slug + " " + JSON.stringify(r));
  }
  expect(wrong, info.project.name).toEqual([]);
});

test("4. the watches: Tajon Buchanan and Radja Nainggolan, a real photo, smaller, in the fine frame of the page", async ({ page }) => {
  for (const slug of ["tajon-buchanan-iced-watch", "radja-nainggolan-iced-watch"]) {
    await open(page, slug);
    const frame = page.locator("[data-opening-framed]");
    await expect(frame).toBeVisible();
    const f = (await frame.boundingBox())!;
    const cover = (await page.locator("[data-piece-cover]").boundingBox())!;
    expect(f.height, slug).toBeLessThan(cover.height * 0.72);
    expect(await frame.evaluate((e) => getComputedStyle(e).borderTopWidth)).toBe("1px");
  }
});

test("5. never the same photo twice on a page; the Thorned T with four views in Every Angle", async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const wrong: string[] = [];
  for (const p of cat.pieces) {
    await open(page, p.slug);
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 900) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 30));
      }
    });
    // Its opening counts once (its view drawn for a computer and for a phone), then every photo of the page.
    const files = await page.locator("main img").evaluateAll((els) => {
      const key = (e: Element) =>
        (e.getAttribute("src") ?? "")
          .replace(/^https?:\/\/[^/]+/, "")
          .replace(/[?#].*$/, "")
          .replace(/\.(webp|avif|jpe?g|png)$/i, "")
          .replace(/\.(w\d+|loupe)$/, "")
          .replace(/\.[0-9a-f]{10}$/, "")
          .replace(/-(\d{3,4})$/, "");
      const shown = els.filter((e) => !e.closest("[data-similar], [data-piece-nav], header, footer") && !(e.getAttribute("src") ?? "").startsWith("data:"));
      const opening = [...new Set(shown.filter((e) => e.closest("[data-piece-cover]")).map(key))];
      return [...opening, ...shown.filter((e) => !e.closest("[data-piece-cover]")).map(key)];
    });
    const seen = new Set<string>();
    for (const f of files) {
      if (seen.has(f)) wrong.push(p.slug + " " + f);
      seen.add(f);
    }
  }
  expect([...new Set(wrong)]).toEqual([]);
  await open(page, "marcus-thuram-thorned-t-pendant");
  await expect(page.locator("[data-every-angle] ol:not([data-angle-rest]) > li")).toHaveCount(4);
  // Its story (the T turning on velvet) never under « Created exclusively for »: it is not worn there.
  await expect(page.locator("[data-worn-by]")).toHaveCount(0);
});

test("6. the Cuban chains: the clasp signed BRT is the first close-up of The Art of Detail", async ({ page }) => {
  for (const [slug, clasp] of [["baguette-cuban-chain", "p10"], ["white-iced-cuban-chain", "p01"]] as const) {
    await open(page, slug);
    await expect(page.locator("[data-magazine-block='1'] [data-magazine-photo] img").first(), slug).toHaveAttribute("src", new RegExp("/" + clasp + "[.]"));
  }
});
