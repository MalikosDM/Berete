/*
 * Runs the 3D pipeline on one file, outside the server (tests, big files):
 *   npx tsx scripts/model-optimize.ts <file.stl|.glb|.3dm> <output folder>
 * Writes full.glb, light.glb and result.json in the folder. The file itself is only read.
 */
import fs from "node:fs";
import path from "node:path";
import { runPipeline, type SourceKind } from "../server/models/pipeline/index.js";

const [input, out] = process.argv.slice(2);
if (!input || !out) {
  console.error("Usage: npx tsx scripts/model-optimize.ts <file> <output folder>");
  process.exit(1);
}
const kind = path.extname(input).slice(1).toLowerCase() as SourceKind;
let last = "";
const result = await runPipeline(input, kind, out, (percent, step) => {
  const line = step + " " + percent + "%";
  if (line !== last && percent % 5 === 0) console.log(line);
  last = line;
});
fs.writeFileSync(path.join(out, "result.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
