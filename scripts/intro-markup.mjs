#!/usr/bin/env node
/**
 * The intro of the house written into index.html (28/11/2026), so that it is there from the very first paint (no page seen,
 * then covered): the monogram BRT that draws itself in rose gold on black, as long as the page is getting ready, never longer
 * (src/components/Preloader.tsx removes it). Its lines come from src/data/monogram-lines.generated.json (npm run brand).
 *   node scripts/intro-markup.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const m = JSON.parse(readFileSync("src/data/monogram-lines.generated.json", "utf8"));
const [x, y, w, h] = m.viewBox.split(" ").map(Number);
const delay = (i) => (i < m.outlines ? i * 0.035 : 0.16 + (i - m.outlines) * 0.012).toFixed(3);
const paths = m.lines.map((d, i) => `<path pathLength="1" data-preloader-line style="animation-delay:${delay(i)}s" d="${d}"/>`).join("");
const markup =
  `<div id="bj-intro" data-preloader aria-hidden="true"><svg viewBox="${m.viewBox}" fill="none" stroke-width="0.9" stroke-linejoin="round">` +
  `<defs><linearGradient id="preloader-rose-gold" gradientUnits="userSpaceOnUse" x1="${x}" y1="${y}" x2="${x + w}" y2="${y + h}">` +
  `<stop offset="0" stop-color="#9C5B4F"/><stop offset="0.5" stop-color="#E8B4A0"/><stop offset="1" stop-color="#B76E79"/></linearGradient></defs>` +
  `<g stroke="url(#preloader-rose-gold)">${paths}</g></svg></div>`;
const file = "index.html";
const html = readFileSync(file, "utf8");
const start = "<!-- intro:start -->";
const end = "<!-- intro:end -->";
const block = start + markup + end;
const next = html.includes(start) ? html.replace(new RegExp(start + "[\\s\\S]*?" + end), block) : html.replace("<body>", "<body>\n    " + block);
writeFileSync(file, next);
console.log("index.html: intro written (" + m.lines.length + " lines, " + markup.length + " characters)");
