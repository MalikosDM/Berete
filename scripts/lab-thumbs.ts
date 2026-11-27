/*
 * The pictures of the 3D editor (26/11/2026), made by our own engine: each lighting of the metal on the test ring, each
 * lighting of the stones and each stone of the library on a real round brilliant seen from three quarters, drawn by the
 * stones' own shader (27/11/2026: never a sphere with a stand-in material), metals on a sphere, each stand, ground,
 * ambiance (expert) and ambiance of the simple mode. They go to public/media/3d-lib/<kind>-<id>.webp (240 px).
 * Needs the development server (the lab exists only there): npx vite --port 5390, then npx tsx scripts/lab-thumbs.ts
 * (ONLY=hdri,mat,stand,preset,ground to make some again).
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "@playwright/test";
import { GEM_ENVS, GROUNDS, METAL_ENVS, STANDS } from "../src/data/scene3d";
import { libraryOf } from "../src/viewer/library/materials";
import { SCENE_PRESETS, SIMPLE_AMBIANCES, thumb } from "../src/pages/admin/editor3d/presets";

const BASE = process.env.LAB_URL ?? "http://localhost:5390";
const OUT = path.resolve("public");
const ONLY = (process.env.ONLY ?? "hdri,mat,stand,preset,ground,ambiance").split(",");
const SIZE = 240;

type Job = { file: string; query: string; focus: "ring" | "stone" | "sphere" | "gem" };
const jobs: Job[] = [];
const q = (o: Record<string, string>) => new URLSearchParams(o).toString();

if (ONLY.includes("gems")) {
  for (const id of GEM_ENVS) jobs.push({ file: thumb("hdri", id), query: q({ jewel: "stone", gemEnv: id, bg: "studio-dark", ground: "none" }), focus: "gem" });
  for (const m of libraryOf("gems")) jobs.push({ file: thumb("mat", m.id), query: q({ jewel: "stone", bg: "studio-dark", ground: "none", settings: JSON.stringify({ layers: { diamond: { role: "diamond", material: m.id } } }) }), focus: "gem" });
}
if (ONLY.includes("hdri")) {
  for (const id of METAL_ENVS) jobs.push({ file: thumb("hdri", id), query: q({ metalEnv: id, bg: "black", ground: "none" }), focus: "ring" });
  for (const id of GEM_ENVS) jobs.push({ file: thumb("hdri", id), query: q({ jewel: "stone", gemEnv: id, bg: "studio-dark", ground: "none" }), focus: "gem" });
}
if (ONLY.includes("mat")) {
  for (const cat of ["metals", "pearls", "other"] as const) for (const m of libraryOf(cat)) jobs.push({ file: thumb("mat", m.id), query: q({ jewel: "sphere", material: m.id, bg: "studio-dark", ground: "none" }), focus: "sphere" });
  for (const m of libraryOf("gems")) jobs.push({ file: thumb("mat", m.id), query: q({ jewel: "stone", bg: "studio-dark", ground: "none", settings: JSON.stringify({ layers: { diamond: { role: "diamond", material: m.id } } }) }), focus: "gem" });
}
if (ONLY.includes("stand")) for (const id of STANDS) jobs.push({ file: thumb("stand", id), query: q({ stand: id, bg: "studio-dark" }), focus: "ring" });
if (ONLY.includes("preset")) for (const p of SCENE_PRESETS) jobs.push({ file: thumb("preset", p.id), query: q({ preset: p.id }), focus: "ring" });
if (ONLY.includes("ambiance")) for (const a of SIMPLE_AMBIANCES) jobs.push({ file: thumb("ambiance", a.id), query: q({ simple: a.id }), focus: "ring" });
if (ONLY.includes("ground")) for (const id of GROUNDS) jobs.push({ file: thumb("ground", id), query: q({ ground: id, bg: "studio-light" }), focus: "ring" });

const browser = await chromium.launch({ args: ["--mute-audio", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 480, height: 480 } });
let done = 0;
for (const job of jobs) {
  await page.goto(BASE + "/lab3d?debug3d&" + job.query);
  await page.waitForSelector("[data-lab-ready]", { timeout: 60_000 });
  await page.waitForTimeout(600);
  await page.evaluate((focus) => {
    const d = (window as unknown as { __berete3d: { layerCenter(n: string): number[]; center(): number[]; lookAt(p: number[], t: number[]): void } }).__berete3d;
    if (focus === "stone") {
      const c = d.layerCenter("diamond");
      d.lookAt([c[0]!, c[1]! + 0.011, c[2]! + 0.008], c);
    } else if (focus === "gem") {
      // The whole stone from three quarters above (a 6 mm round brilliant at the origin).
      d.lookAt([0, 0.0112, 0.0122], [0, -0.0005, 0]);
    } else if (focus === "sphere") {
      const c = d.center();
      d.lookAt([c[0]!, c[1]! + 0.004, c[2]! + 0.017], c);
    }
  }, job.focus);
  // Time for the progressive rendering to smooth the image.
  await page.waitForTimeout(3500);
  const png = await page.screenshot();
  const out = path.join(OUT, job.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(png).resize(SIZE, SIZE).webp({ quality: 82 }).toFile(out);
  done++;
  if (done % 10 === 0) console.log(done + " / " + jobs.length);
}
await browser.close();
console.log(done + " pictures → public/media/3d-lib");
