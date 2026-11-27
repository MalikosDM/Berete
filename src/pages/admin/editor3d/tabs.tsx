/*
 * The right side of the 3D editor (26/11/2026), in tabs as jewellers' tools arrange it: Vue, Parties, Scène, Rendu,
 * Effets, Vues de caméra, Configurateur, Export. Every setting applies at once; « Enregistrer » keeps them.
 */
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ArrowDown, ArrowUp, Crosshair, Diamond, Download, Eye, EyeOff, Plus, Trash2, Upload } from "lucide-react";
import { Color, LinearSRGBColorSpace } from "three";
import { diamondOf, LAYER_ROLES, METALS, type LayerRole, type LayerSetting, type MetalId } from "@/data/models";
import { DEFAULT_DIAMOND, EASES, GEM_ENVS, GROUNDS, METAL_ENVS, TONEMAPS, type CameraView, type Configurator, type DiamondParams, type ExtraLight, type SceneSettings, type Vec3 } from "@/data/scene3d";
import { sceneFromVjson } from "@/data/ijewel";
import { hdriName } from "@/viewer/hdri";
import { LOOK_NAMES, LOOKS } from "@/viewer/looks";
import { METAL_LOOKS } from "@/viewer/materials";
import { importMaterial, libraryOf, materialById } from "@/viewer/library/materials";
import ExportPanel from "@/viewer/export/ExportPanel";
import { download } from "@/viewer/export/exporter";
import { btn, iconBtn, inputCls } from "../ui";
import { Choice, ColorField, Range, Section, Tile, Toggle, Vec3Field } from "./controls";
import { HELP } from "./help";
import type { EditorCtx } from "./context";
import CustomHdr from "./CustomHdr";
import { BACKGROUND_NAMES_FR, EASE_NAMES, FINISH_NAMES, GROUND_NAMES, METAL_NAMES_FR, thumb, TONEMAP_NAMES } from "./presets";

/** A short id for a new light, view or configurator. */
function newId(): string {
  return Math.random().toString(36).slice(2, 8);
}

const ROLE_NAMES: Record<LayerRole, string> = { metal: "Métal", diamond: "Diamant", stone: "Pierre de couleur", enamel: "Émail", hide: "Masquer" };
const metalOptions = METALS.map((m) => [m, METAL_NAMES_FR[m] ?? m] as const);
/** The lightings of a list, with the one in use when it is an uploaded one (« custom:… »). */
const envOptions = (ids: readonly string[], current?: string | null) => [
  ...ids.map((id) => [id, hdriName(id)] as const),
  ...(current && current.startsWith("custom:") ? [[current, "Votre éclairage"] as const] : []),
];
/**
 * Bounds of the lightings' strengths (27/11/2026, measured by scripts/settings-audit.ts): the metal never black nor
 * burnt white under the default lighting, the stones never black nor flat white. The left drawers use the same.
 */
const METAL_INTENSITY: [number, number] = [0.4, 2.5];
const GEM_INTENSITY: [number, number] = [0.5, 2.5];
/**
 * Taken out of the choices (27/11/2026, docs/3d-reglages-testes.md), still shown when a model already uses them: the
 * « Studio sombre » lighting left the metal black on both jewels tested; the brushed finish made it flat white
 * (its anisotropy in src/viewer/library/materials.ts, to be corrected in the engine).
 */
const HIDDEN_METAL_ENVS = ["studio-dark"];
const HIDDEN_FINISHES = ["brushed"];
/** The metal's lightings offered: without the hidden ones, unless in use. */
const metalEnvsShown = (current: string) => METAL_ENVS.filter((id) => !HIDDEN_METAL_ENVS.includes(id) || id === current);
/** The colour looks (« LUT »), for a material or the whole scene. */
const lookOptions = [["", "Aucune"], ...LOOKS.map((id) => [id, LOOK_NAMES[id]] as const)] as const;

/** The roughness a finish gives the alloy (src/viewer/library/materials.ts), shown while the metal has none of its own. */
function finishRoughness(metal: MetalId, kind: NonNullable<LayerSetting["finish"]>["kind"]): number {
  const r = METAL_LOOKS[metal]?.roughness ?? 0.1;
  if (kind === "satin") return Math.min(0.48, r + 0.26);
  if (kind === "brushed") return 0.24;
  if (kind === "hammered") return r + 0.03;
  if (kind === "aged") return 1;
  return r;
}

/** The colour of an alloy as the colour field shows it (#rrggbb). */
function alloyHex(metal: MetalId): string {
  const c = METAL_LOOKS[metal]?.color ?? [0.946, 0.649, 0.48];
  return "#" + new Color().setRGB(c[0], c[1], c[2], LinearSRGBColorSpace).getHexString();
}

/* ---------- Vue ---------- */

export function ViewTab({ c }: { c: EditorCtx }) {
  const { scene, viewer } = c;
  const dist = (which: "portrait" | "landscape") => viewer.distance[which];
  const setDist = (which: "portrait" | "landscape", v: [number, number] | null) => c.setViewer({ ...viewer, distance: { ...viewer.distance, [which]: v } });
  return (
    <div className="grid gap-1" data-tab-panel="view">
      <Section title="Qualité et caméra" open>
        <Choice name="Qualité" value={scene.render.quality} options={[["auto", "Automatique (plus légère sur téléphone)"], ["high", "Haute"], ["ultra", "Très haute (plus de rebonds, plus d'images)"]]} onChange={(q) => c.setScene({ ...scene, render: { ...scene.render, quality: q } })} data="quality" />
        <Range name="Champ de vision" value={scene.camera.fov} min={12} max={60} step={1} unit="°" onChange={(fov) => c.setScene({ ...scene, camera: { ...scene.camera, fov } })} data="fov" />
        <Toggle name="Mise à l'échelle automatique (Auto Scale)" hint="Bouton « Revenir à la première vue » pour voir." checked={scene.camera.autoScale} onChange={(autoScale) => c.setScene({ ...scene, camera: { ...scene.camera, autoScale } })} data="auto-scale" />
        <Toggle name="Centrage automatique (Auto Center)" checked={scene.camera.autoCenter} onChange={(autoCenter) => c.setScene({ ...scene, camera: { ...scene.camera, autoCenter } })} data="auto-center" />
      </Section>
      <Section title="Ce que voit le client" open data="client">
        <Toggle name="Zoom à la molette et au pincement" checked={viewer.zoom} onChange={(zoom) => c.setViewer({ ...viewer, zoom })} data="client-zoom" />
        <Toggle name="Boutons + et −" checked={viewer.zoomButtons} onChange={(zoomButtons) => c.setViewer({ ...viewer, zoomButtons })} data="client-zoom-buttons" />
        <Toggle name="Invite « Glissez pour tourner »" checked={viewer.prompt} onChange={(prompt) => c.setViewer({ ...viewer, prompt })} data="client-prompt" />
        <Toggle name="Rotation automatique au départ" checked={viewer.autoRotate} onChange={(autoRotate) => c.setViewer({ ...viewer, autoRotate })} data="client-auto-rotate" />
        <Toggle name="Vues enregistrées et visite guidée" checked={viewer.views} onChange={(views) => c.setViewer({ ...viewer, views })} data="client-views" />
        <Toggle name="Configurateur (pastilles en bas)" checked={viewer.configurator} onChange={(configurator) => c.setViewer({ ...viewer, configurator })} data="client-configurator" />
        <Toggle name="Bouton Partager" checked={viewer.share} onChange={(share) => c.setViewer({ ...viewer, share })} data="client-share" />
        <Toggle name="Plein écran" checked={viewer.fullscreen} onChange={(fullscreen) => c.setViewer({ ...viewer, fullscreen })} data="client-fullscreen" />
        <Toggle name="Essayage (bagues)" checked={viewer.tryOn} onChange={(tryOn) => c.setViewer({ ...viewer, tryOn })} data="client-try-on" />
        <Toggle name="Voir chez moi (réalité augmentée)" checked={viewer.ar} onChange={(ar) => c.setViewer({ ...viewer, ar })} data="client-ar" />
        <Choice name="Qualité chez le client" value={viewer.quality} options={[["auto", "Automatique"], ["high", "Haute"], ["ultra", "Très haute"]]} onChange={(quality) => c.setViewer({ ...viewer, quality })} data="client-quality" />
      </Section>
      <Section title="Limites du zoom chez le client" data="distances">
        <p className="text-sm text-mist">En nombre de fois la taille du bijou. Un écran en hauteur (téléphone) et un écran en largeur (ordinateur) peuvent avoir leurs propres limites.</p>
        {(["portrait", "landscape"] as const).map((which) => {
          const v = dist(which);
          return (
            <div key={which} className="grid gap-2 border-t border-white/10 pt-2">
              <Toggle name={which === "portrait" ? "Limiter sur un écran en hauteur" : "Limiter sur un écran en largeur"} checked={v !== null} onChange={(on) => setDist(which, on ? [1.2, 6] : null)} data={"zoom-limit-" + which} />
              {v ? (
                <>
                  <Range name="Au plus près" value={v[0]} min={0.3} max={5} step={0.1} unit=" ×" onChange={(lo) => setDist(which, [lo, Math.max(lo + 0.2, v[1])])} data={"zoom-near-" + which} />
                  <Range name="Au plus loin" value={v[1]} min={1} max={15} step={0.1} unit=" ×" onChange={(hi) => setDist(which, [Math.min(v[0], hi - 0.2), hi])} data={"zoom-far-" + which} />
                </>
              ) : null}
            </div>
          );
        })}
      </Section>
      <Section title="Mouvements de la caméra chez le client" data="camera-moves">
        <Range name="Vitesse de la rotation automatique (Rotate Speed)" value={viewer.rotateSpeed ?? 0.35} min={-1.5} max={1.5} step={0.05} onChange={(rotateSpeed) => c.setViewer({ ...viewer, rotateSpeed })} data="rotate-speed" />
        <Toggle name="Déplacement latéral (Pan)" checked={viewer.pan ?? true} onChange={(pan) => c.setViewer({ ...viewer, pan })} data="camera-pan" />
        <Toggle name="Limites d'angle de la caméra (Polar Angle Limits)" checked={Boolean(viewer.polarLimits)} onChange={(on) => c.setViewer({ ...viewer, polarLimits: on ? [20, 100] : null })} data="polar-limits" />
        {viewer.polarLimits ? (
          <>
            <Range name="Au plus haut (depuis le dessus)" value={viewer.polarLimits[0]} min={0} max={170} step={1} unit="°" onChange={(lo) => c.setViewer({ ...viewer, polarLimits: [lo, Math.max(lo + 10, viewer.polarLimits![1])] })} data="polar-min" />
            <Range name="Au plus bas (depuis le dessus)" value={viewer.polarLimits[1]} min={10} max={180} step={1} unit="°" onChange={(hi) => c.setViewer({ ...viewer, polarLimits: [Math.min(viewer.polarLimits![0], hi - 10), hi] })} data="polar-max" />
          </>
        ) : null}
      </Section>
    </div>
  );
}

/* ---------- Parties ---------- */

export function PartsTab({ c }: { c: EditorCtx }) {
  const [library, setLibrary] = useState(false);
  const selected = c.selected;
  const layer = selected ? (c.settings.layers[selected] ?? null) : null;
  const info = c.layers.find((l) => l.name === selected);
  return (
    <div className="grid gap-4" data-tab-panel="parts">
      <p className="text-sm text-mist">Cliquez sur une partie du bijou, ou choisissez-la ici. Les calques nommés comme dans iJewel (Metal, Gem, Diamond) sont reconnus seuls.</p>
      <ul className="grid gap-1" role="listbox" aria-label="Parties du bijou" data-parts>
        {c.layers.map((l) => {
          const s = c.settings.layers[l.name];
          const role = s?.role ?? (l.guess as LayerRole);
          const active = selected === l.name;
          return (
            <li key={l.name} className={"flex items-center gap-2 border px-2 " + (active ? "border-rose-light" : "border-white/10")} data-part={l.name}>
              <button type="button" role="option" aria-selected={active} onClick={() => c.select(active ? null : l.name)} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-start">
                <span className="size-4 shrink-0 rounded-full border border-white/30" style={{ background: l.color ?? (role === "metal" ? "#e8b4a0" : role === "diamond" ? "#ffffff" : (s?.color ?? "#555")) }} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-base text-white">{l.name}</span>
                  <span className="block text-sm text-mist">
                    {ROLE_NAMES[role]} · {l.copies.toLocaleString("fr-FR")} {l.copies > 1 ? "exemplaires" : "exemplaire"}
                    {l.check ? " · à vérifier" : ""}
                  </span>
                </span>
              </button>
              <button type="button" className={iconBtn + " border-0"} aria-pressed={c.highlight === l.name} aria-label={c.highlight === l.name ? "Tout voir" : "Voir seule"} title={c.highlight === l.name ? "Tout voir" : "Voir seule"} onClick={() => c.setHighlight(c.highlight === l.name ? null : l.name)}>
                {c.highlight === l.name ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>

      {selected && info ? (
        <div className="grid gap-1 border-t border-white/15 pt-3" data-part-panel={selected}>
          <p className="text-lg text-white">{selected}</p>
          <Section title="Matière" open>
            {/*
              A coloured stone or an enamel gets the colour its field shows (27/11/2026: it stayed white, or black for an
              enamel); a coloured stone a light density of colour (0,4): the engine's 1,2 made a large stone half black.
            */}
            <Choice
              name="Rôle"
              value={layer?.role ?? (info.guess as LayerRole)}
              options={LAYER_ROLES.map((r) => [r, ROLE_NAMES[r]] as const)}
              onChange={(role) =>
                c.setLayer(selected, {
                  role,
                  ...((role === "stone" || role === "enamel") && !layer?.color ? { color: "#9b111e" } : {}),
                  ...(role === "stone" && layer?.diamond?.absorption === undefined ? { diamond: { ...(layer?.diamond ?? {}), absorption: 0.4 } } : {}),
                })
              }
              data="role"
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} onClick={() => c.setLayer(selected, { role: "diamond", material: undefined })} data-make-diamond>
                <Diamond className="size-4" aria-hidden="true" /> Faire un diamant
              </button>
              <button type="button" className={btn} onClick={() => setLibrary(true)} data-open-library>
                Bibliothèque de matières
              </button>
            </div>
            {layer?.material ? (
              <p className="text-sm text-bone" data-layer-material={layer.material}>
                Matière de la bibliothèque : <span className="text-white">{materialById(layer.material)?.name ?? layer.material}</span>{" "}
                <button type="button" className="underline hover:text-rose-light" onClick={() => c.setLayer(selected, { material: undefined })}>
                  retirer
                </button>
              </p>
            ) : null}
            {(layer?.role ?? info.guess) === "metal" ? <MetalFields c={c} name={selected} layer={layer} /> : null}
            {(layer?.role === "stone" || layer?.role === "enamel") && !layer.material ? <ColorField name="Couleur" value={layer.color ?? "#9b111e"} onChange={(color) => c.setLayer(selected, { color })} data="stone-color" /> : null}
            <Toggle name="Lueur sur cette matière (Bloom)" checked={layer?.bloom ?? (layer?.role === "diamond" || layer?.role === "stone")} onChange={(bloom) => c.setLayer(selected, { bloom })} data="bloom-layer" />
            {(layer?.role ?? info.guess) === "metal" ? (
              <label className="block text-base text-bone" data-control="layer-label">
                Nom pour le client
                <input value={layer?.label ?? ""} placeholder="ex. Maillons" onChange={(e) => c.setLayer(selected, { label: e.target.value })} className={inputCls + " placeholder:text-mist/60"} />
                <span className="mt-1 block text-sm text-mist">Lu par le client au-dessus des pastilles de ce métal.</span>
              </label>
            ) : null}
          </Section>
          {layer?.role === "diamond" || layer?.role === "stone" || (layer?.material && materialById(layer.material) && "gem" in materialById(layer.material)!) ? <DiamondFields c={c} name={selected} layer={layer ?? { role: "diamond" }} /> : null}
        </div>
      ) : null}

      <Section title="Position du bijou" data="transform">
        <Vec3Field name="Rotation" value={c.scene.pose.rotation} min={-180} max={180} step={1} unit="°" onChange={(rotation) => c.setScene({ ...c.scene, pose: { ...c.scene.pose, rotation } })} data="pose-rotation" />
      </Section>
      {library && selected ? <LibraryPicker c={c} layer={selected} onClose={() => setLibrary(false)} /> : null}
    </div>
  );
}

function MetalFields({ c, name, layer }: { c: EditorCtx; name: string; layer: LayerSetting | null }) {
  const finish = layer?.finish ?? { kind: "polished" as const };
  const metal = (layer?.metal ?? "rose-gold") as MetalId;
  return (
    <>
      <Choice name="Métal" value={metal} options={metalOptions} onChange={(m) => c.setLayer(name, { metal: m, material: undefined })} data="metal" />
      <Choice name="Finition" value={finish.kind} options={(Object.entries(FINISH_NAMES) as [NonNullable<LayerSetting["finish"]>["kind"], string][]).filter(([k]) => !HIDDEN_FINISHES.includes(k) || k === finish.kind)} onChange={(kind) => c.setLayer(name, { finish: { ...finish, kind } })} data="finish" />
      {finish.kind === "brushed" ? <Range name="Sens du brossage" value={finish.angle ?? 0} min={0} max={180} step={1} unit="°" onChange={(angle) => c.setLayer(name, { finish: { ...finish, angle } })} data="brush-angle" /> : null}
      <ColorField name="Teinte du métal (Metal Color)" value={layer?.metalColor ?? alloyHex(metal)} onChange={(metalColor) => c.setLayer(name, { metalColor })} data="metal-color">
        {layer?.metalColor ? (
          <button type="button" className="min-h-12 px-2 text-sm text-bone underline hover:text-rose-light" onClick={() => c.setLayer(name, { metalColor: undefined })} data-metal-color-reset>
            Couleur de l'alliage
          </button>
        ) : null}
      </ColorField>
      {/* 0,05 to 0,6 (27/11/2026, measured): below, a mirror shows the dark parts of a lighting as black patches; above, the metal turns to grey plastic. */}
      <Range name="Rugosité (Roughness)" value={layer?.roughness ?? finishRoughness(metal, finish.kind)} min={0.05} max={0.6} step={0.01} hint={layer?.roughness === undefined ? "Celle de la finition, tant que vous ne la changez pas." : undefined} onChange={(roughness) => c.setLayer(name, { roughness })} data="roughness" />
      <Range name="Vernis (Clearcoat)" value={layer?.clearcoat ?? 0} min={0} max={1} step={0.01} onChange={(clearcoat) => c.setLayer(name, { clearcoat })} data="clearcoat" />
      <Choice name="Teinte de la matière (LUT)" value={layer?.lut ?? ""} options={lookOptions} onChange={(lut) => c.setLayer(name, { lut: lut || undefined })} data="metal-lut" />
      {layer?.roughness !== undefined || layer?.clearcoat !== undefined || layer?.lut || layer?.metalColor ? (
        <button type="button" className="min-h-12 text-start text-base text-bone underline hover:text-rose-light" onClick={() => c.setLayer(name, { roughness: undefined, clearcoat: undefined, lut: undefined, metalColor: undefined })} data-metal-reset>
          Revenir au métal tel quel
        </button>
      ) : null}
    </>
  );
}

/**
 * The bounds of the stones' sliders (27/11/2026, measured on ZR0982 and the client's octagon at every lighting,
 * docs/3d-reglages-testes.md): no combination of them makes a stone black or flat white. A stone loaded from a file
 * (.bgem) is kept within them too.
 */
const GEM_BOUNDS = {
  envIntensity: [0.5, 3],
  envRotation: [-180, 180],
  dispersion: [0, 0.03],
  absorption: [0, 1],
  refractiveIndex: [1.5, 2.9],
  gamma: [0.6, 1.6],
  transmission: [0, 0.6],
  reflectivity: [0, 1],
  rayBounces: [1, 16],
  orientedLighting: [0, 1],
} as const satisfies Partial<Record<keyof DiamondParams, readonly [number, number]>>;
const BOOST: readonly [number, number] = [0.6, 1.6];

const clamp = (v: unknown, [lo, hi]: readonly [number, number], fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);
const clamp3 = (v: unknown, b: readonly [number, number], fallback: Vec3): Vec3 => (Array.isArray(v) && v.length === 3 ? (v.map((x, i) => clamp(x, b, fallback[i]!)) as Vec3) : fallback);

/**
 * A stone of our own format (.bgem: {"format":"berete-gem","version":1,"name","diamond"}), read back: only the known
 * settings, every number kept within the sliders' bounds.
 */
function readGem(text: string): { name: string; diamond: Partial<DiamondParams> } | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: "Ce fichier n'est pas une pierre (.bgem)." };
  }
  const o = data as { format?: unknown; name?: unknown; diamond?: unknown };
  if (!o || o.format !== "berete-gem" || typeof o.diamond !== "object" || o.diamond === null) return { error: "Ce fichier n'est pas une pierre (.bgem)." };
  const g = o.diamond as Record<string, unknown>;
  const D = DEFAULT_DIAMOND;
  const out: Partial<DiamondParams> = {};
  for (const [k, b] of Object.entries(GEM_BOUNDS) as [keyof typeof GEM_BOUNDS, readonly [number, number]][]) if (k in g) out[k] = clamp(g[k], b, D[k]) as never;
  if (typeof out.rayBounces === "number") out.rayBounces = Math.round(out.rayBounces);
  if ("boost" in g) out.boost = clamp3(g.boost, BOOST, D.boost);
  if ("envRotationXYZ" in g) out.envRotationXYZ = clamp3(g.envRotationXYZ, GEM_BOUNDS.envRotation, D.envRotationXYZ);
  if (typeof g.color === "string" && /^#[0-9a-f]{6}$/i.test(g.color)) out.color = g.color.toLowerCase();
  if (g.env === null || (typeof g.env === "string" && (GEM_ENVS as readonly string[]).includes(g.env) && g.env !== "auto")) out.env = g.env as string | null;
  if (g.mode === "auto" || g.mode === "trace" || g.mode === "fast") out.mode = g.mode;
  if (typeof g.bloom === "boolean") out.bloom = g.bloom;
  if (g.lut === null || (typeof g.lut === "string" && (LOOKS as readonly string[]).includes(g.lut))) out.lut = g.lut as string | null;
  if (g.cubeSize === "auto" || g.cubeSize === 256 || g.cubeSize === 512 || g.cubeSize === 1024) out.cubeSize = g.cubeSize;
  if (g.inclusions === null) out.inclusions = null;
  else if (typeof g.inclusions === "object" && g.inclusions) {
    const i = g.inclusions as Record<string, unknown>;
    out.inclusions = { amount: clamp(i.amount, [0, 1], 0.3), scale: clamp(i.scale, [0.2, 4], 1), roughness: clamp(i.roughness, [0, 1], 0.5) };
  }
  if (g.thinFilm === null) out.thinFilm = null;
  else if (typeof g.thinFilm === "object" && g.thinFilm) {
    const f = g.thinFilm as Record<string, unknown>;
    out.thinFilm = { amount: clamp(f.amount, [0, 1], 0.5), thickness: clamp(f.thickness, [100, 1200], 380) };
  }
  const name = typeof o.name === "string" ? o.name.slice(0, 80) : "";
  return { name, diamond: out };
}

/** All the settings of a stone, with the names jewellers know (in brackets) and simple words. */
function DiamondFields({ c, name, layer }: { c: EditorCtx; name: string; layer: LayerSetting }) {
  const d = diamondOf(layer, c.settings.diamonds ?? "realistic");
  const set = (patch: Partial<DiamondParams>) => c.setLayer(name, { diamond: { ...(layer.diamond ?? {}), ...patch } });
  const file = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  // « Charger une pierre »: our .bgem first; a material exported before (.json of the library) still reads.
  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const text = await f.text();
    const gem = readGem(text);
    if (!("error" in gem)) {
      c.setLayer(name, { diamond: { ...(layer.diamond ?? {}), ...gem.diamond } });
      return setNote("Pierre chargée" + (gem.name ? " : « " + gem.name + " »" : "") + ".");
    }
    const result = importMaterial(text);
    if ("error" in result) return setNote(gem.error);
    const entry = materialById(result.id);
    const lib = entry && "gem" in entry ? entry.gem : undefined;
    set({ ...(lib ?? {}), ...(result.overrides as Partial<DiamondParams>) });
    setNote("Matière chargée.");
  };
  const saveGem = () => {
    const body = { format: "berete-gem", version: 1, name: name || "Pierre", diamond: { ...DEFAULT_DIAMOND, ...d } };
    download(new Blob([JSON.stringify(body, null, 2)], { type: "application/json" }), (name || "pierre").replace(/[^\p{L}\d._-]+/gu, "-") + ".bgem");
    setNote("Pierre enregistrée dans vos téléchargements (.bgem).");
  };
  return (
    <>
      <Section title="Pierre : lumière et couleur (Diamond Material)" open data="diamond">
        <Choice name="Éclairage de la pierre (Environment)" value={d.env ?? ""} options={[["", "Celui de la scène"], ...envOptions(GEM_ENVS.filter((x) => x !== "auto"), d.env)]} onChange={(env) => set({ env: env || null })} data="gem-env" />
        <ColorField name="Couleur (Color)" value={d.color} onChange={(color) => set({ color })} data="gem-color" />
        <Range name="Luminosité (Env Intensity)" value={d.envIntensity} min={GEM_BOUNDS.envIntensity[0]} max={GEM_BOUNDS.envIntensity[1]} step={0.01} onChange={(envIntensity) => set({ envIntensity })} data="env-intensity" />
        <Range name="Rotation de l'éclairage (Env Rotation Offset)" value={d.envRotation} min={-180} max={180} step={1} unit="°" onChange={(envRotation) => set({ envRotation })} data="env-rotation" />
        <Vec3Field name="Rotation de l'éclairage X / Y / Z" value={d.envRotationXYZ} min={-180} max={180} step={1} unit="°" onChange={(envRotationXYZ) => set({ envRotationXYZ })} data="env-rotation-xyz" />
        <Range name="Feu (Dispersion)" value={d.dispersion} min={GEM_BOUNDS.dispersion[0]} max={GEM_BOUNDS.dispersion[1]} step={0.001} onChange={(dispersion) => set({ dispersion })} data="dispersion" />
        <Range name="Densité de couleur (Absorption)" value={d.absorption} min={layer.role === "stone" ? 0.05 : GEM_BOUNDS.absorption[0]} max={GEM_BOUNDS.absorption[1]} step={0.05} hint="Pour les pierres teintées seulement." onChange={(absorption) => set({ absorption })} data="absorption" />
        <Range name="Indice de réfraction (Refractive Index)" value={d.refractiveIndex} min={GEM_BOUNDS.refractiveIndex[0]} max={GEM_BOUNDS.refractiveIndex[1]} step={0.01} onChange={(refractiveIndex) => set({ refractiveIndex })} data="ior" />
        <Range name="Contraste intérieur (Gamma)" value={d.gamma} min={GEM_BOUNDS.gamma[0]} max={GEM_BOUNDS.gamma[1]} step={0.01} onChange={(gamma) => set({ gamma })} data="gamma" />
        <Vec3Field name="Gain par couleur (RGB Boost)" value={d.boost} min={BOOST[0]} max={BOOST[1]} step={0.05} axes={["Rouge", "Vert", "Bleu"]} onChange={(boost) => set({ boost })} data="boost" />
        <Range name="Transparence vers l'arrière (Transmission)" value={d.transmission} min={GEM_BOUNDS.transmission[0]} max={GEM_BOUNDS.transmission[1]} step={0.01} onChange={(transmission) => set({ transmission })} data="transmission" />
        <Range name="Reflet de surface (Reflectivity)" value={d.reflectivity} min={GEM_BOUNDS.reflectivity[0]} max={GEM_BOUNDS.reflectivity[1]} step={0.01} onChange={(reflectivity) => set({ reflectivity })} data="reflectivity" />
        <Range name="Rebonds de la lumière (Ray Bounces)" value={d.rayBounces} min={GEM_BOUNDS.rayBounces[0]} max={GEM_BOUNDS.rayBounces[1]} step={1} onChange={(rayBounces) => set({ rayBounces })} data="bounces" />
        <Range name="Éclairage orienté (Diamond Oriented Lighting)" value={d.orientedLighting} min={GEM_BOUNDS.orientedLighting[0]} max={GEM_BOUNDS.orientedLighting[1]} step={0.01} onChange={(orientedLighting) => set({ orientedLighting })} data="oriented" />
        <Choice name="Calcul" value={d.mode} options={[["auto", "Automatique"], ["trace", "Lancer de rayons (exact, grosses pierres)"], ["fast", "Rapide (petites pierres répétées)"]]} onChange={(mode) => set({ mode })} data="gem-mode" />
        {d.mode !== "trace" ? (
          <Choice
            name="Précision de la carte intérieure (Cube Map Size)"
            value={String(d.cubeSize ?? "auto")}
            options={[["auto", "Automatique"], ["256", "256 (léger)"], ["512", "512"], ["1024", "1024 (le plus net)"]]}
            hint="Seulement pour les pierres en calcul rapide."
            onChange={(v) => set({ cubeSize: v === "auto" ? "auto" : (Number(v) as 256 | 512 | 1024) })}
            data="cube-size"
          />
        ) : null}
        <Choice name="Teinte de la matière (LUT)" value={d.lut ?? ""} options={lookOptions} onChange={(lut) => set({ lut: lut || null })} data="gem-lut" />
      </Section>
      <Section title="Pierre : film irisé (Thin Film)" data="thin-film">
        <Toggle name="Film irisé (Thin Film)" checked={d.thinFilm !== null && d.thinFilm !== undefined} onChange={(on) => set({ thinFilm: on ? { amount: 0.5, thickness: 380 } : null })} data="thin-film" />
        {d.thinFilm ? (
          <>
            <Range name="Force" value={d.thinFilm.amount} min={0} max={1} step={0.01} onChange={(amount) => set({ thinFilm: { ...d.thinFilm!, amount } })} data="thin-film-amount" />
            <Range name="Épaisseur (Thickness)" value={d.thinFilm.thickness} min={100} max={1200} step={10} unit=" nm" onChange={(thickness) => set({ thinFilm: { ...d.thinFilm!, thickness } })} data="thin-film-thickness" />
          </>
        ) : null}
      </Section>
      <Section title="Pierre : inclusions" data="inclusions">
        <Toggle name="Inclusions" checked={d.inclusions !== null} onChange={(on) => set({ inclusions: on ? { amount: 0.6, scale: 1, roughness: 0.5 } : null })} data="inclusions" />
        {d.inclusions ? (
          <>
            <Range name="Quantité" value={d.inclusions.amount} min={0} max={1} step={0.01} onChange={(amount) => set({ inclusions: { ...d.inclusions!, amount } })} data="inclusions-amount" />
            <Range name="Échelle" value={d.inclusions.scale} min={0.2} max={4} step={0.05} onChange={(scale) => set({ inclusions: { ...d.inclusions!, scale } })} data="inclusions-scale" />
            <Range name="Rugosité" value={d.inclusions.roughness} min={0} max={1} step={0.01} onChange={(roughness) => set({ inclusions: { ...d.inclusions!, roughness } })} data="inclusions-roughness" />
          </>
        ) : null}
      </Section>
      <div className="flex flex-wrap gap-2 py-2">
        <button type="button" className={btn} onClick={saveGem} data-save-gem>
          <Download className="size-4" aria-hidden="true" /> Enregistrer la pierre (.bgem)
        </button>
        <button type="button" className={btn} onClick={() => file.current?.click()} data-load-gem>
          <Upload className="size-4" aria-hidden="true" /> Charger une pierre (.bgem)
        </button>
        <button type="button" className={btn} onClick={() => c.setLayer(name, { diamond: undefined })}>
          Réglages par défaut
        </button>
        <input ref={file} type="file" accept=".bgem,.json,application/json" className="sr-only" onChange={(e) => void onImport(e)} data-gem-file />
      </div>
      <p className="text-sm text-mist">{HELP["save-gem"]!.text}</p>
      {note ? <p role="status" className="text-sm text-bone">{note}</p> : null}
    </>
  );
}

/** The library: click to apply a material to the part chosen. */
function LibraryPicker({ c, layer, onClose }: { c: EditorCtx; layer: string; onClose: () => void }) {
  const [tab, setTab] = useState<"metals" | "gems" | "pearls" | "other">("metals");
  const names = { metals: "Métaux", gems: "Pierres", pearls: "Perles", other: "Autres" } as const;
  const current = c.settings.layers[layer]?.material;
  const entries = libraryOf(tab).filter((m) => !HIDDEN_FINISHES.some((f) => m.id.endsWith("/" + f)) || m.id === current);
  return (
    <div role="dialog" aria-modal="true" aria-label="Bibliothèque de matières" className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4" data-library onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="flex max-h-[90svh] w-full max-w-4xl flex-col border border-white/20 bg-ink">
        <div className="flex items-center justify-between gap-3 border-b border-white/15 p-3">
          <p className="text-lg text-white">Bibliothèque de matières · {layer}</p>
          <button type="button" className={btn} onClick={onClose} autoFocus>
            Fermer
          </button>
        </div>
        <div role="tablist" className="flex flex-wrap gap-1 border-b border-white/15 p-2">
          {(Object.keys(names) as (keyof typeof names)[]).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={"min-h-12 px-4 text-base " + (tab === k ? "bg-white text-ink" : "text-bone hover:text-rose-light")}>
              {names[k]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 overflow-y-auto p-3 sm:grid-cols-5 lg:grid-cols-6">
          {entries.map((m) => (
            <Tile
              key={m.id}
              name={m.name}
              image={thumb("mat", m.id)}
              swatch={m.swatch}
              active={c.settings.layers[layer]?.material === m.id}
              data={m.id}
              onClick={() => {
                const gem = "gem" in m && m.gem;
                const metal = m.id.startsWith("metal/") ? m.id.split("/") : null;
                if (metal) c.setLayer(layer, { role: "metal", metal: metal[1] as MetalId, finish: { kind: (metal[2] ?? "polished") as NonNullable<LayerSetting["finish"]>["kind"] }, material: undefined });
                else c.setLayer(layer, { role: gem ? (c.settings.layers[layer]?.role === "stone" ? "stone" : "diamond") : (c.settings.layers[layer]?.role ?? "enamel"), material: m.id });
                onClose();
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Scène ---------- */

export function SceneTab({ c }: { c: EditorCtx }) {
  const { scene } = c;
  const g = scene.ground;
  const setGround = (patch: Partial<SceneSettings["ground"]>) => c.setScene({ ...scene, ground: { ...g, ...patch } });
  const addLight = (kind: ExtraLight["kind"]) =>
    c.setScene({ ...scene, lights: [...scene.lights, { id: newId(), kind, color: "#fff4e8", intensity: kind === "ambient" ? 0.3 : 1, position: [0.6, 1, 0.8], angle: 0.5, penumbra: 0.6 }] });
  const setLight = (id: string, patch: Partial<ExtraLight>) => c.setScene({ ...scene, lights: scene.lights.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  return (
    <div className="grid gap-1" data-tab-panel="scene">
      <Section title="Fond" open data="background">
        <Choice
          name="Fond"
          value={scene.envBackground ? "__env" : scene.backdrop ? "__" + scene.backdrop.kind : c.settings.background}
          options={[...(Object.entries(BACKGROUND_NAMES_FR) as [string, string][]), ["__color", "Couleur unie"], ["__gradient", "Dégradé"], ["__env", "L'éclairage du métal (EnvMap BG)"]]}
          onChange={(v) => {
            if (v === "__env") c.setScene({ ...scene, envBackground: true, backdrop: null });
            else if (v === "__color") c.setScene({ ...scene, envBackground: false, backdrop: { kind: "color", color: "#0a0a0a" } });
            else if (v === "__gradient") c.setScene({ ...scene, envBackground: false, backdrop: { kind: "gradient", inner: "#3a3532", outer: "#0a0a0a" } });
            else c.set({ ...c.settings, background: v as typeof c.settings.background, scene: { ...scene, envBackground: false, backdrop: null } });
          }}
          data="background"
        />
        {scene.backdrop?.kind === "color" ? <ColorField name="Couleur" value={scene.backdrop.color} onChange={(color) => c.setScene({ ...scene, backdrop: { kind: "color", color } })} data="backdrop-color" /> : null}
        {scene.backdrop?.kind === "gradient" ? (
          <>
            <ColorField name="Centre" value={scene.backdrop.inner} onChange={(inner) => c.setScene({ ...scene, backdrop: { ...(scene.backdrop as { kind: "gradient"; inner: string; outer: string }), inner } })} data="backdrop-inner" />
            <ColorField name="Bords" value={scene.backdrop.outer} onChange={(outer) => c.setScene({ ...scene, backdrop: { ...(scene.backdrop as { kind: "gradient"; inner: string; outer: string }), outer } })} data="backdrop-outer" />
          </>
        ) : null}
      </Section>
      <Section title="Éclairages" open data="lightings">
        <Choice name="Éclairage du métal (Environment)" value={scene.envMetal.id} options={envOptions(metalEnvsShown(scene.envMetal.id), scene.envMetal.id)} onChange={(id) => c.setScene({ ...scene, envMetal: { ...scene.envMetal, id } })} data="env-metal" />
        <Range name="Rotation" value={scene.envMetal.rotation} min={-180} max={180} step={1} unit="°" onChange={(rotation) => c.setScene({ ...scene, envMetal: { ...scene.envMetal, rotation } })} data="env-metal-rotation" />
        <Range name="Intensité" value={scene.envMetal.intensity} min={METAL_INTENSITY[0]} max={METAL_INTENSITY[1]} step={0.01} onChange={(intensity) => c.setScene({ ...scene, envMetal: { ...scene.envMetal, intensity } })} data="env-metal-intensity" />
        <Choice name="Éclairage des pierres (Gem Environment)" value={scene.envGem.id} options={envOptions(GEM_ENVS, scene.envGem.id)} onChange={(id) => c.setScene({ ...scene, envGem: { ...scene.envGem, id } })} data="env-gem" />
        <Range name="Rotation" value={scene.envGem.rotation} min={-180} max={180} step={1} unit="°" onChange={(rotation) => c.setScene({ ...scene, envGem: { ...scene.envGem, rotation } })} data="env-gem-rotation" />
        <Range name="Intensité" value={scene.envGem.intensity} min={GEM_INTENSITY[0]} max={GEM_INTENSITY[1]} step={0.01} onChange={(intensity) => c.setScene({ ...scene, envGem: { ...scene.envGem, intensity } })} data="env-gem-intensity" />
        <Toggle name="Éclairage fixe quand la pièce tourne (Fixed Env Direction)" checked={scene.fixedEnv} onChange={(fixedEnv) => c.setScene({ ...scene, fixedEnv })} data="fixed-env" />
        <p className="pt-2 text-base text-white">Vos éclairages (fichiers .hdr ou .exr)</p>
        <CustomHdr
          token={c.token}
          current={{ metal: scene.envMetal.id, gem: scene.envGem.id }}
          onChoose={(kind, id) => c.setScene({ ...scene, [kind === "metal" ? "envMetal" : "envGem"]: { ...scene[kind === "metal" ? "envMetal" : "envGem"], id } })}
          onDeleted={(id) =>
            c.setScene({
              ...scene,
              envMetal: scene.envMetal.id === id ? { ...scene.envMetal, id: "studio-clair" } : scene.envMetal,
              envGem: scene.envGem.id === id ? { ...scene.envGem, id: "auto" } : scene.envGem,
            })
          }
        />
      </Section>
      <Section title="Sol (Ground)" data="ground">
        <Choice name="Sol" value={g.preset} options={GROUNDS.map((x) => [x, GROUND_NAMES[x]] as const)} onChange={(preset) => setGround({ preset })} data="ground" />
        {g.preset !== "none" ? (
          <>
            <Range name="Taille" value={g.size} min={0.5} max={6} step={0.1} unit=" ×" onChange={(size) => setGround({ size })} data="ground-size" />
            <Range name="Hauteur sous le bijou" value={g.height} min={0} max={20} step={0.1} unit=" mm" onChange={(height) => setGround({ height })} data="ground-height" />
            <Range name="Opacité" value={g.opacity} min={0} max={1} step={0.01} onChange={(opacity) => setGround({ opacity })} data="ground-opacity" />
            <Toggle name="Pas de caméra sous le sol (Limit Camera)" checked={g.limitCamera} onChange={(limitCamera) => setGround({ limitCamera })} data="ground-limit-camera" />
            {g.preset === "soft" ? (
              <>
                <Range name="Images de l'ombre (Shadow Frames)" value={g.shadowFrames} min={1} max={200} step={1} onChange={(shadowFrames) => setGround({ shadowFrames })} data="shadow-frames" />
                <ColorField name="Couleur de l'ombre" value={g.light.color} onChange={(color) => setGround({ light: { ...g.light, color } })} data="shadow-color" />
                <Range name="Intensité" value={g.light.intensity} min={0} max={3} step={0.01} onChange={(intensity) => setGround({ light: { ...g.light, intensity } })} data="shadow-intensity" />
                <Vec3Field name="Direction de la lumière" value={g.light.direction} min={-1} max={1} step={0.05} onChange={(direction) => setGround({ light: { ...g.light, direction } })} data="shadow-direction" />
                <Range name="Rayon" value={g.light.radius} min={0.1} max={4} step={0.05} onChange={(radius) => setGround({ light: { ...g.light, radius } })} data="shadow-radius" />
                <Range name="Biais (Bias)" value={g.light.bias} min={0} max={0.01} step={0.0005} onChange={(bias) => setGround({ light: { ...g.light, bias } })} data="shadow-bias" />
                <Range name="Netteté (Focus)" value={g.light.focus} min={0} max={1} step={0.01} onChange={(focus) => setGround({ light: { ...g.light, focus } })} data="shadow-focus" />
                <Range name="Étalement (Spread)" value={g.light.spread} min={1} max={16} step={1} onChange={(spread) => setGround({ light: { ...g.light, spread } })} data="shadow-spread" />
              </>
            ) : null}
            {g.preset === "reflective" ? (
              <>
                <ColorField name="Couleur du sol" value={g.material.color} onChange={(color) => setGround({ material: { ...g.material, color } })} data="mirror-color" />
                <Range name="Rugosité" value={g.material.roughness} min={0} max={1} step={0.01} onChange={(roughness) => setGround({ material: { ...g.material, roughness } })} data="mirror-roughness" />
                <Range name="Métal" value={g.material.metalness} min={0} max={1} step={0.01} onChange={(metalness) => setGround({ material: { ...g.material, metalness } })} data="mirror-metalness" />
                <Range name="Flou du sol miroir (Mirror Blur)" value={g.mirrorBlur ?? 0.4} min={0} max={1} step={0.01} onChange={(mirrorBlur) => setGround({ mirrorBlur })} data="mirror-blur" />
                <Toggle name="Se fondre dans le fond (Render to Depth)" checked={g.renderToDepth} onChange={(renderToDepth) => setGround({ renderToDepth })} data="ground-render-to-depth" />
              </>
            ) : null}
          </>
        ) : null}
      </Section>
      <Section title="Lumières en plus" data="lights">
        <div className="flex flex-wrap gap-2">
          {/* No « ambient » light (27/11/2026): it lit only matte materials, the metal and the stones did not change. */}
          {(["point", "spot", "directional"] as const).map((k) => (
            <button key={k} type="button" className={btn} onClick={() => addLight(k)} data-add-light={k}>
              <Plus className="size-4" aria-hidden="true" /> {{ directional: "Directionnelle", spot: "Spot", point: "Point", ambient: "Ambiante" }[k]}
            </button>
          ))}
        </div>
        {scene.lights.map((l, i) => (
          <div key={l.id} className="grid gap-2 border-t border-white/10 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-base text-white">
                {{ directional: "Directionnelle", spot: "Spot", point: "Point", ambient: "Ambiante" }[l.kind]} {i + 1}
              </p>
              <button type="button" className={iconBtn} aria-label="Supprimer la lumière" onClick={() => c.setScene({ ...scene, lights: scene.lights.filter((x) => x.id !== l.id) })}>
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
            <ColorField name="Couleur" value={l.color} onChange={(color) => setLight(l.id, { color })} data={"light-color-" + i} />
            <Range name="Intensité" value={l.intensity} min={0} max={5} step={0.01} onChange={(intensity) => setLight(l.id, { intensity })} data={"light-intensity-" + i} />
            {l.kind !== "ambient" ? <Vec3Field name="Position" value={l.position} min={-2} max={2} step={0.05} onChange={(position) => setLight(l.id, { position })} data={"light-position-" + i} /> : null}
            {l.kind === "spot" ? <Range name="Ouverture" value={l.angle} min={0.05} max={1.2} step={0.01} onChange={(angle) => setLight(l.id, { angle })} data={"light-angle-" + i} /> : null}
          </div>
        ))}
      </Section>
    </div>
  );
}

/* ---------- Rendu ---------- */

export function RenderTab({ c }: { c: EditorCtx }) {
  const r = c.scene.render;
  return (
    <div className="grid gap-1" data-tab-panel="render">
      <Section title="Anti-crénelage" open>
        <Range name="Images de lissage à l'arrêt (rendu progressif)" value={r.progressive} min={4} max={128} step={1} onChange={(progressive) => c.setScene({ ...c.scene, render: { ...r, progressive } })} data="progressive" />
        <Toggle name="Lissage en mouvement (TAA)" checked={r.taa} onChange={(taa) => c.setScene({ ...c.scene, render: { ...r, taa } })} data="taa" />
      </Section>
    </div>
  );
}

/* ---------- Effets ---------- */

/**
 * « Mise au point par clic »: the button arms a pick; the next click on the jewel names the point in focus (in the
 * jewel's own space, so that it stays on the same place when the jewel turns). The click still reaches the stage, which
 * picks a part and shows « Parties »: the tab and the part chosen before come back at once.
 */
function DofFocus({ c }: { c: EditorCtx }) {
  const [armed, setArmed] = useState(false);
  const latest = useRef(c);
  useEffect(() => {
    latest.current = c;
  });
  useEffect(() => {
    if (!armed) return undefined;
    const canvas = document.querySelector<HTMLCanvasElement>("[data-editor-canvas] canvas");
    if (!canvas) return undefined;
    const down = { x: 0, y: 0 };
    const onDown = (e: PointerEvent) => {
      down.x = e.clientX;
      down.y = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (e.target !== canvas || e.button !== 0 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const ctx = latest.current;
      const point = ctx.api?.pick(e.clientX, e.clientY) ?? null;
      const before = ctx.selected;
      if (point) {
        const p = ctx.scene.post;
        ctx.setScene({ ...ctx.scene, post: { ...p, dof: { ...p.dof, enabled: true, focus: point.map((v) => Math.round(v * 1e6) / 1e6) as Vec3 } } });
      }
      setArmed(false);
      window.setTimeout(() => {
        ctx.select(before);
        ctx.showTab("effects");
      }, 0);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setArmed(false);
    canvas.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("keydown", onKey);
    canvas.style.cursor = "crosshair";
    return () => {
      canvas.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("keydown", onKey);
      canvas.style.cursor = "";
    };
  }, [armed]);
  const focus = c.scene.post.dof.focus ?? null;
  return (
    <div className="grid gap-2" data-control="dof-focus">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btn + (armed ? " border-rose-light text-rose-light" : "")} aria-pressed={armed} onClick={() => setArmed((a) => !a)} disabled={!c.api} data-dof-pick>
          <Crosshair className="size-4" aria-hidden="true" /> {armed ? "Cliquez sur le bijou…" : "Mise au point par clic"}
        </button>
        {focus ? (
          <button type="button" className="min-h-12 px-2 text-base text-bone underline hover:text-rose-light" onClick={() => c.setScene({ ...c.scene, post: { ...c.scene.post, dof: { ...c.scene.post.dof, focus: null } } })} data-dof-center>
            Le centre
          </button>
        ) : null}
      </div>
      <p className="text-sm text-mist" role="status">
        {armed ? "Cliquez sur l'endroit du bijou qui doit être net (Échap pour annuler)." : focus ? "Net : l'endroit cliqué." : "Net : le centre du bijou. Cliquez le bouton, puis sur le bijou."}
      </p>
    </div>
  );
}

export function EffectsTab({ c }: { c: EditorCtx }) {
  const p = c.scene.post;
  const set = <K extends keyof SceneSettings["post"]>(key: K, patch: Partial<NonNullable<SceneSettings["post"][K]>>) => c.setScene({ ...c.scene, post: { ...p, [key]: { ...p[key], ...patch } } });
  const lut = p.lut ?? { id: null, intensity: 1 };
  return (
    <div className="grid gap-1" data-tab-panel="effects">
      <Section title="Reflets à l'écran (SSR)" open data="ssr">
        <Toggle name="Activer" checked={p.ssr.enabled} onChange={(enabled) => set("ssr", { enabled })} data="ssr" />
        <Range name="Intensité" value={p.ssr.intensity} min={0} max={3} step={0.01} hint="1,2 à 1,5 pour un anneau poli." onChange={(intensity) => set("ssr", { intensity })} data="ssr-intensity" />
        <Vec3Field name="Gain (Boost RGB)" value={p.ssr.boost} min={0} max={3} step={0.05} axes={["Rouge", "Vert", "Bleu"]} onChange={(boost) => set("ssr", { boost })} data="ssr-boost" />
        <Toggle name="Rayon automatique (Auto Radius)" checked={p.ssr.autoRadius} onChange={(autoRadius) => set("ssr", { autoRadius })} data="ssr-auto-radius" />
        <Range name="Rayon de l'objet (Object Radius)" value={p.ssr.radius} min={0.1} max={4} step={0.05} onChange={(radius) => set("ssr", { radius })} data="ssr-radius" />
        <Range name="Puissance (Power)" value={p.ssr.power} min={0.2} max={3} step={0.01} onChange={(power) => set("ssr", { power })} data="ssr-power" />
        <Range name="Tolérance" value={p.ssr.tolerance} min={0} max={2} step={0.01} onChange={(tolerance) => set("ssr", { tolerance })} data="ssr-tolerance" />
        <Range name="Pas (Step Count)" value={p.ssr.steps} min={4} max={64} step={1} hint="16 ; 24 à 32 s'il y a des trous." onChange={(steps) => set("ssr", { steps })} data="ssr-steps" />
        <Toggle name="Ignorer les rayons vers l'avant (Ignore Front Rays)" checked={p.ssr.ignoreFront} onChange={(ignoreFront) => set("ssr", { ignoreFront })} data="ssr-ignore-front" />
        <Range name="Masque des rayons avant (Mask Front Rays Factor)" value={p.ssr.frontFactor} min={-1} max={1} step={0.01} onChange={(frontFactor) => set("ssr", { frontFactor })} data="ssr-front-factor" />
      </Section>
      <Section title="Tons (Tonemapping)" data="tonemap">
        <Choice name="Mode" value={p.tonemap.mode} options={TONEMAPS.map((m) => [m, TONEMAP_NAMES[m]] as const)} onChange={(mode) => set("tonemap", { mode })} data="tonemap" />
        <Range name="Exposition (Exposure)" value={p.tonemap.exposure} min={0.5} max={2.2} step={0.01} onChange={(exposure) => set("tonemap", { exposure })} data="exposure" />
        <Range name="Saturation" value={p.tonemap.saturation} min={0} max={1.5} step={0.01} hint="Un peu plus pour l'or rose et les pierres de couleur." onChange={(saturation) => set("tonemap", { saturation })} data="saturation" />
        <Range name="Contraste (Contrast)" value={p.tonemap.contrast} min={0.85} max={1.2} step={0.005} hint="1,01 à 1,05 conseillé." onChange={(contrast) => set("tonemap", { contrast })} data="contrast" />
        <Toggle name="Fond transparent (Clip Background)" checked={p.tonemap.clipBackground} onChange={(clipBackground) => set("tonemap", { clipBackground })} data="clip" />
      </Section>
      <Section title="Teinte de la scène (LUT de scène)" data="scene-lut">
        <Choice name="Teinte" value={lut.id ?? ""} options={lookOptions} onChange={(id) => c.setScene({ ...c.scene, post: { ...p, lut: { ...lut, id: id || null } } })} data="scene-lut" />
        {lut.id ? <Range name="Force" value={lut.intensity} min={0} max={1} step={0.01} onChange={(intensity) => c.setScene({ ...c.scene, post: { ...p, lut: { ...lut, intensity } } })} data="scene-lut-intensity" /> : null}
      </Section>
      <Section title="Lueur (Bloom)" data="bloom">
        <Toggle name="Activer" checked={p.bloom.enabled} onChange={(enabled) => set("bloom", { enabled })} data="bloom" />
        <Range name="Seuil (Threshold)" value={p.bloom.threshold} min={0.8} max={6} step={0.01} onChange={(threshold) => set("bloom", { threshold })} data="bloom-threshold" />
        <Range name="Seuil doux (Soft Threshold)" value={p.bloom.softThreshold} min={0} max={2} step={0.01} onChange={(softThreshold) => set("bloom", { softThreshold })} data="bloom-soft-threshold" />
        <Range name="Intensité" value={p.bloom.intensity} min={0} max={1.5} step={0.01} onChange={(intensity) => set("bloom", { intensity })} data="bloom-intensity" />
        <Range name="Rayon" value={p.bloom.radius} min={0} max={1} step={0.01} onChange={(radius) => set("bloom", { radius })} data="bloom-radius" />
        <Range name="Puissance (Power)" value={p.bloom.power} min={0.2} max={4} step={0.01} onChange={(power) => set("bloom", { power })} data="bloom-power" />
        <Range name="Itérations (Iterations)" value={p.bloom.iterations} min={0} max={7} step={1} hint="0 : la lueur est éteinte." onChange={(iterations) => set("bloom", { iterations })} data="bloom-iterations" />
        <Toggle name="Mode contrôle (Debug) : ne montrer que ce qui rayonne" checked={p.bloom.debug} onChange={(debug) => set("bloom", { debug })} data="bloom-debug" />
      </Section>
      {/*
        No « Biseau à l'écran (SSBevel) » (27/11/2026, docs/3d-reglages-testes.md): it averages the file's own normals, already
        smooth, and changed nothing on the jewels tested (the setting stays read by the engine for saved models).
      */}
      <Section title="Ombres dans les creux (AO)" data="ao">
        <Toggle name="Activer" checked={p.ao.enabled} onChange={(enabled) => set("ao", { enabled })} data="ao" />
        <Range name="Intensité" value={p.ao.intensity} min={0} max={6} step={0.05} onChange={(intensity) => set("ao", { intensity })} data="ao-intensity" />
        <Range name="Rayon" value={p.ao.radius} min={2} max={80} step={1} onChange={(radius) => set("ao", { radius })} data="ao-radius" />
      </Section>
      <Section title="Profondeur de champ (Depth of Field)" data="dof">
        <Toggle name="Activer" checked={p.dof.enabled} onChange={(enabled) => set("dof", { enabled })} data="dof" />
        <Range name="Flou maximal" value={p.dof.maxBlur} min={0} max={2} step={0.01} onChange={(maxBlur) => set("dof", { maxBlur })} data="dof-blur" />
        <Range name="Profondeur de la zone nette (Aperture)" value={p.dof.aperture} min={0.05} max={1} step={0.01} onChange={(aperture) => set("dof", { aperture })} data="dof-aperture" />
        <DofFocus c={c} />
      </Section>
      <Section title="Vignette" data="vignette">
        <Toggle name="Activer" checked={p.vignette.enabled} onChange={(enabled) => set("vignette", { enabled })} data="vignette" />
        <Range name="Distance" value={p.vignette.offset} min={0} max={1} step={0.01} onChange={(offset) => set("vignette", { offset })} data="vignette-offset" />
        <Range name="Obscurité" value={p.vignette.darkness} min={0} max={1} step={0.01} onChange={(darkness) => set("vignette", { darkness })} data="vignette-darkness" />
      </Section>
      <Section title="Aberration chromatique et grain" data="film">
        <Toggle name="Aberration chromatique" checked={p.chromatic.enabled} onChange={(enabled) => set("chromatic", { enabled })} data="chromatic" />
        <Range name="Décalage" value={p.chromatic.offset} min={0} max={0.004} step={0.0001} onChange={(offset) => set("chromatic", { offset })} data="chromatic-offset" />
        <Toggle name="Grain" checked={p.grain.enabled} onChange={(enabled) => set("grain", { enabled })} data="grain" />
        <Range name="Intensité du grain" value={p.grain.intensity} min={0} max={0.15} step={0.005} onChange={(intensity) => set("grain", { intensity })} data="grain-intensity" />
      </Section>
    </div>
  );
}

/* ---------- Vues de caméra ---------- */

export function CamerasTab({ c }: { c: EditorCtx }) {
  const v = c.views;
  const [current, setCurrent] = useState(0);
  const add = () => {
    const at = c.api?.getView();
    if (!at) return;
    const view: CameraView = { id: newId(), name: "Vue " + (v.list.length + 1), position: at.position as Vec3, target: at.target as Vec3, fov: c.scene.camera.fov };
    c.setViews({ ...v, list: [...v.list, view] });
  };
  const update = (i: number) => {
    const at = c.api?.getView();
    if (!at) return;
    c.setViews({ ...v, list: v.list.map((x, k) => (k === i ? { ...x, position: at.position as Vec3, target: at.target as Vec3 } : x)) });
  };
  const focus = (i: number) => {
    const view = v.list[i];
    if (!view) return;
    setCurrent(i);
    c.api?.goTo(view, v.duration, v.ease, v.interpolation);
  };
  const move = (i: number, d: number) => {
    const list = [...v.list];
    const [x] = list.splice(i, 1);
    list.splice(Math.max(0, Math.min(list.length, i + d)), 0, x!);
    c.setViews({ ...v, list });
  };
  return (
    <div className="grid gap-3" data-tab-panel="cameras">
      <button type="button" className={btn} onClick={add} data-add-view>
        <Plus className="size-4" aria-hidden="true" /> Ajouter la vue actuelle
      </button>
      <ol className="grid gap-2" data-views>
        {v.list.map((view, i) => (
          <li key={view.id} className={"grid gap-2 border p-2 " + (current === i ? "border-rose-light" : "border-white/10")} data-view={view.id}>
            <input value={view.name} aria-label="Nom de la vue" onChange={(e) => c.setViews({ ...v, list: v.list.map((x, k) => (k === i ? { ...x, name: e.target.value.slice(0, 40) } : x)) })} className={inputCls + " mt-0"} />
            <div className="flex flex-wrap gap-1">
              <button type="button" className={btn + " px-3"} onClick={() => focus(i)}>
                Aller
              </button>
              <button type="button" className={btn + " px-3"} onClick={() => update(i)}>
                Mettre à jour
              </button>
              <button type="button" className={iconBtn} aria-label="Monter" onClick={() => move(i, -1)} disabled={i === 0}>
                <ArrowUp className="size-4" aria-hidden="true" />
              </button>
              <button type="button" className={iconBtn} aria-label="Descendre" onClick={() => move(i, 1)} disabled={i === v.list.length - 1}>
                <ArrowDown className="size-4" aria-hidden="true" />
              </button>
              <button type="button" className={iconBtn} aria-label="Supprimer la vue" onClick={() => c.setViews({ ...v, list: v.list.filter((x) => x.id !== view.id) })}>
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ol>
      {v.list.length > 1 ? (
        <div className="flex gap-2">
          <button type="button" className={btn + " flex-1"} onClick={() => focus((current - 1 + v.list.length) % v.list.length)}>
            Vue précédente
          </button>
          <button type="button" className={btn + " flex-1"} onClick={() => focus((current + 1) % v.list.length)} data-next-view>
            Vue suivante
          </button>
        </div>
      ) : null}
      <Section title="Le parcours entre les vues" open data="path">
        <Range name="Durée d'une vue à l'autre (Duration)" value={v.duration} min={0.3} max={8} step={0.1} unit=" s" onChange={(duration) => c.setViews({ ...v, duration })} data="views-duration" />
        <Choice name="Mouvement (Ease)" value={v.ease} options={EASES.map((e) => [e, EASE_NAMES[e]] as const)} onChange={(ease) => c.setViews({ ...v, ease })} data="views-ease" />
        <Choice name="Trajet (Interpolation)" value={v.interpolation} options={[["spherical", "Autour du bijou (conseillé)"], ["linear", "En ligne droite"]]} onChange={(interpolation) => c.setViews({ ...v, interpolation })} data="views-interpolation" />
        <Range name="Pause à chaque vue (View Pause Time)" value={v.pause} min={0} max={6} step={0.1} unit=" s" onChange={(pause) => c.setViews({ ...v, pause })} data="views-pause" />
        <Toggle name="Boucler toutes les vues (Loop All Views)" checked={v.loop} onChange={(loop) => c.setViews({ ...v, loop })} data="views-loop" />
        <Toggle name="La caméra suit le défilement de la page (Seek on Scroll)" hint="Au moins deux vues." checked={v.seekOnScroll} onChange={(seekOnScroll) => c.setViews({ ...v, seekOnScroll })} data="seek-on-scroll" />
        <p className="text-sm text-mist">Pour enregistrer le parcours en vidéo : onglet Export, « Film », « Le parcours des vues ».</p>
      </Section>
    </div>
  );
}

/* ---------- Configurateur ---------- */

export function ConfiguratorTab({ c }: { c: EditorCtx }) {
  const list = c.settings.configurators ?? [];
  const setList = (next: Configurator[]) => c.set({ ...c.settings, configurators: next });
  const file = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const all = [...libraryOf("metals"), ...libraryOf("gems"), ...libraryOf("pearls"), ...libraryOf("other")];
  const add = () => {
    const layers = c.selected ? [c.selected] : [];
    setList([...list, { id: newId(), label: "Métal", layers, options: [] }]);
  };
  const metalLayers = c.layers.filter((l) => (c.settings.layers[l.name]?.role ?? l.guess) === "metal").map((l) => l.name);
  // The three golds of the house, polished, on every metal part.
  const proposeMetal = () =>
    setList([
      ...list,
      {
        id: newId(),
        label: "Métal",
        layers: metalLayers,
        options: [
          { material: "metal/rose-gold/polished", label: "Or rose" },
          { material: "metal/yellow-gold/polished", label: "Or jaune" },
          { material: "metal/white-gold/polished", label: "Or blanc" },
        ],
      },
    ]);
  const set = (id: string, patch: Partial<Configurator>) => setList(list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const data = JSON.parse(await f.text()) as { format?: string; configurators?: Configurator[] };
      if (data.format !== "berete-configurator" || !Array.isArray(data.configurators)) throw new Error();
      const names = new Set(c.layers.map((l) => l.name));
      // Reused on a model whose layers have the same names: the layers not in this model are left out.
      const kept = data.configurators.map((x) => ({ ...x, id: newId(), layers: x.layers.filter((l) => names.has(l)) })).filter((x) => x.layers.length > 0);
      setList([...list, ...kept]);
      setNote(kept.length + (kept.length > 1 ? " configurateurs ajoutés." : " configurateur ajouté.") + (kept.length < data.configurators.length ? " Ceux dont les calques n'existent pas ici sont laissés de côté." : ""));
    } catch {
      setNote("Ce fichier n'est pas un préréglage de configurateur.");
    }
  };
  return (
    <div className="grid gap-3" data-tab-panel="configurator">
      <p className="text-sm text-mist">Choisissez, pour une ou plusieurs parties, les matières que le client pourra essayer, avec le nom qu'il lira. Il les change avec des pastilles en bas de la 3D.</p>
      {list.length === 0 && metalLayers.length > 0 && c.layers.some((l) => ["diamond", "stone"].includes(c.settings.layers[l.name]?.role ?? l.guess)) ? (
        <div className="grid gap-2 border border-rose-light/40 p-3" data-propose-configurator>
          <p className="text-base text-bone">Cette pièce a du métal et des pierres : proposer au client de changer l'or ?</p>
          <button type="button" className={btn} onClick={proposeMetal}>
            Proposer un configurateur de métal
          </button>
        </div>
      ) : null}
      <button type="button" className={btn} onClick={add} data-add-configurator>
        <Plus className="size-4" aria-hidden="true" /> Ajouter un configurateur
      </button>
      {list.map((cfg) => (
        <div key={cfg.id} className="grid gap-2 border border-white/15 p-3" data-configurator-row={cfg.id}>
          <div className="flex items-end gap-2">
            <label className="block flex-1 text-base text-bone">
              Libellé
              <input value={cfg.label} onChange={(e) => set(cfg.id, { label: e.target.value.slice(0, 60) })} className={inputCls} />
            </label>
            <button type="button" className={iconBtn} aria-label="Supprimer le configurateur" onClick={() => setList(list.filter((x) => x.id !== cfg.id))}>
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
          <fieldset>
            <legend className="text-base text-bone">Parties</legend>
            <div className="flex flex-wrap gap-x-4">
              {c.layers.map((l) => (
                <Toggle key={l.name} name={l.name} checked={cfg.layers.includes(l.name)} onChange={(on) => set(cfg.id, { layers: on ? [...cfg.layers, l.name] : cfg.layers.filter((x) => x !== l.name) })} data={"config-part-" + l.name} help="config-part" />
              ))}
            </div>
          </fieldset>
          <fieldset className="grid gap-2">
            <legend className="text-base text-bone">Matières proposées</legend>
            {cfg.options.map((o, i) => (
              <div key={o.material} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm text-mist">{materialById(o.material)?.name ?? o.material}</span>
                <input aria-label="Nom pour le client" value={o.label} onChange={(e) => set(cfg.id, { options: cfg.options.map((x, k) => (k === i ? { ...x, label: e.target.value.slice(0, 60) } : x)) })} className={inputCls + " mt-0 w-40"} />
                <button type="button" className={iconBtn} aria-label="Retirer" onClick={() => set(cfg.id, { options: cfg.options.filter((_, k) => k !== i) })}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            <Choice
              name="Ajouter une matière"
              value={"" as string}
              options={[["", "Choisir…"], ...all.filter((m) => !cfg.options.some((o) => o.material === m.id)).map((m) => [m.id, m.name] as const)]}
              onChange={(id) => id && set(cfg.id, { options: [...cfg.options, { material: id, label: materialById(id)?.name ?? id }] })}
              data="config-add"
            />
          </fieldset>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} disabled={list.length === 0} onClick={() => download(new Blob([JSON.stringify({ format: "berete-configurator", version: 1, configurators: list }, null, 2)], { type: "application/json" }), "configurateur.json")}>
          <Download className="size-4" aria-hidden="true" /> Enregistrer le préréglage (.json)
        </button>
        <button type="button" className={btn} onClick={() => file.current?.click()}>
          <Upload className="size-4" aria-hidden="true" /> Charger un préréglage
        </button>
        <input ref={file} type="file" accept=".json,application/json" className="sr-only" onChange={(e) => void onImport(e)} />
      </div>
      {note ? <p role="status" className="text-sm text-bone">{note}</p> : null}
    </div>
  );
}

/* ---------- Export ---------- */

export function ExportTab({ c }: { c: EditorCtx }) {
  const file = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const onVjson = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const { scene, notes } = sceneFromVjson(JSON.parse(await f.text()));
      c.setScene({ ...c.scene, ...scene, post: { ...c.scene.post, ...(scene.post ?? {}) } as SceneSettings["post"] } as SceneSettings);
      setNotes(["Scène iJewel lue : vérifiez le rendu, puis Enregistrer.", ...notes]);
    } catch {
      setNotes(["Ce fichier .vjson n'a pas pu être lu."]);
    }
  };
  const metals = (c.settings.metals.length > 0 ? c.settings.metals : [...METALS]) as MetalId[];
  return (
    <div className="grid gap-4" data-tab-panel="export">
      <ExportPanel
        api={c.api?.handles.render ?? null}
        metals={metals}
        metalNames={METAL_NAMES_FR}
        pieceName={c.model.name}
        onExportGlb={c.api ? () => c.api!.handles.exportGlb() : undefined}
        jewel={() => c.api?.handles.jewel() ?? null}
        settings={c.settings}
        layerNames={c.layers.map((l) => l.name)}
        onImportScene={(s) => c.set({ ...c.settings, ...s, layers: { ...c.settings.layers, ...(s.layers ?? {}) } })}
      />
      <Section title="Reprendre une scène d'iJewel (.vjson)" data="ijewel">
        <p className="text-sm text-mist">Exportez la pièce depuis iJewel (GLB + scène .vjson). Le GLB s'envoie comme un modèle : ses réglages de diamants sont lus seuls. Ici, la scène : éclairages, tons, lueur, reflets, sol.</p>
        <button type="button" className={btn} onClick={() => file.current?.click()}>
          <Upload className="size-4" aria-hidden="true" /> Charger la scène iJewel
        </button>
        <input ref={file} type="file" accept=".vjson,.json,application/json" className="sr-only" onChange={(e) => void onVjson(e)} />
        {notes.length > 0 ? (
          <ul className="grid gap-1 text-sm text-bone" role="status">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        ) : null}
      </Section>
    </div>
  );
}
