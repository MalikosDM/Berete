import { mkdirSync } from "node:fs";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import type { Catalogue } from "../src/data/types";

/*
 * Checks of the whole site, on a 1440px desktop and a 390px iPhone:
 * no console error, no 404, the 30 stories in order with every step shown
 * and every video really playing, the scroll-driven films, every page of the
 * catalogue, no horizontal overflow, readable text. Screenshots: verification/.
 */

const STORY_TITLES = [
  "Kenan Yildiz", "Noah Okafor", "Kevin Schade", "Thuram", "Loïs Openda", "Inter Milan", "Michy Batshuayi", "Radja Nainggolan", "Collectors", "Press",
  "Noah Okafor II", "Jamie Leweling", "Deniz Undav", "Angelo Stiller", "Samuel Ballet", "Keita Losene", "Malik Tillman", "Thuram II", "Noah Okafor S24", "Thuram SS23",
  "Inter Squad", "Sambi Lokonga", "NZ", "Malik Tillman II", "Tajon Buchanan", "Eljero Elia", "Sidney Eweka", "Tanguy Nianzou", "Marcus Thuram", "Jeff Chabot",
];

const MAIN_PAGES = ["/", "/creations", "/players", "/atelier", "/boxes", "/process", "/about", "/contact", "/legal", "/privacy", "/admin"];

/* ---------- Helpers ---------- */

type Problems = { errors: string[] };

/** Collects console errors, page errors, failed requests and 4xx/5xx answers. */
function watch(page: Page): Problems {
  const problems: Problems = { errors: [] };
  page.on("console", (m) => {
    if (m.type() === "error") problems.errors.push("console: " + m.text());
  });
  page.on("pageerror", (e) => problems.errors.push("page error: " + e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) problems.errors.push("HTTP " + r.status() + ": " + r.url());
  });
  page.on("requestfailed", (r) => {
    const reason = r.failure()?.errorText ?? "";
    // Leaving a page cancels the media still loading: not an error.
    if (/abort|cancel/i.test(reason)) return;
    problems.errors.push("failed: " + r.url() + " (" + reason + ")");
  });
  return problems;
}

async function skipIntro(page: Page) {
  await page.addInitScript(() => {
    // Keep every resource entry (the films have hundreds of frames).
    performance.setResourceTimingBufferSize(10_000);
    try {
      sessionStorage.setItem("bj-intro-seen", "1");
    } catch {
      /* ignore */
    }
  });
}

let catalogue: Catalogue | null = null;
async function getCatalogue(page: Page): Promise<Catalogue> {
  if (catalogue) return catalogue;
  const res = await page.request.get("/api/catalogue");
  expect(res.ok()).toBeTruthy();
  catalogue = (await res.json()) as Catalogue;
  return catalogue;
}

function shotPath(info: TestInfo, name: string): string {
  const dir = "verification/" + info.project.name;
  mkdirSync(dir, { recursive: true });
  return dir + "/" + name + ".jpg";
}

async function scrollTo(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await page.waitForTimeout(700);
}

/** Elements sticking out of the screen sideways (outside of horizontal scrollers). */
async function overflow(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out: string[] = [];
    if (document.documentElement.scrollWidth > vw + 1) out.push("page scrollWidth " + document.documentElement.scrollWidth + " > " + vw);
    const clipped = (el: Element): boolean => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (["auto", "scroll", "hidden", "clip"].includes(s.overflowX) || s.position === "fixed") return true;
      }
      return false;
    };
    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.position === "fixed") continue;
      if ((r.right > vw + 1 || r.left < -1) && !clipped(el)) out.push(el.tagName.toLowerCase() + "." + String(el.className).slice(0, 60) + " → " + Math.round(r.left) + ".." + Math.round(r.right));
      if (out.length > 5) break;
    }
    return out;
  });
}

/** Visible text under 16px. */
async function smallText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n.textContent ?? "").trim();
      const el = n.parentElement;
      if (!text || !el) continue;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (s.visibility === "hidden" || s.display === "none" || r.width <= 1 || r.height <= 1 || Number(s.opacity) === 0) continue;
      if (el.closest(".sr-only,[aria-hidden='true'],[hidden],.invisible")) continue;
      if (parseFloat(s.fontSize) < 15.9) out.push(Math.round(parseFloat(s.fontSize) * 10) / 10 + "px: " + text.slice(0, 40));
      if (out.length > 8) break;
    }
    return out;
  });
}

/** Loads a page, scrolls through it (lazy images, reveals), checks it and takes screenshots. */
async function checkPage(page: Page, info: TestInfo, path: string, name: string, shots = 3) {
  const problems = watch(page);
  const res = await page.goto(path, { waitUntil: "load" });
  expect(res?.status(), path).toBeLessThan(400);
  await page.waitForTimeout(800);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = await page.evaluate(() => window.innerHeight);
  const positions = shots <= 1 ? [0] : Array.from({ length: shots }, (_, i) => Math.round(((height - vh) * i) / (shots - 1)));
  // Walk the whole page once so every lazy image is requested.
  for (let y = 0; y < height; y += vh) await scrollTo(page, y);
  for (const [i, y] of positions.entries()) {
    await scrollTo(page, y);
    await page.screenshot({ path: shotPath(info, name + (shots > 1 ? "-" + (i + 1) : "")), type: "jpeg", quality: 60 });
  }
  await scrollTo(page, 0);
  expect(await overflow(page), "horizontal overflow on " + path).toEqual([]);
  if (info.project.name === "iphone") expect(await smallText(page), "text under 16px on " + path).toEqual([]);
  const title = await page.title();
  expect(title, "title of " + path).not.toMatch(/coming soon/i);
  const description = await page.locator('meta[name="description"]').getAttribute("content");
  expect(description?.length ?? 0, "description of " + path).toBeGreaterThan(40);
  await page.waitForTimeout(400);
  expect(problems.errors, "errors on " + path).toEqual([]);
  return title;
}

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

/* ---------- Pages ---------- */

test("main pages: no error, no 404, no overflow, own title", async ({ page }, info) => {
  const titles = new Map<string, string>();
  for (const path of MAIN_PAGES) {
    const name = path === "/" ? "home" : path.slice(1);
    titles.set(path, await checkPage(page, info, path, name, path === "/" || path === "/process" ? 6 : 3));
  }
  expect(titles.get("/")).toBe("Berete Jewellers — Custom High Jewellery, Dubai");
  expect(new Set(titles.values()).size, "every page has its own title").toBe(titles.size);
});

test("every piece and every person has a working page", async ({ page }, info) => {
  const cat = await getCatalogue(page);
  const titles = new Set<string>();
  for (const p of cat.pieces) titles.add(await checkPage(page, info, "/pieces/" + p.slug, "piece-" + p.slug, 1));
  for (const p of cat.people) titles.add(await checkPage(page, info, "/players/" + p.slug, "player-" + p.slug, 1));
  expect(titles.size, "unique titles").toBe(cat.pieces.length + cat.people.length);
});

test("creations filters and old addresses", async ({ page }) => {
  const problems = watch(page);
  await page.goto("/creations");
  const cards = page.locator('a[href^="/pieces/"]');
  await expect(cards).toHaveCount(9);
  await page.getByRole("button", { name: "Pendants" }).click();
  await expect(cards).toHaveCount(5);
  await page.getByRole("button", { name: "Rings" }).click();
  await expect(cards).toHaveCount(2);
  await page.getByRole("button", { name: "Chains" }).click();
  await expect(cards).toHaveCount(2);
  await page.getByRole("button", { name: "Watches" }).click();
  await expect(page.getByText("New pieces are being crafted")).toBeVisible();
  await page.goto("/creations/the-hand");
  await expect(page).toHaveURL(/\/pieces\/the-hand$/);
  await page.goto("/pieces");
  await expect(page).toHaveURL(/\/creations$/);
  // Every image of the catalogue answers.
  const cat = await getCatalogue(page);
  const files = new Set<string>();
  for (const p of cat.pieces) [p.cover, ...p.gallery, ...p.handover].forEach((m) => files.add(m.src));
  for (const b of cat.boxes) b.images.forEach((m) => files.add(m.src));
  for (const s of cat.stories) {
    files.add(s.cover);
    s.media.forEach((m) => {
      files.add(m.src);
      if (m.poster) files.add(m.poster);
    });
  }
  for (const src of files) {
    const r = await page.request.head(src);
    expect(r.status(), src).toBeLessThan(400);
  }
  expect(problems.errors).toEqual([]);
});

/* ---------- Players are in sync with the stories ---------- */

test("player pages show their stories and pieces", async ({ page }) => {
  const expected: Record<string, { stories: string[]; pieces: number }> = {
    "noah-okafor": { stories: ["Noah Okafor", "Noah Okafor II", "Noah Okafor S24"], pieces: 0 },
    "marcus-thuram": { stories: ["Thuram", "Thuram II", "Thuram SS23", "Marcus Thuram"], pieces: 1 },
    "malik-tillman": { stories: ["Malik Tillman", "Malik Tillman II"], pieces: 0 },
    "tanguy-nianzou": { stories: ["NZ", "Tanguy Nianzou"], pieces: 0 },
    "inter-milan": { stories: ["Inter Milan", "Inter Squad"], pieces: 1 },
    "deniz-undav": { stories: ["Deniz Undav"], pieces: 1 },
    "angelo-stiller": { stories: ["Angelo Stiller"], pieces: 1 },
    "jamie-leweling": { stories: ["Jamie Leweling"], pieces: 1 },
    "maximilian-mittelstaedt": { stories: [], pieces: 1 },
    "chris-fuehrich": { stories: [], pieces: 1 },
    "atakan-karazor": { stories: [], pieces: 1 },
    "vfb-stuttgart": { stories: [], pieces: 1 },
    "sidney-eweka": { stories: ["Sidney Eweka"], pieces: 0 },
  };
  for (const [slug, want] of Object.entries(expected)) {
    await page.goto("/players/" + slug);
    const stories = await page.locator("[data-player-story]").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")?.replace("Open the story ", "")));
    expect(stories, slug).toEqual(want.stories);
    await expect(page.locator('#player-pieces ~ ul a[href^="/pieces/"]'), slug).toHaveCount(want.pieces);
  }
  // Collectors and Press stay stories only.
  await page.goto("/players");
  await expect(page.locator('a[href="/players/collectors"], a[href="/players/press"]')).toHaveCount(0);
});

/* ---------- Stories ---------- */

test("the 30 stories, in order, every step shown, videos playing", async ({ page }, info) => {
  const problems = watch(page);
  const cat = await getCatalogue(page);
  await page.goto("/");
  const bubbles = page.locator("[data-story-bubble]");
  await expect(bubbles).toHaveCount(30);
  const titles = await bubbles.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")?.replace("Open the story ", "")));
  expect(titles).toEqual(STORY_TITLES);

  // Covers: swipe the bar to its end, as a visitor would, so the lazy ones load; then check them all.
  const bar = page.locator("[data-stories-bar] .no-scrollbar");
  const width = await bar.evaluate((el) => el.scrollWidth);
  for (let x = 0; x <= width; x += 200) {
    await bar.evaluate((el, left) => el.scrollTo({ left }), x);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1000);
  await bar.evaluate((el) => el.scrollTo({ left: 0 }));
  const covers = await page.locator("[data-story-bubble] img").evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0));
  expect(covers.filter(Boolean).length, "covers loaded").toBe(30);

  // Names: whole, on two lines at most; 16px margin on phones.
  const names = await page.locator("[data-story-name]").evaluateAll((els) =>
    els.map((e) => {
      const s = getComputedStyle(e);
      const lines = Math.round(e.scrollHeight / parseFloat(s.lineHeight));
      return { text: e.textContent, lines, cut: e.scrollWidth > e.clientWidth + 1 };
    }),
  );
  for (const n of names) {
    expect(n.lines, n.text ?? "").toBeLessThanOrEqual(2);
    expect(n.cut, n.text ?? "").toBe(false);
  }
  if (info.project.name === "iphone") {
    const left = await bubbles.first().evaluate((el) => el.getBoundingClientRect().left);
    expect(Math.round(left)).toBe(16);
  }
  await page.screenshot({ path: shotPath(info, "stories-bar"), type: "jpeg", quality: 60 });

  await bubbles.first().click();
  const dialog = page.locator('[role="dialog"][data-story]');
  await expect(dialog).toBeVisible();
  for (const [i, story] of cat.stories.entries()) {
    await expect(dialog).toHaveAttribute("data-story", story.slug);
    for (const [j, item] of story.media.entries()) {
      await expect(dialog, story.slug + " step " + (j + 1)).toHaveAttribute("data-step", String(j));
      if (item.type === "image") {
        const img = dialog.locator("[data-story-surface] img");
        await expect(img).toHaveAttribute("src", item.src);
        await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0), { message: story.slug + " photo " + (j + 1) }).toBe(true);
      } else {
        const video = dialog.locator("video[data-story-video]");
        await expect(video).toHaveAttribute("src", item.src);
        await expect.poll(() => video.evaluate((el) => (el as HTMLVideoElement).currentTime), { message: story.slug + " video " + (j + 1) + " plays", timeout: 15_000 }).toBeGreaterThan(0.25);
        // ONE video element for the whole viewer.
        expect(await page.locator("video[data-story-video]").count()).toBe(1);
      }
      if (j === 0 && (i === 0 || i === 9)) await page.screenshot({ path: shotPath(info, "story-" + story.slug), type: "jpeg", quality: 60 });
      await page.keyboard.press("ArrowRight");
    }
  }
  await expect(dialog).toHaveCount(0);
  expect(problems.errors).toEqual([]);
});

test("story viewer: buttons, pause, close", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-story-bubble="press"]').click();
  const dialog = page.locator('[role="dialog"][data-story="press"]');
  await expect(dialog.getByRole("link", { name: /Read the article/ })).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Want yours\? WhatsApp/ })).toHaveAttribute("href", /wa\.me\/971XXXXXXXXX/);
  // Long press pauses the photo timer.
  const bar = dialog.locator("[data-progress]");
  const surface = dialog.locator("[data-story-surface]");
  const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(400);
  const w1 = await bar.evaluate((el) => (el as HTMLElement).style.width);
  await page.waitForTimeout(1000);
  const w2 = await bar.evaluate((el) => (el as HTMLElement).style.width);
  await page.mouse.up();
  expect(w2).toBe(w1);
  await dialog.getByRole("button", { name: "Close the story" }).click();
  await expect(dialog).toHaveCount(0);
});

/* ---------- Scroll-driven films ---------- */

for (const path of ["/", "/process"]) {
  test("the film of " + path + " is moved by the scroll only", async ({ page }) => {
    const problems = watch(page);
    await page.goto(path);
    const section = page.locator("[data-scroll-video]");
    await expect(section).toHaveCount(1);
    const canvas = section.locator("canvas");
    await expect(canvas).toHaveCount(1);
    const frame = () => canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL("image/jpeg", 0.5).length);
    // Wait for the whole frame sequence.
    await expect(canvas).toHaveAttribute("data-frames", /^\d+$/);
    const count = Number(await canvas.getAttribute("data-frames"));
    await expect
      .poll(() => page.evaluate(() => new Set(performance.getEntriesByType("resource").map((e) => e.name).filter((n) => /frames-(desktop|mobile)\/\d+\.webp/.test(n))).size), { timeout: 60_000 })
      .toBeGreaterThanOrEqual(count);
    const box = await section.evaluate((el) => ({ top: el.getBoundingClientRect().top + window.scrollY, height: el.offsetHeight }));
    const vh = await page.evaluate(() => window.innerHeight);
    const at = async (p: number) => {
      await scrollTo(page, box.top + p * (box.height - vh));
      await page.waitForTimeout(1200);
      return frame();
    };
    const f0 = await at(0);
    await page.waitForTimeout(1500);
    expect(await frame(), "frozen while the scroll does not move").toBe(f0);
    const f1 = await at(0.3);
    const f2 = await at(0.7);
    const back = await at(0.3);
    expect(f1).not.toBe(f0);
    expect(f2).not.toBe(f1);
    expect(Math.abs(back - f1) / f1, "scrolling back shows the same frame again").toBeLessThan(0.02);
    // No <video> plays by itself in the film.
    expect(await section.locator("video").count()).toBe(0);
    expect(problems.errors).toEqual([]);
  });
}

/* ---------- Logo, admin, forms ---------- */

test("logo size in the navigation", async ({ page }, info) => {
  await page.goto("/creations");
  const logo = page.locator('header a[aria-label="Berete Jewellers, home"] span:visible');
  const h = await logo.evaluate((el) => el.getBoundingClientRect().height);
  expect(Math.round(h)).toBe(info.project.name === "iphone" ? 40 : 56);
});

test("contact: call back request reaches the admin", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "once is enough");
  const password = process.env.ADMIN_PASSWORD;
  test.skip(!password, "ADMIN_PASSWORD (.env) is needed to open the admin");
  const problems = watch(page);
  await page.goto("/contact");
  // The block fades in when it reaches the screen.
  await page.locator("button[aria-controls=callback-form]").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.getByRole("button", { name: /Prefer a call back/i }).click();
  const form = page.locator("#callback-form");
  await form.getByLabel("Name").fill("Test Verification");
  await form.getByLabel("Phone number").fill("+971500000000");
  await form.getByRole("button", { name: "Call me back" }).click();
  await expect(page.getByText("We will call you back shortly")).toBeVisible();

  await page.goto("/admin");
  await page.getByLabel("Mot de passe").fill(password!);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByRole("tab", { name: "Stories" })).toBeVisible();
  await expect(page.locator("main li, section li").filter({ hasText: "/kenan-yildiz" })).toHaveCount(1);
  await page.getByRole("tab", { name: "Messages" }).click();
  await expect(page.getByText("Test Verification").first()).toBeVisible();
  expect(problems.errors).toEqual([]);
});
