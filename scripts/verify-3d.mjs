/* global window, document, requestAnimationFrame, Image */
/*
 * Checks the 3D viewer end to end and writes verification/3d/ (npm run verify:3d):
 *   - sends the jeweller's files through the admin (the .glb test model through the page
 *     itself, the STL through the same API), waits for their processing;
 *   - opens each model in a private link, on a computer (1440 px) and an iPhone (390 px),
 *     with the GPU (Chromium, ANGLE Metal): load time, images per second while turning
 *     (the phone with a processor slowed down 4 times), images of the default view, the
 *     zoom on a stone, the metals, the lightings;
 *   - checks the private link, the expired link, the password, a missing link, the page of a
 *     piece, that a zoom on a detail never brings the camera back to the centre, and that no
 *     page writes an error in its console;
 *   - writes verification/3d/rapport.md.
 * Needs the site and its API running (npm run build && npm start, or BASE_URL=http://localhost:5173 with npm run dev:server).
 * Files: MODELS_GLB (default: the test file on the Desktop), MODELS_STL_DIR (default: ~/Downloads).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium, devices } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3001";
const OUT = path.resolve("verification/3d");
const GLB = process.env.MODELS_GLB ?? path.join(os.homedir(), "Desktop/Berete - 3D/fichiers de test/ZN1242-bj001.glb");
const STL_DIR = process.env.MODELS_STL_DIR ?? path.join(os.homedir(), "Downloads");
const STLS = ["ZN1059-BJ001(2).stl", "zp1864-BJ001.stl", "0542.stl", "ZR0982-BJ001.stl"];
/** What Malik counted in each file, to compare with what the pipeline finds. */
const EXPECTED = {
  "ZN1059-BJ001(2).stl": "1026 rondes 0,8 mm ; 152 rondes 1,9 mm ; plusieurs centaines de taille fantaisie (40 triangles) ; 144 griffes et 38 maillons en métal",
  "zp1864-BJ001.stl": "40 rondes 1,0 mm + quelques petits groupes répétés",
  "0542.stl": "un grand bloc où la plupart des pierres sont fondues dans le métal (inséparables) ; à part, 7 petites pierres rondes d'environ 1 mm, chacune dessinée autrement (plus de 1000 triangles)",
  "ZR0982-BJ001.stl": "1 émeraude centrale 12,5 × 8,1 mm dessinée avec 108 481 triangles, et 2 baguettes effilées de côté (40 triangles, pavillon aux facettes tordues)",
  "ZN1242-bj001.glb": "3601 diamants (图层09), 2 × 199 autres pierres (图层10), maillons or rose (图层05), fleurs or blanc (图层01), 图层04 inconnu",
};
const METALS = ["yellow-gold", "white-gold", "rose-gold", "platinum", "black-rhodium"];
const AMBIANCES = ["studio", "warm", "spotlight"];

const password = fs.readFileSync(".env", "utf8").match(/ADMIN_PASSWORD="?([^"\n]*)/)?.[1] ?? "";
const errors = [];
const results = {};
let rhinoCheck;

async function api(method, url, body, token) {
  const res = await fetch(BASE + url, { method, headers: { ...(token ? { Authorization: "Bearer " + token } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(method + " " + url + " → " + res.status + " " + JSON.stringify(json));
  return json;
}

const { token } = await api("POST", "/api/admin/login", { password });

/** Sends a file by pieces, as the admin page does, and waits for its processing. */
async function upload(file) {
  const size = fs.statSync(file).size;
  const name = path.basename(file);
  const t0 = Date.now();
  const start = await api("POST", "/api/admin/models/uploads", { name, size }, token);
  const fd = fs.openSync(file, "r");
  let offset = 0;
  while (offset < size) {
    const n = Math.min(start.chunkBytes, size - offset);
    const buf = Buffer.alloc(n);
    fs.readSync(fd, buf, 0, n, offset);
    const res = await fetch(BASE + "/api/admin/models/uploads/" + start.uploadId + "?offset=" + offset, { method: "PUT", headers: { Authorization: "Bearer " + token, "Content-Type": "application/octet-stream" }, body: buf });
    offset = (await res.json()).received;
  }
  fs.closeSync(fd);
  const sent = Date.now();
  const { id } = await api("POST", "/api/admin/models/uploads/" + start.uploadId + "/complete", { name, size }, token);
  const m = await waitReady(id, t0, sent);
  return m.status === "ready" ? { ...(await markAsTest(m)), uploadSeconds: m.uploadSeconds, processSeconds: m.processSeconds } : m;
}

async function waitReady(id, t0 = Date.now(), sent = Date.now()) {
  for (;;) {
    const m = await api("GET", "/api/admin/models/" + id, undefined, token);
    if (m.status === "ready" || m.status === "failed") return { ...m, uploadSeconds: (sent - t0) / 1000, processSeconds: (Date.now() - sent) / 1000 };
    await new Promise((r) => setTimeout(r, 400));
  }
}

/** The models sent by this check are named so, and deleted at the end: the models of the site and their links stay untouched. */
const TEST_PREFIX = "[vérification] ";
const created = [];

async function markAsTest(m) {
  created.push(m.id);
  await api("PUT", "/api/admin/models/" + m.id, { name: TEST_PREFIX + m.name, settings: m.settings, pieceSlug: null }, token);
  return { ...m, name: TEST_PREFIX + m.name };
}

/** Test models left by a check that stopped half-way. */
async function removeOldTests() {
  const { items } = await api("GET", "/api/admin/models", undefined, token);
  for (const m of items) if (m.name.startsWith(TEST_PREFIX)) await api("DELETE", "/api/admin/models/" + m.id, undefined, token);
}

async function link(id, extra = {}) {
  const { token: t } = await api("POST", "/api/admin/models/" + id + "/links", { title: extra.title ?? "Test", expiresAt: extra.expiresAt ?? null, password: extra.password ?? null }, token);
  return t;
}

/* ---------- Browser ---------- */

const browser = await chromium.launch({ headless: true, channel: "chromium", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const PROFILES = {
  desktop: { viewport: { width: 1440, height: 900 } },
  iphone: (() => {
    const { defaultBrowserType: _ignored, ...iphone } = devices["iPhone 13"];
    return { ...iphone, viewport: { width: 390, height: 844 } };
  })(),
};

async function open(profile, url) {
  const context = await browser.newContext(PROFILES[profile]);
  const page = await context.newPage();
  page.on("console", (m) => m.type() === "error" && errors.push(profile + " " + url + " : " + m.text()));
  page.on("pageerror", (e) => errors.push(profile + " " + url + " : " + e.message));
  return { context, page };
}

async function ready(page) {
  await page.waitForSelector("[data-viewer] [data-metal], [data-viewer] [data-ambiance]", { timeout: 120_000 });
  await page.waitForFunction(() => Boolean(window.__berete3d), null, { timeout: 30_000 });
  await page.waitForTimeout(1200);
}

/** The image of the canvas, as the viewer makes it (button "Save an image"), kept as a JPEG of at most 1600 px. */
async function grab(page, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const data = await page.evaluate(async () => {
    const img = new Image();
    img.src = window.__berete3d.capture();
    await img.decode();
    const scale = Math.min(1, 1600 / img.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.88);
  });
  fs.writeFileSync(file.replace(/\.png$/, ".jpg"), Buffer.from(data.split(",")[1], "base64"));
}

async function measureFps(page) {
  const turn = page.locator("[data-viewer] button[aria-pressed]").first();
  await turn.click();
  // A moment of turning first (shaders compiled, resolution settled), then 4 s measured.
  await page.waitForTimeout(2000);
  const fps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        const t0 = performance.now();
        const step = () => {
          frames++;
          if (performance.now() - t0 < 4000) requestAnimationFrame(step);
          else resolve(frames / ((performance.now() - t0) / 1000));
        };
        requestAnimationFrame(step);
      }),
  );
  await turn.click();
  await page.waitForTimeout(400);
  return Math.round(fps);
}

/** Double-click (computer) or double-tap (phone) on a world point, to glide towards it. */
async function glideTo(page, profile, point) {
  const [x, y] = await page.evaluate((p) => window.__berete3d.project(p), point);
  const box = await page.locator("[data-viewer] canvas").boundingBox();
  if (profile === "iphone") {
    await page.touchscreen.tap(box.x + x, box.y + y);
    await page.waitForTimeout(120);
    await page.touchscreen.tap(box.x + x, box.y + y);
  } else await page.mouse.dblclick(box.x + x, box.y + y);
  await page.waitForTimeout(1600);
}

async function setAllMetals(page, metal) {
  const layers = await page.locator("[data-metal-layer]").evaluateAll((els) => els.map((e) => e.getAttribute("data-metal-layer")));
  for (const layer of layers) await page.locator(`[data-metal-layer="${layer}"] [data-metal="${metal}"]`).click();
  await page.waitForTimeout(500);
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** In a .glb made by the pipeline: the copies of each layer, and how many of them are seen in a mirror (a negative scale). */
async function stonesOf(file) {
  const { NodeIO } = await import("@gltf-transform/core");
  const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions");
  const { MeshoptDecoder } = await import("meshoptimizer");
  await MeshoptDecoder.ready;
  const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder }).read(file);
  const stones = {};
  let mirrored = 0;
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const layer = mesh.listPrimitives()[0]?.getMaterial()?.getName() ?? "";
    const batch = node.getExtension("EXT_mesh_gpu_instancing");
    const scale = batch?.getAttribute("SCALE");
    const count = batch ? batch.getAttribute("TRANSLATION").getCount() : 1;
    stones[layer] = (stones[layer] ?? 0) + count;
    for (let i = 0; scale && i < count; i++) if (scale.getElement(i, []).filter((v) => v < 0).length % 2 === 1) mirrored++;
  }
  return { stones, mirrored };
}

/** One model in one profile: load, fps, images. */
async function shoot(profile, model, slug, opts) {
  const t = await link(model.id, { title: model.name });
  const { context, page } = await open(profile, "/view/" + t);
  if (profile === "iphone") {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  const t0 = Date.now();
  await page.goto(BASE + "/view/" + t + "?debug3d");
  await ready(page);
  const loadSeconds = (Date.now() - t0 - 1200) / 1000;
  const dir = path.join(OUT, profile);
  await grab(page, path.join(dir, slug + "-1-vue-par-defaut.png"));
  if (opts.page) await page.screenshot({ path: path.join(dir, slug + "-0-page.jpg"), type: "jpeg", quality: 85, fullPage: false });
  const fps = await measureFps(page);
  const out = { loadSeconds, fps, version: profile === "iphone" ? "light" : "full" };
  if (profile === "desktop") {
    // A pinch on the trackpad (a wheel with Ctrl): the camera must come closer, never enlarge the picture (it blurred it).
    const viewDistance = () => page.evaluate(() => { const v = window.__berete3d.getView(); return Math.hypot(v.position[0] - v.target[0], v.position[1] - v.target[1], v.position[2] - v.target[2]); });
    const box = await page.locator("[data-viewer] canvas").boundingBox();
    const before = await viewDistance();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.down("Control");
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, -40);
      await page.waitForTimeout(60);
    }
    await page.keyboard.up("Control");
    await page.waitForTimeout(1200);
    out.pinch = { before: before * 1000, after: (await viewDistance()) * 1000, zoom: await page.evaluate(() => window.__berete3d.zoom()) };
    await grab(page, path.join(dir, slug + "-1b-pincement.png"));
    await page.evaluate(() => window.__berete3d.view("reset"));
    await page.waitForTimeout(1200);
  }
  if (profile === "iphone") {
    // The same page over a 4G connection (10 Mbit/s, 80 ms), cache emptied.
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 80, downloadThroughput: (10 * 1024 * 1024) / 8, uploadThroughput: (3 * 1024 * 1024) / 8 });
    const t1 = Date.now();
    await page.goto(BASE + "/view/" + t + "?debug3d");
    await ready(page);
    out.load4g = (Date.now() - t1 - 1200) / 1000;
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: false });
  }

  if (opts.ambiances) {
    for (const a of AMBIANCES) {
      await page.locator(`[data-ambiance="${a}"]`).click();
      await page.waitForTimeout(1500);
      await grab(page, path.join(dir, slug + "-3-lumiere-" + a + ".png"));
    }
    await page.locator('[data-ambiance="studio"]').click();
    await page.waitForTimeout(1200);
  }
  for (const metal of opts.metals) {
    await setAllMetals(page, metal);
    await grab(page, path.join(dir, slug + "-4-metal-" + metal + ".png"));
  }
  if (opts.metals.length > 0) {
    // Back to the jeweller's metals.
    await page.reload();
    await ready(page);
  }

  // Zoom on a stone (or a detail): double-click / double-tap until the camera is close (each one glides 60 % of the way).
  const point = await page.evaluate((layer) => window.__berete3d.instancePoint(layer, 7), opts.zoomLayer);
  const center = await page.evaluate(() => window.__berete3d.center());
  const cameraDistance = async () => page.evaluate(() => { const v = window.__berete3d.getView(); return Math.hypot(v.position[0] - v.target[0], v.position[1] - v.target[1], v.position[2] - v.target[2]); });
  await glideTo(page, profile, point);
  const afterFirst = await page.evaluate(() => window.__berete3d.target());
  for (let i = 0; i < 8 && (await cameraDistance()) > opts.close; i++) await glideTo(page, profile, point);
  const view = await page.evaluate(() => window.__berete3d.getView());
  await grab(page, path.join(dir, slug + "-2-zoom.png"));
  // Then closer still (wheel towards the stone, or one more double-tap): the view must stay on it, and not move by itself.
  if (profile === "desktop") {
    const [x, y] = await page.evaluate((p) => window.__berete3d.project(p), point);
    const box = await page.locator("[data-viewer] canvas").boundingBox();
    await page.mouse.move(box.x + x, box.y + y);
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(1200);
  } else await glideTo(page, profile, point);
  const zoomed = await page.evaluate(() => window.__berete3d.target());
  await page.waitForTimeout(2500);
  const later = await page.evaluate(() => window.__berete3d.target());
  out.zoom = {
    // mm: how far the centre of the view is from the stone, from the centre of the jewel, and how much it moved by itself in 2.5 s.
    targetToStone: +(dist(zoomed, point) * 1000).toFixed(2),
    stoneToCentre: +(dist(point, center) * 1000).toFixed(1),
    targetToCentre: +(dist(zoomed, center) * 1000).toFixed(1),
    drift: +(dist(zoomed, later) * 1000).toFixed(3),
    firstGlide: +(dist(afterFirst, point) * 1000).toFixed(2),
    cameraDistance: +(dist(view.position, view.target) * 1000).toFixed(1),
  };
  await context.close();
  return out;
}

/* ---------- 1. The files through the admin ---------- */

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const models = {};

// The .glb test model through the admin page itself.
await removeOldTests();
/** Filled once the test .glb is processed (copies seen in a mirror). */
let mirrorCheck;
const knownIds = (await api("GET", "/api/admin/models", undefined, token)).items.map((m) => m.id);
{
  const { context, page } = await open("desktop", "/admin");
  await page.goto(BASE + "/admin");
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.click('button[role="tab"]:has-text("3D")');
  await page.waitForSelector("[data-admin-3d]");
  const rows = '[data-model-row="ZN1242-bj001.glb"][data-status="ready"]';
  await page.waitForSelector("[data-model-row]", { timeout: 30_000 });
  const before = await page.locator(rows).count();
  const t0 = Date.now();
  await page.setInputFiles("[data-model-input]", GLB);
  // The processing, seen in the list (the demo model has the same file name: the new row is the one being processed).
  await page
    .waitForSelector('[data-model-row="ZN1242-bj001.glb"][data-status="processing"], [data-model-row="ZN1242-bj001.glb"][data-status="queued"]', { timeout: 120_000 })
    .then(() => page.waitForTimeout(1500))
    .then(() => page.screenshot({ path: path.join(OUT, "admin-1-optimisation-en-cours.jpg"), type: "jpeg", quality: 85 }))
    .catch(() => undefined);
  await page.waitForFunction(([sel, n]) => document.querySelectorAll(sel).length > n, [rows, before], { timeout: 300_000 });
  const seconds = (Date.now() - t0) / 1000;
  await page.screenshot({ path: path.join(OUT, "admin-2-liste.jpg"), type: "jpeg", quality: 85, fullPage: true });
  const { items } = await api("GET", "/api/admin/models", undefined, token);
  const before3 = new Set(knownIds);
  const fresh = items.find((x) => x.sourceName === "ZN1242-bj001.glb" && !before3.has(x.id) && x.status === "ready");
  const m = await markAsTest(fresh);
  models["ZN1242-bj001.glb"] = { ...m, uploadSeconds: Math.max(0, seconds - (m.stats.seconds ?? 0)), uploadAndProcessSeconds: seconds };
  // In this file, 665 small diamonds and 55 large stones are copies seen in a mirror: they must come out as copies of
  // a mirrored mesh (a mirrored copy is drawn inside out by the viewer: an empty setting), and none may be lost.
  {
    const counted = await stonesOf(path.join(process.env.MODELS_DIR ?? "storage/models", fresh.id, "full.glb"));
    mirrorCheck = [
      "Pierres en miroir du fichier de test (665 + 55) : " + counted.mirrored + " copie(s) encore à l'envers, " + counted.stones["图层09"] + " diamants (图层09) et " + counted.stones["图层10"] + " grosses pierres (图层10) sur 3601 et 199",
      counted.mirrored === 0 && counted.stones["图层09"] === 3601 && counted.stones["图层10"] === 199,
    ];
  }
  // The editor: layers recognised from their names, one layer shown alone. (The new model is first in the list.)
  await page.locator('[data-model-row="ZN1242-bj001.glb"] [data-open-model]').first().click();
  await page.waitForSelector("[data-model-editor] [data-viewer] [data-metal]", { timeout: 120_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "admin-3-reglages.jpg"), type: "jpeg", quality: 85, fullPage: true });
  await page.locator('[data-layer="图层05"] button[aria-pressed]').click();
  await page.waitForTimeout(1200);
  await page.locator("[data-model-editor] [data-viewer]").screenshot({ path: path.join(OUT, "admin-4-calque-seul-图层05.jpg"), type: "jpeg", quality: 85 });
  await context.close();
}

for (const name of STLS) {
  const file = path.join(STL_DIR, name);
  if (!fs.existsSync(file)) continue;
  models[name] = await upload(file);
}
// Stones alone or finely drawn are found by their shape (a table, a point below, facets), not by their copies.
const stonesFound = (name) => (models[name]?.stats.stones ?? []).reduce((n, s) => n + s.count, 0);
let shapeCheck;
if (models["ZR0982-BJ001.stl"] && models["0542.stl"]) {
  shapeCheck = ["Pierres seules ou très finement dessinées reconnues à leur forme : ZR0982 " + stonesFound("ZR0982-BJ001.stl") + " (l'émeraude centrale et 2 baguettes : 3 attendues), 0542 " + stonesFound("0542.stl") + " (7 petites pierres séparées attendues)", stonesFound("ZR0982-BJ001.stl") === 3 && stonesFound("0542.stl") === 7];
}

// A Rhino file made here (the jeweller has not sent one yet): a metal layer, a stone placed 12 times as a
// block and 8 times as separate turned copies. Its layers must keep their names and get their roles.
{
  const { default: rhino3dm } = await import("rhino3dm");
  const rhino = await rhino3dm();
  const doc = new rhino.File3dm();
  doc.settings().modelUnitSystem = rhino.UnitSystem.Millimeters;
  const layer = (name) => {
    const l = new rhino.Layer();
    l.name = name;
    return doc.layers().add(l);
  };
  const metalLayer = layer("Metal 18K");
  const gemLayer = layer("Diamonds");
  const box = new rhino.Mesh();
  for (const [x, y, z] of [[-10, -2, 0], [10, -2, 0], [10, 2, 0], [-10, 2, 0], [-10, -2, 3], [10, -2, 3], [10, 2, 3], [-10, 2, 3]]) box.vertices().add(x, y, z);
  for (const f of [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) box.faces().addQuadFace(...f);
  const ma = new rhino.ObjectAttributes();
  ma.layerIndex = metalLayer;
  doc.objects().add(box, ma);
  const gem = new rhino.Mesh();
  for (const [x, y, z] of [[0, 0, 0.6], [0.5, 0, 0], [0, 0.5, 0], [-0.5, 0, 0], [0, -0.5, 0], [0, 0, -0.4]]) gem.vertices().add(x, y, z);
  for (const f of [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1], [5, 2, 1], [5, 3, 2], [5, 4, 3], [5, 1, 4]]) gem.faces().addTriFace(...f);
  const ga = new rhino.ObjectAttributes();
  ga.layerIndex = gemLayer;
  const idx = doc.instanceDefinitions().add("gem", "", "", "", [0, 0, 0], [gem], [ga]);
  const idef = doc.instanceDefinitions().get(idx);
  for (let i = 0; i < 12; i++) doc.objects().addInstanceObject(new rhino.InstanceReference(idef.id, rhino.Transform.translationXYZ(-8 + i * 1.5, 0, 3.4)), ga);
  for (let i = 0; i < 8; i++) {
    const copy = gem.duplicate();
    copy.transform(rhino.Transform.rotation(i * 0.4, [0, 0, 1], [0, 0, 0]));
    copy.transform(rhino.Transform.translationXYZ(-8 + i * 2, 1.5, 3.4));
    doc.objects().add(copy, ga);
  }
  const file = path.join(os.tmpdir(), "berete-test-rhino.3dm");
  fs.writeFileSync(file, doc.toByteArray());
  const m = await upload(file);
  const metal = m.layers.find((l) => l.name === "Metal 18K");
  const gems = m.layers.find((l) => l.name === "Diamonds");
  rhinoCheck = ["Import .3dm (fichier Rhino fabriqué pour le test) : calques « Metal 18K » → " + metal?.guess + ", « Diamonds » → " + gems?.guess + ", " + m.stats.pieces + " morceaux lus (la pièce de métal et 20 pierres : un bloc posé 12 fois et 8 copies tournées)", metal?.guess === "metal" && gems?.guess === "diamond" && m.stats.pieces === 21];
  fs.rmSync(file, { force: true });
}

/* ---------- 2. Each model, computer and iPhone ---------- */

const SLUGS = { "ZN1242-bj001.glb": "zn1242-bracelet", "ZN1059-BJ001(2).stl": "zn1059-collier", "zp1864-BJ001.stl": "zp1864-pendentif", "0542.stl": "0542", "ZR0982-BJ001.stl": "zr0982-bague" };
for (const [name, model] of Object.entries(models)) {
  if (model.status !== "ready") continue;
  const stones = model.stats.stones ?? [];
  const mainStone = stones.find((s) => s.known)?.material ?? stones[0]?.material;
  const glb = name.endsWith(".glb");
  const zoomLayer = glb ? "图层10" : (mainStone ?? "metal");
  results[name] = {};
  for (const profile of ["desktop", "iphone"]) {
    results[name][profile] = await shoot(profile, model, SLUGS[name], {
      page: true,
      ambiances: glb,
      metals: glb ? METALS : ["yellow-gold", "white-gold", "rose-gold"],
      zoomLayer,
      // Camera distance of the zoom image (m): a flower of the bracelet, a few small stones, a detail of the metal.
      close: glb ? 0.03 : mainStone ? 0.01 : 0.02,
    });
    console.log(name, profile, JSON.stringify(results[name][profile]));
  }
}

/* ---------- 3. Links, piece page ---------- */

const checks = [rhinoCheck, mirrorCheck, ...(shapeCheck ? [shapeCheck] : [])];
// The demonstration model was made before the pipeline turned copies seen in a mirror over: the viewer does it when
// it loads (665 small diamonds and 55 large stones that showed an empty setting).
{
  const t = await link("demo-zn1242", { title: "Démo" });
  const { context, page } = await open("desktop", "/view/" + t);
  await page.goto(BASE + "/view/" + t + "?debug3d");
  await ready(page);
  const turned = await page.evaluate(() => window.__berete3d.mirrorCopies());
  checks.push(["Modèle de démonstration (fait avant la correction) : " + turned + " pierres en miroir redessinées à l'endroit par le visualiseur (665 + 55 attendues)", turned === 720]);
  await context.close();
  // The test link is removed: the demonstration model keeps only the jeweller's links.
  const made = (await api("GET", "/api/admin/models/demo-zn1242", undefined, token)).links.find((l) => l.token === t);
  if (made) await api("DELETE", "/api/admin/links/" + made.id, undefined, token);
}

const demo = models["ZN1242-bj001.glb"];
{
  const yesterday = new Date(Date.now() - 86400_000).toISOString();
  const expired = await link(demo.id, { expiresAt: yesterday });
  const locked = await link(demo.id, { password: "rose-gold-18" });
  const { context, page } = await open("desktop", "links");
  await page.goto(BASE + "/view/" + expired);
  await page.waitForSelector('[data-link-state="expired"]');
  checks.push(["Lien expiré : page « Ce lien a expiré »", true]);
  await page.screenshot({ path: path.join(OUT, "lien-expire.jpg"), type: "jpeg", quality: 85 });
  await page.goto(BASE + "/view/abcdefghijklmnopqrstuvwxyz012345");
  await page.waitForSelector('[data-link-state="missing"]');
  checks.push(["Lien inexistant : page « Ce lien n'existe pas »", true]);
  await page.goto(BASE + "/view/" + locked);
  await page.waitForSelector("[data-link-password]");
  await page.fill('input[type="password"]', "wrong");
  await page.click('button[type="submit"]');
  await page.waitForSelector('[role="alert"]');
  checks.push(["Mot de passe faux refusé", true]);
  await page.screenshot({ path: path.join(OUT, "lien-mot-de-passe.jpg"), type: "jpeg", quality: 85 });
  await page.fill('input[type="password"]', "rose-gold-18");
  await page.click('button[type="submit"]');
  await page.waitForSelector("[data-viewer] [data-metal]", { timeout: 120_000 });
  checks.push(["Bon mot de passe : la pièce s'affiche", true]);
  const love = await page.getAttribute("[data-love]", "href");
  checks.push(["Bouton WhatsApp « I love it » avec le métal : " + decodeURIComponent(love.split("text=")[1] ?? "").slice(0, 160), love.includes("gold")]);
  const robots = await page.evaluate(() => document.querySelector('meta[name="robots"]')?.getAttribute("content"));
  const header = (await fetch(BASE + "/view/" + locked)).headers.get("x-robots-tag");
  checks.push(["Lien privé jamais indexé : meta robots « " + robots + " », en-tête « " + header + " »", /noindex/.test(robots ?? "")]);
  await context.close();
}
{
  // The page of a piece shows "See it in 3D" at its top and "Explore in 3D" under it while a model is attached to it
  // (chosen from the piece in the admin); its card shows "3D". What was attached before is put back at the end.
  const { items } = await api("GET", "/api/admin/pieces", undefined, token);
  const attached = await (await fetch(BASE + "/api/models/pieces")).json();
  const piece = items.find((p) => !attached[p.slug] && p.type === "chain") ?? items.find((p) => !attached[p.slug]) ?? items[0];
  const demoBefore = (await api("GET", "/api/admin/models/" + demo.id, undefined, token)).pieceSlug;
  await api("PUT", "/api/admin/pieces/" + piece.slug + "/model", { modelId: demo.id }, token);
  const { context, page } = await open("desktop", "/pieces/" + piece.slug);
  await page.goto(BASE + "/pieces/" + piece.slug);
  await page.waitForSelector("[data-see-3d]", { timeout: 30_000 });
  await page.click("[data-see-3d]");
  await page.waitForSelector("[data-piece-3d] [data-viewer] [data-metal]", { timeout: 120_000 });
  await page.waitForTimeout(1500);
  const box = await page.locator("#piece-3d-viewer").boundingBox();
  checks.push(["Bouton « See it in 3D » en haut de la page de la pièce : il amène au visualiseur (haut à " + Math.round(box?.y ?? -1) + " px)", box !== null && box.y >= 0 && box.y < 300]);
  await page.locator('[data-piece-3d] [data-metal-layer="图层01"] [data-metal="yellow-gold"]').click();
  await page.waitForTimeout(500);
  const want = await page.getAttribute("[data-want-3d]", "href");
  checks.push(["Page de la pièce /pieces/" + piece.slug + " : section « Explore in 3D », WhatsApp « " + decodeURIComponent(want.split("text=")[1] ?? "").slice(0, 170) + " »", want.includes("yellow")]);
  await page.locator("[data-piece-3d]").screenshot({ path: path.join(OUT, "page-piece-explore-in-3d.jpg"), type: "jpeg", quality: 85 });
  // The wheel (or two fingers on a trackpad) over the jewel brings it closer, and never scrolls the page as well.
  {
    const frame = await page.locator("[data-piece-3d] [data-viewer] canvas").boundingBox();
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2);
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, -80);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(1200);
    const moved = Math.round((await page.evaluate(() => window.scrollY)) - before);
    checks.push(["Molette sur le bijou : il se rapproche, la page ne défile pas (" + moved + " px)", moved === 0]);
  }
  // A new version of the site while the page is open: the file of the viewer is gone. The page loads again by itself
  // and shows the 3D; if the file stays missing (no network), the viewer says so in its place and the page stays.
  for (const always of [false, true]) {
    const missing = await context.newPage();
    let refused = 0;
    await missing.route(/\/assets\/JewelViewer-[^/]*\.js$/, (route) => (always || refused++ === 0 ? route.fulfill({ status: 404, contentType: "text/html", body: "" }) : route.continue()));
    await missing.goto(BASE + "/pieces/" + piece.slug);
    if (always) {
      const shown = await missing.waitForSelector("[data-viewer-failed]", { timeout: 60_000 }).then(() => true, () => false);
      const pageText = await missing.evaluate(() => document.body.innerText.length);
      checks.push(["Fichier de la 3D toujours introuvable : message « " + (await missing.locator("[data-viewer-failed]").innerText().catch(() => "")).split("\n")[0] + " » à sa place, le reste de la page reste affiché", shown && pageText > 500]);
    } else {
      const shown = await missing.waitForSelector("[data-piece-3d] [data-viewer] [data-metal]", { timeout: 120_000 }).then(() => true, () => false);
      checks.push(["Fichier de la 3D introuvable une fois (nouvelle version du site) : la page se recharge seule et la 3D s'affiche", shown]);
    }
    await missing.close();
  }
  await page.goto(BASE + "/creations");
  // (Attached, not visible: the cards lower in the page fade in only when they reach the screen.)
  const mark = await page.waitForSelector('[data-piece-card="' + piece.slug + '"] [data-card-3d]', { timeout: 60_000, state: "attached" }).then(() => true, () => false);
  checks.push(["Vignette de la pièce dans les créations : repère « 3D »", mark]);
  await context.close();
  await api("PUT", "/api/admin/pieces/" + piece.slug + "/model", { modelId: null }, token);
  if (demoBefore) await api("PUT", "/api/admin/pieces/" + demoBefore + "/model", { modelId: demo.id }, token);
}
{
  // The layer names of the test model were recognised (remembered from the first time they were set).
  const layers = demo.settings.layers;
  checks.push(["Calques du fichier de test reconnus par leur nom : 图层01 " + layers["图层01"]?.metal + ", 图层05 " + layers["图层05"]?.metal + ", 图层09 " + layers["图层09"]?.role, layers["图层01"]?.metal === "white-gold" && layers["图层09"]?.role === "diamond"]);
}
await browser.close();
// The test models and their links are deleted: only the report and the images stay.
for (const id of created) await api("DELETE", "/api/admin/models/" + id, undefined, token).catch(() => undefined);

/* ---------- 4. The report ---------- */

const mb = (b) => (b / 1024 / 1024).toFixed(1).replace(".", ",") + " Mo";
const lines = [];
lines.push("# Visualiseur 3D : rapport de vérification", "");
lines.push("Généré par `npm run verify:3d` le " + new Date().toLocaleString("fr-FR") + ", sur " + BASE + ". Machine : " + os.cpus()[0].model + ", rendu par le GPU (Chromium, ANGLE Metal).", "");
lines.push("Images par seconde : moyenne sur 4 s de rotation automatique. Ordinateur : 1440 × 900, version « full ». iPhone : écran de 390 px émulé, version « light », processeur ralenti 4 fois (le GPU reste celui du Mac, la fluidité sur un vrai iPhone est à confirmer sur l'appareil).", "");
lines.push("## Poids et traitement", "");
lines.push("| Fichier | Original | Full (ordinateur) | Light (téléphone) | Triangles affichés full / light | Traitement |");
lines.push("|---|---|---|---|---|---|");
for (const [name, m] of Object.entries(models)) {
  const v = m.stats.versions ?? {};
  lines.push(`| ${name} | ${mb(m.sizes.original ?? 0)} | ${mb(m.sizes.full ?? 0)} | ${mb(m.sizes.light ?? 0)} | ${(v.full?.drawn ?? 0).toLocaleString("fr-FR")} / ${(v.light?.drawn ?? 0).toLocaleString("fr-FR")} | ${String(m.stats.seconds).replace(".", ",")} s (+ envoi ${String((m.uploadSeconds ?? 0).toFixed(1)).replace(".", ",")} s) |`);
}
lines.push("", "## Pierres détectées", "");
lines.push("| Fichier | Trouvé par le pipeline | Analyse de départ |");
lines.push("|---|---|---|");
for (const [name, m] of Object.entries(models)) {
  const found = m.stats.stonesMissing ? "aucune pierre séparable : métal seul (message « pierres fondues ou absentes » dans l'admin)" : (m.stats.stones ?? []).length > 0 ? m.stats.stones.map((s) => s.count + " × " + s.material.replace("stone_", "").replace("_", " ") + (s.known ? "" : " (à vérifier)")).join(" ; ") : m.layers.map((l) => l.name + " : " + l.copies + " exemplaire(s), rôle deviné " + l.guess + (l.check ? " (à vérifier)" : "")).join(" ; ");
  lines.push(`| ${name} | ${found} | ${EXPECTED[name] ?? ""} |`);
}
lines.push("", "## Chargement et fluidité", "");
lines.push("Chargement : du clic sur le lien au bijou affiché, serveur local ; « 4G » : la même page sur l'iPhone émulé avec une connexion de 10 Mbit/s, sans cache. Les images par seconde plafonnent à 60 (la fréquence de l'écran).", "");
lines.push("| Fichier | Ordinateur : chargement / images par s | iPhone émulé : chargement (4G) / images par s | Zoom sur une pierre : centre de la vue → pierre | Recentrage tout seul (2,5 s après) |");
lines.push("|---|---|---|---|---|");
const fr = (n, digits = 1) => String(Number(n).toFixed(digits)).replace(".", ",");
for (const [name, r] of Object.entries(results)) {
  const d = r.desktop;
  const p = r.iphone;
  const hasStones = (models[name].stats.stones ?? []).length > 0 || name.endsWith(".glb");
  const zoom = hasStones ? `${fr(d.zoom.targetToStone, 2)} mm (la pierre est à ${fr(d.zoom.stoneToCentre)} mm du centre du bijou ; caméra à ${fr(d.zoom.cameraDistance)} mm)` : `pas de pierres : zoom sur le métal (caméra à ${fr(d.zoom.cameraDistance)} mm)`;
  lines.push(`| ${name} | ${fr(d.loadSeconds)} s / ${d.fps} | ${fr(p.loadSeconds)} s (${fr(p.load4g)} s) / ${p.fps} | ${zoom} | ${fr(d.zoom.drift, 3)} mm |`);
}
lines.push("", "## Contrôles", "");
const recentered = Object.values(results).some((r) => r.desktop.zoom.targetToCentre < r.desktop.zoom.stoneToCentre * 0.5 || r.desktop.zoom.drift > 0.05);
checks.push(["Zoom sur un détail : la vue reste sur le détail, jamais de recentrage sur le bijou", !recentered]);
const pinches = Object.values(results).map((r) => r.desktop.pinch);
checks.push([
  "Pincement du pavé tactile : la caméra se rapproche (" + pinches.map((p) => fr(p.before) + " → " + fr(p.after) + " mm").join(" ; ") + "), l'image n'est jamais agrandie (flou)",
  pinches.every((p) => p.after < p.before * 0.95 && p.zoom === 1),
]);
checks.push(["Erreurs dans la console (toutes les pages ouvertes) : " + errors.length, errors.length === 0]);
for (const [text, ok] of checks) lines.push("- " + (ok ? "OK" : "**À REVOIR**") + " — " + text);
if (errors.length > 0) lines.push("", "```", ...errors.slice(0, 30), "```");
lines.push("", "## Captures", "");
lines.push("- `admin-*.jpg` : l'envoi du fichier de test dans l'admin, la liste, les réglages des calques, un calque vu seul.");
lines.push("- `desktop/` et `iphone/` : pour chaque modèle, `-0-page` (la page du lien privé), `-1-vue-par-defaut`, `-1b-pincement` (pincement du pavé tactile, ordinateur), `-2-zoom` (double-clic puis molette, ou double-tap), `-3-lumiere-*` (bracelet de test), `-4-metal-*`.");
lines.push("- `lien-expire.jpg`, `lien-mot-de-passe.jpg`, `page-piece-explore-in-3d.jpg`.");
fs.writeFileSync(path.join(OUT, "rapport.md"), lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exit(errors.length === 0 && checks.every(([, ok]) => ok) ? 0 : 1);
