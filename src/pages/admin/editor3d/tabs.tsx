/*
 * The right side of the 3D editor (26/11/2026), in tabs as jewellers' tools arrange it: Vue, Parties, Scène, Rendu,
 * Effets, Vues de caméra, Configurateur, Export. Every setting applies at once; « Enregistrer » keeps them.
 */
import { useRef, useState, type ChangeEvent } from "react";
import { ArrowDown, ArrowUp, Diamond, Download, Eye, EyeOff, Plus, Trash2, Upload } from "lucide-react";
import { diamondOf, LAYER_ROLES, METALS, type LayerRole, type LayerSetting, type MetalId } from "@/data/models";
import { DEFAULT_DIAMOND, EASES, GEM_ENVS, GROUNDS, METAL_ENVS, TONEMAPS, type CameraView, type Configurator, type DiamondParams, type ExtraLight, type SceneSettings, type Vec3 } from "@/data/scene3d";
import { sceneFromVjson } from "@/data/ijewel";
import { hdriName } from "@/viewer/hdri";
import { exportMaterial, importMaterial, libraryOf, materialById } from "@/viewer/library/materials";
import ExportPanel from "@/viewer/export/ExportPanel";
import { download } from "@/viewer/export/exporter";
import { btn, iconBtn, inputCls } from "../ui";
import { Choice, ColorField, Range, Section, Tile, Toggle, Vec3Field } from "./controls";
import type { EditorCtx } from "./context";
import { BACKGROUND_NAMES_FR, EASE_NAMES, FINISH_NAMES, GROUND_NAMES, METAL_NAMES_FR, thumb, TONEMAP_NAMES } from "./presets";

/** A short id for a new light, view or configurator. */
function newId(): string {
  return Math.random().toString(36).slice(2, 8);
}

const ROLE_NAMES: Record<LayerRole, string> = { metal: "Métal", diamond: "Diamant", stone: "Pierre de couleur", enamel: "Émail", hide: "Masquer" };
const metalOptions = METALS.map((m) => [m, METAL_NAMES_FR[m] ?? m] as const);
const envOptions = (ids: readonly string[]) => ids.map((id) => [id, hdriName(id)] as const);

/* ---------- Vue ---------- */

export function ViewTab({ c }: { c: EditorCtx }) {
  const { scene, viewer } = c;
  const dist = (which: "portrait" | "landscape") => viewer.distance[which];
  const setDist = (which: "portrait" | "landscape", v: [number, number] | null) => c.setViewer({ ...viewer, distance: { ...viewer.distance, [which]: v } });
  return (
    <div className="grid gap-1" data-tab-panel="view">
      <Section title="Qualité et caméra" open>
        <Choice name="Qualité" value={scene.render.quality} options={[["auto", "Automatique (plus légère sur téléphone)"], ["high", "Haute"], ["ultra", "Très haute (plus de rebonds, plus d'images)"]]} onChange={(q) => c.setScene({ ...scene, render: { ...scene.render, quality: q } })} data="quality" />
        <Range name="Champ de vision" value={scene.camera.fov} min={12} max={60} step={1} unit="°" hint="Petit : comme un téléobjectif (peu de déformation). Grand : plus de perspective." onChange={(fov) => c.setScene({ ...scene, camera: { ...scene.camera, fov } })} data="fov" />
        <Toggle name="Mise à l'échelle automatique (Auto Scale)" hint="La première vue cadre le bijou, quelle que soit sa taille dans le fichier (sinon : une distance fixe). Bouton « Revenir à la première vue » pour voir." checked={scene.camera.autoScale} onChange={(autoScale) => c.setScene({ ...scene, camera: { ...scene.camera, autoScale } })} />
        <Toggle name="Centrage automatique (Auto Center)" hint="La première vue vise le milieu du bijou (sinon : l'origine du fichier)." checked={scene.camera.autoCenter} onChange={(autoCenter) => c.setScene({ ...scene, camera: { ...scene.camera, autoCenter } })} />
      </Section>
      <Section title="Ce que voit le client" open data="client">
        <Toggle name="Zoom à la molette et au pincement" checked={viewer.zoom} onChange={(zoom) => c.setViewer({ ...viewer, zoom })} />
        <Toggle name="Boutons + et −" checked={viewer.zoomButtons} onChange={(zoomButtons) => c.setViewer({ ...viewer, zoomButtons })} />
        <Toggle name="Invite « Glissez pour tourner »" hint="À la première apparition du bijou." checked={viewer.prompt} onChange={(prompt) => c.setViewer({ ...viewer, prompt })} />
        <Toggle name="Rotation automatique au départ" checked={viewer.autoRotate} onChange={(autoRotate) => c.setViewer({ ...viewer, autoRotate })} />
        <Toggle name="Vues enregistrées et visite guidée" checked={viewer.views} onChange={(views) => c.setViewer({ ...viewer, views })} />
        <Toggle name="Configurateur (pastilles en bas)" checked={viewer.configurator} onChange={(configurator) => c.setViewer({ ...viewer, configurator })} />
        <Toggle name="Bouton Partager" checked={viewer.share} onChange={(share) => c.setViewer({ ...viewer, share })} />
        <Toggle name="Plein écran" checked={viewer.fullscreen} onChange={(fullscreen) => c.setViewer({ ...viewer, fullscreen })} />
        <Toggle name="Essayage (bagues)" hint="Réglé dans « Essayage », à gauche." checked={viewer.tryOn} onChange={(tryOn) => c.setViewer({ ...viewer, tryOn })} />
        <Toggle name="Voir chez moi (réalité augmentée)" hint="iPhone et Android." checked={viewer.ar} onChange={(ar) => c.setViewer({ ...viewer, ar })} />
        <Choice name="Qualité chez le client" value={viewer.quality} options={[["auto", "Automatique"], ["high", "Haute"], ["ultra", "Très haute"]]} onChange={(quality) => c.setViewer({ ...viewer, quality })} />
      </Section>
      <Section title="Limites du zoom chez le client" data="distances">
        <p className="text-sm text-mist">En nombre de fois la taille du bijou. Un écran en hauteur (téléphone) et un écran en largeur (ordinateur) peuvent avoir leurs propres limites.</p>
        {(["portrait", "landscape"] as const).map((which) => {
          const v = dist(which);
          return (
            <div key={which} className="grid gap-2 border-t border-white/10 pt-2">
              <Toggle name={which === "portrait" ? "Limiter sur un écran en hauteur" : "Limiter sur un écran en largeur"} checked={v !== null} onChange={(on) => setDist(which, on ? [1.2, 6] : null)} />
              {v ? (
                <>
                  <Range name="Au plus près" value={v[0]} min={0.3} max={5} step={0.1} unit=" ×" onChange={(lo) => setDist(which, [lo, Math.max(lo + 0.2, v[1])])} />
                  <Range name="Au plus loin" value={v[1]} min={1} max={15} step={0.1} unit=" ×" onChange={(hi) => setDist(which, [Math.min(v[0], hi - 0.2), hi])} />
                </>
              ) : null}
            </div>
          );
        })}
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
            <Choice name="Rôle" value={layer?.role ?? (info.guess as LayerRole)} options={LAYER_ROLES.map((r) => [r, ROLE_NAMES[r]] as const)} onChange={(role) => c.setLayer(selected, { role })} data="role" />
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
            {(layer?.role === "stone" || layer?.role === "enamel") && !layer.material ? <ColorField name="Couleur" value={layer.color ?? "#9b111e"} onChange={(color) => c.setLayer(selected, { color })} /> : null}
            <Range name="Biseau à l'écran (cette matière)" value={layer?.bevel ?? -1} min={-1} max={16} step={1} hint="−1 : celui de la scène. Arrondit les arêtes sans changer la forme." onChange={(v) => c.setLayer(selected, { bevel: v < 0 ? undefined : v })} data="bevel-layer" />
            <Toggle name="Lueur (bloom) sur cette matière" checked={layer?.bloom ?? (layer?.role === "diamond" || layer?.role === "stone")} onChange={(bloom) => c.setLayer(selected, { bloom })} />
            {(layer?.role ?? info.guess) === "metal" ? (
              <label className="block text-base text-bone">
                Nom pour le client
                <input value={layer?.label ?? ""} placeholder="ex. Maillons" onChange={(e) => c.setLayer(selected, { label: e.target.value })} className={inputCls + " placeholder:text-mist/60"} />
              </label>
            ) : null}
          </Section>
          {layer?.role === "diamond" || layer?.role === "stone" || (layer?.material && materialById(layer.material) && "gem" in materialById(layer.material)!) ? <DiamondFields c={c} name={selected} layer={layer ?? { role: "diamond" }} /> : null}
        </div>
      ) : null}

      <Section title="Position du bijou" data="transform">
        <Vec3Field name="Rotation" value={c.scene.pose.rotation} min={-180} max={180} step={1} unit="°" onChange={(rotation) => c.setScene({ ...c.scene, pose: { ...c.scene.pose, rotation } })} />
      </Section>
      {library && selected ? <LibraryPicker c={c} layer={selected} onClose={() => setLibrary(false)} /> : null}
    </div>
  );
}

function MetalFields({ c, name, layer }: { c: EditorCtx; name: string; layer: LayerSetting | null }) {
  const finish = layer?.finish ?? { kind: "polished" as const };
  return (
    <>
      <Choice name="Métal" value={(layer?.metal ?? "rose-gold") as MetalId} options={metalOptions} onChange={(metal) => c.setLayer(name, { metal, material: undefined })} data="metal" />
      <Choice name="Finition" value={finish.kind} options={Object.entries(FINISH_NAMES) as [NonNullable<LayerSetting["finish"]>["kind"], string][]} onChange={(kind) => c.setLayer(name, { finish: { ...finish, kind } })} data="finish" />
      {finish.kind === "brushed" ? <Range name="Sens du brossage" value={finish.angle ?? 0} min={0} max={180} step={1} unit="°" onChange={(angle) => c.setLayer(name, { finish: { ...finish, angle } })} /> : null}
    </>
  );
}

/** All the settings of a stone, with the names jewellers know (in brackets) and simple words. */
function DiamondFields({ c, name, layer }: { c: EditorCtx; name: string; layer: LayerSetting }) {
  const d = diamondOf(layer, c.settings.diamonds ?? "realistic");
  const set = (patch: Partial<DiamondParams>) => c.setLayer(name, { diamond: { ...(layer.diamond ?? {}), ...patch } });
  const file = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const result = importMaterial(await f.text());
    if ("error" in result) return setNote(String(result.error));
    const entry = materialById(result.id);
    const gem = entry && "gem" in entry ? entry.gem : undefined;
    set({ ...(gem ?? {}), ...(result.overrides as Partial<DiamondParams>) });
    setNote("Matière chargée.");
  };
  return (
    <>
      <Section title="Pierre : lumière et couleur (Diamond Material)" open data="diamond">
        <Choice name="Éclairage de la pierre (Environment)" value={d.env ?? ""} options={[["", "Celui de la scène"], ...envOptions(GEM_ENVS)]} onChange={(env) => set({ env: env || null })} />
        <ColorField name="Couleur (Color)" value={d.color} onChange={(color) => set({ color })} />
        <Range name="Luminosité (Env Intensity)" value={d.envIntensity} min={0} max={4} step={0.01} hint="1,30 conseillé ; 0,84 pour plus discret." onChange={(envIntensity) => set({ envIntensity })} data="env-intensity" />
        <Range name="Rotation de l'éclairage (Env Rotation Offset)" value={d.envRotation} min={-180} max={180} step={1} unit="°" hint="Place le feu et les éclats, ou éloigne une zone brûlée." onChange={(envRotation) => set({ envRotation })} />
        <Vec3Field name="Rotation X / Y / Z" value={d.envRotationXYZ} min={-180} max={180} step={1} unit="°" onChange={(envRotationXYZ) => set({ envRotationXYZ })} />
        <Range name="Feu (Dispersion)" value={d.dispersion} min={0} max={0.05} step={0.001} hint="Très bas : de petits éclats colorés remarquables." onChange={(dispersion) => set({ dispersion })} data="dispersion" />
        <Range name="Densité de couleur (Absorption)" value={d.absorption} min={0} max={6} step={0.05} hint="Pour les pierres teintées : plus la lumière traverse, plus la couleur fonce." onChange={(absorption) => set({ absorption })} />
        <Range name="Indice de réfraction (Refractive Index)" value={d.refractiveIndex} min={1.3} max={3} step={0.01} hint="2,60 conseillé (plus d'éclat que le vrai 2,42) ; 1,4 à 1,7 : du verre." onChange={(refractiveIndex) => set({ refractiveIndex })} data="ior" />
        <Range name="Contraste intérieur (Gamma)" value={d.gamma} min={0.3} max={2.5} step={0.01} onChange={(gamma) => set({ gamma })} />
        <Vec3Field name="Gain par couleur (RGB Boost)" value={d.boost} min={0} max={4} step={0.05} axes={["Rouge", "Vert", "Bleu"]} onChange={(boost) => set({ boost })} />
        <Range name="Transparence vers l'arrière (Transmission)" value={d.transmission} min={0} max={1} step={0.01} hint="Laisse voir les griffes à travers la pierre." onChange={(transmission) => set({ transmission })} />
        <Range name="Reflet de surface (Reflectivity)" value={d.reflectivity} min={0} max={1} step={0.01} onChange={(reflectivity) => set({ reflectivity })} />
        <Range name="Rebonds (Ray Bounces)" value={d.rayBounces} min={1} max={16} step={1} hint="4 à 5 en général, jusqu'à 12–16 pour certaines tailles." onChange={(rayBounces) => set({ rayBounces })} data="bounces" />
        <Range name="Éclairage orienté (Diamond Oriented Lighting)" value={d.orientedLighting} min={0} max={1} step={0.01} hint="1 : l'éclairage suit le haut de chaque pierre, où qu'elle soit sertie." onChange={(orientedLighting) => set({ orientedLighting })} />
        <Choice name="Calcul" value={d.mode} options={[["auto", "Automatique"], ["trace", "Lancer de rayons (exact, grosses pierres)"], ["fast", "Rapide (petites pierres répétées)"]]} onChange={(mode) => set({ mode })} />
      </Section>
      <Section title="Pierre : inclusions" data="inclusions">
        <Toggle name="Inclusions" checked={d.inclusions !== null} onChange={(on) => set({ inclusions: on ? { amount: 0.3, scale: 1, roughness: 0.5 } : null })} />
        {d.inclusions ? (
          <>
            <Range name="Quantité" value={d.inclusions.amount} min={0} max={1} step={0.01} onChange={(amount) => set({ inclusions: { ...d.inclusions!, amount } })} />
            <Range name="Échelle" value={d.inclusions.scale} min={0.2} max={4} step={0.05} onChange={(scale) => set({ inclusions: { ...d.inclusions!, scale } })} />
            <Range name="Rugosité" value={d.inclusions.roughness} min={0} max={1} step={0.01} onChange={(roughness) => set({ inclusions: { ...d.inclusions!, roughness } })} />
          </>
        ) : null}
      </Section>
      <div className="flex flex-wrap gap-2 py-2">
        <button type="button" className={btn} onClick={() => download(new Blob([exportMaterial({ id: layer.material ?? "gem/diamond", overrides: { ...DEFAULT_DIAMOND, ...d } })], { type: "application/json" }), (name || "pierre") + ".json")}>
          <Download className="size-4" aria-hidden="true" /> Exporter la matière (.json)
        </button>
        <button type="button" className={btn} onClick={() => file.current?.click()}>
          <Upload className="size-4" aria-hidden="true" /> Importer (.json)
        </button>
        <button type="button" className={btn} onClick={() => c.setLayer(name, { diamond: undefined })}>
          Réglages par défaut
        </button>
        <input ref={file} type="file" accept=".json,application/json" className="sr-only" onChange={(e) => void onImport(e)} />
      </div>
      {note ? <p role="status" className="text-sm text-bone">{note}</p> : null}
    </>
  );
}

/** The library: click to apply a material to the part chosen. */
function LibraryPicker({ c, layer, onClose }: { c: EditorCtx; layer: string; onClose: () => void }) {
  const [tab, setTab] = useState<"metals" | "gems" | "pearls" | "other">("metals");
  const names = { metals: "Métaux", gems: "Pierres", pearls: "Perles", other: "Autres" } as const;
  const entries = libraryOf(tab);
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
        {scene.backdrop?.kind === "color" ? <ColorField name="Couleur" value={scene.backdrop.color} onChange={(color) => c.setScene({ ...scene, backdrop: { kind: "color", color } })} /> : null}
        {scene.backdrop?.kind === "gradient" ? (
          <>
            <ColorField name="Centre" value={scene.backdrop.inner} onChange={(inner) => c.setScene({ ...scene, backdrop: { ...(scene.backdrop as { kind: "gradient"; inner: string; outer: string }), inner } })} />
            <ColorField name="Bords" value={scene.backdrop.outer} onChange={(outer) => c.setScene({ ...scene, backdrop: { ...(scene.backdrop as { kind: "gradient"; inner: string; outer: string }), outer } })} />
          </>
        ) : null}
      </Section>
      <Section title="Éclairages" open data="lightings">
        <Choice name="Éclairage du métal (Environment)" value={scene.envMetal.id} options={envOptions(METAL_ENVS)} onChange={(id) => c.setScene({ ...scene, envMetal: { ...scene.envMetal, id } })} data="env-metal" />
        <Range name="Rotation" value={scene.envMetal.rotation} min={-180} max={180} step={1} unit="°" onChange={(rotation) => c.setScene({ ...scene, envMetal: { ...scene.envMetal, rotation } })} />
        <Range name="Intensité" value={scene.envMetal.intensity} min={0} max={3} step={0.01} onChange={(intensity) => c.setScene({ ...scene, envMetal: { ...scene.envMetal, intensity } })} />
        <Choice name="Éclairage des pierres (Gem Environment)" value={scene.envGem.id} options={envOptions(GEM_ENVS)} onChange={(id) => c.setScene({ ...scene, envGem: { ...scene.envGem, id } })} data="env-gem" />
        <Range name="Rotation" value={scene.envGem.rotation} min={-180} max={180} step={1} unit="°" onChange={(rotation) => c.setScene({ ...scene, envGem: { ...scene.envGem, rotation } })} />
        <Toggle name="Éclairage fixe quand la pièce tourne (Fixed Env Direction)" hint="Les éclats passent d'une facette à l'autre quand on tourne autour du bijou." checked={scene.fixedEnv} onChange={(fixedEnv) => c.setScene({ ...scene, fixedEnv })} data="fixed-env" />
      </Section>
      <Section title="Sol (Ground)" data="ground">
        <Choice name="Sol" value={g.preset} options={GROUNDS.map((x) => [x, GROUND_NAMES[x]] as const)} onChange={(preset) => setGround({ preset })} data="ground" />
        {g.preset !== "none" ? (
          <>
            <Range name="Taille" value={g.size} min={0.5} max={6} step={0.1} unit=" ×" onChange={(size) => setGround({ size })} />
            <Range name="Hauteur sous le bijou" value={g.height} min={0} max={20} step={0.1} unit=" mm" onChange={(height) => setGround({ height })} />
            <Range name="Opacité" value={g.opacity} min={0} max={1} step={0.01} onChange={(opacity) => setGround({ opacity })} />
            <Toggle name="Se fondre dans le fond (Render to Depth)" checked={g.renderToDepth} onChange={(renderToDepth) => setGround({ renderToDepth })} />
            <Toggle name="Pas de caméra sous le sol (Limit Camera)" checked={g.limitCamera} onChange={(limitCamera) => setGround({ limitCamera })} />
            {g.preset === "soft" ? (
              <>
                <Range name="Images de l'ombre (Shadow Frames)" value={g.shadowFrames} min={1} max={200} step={1} hint="Plus d'images : une ombre plus douce." onChange={(shadowFrames) => setGround({ shadowFrames })} />
                <ColorField name="Couleur de l'ombre" value={g.light.color} onChange={(color) => setGround({ light: { ...g.light, color } })} />
                <Range name="Intensité" value={g.light.intensity} min={0} max={3} step={0.01} onChange={(intensity) => setGround({ light: { ...g.light, intensity } })} />
                <Vec3Field name="Direction de la lumière" value={g.light.direction} min={-1} max={1} step={0.05} onChange={(direction) => setGround({ light: { ...g.light, direction } })} />
                <Range name="Rayon" value={g.light.radius} min={0.1} max={4} step={0.05} onChange={(radius) => setGround({ light: { ...g.light, radius } })} />
                <Range name="Biais (Bias)" value={g.light.bias} min={0} max={0.01} step={0.0005} onChange={(bias) => setGround({ light: { ...g.light, bias } })} />
                <Range name="Netteté (Focus)" value={g.light.focus} min={0} max={1} step={0.01} onChange={(focus) => setGround({ light: { ...g.light, focus } })} />
                <Range name="Étalement (Spread)" value={g.light.spread} min={1} max={16} step={1} onChange={(spread) => setGround({ light: { ...g.light, spread } })} />
              </>
            ) : null}
            {g.preset === "reflective" ? (
              <>
                <ColorField name="Couleur du sol" value={g.material.color} onChange={(color) => setGround({ material: { ...g.material, color } })} />
                <Range name="Rugosité" value={g.material.roughness} min={0} max={1} step={0.01} onChange={(roughness) => setGround({ material: { ...g.material, roughness } })} />
                <Range name="Métal" value={g.material.metalness} min={0} max={1} step={0.01} onChange={(metalness) => setGround({ material: { ...g.material, metalness } })} />
              </>
            ) : null}
          </>
        ) : null}
      </Section>
      <Section title="Lumières en plus" data="lights">
        <div className="flex flex-wrap gap-2">
          {(["directional", "spot", "point", "ambient"] as const).map((k) => (
            <button key={k} type="button" className={btn} onClick={() => addLight(k)}>
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
            <ColorField name="Couleur" value={l.color} onChange={(color) => setLight(l.id, { color })} />
            <Range name="Intensité" value={l.intensity} min={0} max={5} step={0.01} onChange={(intensity) => setLight(l.id, { intensity })} />
            {l.kind !== "ambient" ? <Vec3Field name="Position" value={l.position} min={-2} max={2} step={0.05} onChange={(position) => setLight(l.id, { position })} /> : null}
            {l.kind === "spot" ? <Range name="Ouverture" value={l.angle} min={0.05} max={1.2} step={0.01} onChange={(angle) => setLight(l.id, { angle })} /> : null}
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
        <Range name="Images de lissage à l'arrêt (rendu progressif)" value={r.progressive} min={4} max={128} step={1} hint="À l'arrêt, l'image s'affine jusqu'à la qualité d'une photo." onChange={(progressive) => c.setScene({ ...c.scene, render: { ...r, progressive } })} data="progressive" />
        <Toggle name="Lissage en mouvement (TAA)" hint="Les éclats ne fourmillent plus quand le bijou tourne." checked={r.taa} onChange={(taa) => c.setScene({ ...c.scene, render: { ...r, taa } })} data="taa" />
      </Section>
    </div>
  );
}

/* ---------- Effets ---------- */

export function EffectsTab({ c }: { c: EditorCtx }) {
  const p = c.scene.post;
  const set = <K extends keyof SceneSettings["post"]>(key: K, patch: Partial<SceneSettings["post"][K]>) => c.setScene({ ...c.scene, post: { ...p, [key]: { ...p[key], ...patch } } });
  return (
    <div className="grid gap-1" data-tab-panel="effects">
      <Section title="Reflets à l'écran (SSR)" open data="ssr">
        <Toggle name="Activer" checked={p.ssr.enabled} onChange={(enabled) => set("ssr", { enabled })} data="ssr" />
        <Range name="Intensité" value={p.ssr.intensity} min={0} max={3} step={0.01} hint="1,2 à 1,5 pour un anneau poli." onChange={(intensity) => set("ssr", { intensity })} data="ssr-intensity" />
        <Vec3Field name="Gain (Boost RGB)" value={p.ssr.boost} min={0} max={3} step={0.05} axes={["Rouge", "Vert", "Bleu"]} onChange={(boost) => set("ssr", { boost })} />
        <Toggle name="Rayon automatique (Auto Radius)" checked={p.ssr.autoRadius} onChange={(autoRadius) => set("ssr", { autoRadius })} />
        <Range name="Rayon de l'objet (Object Radius)" value={p.ssr.radius} min={0.1} max={4} step={0.05} onChange={(radius) => set("ssr", { radius })} />
        <Range name="Puissance (Power)" value={p.ssr.power} min={0.2} max={3} step={0.01} onChange={(power) => set("ssr", { power })} />
        <Range name="Tolérance" value={p.ssr.tolerance} min={0} max={2} step={0.01} onChange={(tolerance) => set("ssr", { tolerance })} />
        <Range name="Pas (Step Count)" value={p.ssr.steps} min={4} max={64} step={1} hint="16 ; 24 à 32 s'il y a des trous." onChange={(steps) => set("ssr", { steps })} />
        <Toggle name="Ignorer les rayons vers l'avant (Ignore Front Rays)" checked={p.ssr.ignoreFront} onChange={(ignoreFront) => set("ssr", { ignoreFront })} />
        <Range name="Masque des rayons avant (Mask Front Rays Factor)" value={p.ssr.frontFactor} min={-1} max={1} step={0.01} onChange={(frontFactor) => set("ssr", { frontFactor })} />
      </Section>
      <Section title="Tons (Tonemapping)" data="tonemap">
        <Choice name="Mode" value={p.tonemap.mode} options={TONEMAPS.map((m) => [m, TONEMAP_NAMES[m]] as const)} onChange={(mode) => set("tonemap", { mode })} data="tonemap" />
        <Range name="Exposition (Exposure)" value={p.tonemap.exposure} min={0.2} max={3} step={0.01} onChange={(exposure) => set("tonemap", { exposure })} data="exposure" />
        <Range name="Saturation" value={p.tonemap.saturation} min={0} max={2} step={0.01} hint="Un peu plus pour l'or rose et les pierres de couleur." onChange={(saturation) => set("tonemap", { saturation })} />
        <Range name="Contraste (Contrast)" value={p.tonemap.contrast} min={0.5} max={1.5} step={0.005} hint="1,01 à 1,05 conseillé." onChange={(contrast) => set("tonemap", { contrast })} />
        <Toggle name="Fond transparent (Clip Background)" hint="Pour une image PNG sans fond." checked={p.tonemap.clipBackground} onChange={(clipBackground) => set("tonemap", { clipBackground })} data="clip" />
      </Section>
      <Section title="Lueur (Bloom)" data="bloom">
        <Toggle name="Activer" checked={p.bloom.enabled} onChange={(enabled) => set("bloom", { enabled })} data="bloom" />
        <Range name="Seuil (Threshold)" value={p.bloom.threshold} min={0} max={6} step={0.01} onChange={(threshold) => set("bloom", { threshold })} />
        <Range name="Seuil doux (Soft Threshold)" value={p.bloom.softThreshold} min={0} max={2} step={0.01} onChange={(softThreshold) => set("bloom", { softThreshold })} />
        <Range name="Intensité" value={p.bloom.intensity} min={0} max={3} step={0.01} onChange={(intensity) => set("bloom", { intensity })} />
        <Range name="Rayon" value={p.bloom.radius} min={0} max={1} step={0.01} onChange={(radius) => set("bloom", { radius })} />
        <Range name="Puissance (Power)" value={p.bloom.power} min={0.2} max={4} step={0.01} onChange={(power) => set("bloom", { power })} />
        <Range name="Itérations" value={p.bloom.iterations} min={1} max={7} step={1} onChange={(iterations) => set("bloom", { iterations })} />
        <Toggle name="Mode contrôle (Debug) : ne montrer que ce qui rayonne" checked={p.bloom.debug} onChange={(debug) => set("bloom", { debug })} data="bloom-debug" />
      </Section>
      <Section title="Biseau à l'écran (SSBevel)" data="bevel">
        <Toggle name="Activer" checked={p.bevel.enabled} onChange={(enabled) => set("bevel", { enabled })} data="bevel" />
        <Range name="Rayon (scène)" value={p.bevel.radius} min={0} max={8} step={0.1} hint="Arrondit les arêtes à l'écran (anneaux, sertis clos, griffes). Chaque matière peut avoir le sien (0 à 16)." onChange={(radius) => set("bevel", { radius })} data="bevel-radius" />
        <Range name="Intensité" value={p.bevel.intensity} min={0} max={1} step={0.01} onChange={(intensity) => set("bevel", { intensity })} />
      </Section>
      <Section title="Ombres dans les creux (AO)" data="ao">
        <Toggle name="Activer" checked={p.ao.enabled} onChange={(enabled) => set("ao", { enabled })} />
        <Range name="Intensité" value={p.ao.intensity} min={0} max={6} step={0.05} onChange={(intensity) => set("ao", { intensity })} />
        <Range name="Rayon" value={p.ao.radius} min={2} max={80} step={1} onChange={(radius) => set("ao", { radius })} />
      </Section>
      <Section title="Profondeur de champ" data="dof">
        <Toggle name="Activer" checked={p.dof.enabled} onChange={(enabled) => set("dof", { enabled })} />
        <Range name="Flou maximal" value={p.dof.maxBlur} min={0} max={2} step={0.01} onChange={(maxBlur) => set("dof", { maxBlur })} />
      </Section>
      <Section title="Vignette" data="vignette">
        <Toggle name="Activer" checked={p.vignette.enabled} onChange={(enabled) => set("vignette", { enabled })} />
        <Range name="Distance" value={p.vignette.offset} min={0} max={1} step={0.01} onChange={(offset) => set("vignette", { offset })} />
        <Range name="Obscurité" value={p.vignette.darkness} min={0} max={1} step={0.01} onChange={(darkness) => set("vignette", { darkness })} />
      </Section>
      <Section title="Aberration chromatique et grain" data="film">
        <Toggle name="Aberration chromatique" checked={p.chromatic.enabled} onChange={(enabled) => set("chromatic", { enabled })} />
        <Range name="Décalage" value={p.chromatic.offset} min={0} max={0.004} step={0.0001} onChange={(offset) => set("chromatic", { offset })} />
        <Toggle name="Grain" checked={p.grain.enabled} onChange={(enabled) => set("grain", { enabled })} />
        <Range name="Intensité du grain" value={p.grain.intensity} min={0} max={0.3} step={0.005} onChange={(intensity) => set("grain", { intensity })} />
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
        <Range name="Durée d'une vue à l'autre (Duration)" value={v.duration} min={0.3} max={8} step={0.1} unit=" s" onChange={(duration) => c.setViews({ ...v, duration })} />
        <Choice name="Mouvement (Ease)" value={v.ease} options={EASES.map((e) => [e, EASE_NAMES[e]] as const)} onChange={(ease) => c.setViews({ ...v, ease })} />
        <Choice name="Trajet (Interpolation)" value={v.interpolation} options={[["spherical", "Autour du bijou (conseillé)"], ["linear", "En ligne droite"]]} onChange={(interpolation) => c.setViews({ ...v, interpolation })} />
        <Range name="Pause à chaque vue (View Pause Time)" value={v.pause} min={0} max={6} step={0.1} unit=" s" onChange={(pause) => c.setViews({ ...v, pause })} />
        <Toggle name="Boucler toutes les vues (Loop All Views)" checked={v.loop} onChange={(loop) => c.setViews({ ...v, loop })} />
        <Toggle name="La caméra suit le défilement de la page (Seek on Scroll)" hint="Sur la page de la pièce, au moins deux vues." checked={v.seekOnScroll} onChange={(seekOnScroll) => c.setViews({ ...v, seekOnScroll })} data="seek-on-scroll" />
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
                <Toggle key={l.name} name={l.name} checked={cfg.layers.includes(l.name)} onChange={(on) => set(cfg.id, { layers: on ? [...cfg.layers, l.name] : cfg.layers.filter((x) => x !== l.name) })} />
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
      <ExportPanel api={c.api?.handles.render ?? null} metals={metals} metalNames={METAL_NAMES_FR} pieceName={c.model.name} onExportGlb={c.api ? () => c.api!.handles.exportGlb() : undefined} />
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
