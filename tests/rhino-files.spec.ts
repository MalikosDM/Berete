// Rhino files (.3dm) converted by the 3D pipeline (27/11/2026): the GLB holds every solid object of the visible layers
// of the file, where the file puts it, and nothing else; no part away from the jewel unless it is away from it in the
// file (scripts/rhino-check.ts reads the file with rhino3dm on its own and compares, object by object).
// - A small file made here (layers turned off, a parent layer off, nested blocks turned, stretched and mirrored copies,
//   a hidden object, a curve, a far piece, in centimetres), converted by the pipeline itself: no server needed.
// - Yoni's three files as the server converted them (API: ADMIN_PASSWORD, typed in the Terminal, never written; the
//   originals in storage/models). Skipped when they are not there. RHINO_REPROCESS=1 converts them again first.
// No page is opened: it runs once, in the "desktop" project.
import fs from "node:fs";
import path from "node:path";
import { expect, test, type APIRequestContext } from "./fixtures";
import { boxText, checkModel, makeTestFile } from "../scripts/rhino-check.js";
import { runPipeline } from "../server/models/pipeline/index.js";

test.beforeEach(() => test.skip(test.info().project.name !== "desktop", "No page: once is enough (desktop)"));

/** Yoni's three Rhino files (26/11/2026), by their name in the admin. */
const FILES = [
  { label: "OKA pendant (Noah Okafor)", name: /SCO108301-ZP0275-BJ001/ },
  { label: "octagon « N », version 2", name: /SCO110093-ZP0975-BJ001/ },
  { label: "octagon « N », version 1", name: /^ZP0975-BJ001/ },
];

type Row = { id: string; name: string; sourceKind: string; status: string; stats: { notes?: string[]; apart?: { main: { min: number[]; max: number[] }; groups: unknown[] } } | null; preview: { files: { full: string; light: string } } | null };

const auth = (token: string) => ({ Authorization: "Bearer " + token });

async function session(request: APIRequestContext): Promise<string> {
  const res = await request.post("/api/admin/login", { data: { password: process.env.ADMIN_PASSWORD } });
  expect(res.status(), "admin login").toBe(200);
  return ((await res.json()) as { token: string }).token;
}

test("a test file: hidden layers, nested blocks, units, a far piece", async () => {
  const testInfo = test.info();
  const dir = testInfo.outputPath("test-3dm");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "test.3dm");
  fs.writeFileSync(file, await makeTestFile());
  const result = await runPipeline(file, "3dm", dir, () => undefined);
  const { skipped, apart, checks, notes } = result.stats;
  expect(skipped?.hidden, "hidden objects").toBe(1);
  expect(skipped?.offLayers, "objects on layers turned off (a parent off counts)").toBe(4);
  expect(skipped?.drawings, "curves").toBe(1);
  expect(checks?.units.mmPerUnit, "centimetres").toBe(10);
  expect(apart?.groups.length, "the far piece, kept").toBe(1);
  expect(apart!.groups[0]!.gap).toBeCloseTo(290, 0);
  expect(notes?.some((n) => /calques? éteints?/.test(n)), "note: layers off").toBe(true);
  expect(notes?.some((n) => /posée à part/.test(n)), "note: piece apart").toBe(true);
  for (const version of ["full", "light"]) {
    const check = await checkModel(file, path.join(dir, version + ".glb"));
    expect(check.failures, version + ":\n" + check.report.join("\n")).toEqual([]);
    expect(check.apartInFile.length).toBe(1);
  }
});

test.describe("Yoni's Rhino files", () => {
  test.skip(!process.env.ADMIN_PASSWORD, "ADMIN_PASSWORD (the password of the admin) is needed");
  test.describe.configure({ mode: "serial" });

  for (const entry of FILES) {
    test(entry.label, async ({ request }, testInfo) => {
      test.setTimeout(10 * 60_000);
      const token = await session(request);
      const list = ((await (await request.get("/api/admin/models", { headers: auth(token) })).json()) as { items: Row[] }).items;
      const found = list.find((m) => m.sourceKind === "3dm" && entry.name.test(m.name));
      test.skip(!found, "not in the admin of this server");
      const models = path.resolve(process.env.MODELS_DIR ?? "storage", "models");
      const original = path.join(models, found!.id, "original.3dm");
      test.skip(!fs.existsSync(original), "the original is not on this computer (" + original + ")");

      if (process.env.RHINO_REPROCESS === "1") {
        const res = await request.post("/api/admin/models/" + found!.id + "/reprocess", { headers: auth(token) });
        expect(res.ok(), "reprocess").toBe(true);
        await expect
          .poll(async () => ((await (await request.get("/api/admin/models/" + found!.id, { headers: auth(token) })).json()) as Row).status, { timeout: 8 * 60_000, intervals: [2000] })
          .toBe("ready");
      }
      const row = (await (await request.get("/api/admin/models/" + found!.id, { headers: auth(token) })).json()) as Row;
      expect(row.status, "converted").toBe("ready");

      for (const version of ["full", "light"] as const) {
        // The GLB as the site serves it (the signed address of the admin), else from the disk.
        const glb = testInfo.outputPath(found!.id + "-" + version + ".glb");
        const served = row.preview ? await request.get(row.preview.files[version]) : null;
        if (served?.ok()) fs.writeFileSync(glb, await served.body());
        else fs.copyFileSync(path.join(models, found!.id, version + ".glb"), glb);
        const check = await checkModel(original, glb);
        await testInfo.attach(version + "-report.txt", { body: check.report.join("\n") + "\n\n" + (check.failures.join("\n") || "OK"), contentType: "text/plain" });
        expect(check.failures, entry.label + ", " + version + ":\n" + check.report.join("\n")).toEqual([]);

        // What the admin is told matches the file: pieces apart, hidden objects, drawings.
        const notes = row.stats?.notes ?? [];
        if (check.apartInFile.length > 0) {
          expect(notes.some((n) => /posées? à part/.test(n)), "note: pieces apart (" + check.apartInFile.map((a) => boxText(a.box)).join("; ") + ")").toBe(true);
          const main = row.stats?.apart?.main;
          expect(main, "box of the main piece in the stats").toBeTruthy();
        } else expect(row.stats?.apart?.groups.length ?? 0, "no piece apart").toBe(0);
        if (check.inventory.left.some((l) => l.why === "hidden")) expect(notes.some((n) => /cachés? dans Rhino/.test(n)), "note: hidden objects").toBe(true);
        if (Object.keys(check.inventory.drawings).length > 0) expect(notes.some((n) => /pas des? volumes?/.test(n)), "note: drawings").toBe(true);
      }
    });
  }
});
