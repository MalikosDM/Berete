// From one universe to the next (Yoni, 27/11/2026, his video on the Butterfly pendant; src/components/PieceNav.tsx): in the
// opening of every piece, the piece before and the piece after in the order of The Creations, looping; their names in the 6
// languages (mirrored in Arabic); the arrow keys on a computer, a swipe on a phone; a client-side passage (no reload) with a
// crossfade (View Transitions), instant with "reduce motion". Computer (Chromium 1440 × 900, and 1920 × 1080 for the
// screenshots) and iPhone (WebKit 390). Screenshots: ~/Downloads/_verif-corrections-27-11/navigation/.
//
// The order is read on the page of The Creations itself (all of them), with the same live catalogue (/api/catalogue).
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { expect, test, type Page } from "./fixtures";
import { skipIntro } from "./helpers";

const SHOTS = join(homedir(), "Downloads/_verif-corrections-27-11/navigation");
mkdirSync(SHOTS, { recursive: true });

const BUTTERFLY = "michy-batshuayi-butterfly-pendant";
const DRAGON = "kevin-schade-dragon-ball-pendant";

type Entry = { slug: string; title: string };

/** Loads an address of the site and waits for its live catalogue (asked once the page is there). */
async function load(page: Page, url: string) {
  const live = page.waitForResponse((r) => r.url().endsWith("/api/catalogue"), { timeout: 30_000 }).catch(() => null);
  await page.goto(url, { waitUntil: "load" });
  await live;
  await page.waitForTimeout(400);
}

/** The pieces of The Creations (all of them), in the order of the page. */
async function creations(page: Page, prefix = ""): Promise<Entry[]> {
  await load(page, prefix + "/creations");
  const cards = page.locator("[data-creations-grid] [data-piece-card]");
  await expect(cards.first()).toBeVisible();
  return cards.evaluateAll((els) => els.map((e) => ({ slug: e.getAttribute("data-piece-card") ?? "", title: (e.querySelector("[data-card-title]")?.textContent ?? "").trim() })));
}

/** A piece page as a visitor gets it (the intro of the house seen), its entrance over. */
async function openPiece(page: Page, slug: string, prefix = "") {
  await load(page, prefix + "/pieces/" + slug);
  await expect(page.locator('article[data-piece="' + slug + '"]')).toBeVisible();
  await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
}

/** The passage over (the crossfade ended): the next arrow, key or swipe is heard again. */
async function settled(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.hasAttribute("data-piece-nav-moving")), { timeout: 10_000 }).toBe(false);
}

const prev = (page: Page) => page.locator('[data-piece-nav-link="prev"]');
const next = (page: Page) => page.locator('[data-piece-nav-link="next"]');

/** The neighbours of a piece in a list, looping. */
function around(list: Entry[], slug: string) {
  const i = list.findIndex((p) => p.slug === slug);
  expect(i, slug + " in The Creations").toBeGreaterThanOrEqual(0);
  return { prev: list[(i - 1 + list.length) % list.length]!, next: list[(i + 1) % list.length]! };
}

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
  // Counts the view transitions asked (a crossfade), and marks the window: a full reload would lose the mark.
  await page.addInitScript(() => {
    const w = window as unknown as { __vt: number };
    w.__vt = 0;
    const doc = document as Document & { startViewTransition?: (...a: unknown[]) => unknown };
    const native = doc.startViewTransition;
    if (typeof native === "function") {
      doc.startViewTransition = function (this: Document, ...a: unknown[]) {
        w.__vt += 1;
        return native.apply(this, a);
      };
    }
  });
});

test("the arrows: the neighbours in the order of The Creations, their names, looping at both ends", async ({ page }) => {
  const list = await creations(page);
  expect(list.length).toBeGreaterThan(2);

  for (const slug of [BUTTERFLY, list[0]!.slug, list[list.length - 1]!.slug]) {
    await openPiece(page, slug);
    const n = around(list, slug);
    await expect(prev(page)).toHaveAttribute("href", "/pieces/" + n.prev.slug);
    await expect(next(page)).toHaveAttribute("href", "/pieces/" + n.next.slug);
    await expect(prev(page)).toHaveAttribute("aria-label", "Previous creation: " + n.prev.title);
    await expect(next(page)).toHaveAttribute("aria-label", "Next creation: " + n.next.title);
    await expect(page.locator("[data-piece-nav]")).toHaveAttribute("aria-label", "Other creations");
    await expect(prev(page)).toBeVisible();
    await expect(next(page)).toBeVisible();
  }
  // Looping: before the first, the last; after the last, the first.
  await openPiece(page, list[0]!.slug);
  await expect(prev(page)).toHaveAttribute("href", "/pieces/" + list[list.length - 1]!.slug);
  await openPiece(page, list[list.length - 1]!.slug);
  await expect(next(page)).toHaveAttribute("href", "/pieces/" + list[0]!.slug);
});

test("the language is kept: French addresses and names, Arabic mirrored (the previous piece on the right)", async ({ page }) => {
  const fr = await creations(page, "/fr");
  await openPiece(page, BUTTERFLY, "/fr");
  const n = around(fr, BUTTERFLY);
  await expect(prev(page)).toHaveAttribute("href", "/fr/pieces/" + n.prev.slug);
  await expect(next(page)).toHaveAttribute("href", "/fr/pieces/" + n.next.slug);
  await expect(prev(page)).toHaveAttribute("aria-label", "Création précédente : " + n.prev.title);
  await expect(next(page)).toHaveAttribute("aria-label", "Création suivante : " + n.next.title);

  await openPiece(page, BUTTERFLY, "/ar");
  await expect(prev(page)).toHaveAttribute("href", /^\/ar\/pieces\//);
  await expect(prev(page)).toHaveAttribute("aria-label", /^الإبداع السابق: /);
  const [p, x] = [await prev(page).boundingBox(), await next(page).boundingBox()];
  expect(p!.x, "Arabic: the previous piece on the right").toBeGreaterThan(x!.x);
});

test("the arrows stay clear of the jewel, the title and the buttons, and are large enough to touch", async ({ page }, info) => {
  for (const slug of [BUTTERFLY, DRAGON]) {
    await openPiece(page, slug);
    const boxes = await page.evaluate(() => {
      const r = (el: Element | null) => (el ? el.getBoundingClientRect().toJSON() : null) as DOMRect | null;
      const visible = [...document.querySelectorAll('[data-piece-cover] [data-place="0"] img, [data-piece-cover] [data-showcase-slide="0"] img, [data-piece-cover] img')].find((e) => e.getBoundingClientRect().width > 0) as HTMLImageElement | undefined;
      let jewel: DOMRect | null = null;
      if (visible && visible.naturalWidth) {
        const f = visible.getBoundingClientRect();
        const k = Math.min(f.width / visible.naturalWidth, f.height / visible.naturalHeight);
        const w = visible.naturalWidth * k;
        const h = visible.naturalHeight * k;
        jewel = { left: f.left + (f.width - w) / 2, top: f.top + (f.height - h) / 2, right: f.left + (f.width + w) / 2, bottom: f.top + (f.height + h) / 2 } as DOMRect;
      }
      return {
        prev: r(document.querySelector('[data-piece-nav-link="prev"]')),
        next: r(document.querySelector('[data-piece-nav-link="next"]')),
        title: r(document.querySelector("#piece-title")),
        buttons: [...document.querySelectorAll("[data-piece-intro] [data-cta]")].map((e) => r(e)),
        jewel,
      };
    });
    const overlaps = (a: DOMRect | null, b: DOMRect | null) => Boolean(a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom);
    for (const arrow of [boxes.prev, boxes.next]) {
      expect(arrow!.width).toBeGreaterThanOrEqual(48);
      expect(arrow!.height).toBeGreaterThanOrEqual(48);
      expect(overlaps(arrow, boxes.title), slug + ": an arrow over the title").toBe(false);
      for (const b of boxes.buttons) expect(overlaps(arrow, b), slug + ": an arrow over a button").toBe(false);
    }
    // On a computer, beside the jewel, vertically centred on the opening.
    if (info.project.name === "desktop") {
      for (const arrow of [boxes.prev, boxes.next]) expect(overlaps(arrow, boxes.jewel), slug + ": an arrow over the jewel").toBe(false);
      const opening = (await page.locator("[data-piece-opening]").boundingBox())!;
      const mid = opening.y + opening.height / 2;
      expect(Math.abs(boxes.prev!.top + boxes.prev!.height / 2 - mid)).toBeLessThan(4);
    }
  }
});

test("computer: the name on hover, the arrow keys, a crossfade without reload", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "computer only");
  const list = await creations(page);
  await openPiece(page, BUTTERFLY);
  const n = around(list, BUTTERFLY);
  await page.evaluate(() => ((window as unknown as { __mark: string }).__mark = "same window"));

  // The name, on hover only.
  const name = next(page).locator("[data-piece-nav-name]");
  await expect(name).toBeHidden();
  await next(page).hover();
  await expect(name).toBeVisible();
  await expect(name).toContainText(n.next.title);
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(SHOTS, "desktop-1440-butterfly-hover-next.jpg"), quality: 82 });
  await page.mouse.move(700, 450);

  // → : the next piece, in the same window, through a view transition.
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(new RegExp("/pieces/" + n.next.slug + "$"));
  await expect(page.locator('article[data-piece="' + n.next.slug + '"]')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __mark?: string }).__mark)).toBe("same window");
  expect(await page.evaluate(() => (window as unknown as { __vt: number }).__vt)).toBeGreaterThan(0);
  await settled(page);

  // ← : back to the Butterfly.
  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(new RegExp("/pieces/" + BUTTERFLY + "$"));
  await expect(page.locator('article[data-piece="' + BUTTERFLY + '"]')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __mark?: string }).__mark)).toBe("same window");
  await settled(page);

  // Never with a modifier key, nor while a field has the focus.
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Alt+ArrowLeft");
  await page.evaluate(() => {
    const input = document.createElement("input");
    input.id = "pn-field";
    document.querySelector("[data-piece-intro]")!.append(input);
    input.focus();
  });
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(700);
  await expect(page).toHaveURL(new RegExp("/pieces/" + BUTTERFLY + "$"));
  await page.evaluate(() => document.getElementById("pn-field")?.remove());

  // A click on the arrow: the same passage; from the keyboard (Enter), the arrow keeps the focus on the next page.
  await next(page).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp("/pieces/" + n.next.slug + "$"));
  await expect(next(page)).toBeFocused();
  expect(await page.evaluate(() => (window as unknown as { __mark?: string }).__mark)).toBe("same window");
});

test("iPhone: a swipe left for the next piece, right for the previous one; a vertical swipe scrolls", async ({ page }, info) => {
  test.skip(info.project.name !== "iphone", "phone only");
  const list = await creations(page);
  await openPiece(page, BUTTERFLY);
  const n = around(list, BUTTERFLY);
  await page.evaluate(() => ((window as unknown as { __mark: string }).__mark = "same window"));

  /** A swipe of one finger on the words of the opening (its jewel may be a showcase with its own swipe). */
  const swipe = async (dx: number, dy: number) => {
    const box = (await page.locator("[data-piece-intro]").boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + Math.min(60, box.height / 2);
    const target = page.locator("[data-piece-intro]");
    const touch = (cx: number, cy: number) => [{ identifier: 1, clientX: cx, clientY: cy, pageX: cx, pageY: cy }];
    await target.dispatchEvent("touchstart", { touches: touch(x, y), targetTouches: touch(x, y), changedTouches: touch(x, y) });
    for (let k = 1; k <= 5; k++) {
      const p = touch(x + (dx * k) / 5, y + (dy * k) / 5);
      await target.dispatchEvent("touchmove", { touches: p, targetTouches: p, changedTouches: p });
    }
    await target.dispatchEvent("touchend", { touches: [], targetTouches: [], changedTouches: touch(x + dx, y + dy) });
  };

  // Vertical: nothing.
  await swipe(10, -220);
  await page.waitForTimeout(700);
  await expect(page).toHaveURL(new RegExp("/pieces/" + BUTTERFLY + "$"));

  // Left: the next piece, in the same window.
  await swipe(-160, 8);
  await expect(page).toHaveURL(new RegExp("/pieces/" + n.next.slug + "$"));
  await expect(page.locator('article[data-piece="' + n.next.slug + '"]')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __mark?: string }).__mark)).toBe("same window");
  await settled(page);

  // Right: back to the Butterfly.
  await swipe(160, -6);
  await expect(page).toHaveURL(new RegExp("/pieces/" + BUTTERFLY + "$"));
  expect(await page.evaluate(() => (window as unknown as { __mark?: string }).__mark)).toBe("same window");
  await settled(page);

  // A showcase of several views keeps its own swipe: a swipe there does not leave the piece.
  if ((await page.locator('[data-piece-cover] [data-showcase="multi"]').count()) > 0) {
    const track = page.locator("[data-piece-cover] [data-showcase-track]");
    const b = (await track.boundingBox())!;
    const t = (cx: number) => [{ identifier: 2, clientX: cx, clientY: b.y + b.height / 2, pageX: cx, pageY: b.y + b.height / 2 }];
    await track.dispatchEvent("touchstart", { touches: t(b.x + b.width * 0.7), targetTouches: t(b.x + b.width * 0.7), changedTouches: t(b.x + b.width * 0.7) });
    await track.dispatchEvent("touchmove", { touches: t(b.x + b.width * 0.4), targetTouches: t(b.x + b.width * 0.4), changedTouches: t(b.x + b.width * 0.4) });
    await track.dispatchEvent("touchend", { touches: [], targetTouches: [], changedTouches: t(b.x + b.width * 0.2) });
    await page.waitForTimeout(700);
    await expect(page).toHaveURL(new RegExp("/pieces/" + BUTTERFLY + "$"));
  }

  // A tap on the arrow at the bottom of the jewel.
  await next(page).tap();
  await expect(page).toHaveURL(new RegExp("/pieces/" + n.next.slug + "$"));
  expect(await page.evaluate(() => (window as unknown as { __mark?: string }).__mark)).toBe("same window");
});

test("without View Transitions (an older browser): a short fade of the page, still without reload", async ({ page }) => {
  await page.addInitScript(() => {
    delete (Document.prototype as unknown as { startViewTransition?: unknown }).startViewTransition;
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  });
  const list = await creations(page);
  await openPiece(page, BUTTERFLY);
  const n = around(list, BUTTERFLY);
  expect(await page.evaluate(() => "startViewTransition" in document)).toBe(false);
  await page.evaluate(() => ((window as unknown as { __mark: string }).__mark = "same window"));
  await prev(page).click();
  await expect(page).toHaveURL(new RegExp("/pieces/" + n.prev.slug + "$"));
  await expect(page.locator('article[data-piece="' + n.prev.slug + '"]')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __mark?: string }).__mark)).toBe("same window");
  await settled(page);
  // Faded in to the end: the new page whole.
  await expect.poll(() => page.locator("article[data-piece]").evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
});

test("reduce motion: the passage is instant (no crossfade), still without reload", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const list = await creations(page);
  await openPiece(page, BUTTERFLY);
  const n = around(list, BUTTERFLY);
  await page.evaluate(() => ((window as unknown as { __mark: string }).__mark = "same window"));
  await next(page).click();
  await expect(page).toHaveURL(new RegExp("/pieces/" + n.next.slug + "$"));
  await expect(page.locator('article[data-piece="' + n.next.slug + '"]')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __mark?: string }).__mark)).toBe("same window");
  expect(await page.evaluate(() => (window as unknown as { __vt: number }).__vt)).toBe(0);
  // Nothing faded either: the new page at full opacity at once.
  expect(await page.locator("article[data-piece]").evaluate((el) => el.getAnimations().length)).toBe(0);
});

test("screenshots: the Butterfly pendant and the Dragon Ball pendant", async ({ page }, info) => {
  const sizes = info.project.name === "desktop" ? [{ w: 1440, h: 900 }, { w: 1920, h: 1080 }] : [{ w: 390, h: 844 }];
  for (const { w, h } of sizes) {
    await page.setViewportSize({ width: w, height: h });
    for (const slug of [BUTTERFLY, DRAGON]) {
      await openPiece(page, slug);
      await page.waitForTimeout(800);
      const name = slug === BUTTERFLY ? "butterfly" : "dragon-ball";
      await page.screenshot({ path: join(SHOTS, info.project.name + "-" + w + "-" + name + ".jpg"), quality: 82 });
      if (info.project.name === "desktop") {
        await prev(page).hover();
        await page.waitForTimeout(600);
        await page.screenshot({ path: join(SHOTS, info.project.name + "-" + w + "-" + name + "-hover-prev.jpg"), quality: 82 });
        await page.mouse.move(w / 2, h / 2);
      }
    }
  }
  if (info.project.name === "iphone") {
    await openPiece(page, BUTTERFLY, "/ar");
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(SHOTS, "iphone-390-butterfly-ar.jpg"), quality: 82 });
  } else {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openPiece(page, BUTTERFLY, "/ar");
    await prev(page).hover();
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(SHOTS, "desktop-1440-butterfly-ar-hover-prev.jpg"), quality: 82 });
    // The middle of the dissolve from one universe to the next.
    await openPiece(page, BUTTERFLY);
    await page.waitForTimeout(800);
    await page.keyboard.press("ArrowRight");
    await expect(page).not.toHaveURL(new RegExp("/pieces/" + BUTTERFLY + "$"));
    await page.waitForTimeout(220);
    await page.screenshot({ path: join(SHOTS, "desktop-1440-crossfade-middle.jpg"), quality: 82 });
    await settled(page);
  }
});
