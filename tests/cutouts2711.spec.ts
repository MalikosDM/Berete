// The cut-outs of the pieces at studio level (27/11/2026): every cut-out (src/data/cutouts.generated.json, the openings, the
// cards, « Your vision. Your universe ») laid on light grey, on mid grey and on the backdrop of its universe (or the black of
// the page when it has none), and measured (tests/cutout-metrics.ts):
//   - no dark fringe or halo: under 8 % of its edge comes out darker than both the background and the jewel inside it;
//   - no ghost: under 1.5 % of the jewel half transparent away from its edge (a chain is whole, or cut clean at its border);
//   - no background left: under 2 % of its outline in a thick patch of flat neutral black (the photo's black stuck to it);
//   - a cut side is only the top (the page puts that border at the top of its frame), never a fade.
// The cut-outs of images made by AI are never shown (src/data/showcase.ts, isAiView): not measured.
// CUTOUTS_ROOT=<folder> measures another set (a copy of public/media/cutouts and src/data/cutouts.generated.json, the set of
// before the 27/11/2026: every view listed by the lead fails there). Report: verification/cutouts2711/rapport.md.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import { BACKDROPS, resolveTheme } from "../src/data/themes";
import { isAiView, resolveShowcase, type CutoutView } from "../src/data/showcase";
import { publicCatalogue } from "../src/data/relations";
import { measureCutout } from "./cutout-metrics";
import { skipIntro } from "./helpers";

const ROOT = process.env.CUTOUTS_ROOT ?? process.cwd();
const DIR = "verification/cutouts2711";
const LIMITS = { fringe: 0.08, ghost: 0.015, background: 0.02 };

/**
 * Views looked at one by one at full size whose outline is partly the jewel's own black (a polished band mirroring the black
 * studio, the black of a side in the shadow): their "background" measure is not counted, for this exact file only (its
 * version): a cut-out redone is looked at again.
 */
const OWN_BLACK: Record<string, string> = {
  // The outside of its band, polished, mirrors the black studio (its edge drawn by the light of the band, 27/11/2026).
  "vfb-stuttgart-dfb-pokal-2025/p12@dc6cbe06a0": "le dehors poli de l'anneau reflète le studio noir",
  "vfb-stuttgart-dfb-pokal-2025/p18@8e7791c41e": "le dehors poli de l'anneau reflète le studio noir",
  // The walls of its petals in the shadow (the black stains of the velvet under them cut away along their bottom).
  "the-safi-link/p02@7b4efc0d56": "les parois des pétales dans l'ombre (les taches du velours dessous sont retirées)",
  // The black bands of its bezel and its dark side.
  "campione-d-italia-2023-2024/p44@73a000a8f1": "les bandes noires de la lunette et son flanc dans l'ombre",
};

/** The backdrop image of the universe of a piece (its computer image, 1600 px), or null. */
function backdropOf(slug: string): string | null {
  const piece = defaultCatalogue.pieces.find((p) => p.slug === slug);
  if (!piece) return null;
  const id = resolveTheme(piece.theme).backdrop;
  if (!id) return null;
  if (id.startsWith("/media/")) return join(process.cwd(), "public", id);
  const b = BACKDROPS[id];
  if (!b) return null;
  const first = b.sequence?.length ? b.sequence[0]! : id;
  const bb = BACKDROPS[first] ?? b;
  const file = join(process.cwd(), "public/media/universes", first + "-1600" + (bb.version ? "." + bb.version : "") + ".webp");
  return existsSync(file) ? file : null;
}

test("every cut-out is clean on light grey, mid grey and its universe: no fringe, no ghost, no background left", async () => {
  test.skip(test.info().project.name !== "desktop", "the files are measured once");
  test.setTimeout(10 * 60_000);
  mkdirSync(DIR, { recursive: true });
  const views = (JSON.parse(readFileSync(join(ROOT, "src/data/cutouts.generated.json"), "utf8")) as { views: Record<string, CutoutView[]> }).views;
  const lines = ["# Détourages : mesures (27/11/2026)", "", "| pièce / vue | liseré sombre | voile | fond resté | coupé | état |", "|---|---|---|---|---|---|"];
  const failures: string[] = [];
  let count = 0;
  for (const [slug, list] of Object.entries(views)) {
    for (const v of list) {
      if (isAiView(v)) continue;
      // A view marked not clean is never shown (src/data/showcase.ts): listed, not measured.
      if (!v.clean) {
        lines.push("| " + slug + " / " + v.id + " | | | | | jamais montrée : " + (v.note || "non propre") + " |");
        continue;
      }
      const w = v.widths[v.widths.length - 1]!;
      const file = join(ROOT, "public/media/cutouts", slug, v.id + "-" + w + (v.version ? "." + v.version : "") + ".webp");
      expect(existsSync(file), file).toBe(true);
      const m = await measureCutout(file, backdropOf(slug));
      const cut = (v as CutoutView & { fade?: string[] | null }).cut ?? null;
      const faded = (v as { fade?: string[] | null }).fade ?? null;
      const bad: string[] = [];
      if (m.fringe >= LIMITS.fringe) bad.push("liseré sombre " + (m.fringe * 100).toFixed(1) + " % (" + m.fringeOn + ")");
      if (m.ghost >= LIMITS.ghost) bad.push("voile " + (m.ghost * 100).toFixed(2) + " %");
      if (m.background >= LIMITS.background && !OWN_BLACK[slug + "/" + v.id + "@" + v.version]) bad.push("fond resté " + (m.background * 100).toFixed(2) + " %");
      if (faded?.length) bad.push("fondu " + faded.join(", "));
      if (cut?.some((s) => s !== "top")) bad.push("coupé ailleurs qu'en haut : " + cut.join(", "));
      count += 1;
      lines.push("| " + slug + " / " + v.id + " | " + (m.fringe * 100).toFixed(1) + " % | " + (m.ghost * 100).toFixed(2) + " % | " + (m.background * 100).toFixed(2) + " % | " + (cut?.join(", ") ?? "") + " | " + (bad.length ? "**" + bad.join(" ; ") + "**" : "propre") + " |");
      if (bad.length) failures.push(slug + "/" + v.id + ": " + bad.join(" ; "));
    }
  }
  writeFileSync(join(DIR, "rapport.md"), lines.join("\n") + "\n\n" + count + " vues mesurées, " + failures.length + " à reprendre.\n");
  expect(count).toBeGreaterThan(40);
  expect(failures, failures.join("\n")).toEqual([]);
  // The pieces that opened on their photo until 27/11/2026 (a rectangle of black on their universe): cut out now, at least two
  // views each when their photos allow it, and every unpublished piece of the list has one too (only where there is a real
  // photo: a piece known only by images made by AI stays out).
  if (!process.env.CUTOUTS_ROOT) {
    const real = (slug: string) => (views[slug] ?? []).filter((v) => v.clean && !isAiView(v));
    for (const slug of CUT_AT_LAST) expect(real(slug).length, slug + ": its real photos cut out").toBeGreaterThanOrEqual(TWO_VIEWS.has(slug) ? 2 : 1);
  }
});

/**
 * Cut out for the first time on 27/11/2026 (published and unpublished pieces). Cut out but never shown: the JACK nameplate (its
 * only photo, a blurry story), the JC and the 999 (cut by their photo). Not cut out: the NZ ring and the signet ring (held in
 * gloved fingers, on a hand: no clean outline without inventing).
 */
const CUT_AT_LAST = [
  "deniz-undav-l-pendant",
  "panther-champion-pendant",
  "marcus-thuram-jesus-piece",
  "jesus-piece-red-flowers",
  "oval-eternity-band",
  "tanguy-nianzou-nz-pendant",
  "eljero-elia-clover-medallion",
  "flaneur-medallion",
  "baguette-cuban-chain",
  "rose-iced-cuban-chain",
  "wide-rose-iced-cuban-chain",
  "two-tone-iced-cuban-chain",
  "infinity-link-chain",
  "pear-link-chain",
  "cross-infinity-chain",
];
/** Those whose folder has two clean photos of the whole jewel or more. */
const TWO_VIEWS = new Set(["deniz-undav-l-pendant", "panther-champion-pendant", "jesus-piece-red-flowers", "marcus-thuram-jesus-piece", "oval-eternity-band", "eljero-elia-clover-medallion", "baguette-cuban-chain", "rose-iced-cuban-chain", "wide-rose-iced-cuban-chain"]);

// The openings of the pieces and the home page (1440 x 900, iPhone WebKit): the jewel cut out (never the rectangle of its photo)
// wherever a clean cut-out of a real photo exists; screenshots in verification/cutouts2711/<project>/ to look at.
test("the openings show the jewel cut out, never the rectangle of its photo", async ({ page }) => {
  const project = test.info().project.name;
  test.skip(project !== "desktop" && project !== "iphone", "a computer and an iPhone");
  test.setTimeout(15 * 60_000);
  const dir = join(DIR, project);
  mkdirSync(dir, { recursive: true });
  await skipIntro(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const photos: string[] = [];
  for (const piece of publicCatalogue(defaultCatalogue).pieces) {
    const expected = resolveShowcase(piece.slug, piece.showcase).mode !== "photo";
    await page.goto("/pieces/" + piece.slug, { waitUntil: "domcontentloaded" });
    const opening = page.locator("[data-piece-opening]");
    await expect(opening).toBeVisible();
    await page.waitForTimeout(900);
    const cutout = await opening.locator("[data-showcase]").count();
    if (expected && !cutout) photos.push(piece.slug);
    if (cutout) await opening.locator("[data-showcase] img").first().evaluate((img: HTMLImageElement) => (img.complete ? null : new Promise((r) => img.addEventListener("load", r, { once: true })))).catch(() => undefined);
    await page.screenshot({ path: join(dir, piece.slug + ".jpg"), type: "jpeg", quality: 80 });
  }
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(dir, "_accueil.jpg"), type: "jpeg", quality: 80, fullPage: true });
  expect(photos, "openings still on their photo: " + photos.join(", ")).toEqual([]);
});
