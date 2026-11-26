#!/usr/bin/env node
/*
 * The files of the hand tracking of the ring try-on (src/viewer/tryon/hands.ts), served by the site itself (never asked
 * from another server at the visit):
 *   public/mediapipe/wasm/   the WebAssembly of MediaPipe Tasks Vision, copied from node_modules/@mediapipe/tasks-vision
 *                            (the version of package.json: the code and its WebAssembly always go together)
 *   public/mediapipe/hand_landmarker.task   the official hand model of Google (float16), downloaded once
 *
 * Run once, and again after a new version of @mediapipe/tasks-vision: node scripts/mediapipe-assets.mjs
 * The model is kept when it is already there (--force downloads it again).
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "node_modules/@mediapipe/tasks-vision/wasm");
const target = path.join(root, "public/mediapipe");
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const force = process.argv.includes("--force");

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1) + " MB";

if (!fs.existsSync(source)) {
  console.error("node_modules/@mediapipe/tasks-vision is missing: run npm install first.");
  process.exit(1);
}

// 1. The WebAssembly (the folder emptied first: no file of an older version stays).
const wasmDir = path.join(target, "wasm");
fs.rmSync(wasmDir, { recursive: true, force: true });
fs.mkdirSync(wasmDir, { recursive: true });
let total = 0;
for (const name of fs.readdirSync(source)) {
  if (!/\.(js|wasm)$/.test(name)) continue;
  fs.copyFileSync(path.join(source, name), path.join(wasmDir, name));
  const size = fs.statSync(path.join(wasmDir, name)).size;
  total += size;
  console.log("  wasm/" + name.padEnd(36) + mb(size));
}

// 2. The model (a .task file is a zip of two TensorFlow Lite models: its first bytes hold "PK\x03\x04").
const model = path.join(target, "hand_landmarker.task");
const looksRight = (file) => {
  if (!fs.existsSync(file)) return false;
  const head = Buffer.alloc(8);
  const fd = fs.openSync(file, "r");
  fs.readSync(fd, head, 0, 8, 0);
  fs.closeSync(fd);
  return head.includes(Buffer.from("PK\x03\x04", "latin1")) && fs.statSync(file).size > 1_000_000;
};
if (force || !looksRight(model)) {
  console.log("  downloading " + MODEL_URL);
  const res = await fetch(MODEL_URL);
  if (!res.ok) {
    console.error("The model could not be downloaded (" + res.status + ").");
    process.exit(1);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  const part = model + ".part";
  fs.writeFileSync(part, bytes);
  if (!looksRight(part)) {
    fs.rmSync(part, { force: true });
    console.error("The downloaded model is not a .task file.");
    process.exit(1);
  }
  fs.renameSync(part, model);
}
const modelBytes = fs.readFileSync(model);
total += modelBytes.length;
console.log("  hand_landmarker.task".padEnd(43) + mb(modelBytes.length) + "  sha256 " + createHash("sha256").update(modelBytes).digest("hex").slice(0, 16) + "…");
console.log("public/mediapipe: " + mb(total) + " (a visitor loads one WebAssembly of the two, and the model, only when he starts the try-on)");
