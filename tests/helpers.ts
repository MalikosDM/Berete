// Shared by the checks of the site (site.spec.ts) and of its languages (languages.spec.ts).
import { mkdirSync } from "node:fs";
import { expect, type Page, type TestInfo } from "@playwright/test";
import type { Catalogue } from "../src/data/types";


export type Problems = { errors: string[] };

/** Collects console errors, page errors, failed requests and 4xx/5xx answers. */
export function watch(page: Page): Problems {
  const problems: Problems = { errors: [] };
  page.on("console", (m) => {
    if (m.type() === "error") problems.errors.push("console: " + m.text());
  });
  page.on("pageerror", (e) => {
    // Safari (WebKit) reports a request of the site cut short by leaving the page as "access control checks": the
    // next page.goto came before the background request (live catalogue, 3D models) had its answer. Not an error.
    if (/\/api\/\S* due to access control checks/.test(e.message)) return;
    problems.errors.push("page error: " + e.message);
  });
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

export async function skipIntro(page: Page) {
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
export async function getCatalogue(page: Page): Promise<Catalogue> {
  if (catalogue) return catalogue;
  const res = await page.request.get("/api/catalogue");
  expect(res.ok()).toBeTruthy();
  catalogue = (await res.json()) as Catalogue;
  return catalogue;
}

export function shotPath(info: TestInfo, name: string): string {
  const dir = "verification/" + info.project.name;
  mkdirSync(dir, { recursive: true });
  return dir + "/" + name + ".jpg";
}

export async function scrollTo(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await page.waitForTimeout(700);
}

/** Elements sticking out of the screen sideways (outside of horizontal scrollers). */
export async function overflow(page: Page): Promise<string[]> {
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
      // A hidden hint (shown on hover only, like the names of the buttons of the 3D viewer) is not seen sticking out.
      if (s.visibility === "hidden" || s.position === "fixed" || s.opacity === "0") continue;
      if ((r.right > vw + 1 || r.left < -1) && !clipped(el)) out.push(el.tagName.toLowerCase() + "." + String(el.className).slice(0, 60) + " → " + Math.round(r.left) + ".." + Math.round(r.right));
      if (out.length > 5) break;
    }
    return out;
  });
}

/** Visible text under 16px. */
export async function smallText(page: Page): Promise<string[]> {
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
export async function checkPage(page: Page, info: TestInfo, path: string, name: string, shots = 3) {
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

