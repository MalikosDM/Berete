// The stones' test sheet (27/11/2026): the thirteen cuts (round, princess, emerald, asscher, baguette, pear, oval,
// marquise, heart, cushion, radiant, trillion, octagon), drawn traced and fast, under three lightings of the stones, and
// once more with their positions stored as the light files store them (whole numbers of 16 bits: the large emerald cut of
// ZR0982 came out black because of it). Every stone must be readable: never black, never flat white, its facets seen.
// The 3D lab exists only on the development server: BASE_URL=http://localhost:5390 (skipped elsewhere).
import { expect, test } from "./fixtures";

const CUTS = ["round", "princess", "emerald", "asscher", "baguette", "pear", "oval", "marquise", "heart", "cushion", "radiant", "trillion", "octagon"];

type Stat = { name: string; mean: number; contrast: number; black: number; white: number; pixels: number };

async function measure(page: import("@playwright/test").Page, query: string): Promise<Stat[]> {
  // A transparent background: the stones are where the image is opaque.
  const scene = encodeURIComponent(JSON.stringify({ post: { tonemap: { clipBackground: true }, bloom: { enabled: false } } }));
  // The lab exists only on the development server: a light page first (a sphere) tells; there, the sheet must come.
  await page.goto("/lab3d?debug3d&jewel=sphere&ground=none");
  const lab = await page
    .locator("[data-lab-ready]")
    .waitFor({ timeout: 60_000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!lab, "the lab exists only on the development server (BASE_URL=http://localhost:5390)");
  await page.goto("/lab3d?debug3d&jewel=cuts&ground=none&scene=" + scene + "&" + query);
  // An engine that hangs on these stones (the old one did, on whole numbers of 16 bits) fails here.
  await page.waitForSelector("[data-lab-ready]", { timeout: 120_000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => (window as unknown as { __berete3d: { lookAt(p: number[], t: number[]): void } }).__berete3d.lookAt([0, 0.034, 0.056], [0, -0.0008, 0.0006]));
  // Still: the progressive rendering smooths the image.
  await page.waitForFunction(() => ((window as unknown as { __berete3d: { progressive(): number } }).__berete3d.progressive() ?? 0) >= 6, null, { timeout: 120_000 });
  return page.evaluate((cuts) => {
    const d = (window as unknown as { __berete3d: { project(p: number[]): number[]; layerCenter(n: string): number[] } }).__berete3d;
    const gl = document.querySelector("canvas") as HTMLCanvasElement;
    const c = document.createElement("canvas");
    c.width = gl.clientWidth;
    c.height = gl.clientHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(gl, 0, 0, c.width, c.height);
    const img = ctx.getImageData(0, 0, c.width, c.height).data;
    const out: Stat[] = [];
    for (const mode of ["trace", "fast"]) {
      const centres = cuts.map((cut) => d.project(d.layerCenter(mode + ":" + cut)));
      cuts.forEach((cut, i) => {
        const p = centres[i]!;
        const near = centres[i + 1] ?? centres[i - 1]!;
        const half = Math.max(8, Math.abs(near[0]! - p[0]!) / 2);
        let n = 0;
        let sum = 0;
        let sum2 = 0;
        let black = 0;
        let white = 0;
        for (let y = Math.max(0, Math.round(p[1]! - half)); y < Math.min(c.height, Math.round(p[1]! + half)); y++) {
          for (let x = Math.max(0, Math.round(p[0]! - half)); x < Math.min(c.width, Math.round(p[0]! + half)); x++) {
            const k = (y * c.width + x) * 4;
            if (img[k + 3]! < 200) continue;
            const L = (0.2126 * img[k]! + 0.7152 * img[k + 1]! + 0.0722 * img[k + 2]!) / 255;
            n++;
            sum += L;
            sum2 += L * L;
            if (L < 0.04) black++;
            if (L > 0.96) white++;
          }
        }
        const mean = sum / Math.max(1, n);
        out.push({ name: mode + ":" + cut, mean, contrast: Math.sqrt(Math.max(0, sum2 / Math.max(1, n) - mean * mean)), black: black / Math.max(1, n), white: white / Math.max(1, n), pixels: n });
      });
    }
    return out;
  }, CUTS);
}

function check(stats: Stat[], label: string) {
  for (const s of stats) {
    const where = label + " " + s.name + " " + JSON.stringify({ mean: +s.mean.toFixed(3), contrast: +s.contrast.toFixed(3), black: +s.black.toFixed(3), white: +s.white.toFixed(3) });
    expect(s.pixels, where + ": the stone is drawn").toBeGreaterThan(40);
    expect(s.mean, where + ": not black").toBeGreaterThan(0.12);
    expect(s.mean, where + ": not flat white").toBeLessThan(0.88);
    expect(s.contrast, where + ": its facets are seen").toBeGreaterThan(0.06);
    expect(s.black, where + ": no black hole").toBeLessThan(0.4);
    expect(s.white, where + ": not burnt").toBeLessThan(0.45);
  }
}

test.describe.configure({ mode: "default" });

for (const env of ["auto", "gem-studio", "gem-vitrine", "gem-points"]) {
  test("every cut readable, traced and fast, under « " + env + " »", async ({ page, isMobile }) => {
    test.skip(isMobile, "the sheet is a computer's");
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1300, height: 320 });
    check(await measure(page, "gemEnv=" + env), env);
  });
}

test("every cut readable when stored as whole numbers of 16 bits (the light files of the site)", async ({ page, isMobile }) => {
  test.skip(isMobile, "the sheet is a computer's");
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1300, height: 320 });
  check(await measure(page, "gemEnv=gem-studio&quantize=1"), "quantized");
});
