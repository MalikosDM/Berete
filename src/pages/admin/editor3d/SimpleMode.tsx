/*
 * The simple mode of the 3D editor (27/11/2026), what Yoni sees first: four big choices with pictures made by our engine
 * — the ambiance (a whole scene at once), the metal of each part, the stone of each part, the view — and « Exporter »
 * (a 4K photo or a film in one click). Everything else is chosen by the engine (src/viewer/auto.ts); « Revenir au
 * réglage parfait » puts its choices back. The expert settings stay closed in « Mode expert ».
 * Plain French, big targets, no technical word.
 */
import { useEffect, useMemo, useState } from "react";
import { Camera, Check, ChevronDown, Film, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import type { LayerSetting, MetalId, ModelSettings } from "@/data/models";
import { merged } from "@/data/scene3d";
import type { LayerAnalysis } from "@/viewer/auto";
import { METAL_LOOKS } from "@/viewer/materials";
import { download, exportFilm, exportImage, fileSlug } from "@/viewer/export/exporter";
import type { StageApi, StoneMeasure } from "@/viewer/Stage";
import type { EditorCtx } from "./context";
import { SIMPLE_AMBIANCES, SIMPLE_METALS, SIMPLE_STONES, SIMPLE_VIEWS, ambianceOf, thumb } from "./presets";

type Props = {
  c: EditorCtx;
  analysis: Record<string, LayerAnalysis> | null;
  autoRotate: boolean;
  onAutoRotate: (on: boolean) => void;
  onExpert: () => void;
};

/** A layer's role as it is drawn: its own setting, else the engine's reading. */
export function roleOf(name: string, settings: ModelSettings, analysis: Record<string, LayerAnalysis> | null, guess?: string): "metal" | "stone" | "other" {
  const own = settings.layers[name]?.role;
  if (own === "diamond" || own === "stone") return "stone";
  if (own === "metal") return "metal";
  if (own === "enamel" || own === "hide") return "other";
  const a = analysis?.[name];
  if (a) return a.kind;
  return guess === "diamond" ? "stone" : "metal";
}

/** A name a jeweller reads: « Pierres rondes · 1 584 », « Métal 2 » (the file's own name when it says something). */
function friendlyName(name: string, kind: "metal" | "stone", index: number, a: LayerAnalysis | undefined): string {
  const plain = /^[\p{L}\d _.-]+$/u.test(name) && !/^(图层|组名|layer ?\d|default|iges)/i.test(name) && !/^stone_/i.test(name);
  if (kind === "stone") {
    const cut = a?.cut === "step" ? "Pierres à degrés" : a?.cut === "brilliant" ? "Pierres rondes ou fantaisie" : "Pierres serties";
    const copies = a && a.copies > 1 ? " · " + a.copies.toLocaleString("fr-FR") : "";
    const size = a && a.sizeMm > 0 && a.sizeMm < 30 ? " · " + a.sizeMm.toFixed(1).replace(".", ",") + " mm" : "";
    return (plain ? name : cut) + copies + size;
  }
  return plain ? name : "Métal " + (index + 1);
}

/**
 * The engine's perfect setting: every layer back to the role it reads (stone or metal), the metals as chosen (the colour
 * of the piece is Yoni's choice), every stone setting, lighting, effect and ground back to the engine's own. The client's
 * views, configurators, try-on and viewer options are kept (they are content, not rendering).
 */
export function perfectSettings(settings: ModelSettings, analysis: Record<string, LayerAnalysis> | null): ModelSettings {
  const layers: Record<string, LayerSetting> = {};
  for (const [name, own] of Object.entries(settings.layers)) {
    if (own.role === "hide") {
      layers[name] = own;
      continue;
    }
    const kind = analysis?.[name]?.kind ?? (own.role === "diamond" || own.role === "stone" ? "stone" : "metal");
    if (kind === "stone") layers[name] = { role: "diamond", ...(own.material?.startsWith("gem/") ? { material: own.material } : {}) };
    else layers[name] = { role: own.role === "enamel" ? "enamel" : "metal", ...(own.metal ? { metal: own.metal } : {}), ...(own.color ? { color: own.color } : {}) };
  }
  const { scene: _scene, ...rest } = settings;
  void _scene;
  return { ...rest, layers, ambiance: "studio", background: "studio-dark", diamonds: "realistic" };
}

export default function SimpleMode({ c, analysis, autoRotate, onAutoRotate, onExpert }: Props) {
  const { settings, layers, api } = c;
  const [byPart, setByPart] = useState<{ metal: boolean; stone: boolean }>({ metal: false, stone: false });
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [measures, setMeasures] = useState<Record<string, StoneMeasure>>({});

  const names = useMemo(() => {
    const all = layers.length ? layers.map((l) => l.name) : Object.keys(analysis ?? {});
    const metal: string[] = [];
    const stone: string[] = [];
    for (const n of all) {
      const r = roleOf(n, settings, analysis, layers.find((l) => l.name === n)?.guess);
      if (r === "metal") metal.push(n);
      else if (r === "stone") stone.push(n);
    }
    return { metal, stone };
  }, [layers, analysis, settings]);

  // The stones measured after each change (the engine draws them alone, small): too dark, or flat white?
  const settingsKey = JSON.stringify([settings.layers, settings.scene, settings.ambiance, settings.background, settings.diamonds]);
  useEffect(() => {
    if (!api || !analysis) return undefined;
    const t = window.setTimeout(() => setMeasures(api.measureStones()), 900);
    return () => window.clearTimeout(t);
  }, [api, analysis, settingsKey]);
  const problems = useMemo(() => stoneProblems(measures, settings), [measures, settings]);
  // Layers lying wholly apart from the jewel in the file (hidden by the engine until shown).
  const apartLayers = useMemo(() => Object.entries(analysis ?? {}).filter(([n, a]) => a.apart && !settings.layers[n]?.showApart).map(([n]) => n), [analysis, settings.layers]);

  const metalOf = (n: string): MetalId => settings.layers[n]?.metal ?? (settings.layers[n]?.material?.startsWith("metal/") ? (settings.layers[n]!.material!.split("/")[1] as MetalId) : "rose-gold");
  const stoneOf = (n: string): string => settings.layers[n]?.material ?? "gem/diamond";
  const setMetal = (list: string[], metal: MetalId) => {
    const next = { ...settings.layers };
    for (const n of list) next[n] = { ...(next[n] ?? { role: "metal" }), role: "metal", metal, material: undefined } as LayerSetting;
    for (const n of list) delete next[n]!.material;
    c.set({ ...settings, layers: next, metals: settings.metals.includes(metal) ? settings.metals : [...settings.metals, metal] });
  };
  const setStone = (list: string[], material: string) => {
    const next = { ...settings.layers };
    for (const n of list) {
      const before = next[n] ?? { role: "diamond" as const };
      next[n] = { ...before, role: "diamond", material };
    }
    c.set({ ...settings, layers: next });
  };
  const ambiance = ambianceOf(settings);
  const fix = (layer: string) => {
    const next = { ...settings.layers };
    const own = next[layer] ?? { role: "diamond" as const };
    next[layer] = { role: "diamond", ...(own.material ? { material: own.material } : {}) };
    const scene = c.scene;
    c.set({ ...settings, layers: next, scene: merged(settings.scene ?? {}, { envGem: { ...scene.envGem, id: "auto", intensity: Math.max(0.9, Math.min(1.4, scene.envGem.intensity)) }, post: { tonemap: { ...scene.post.tonemap, exposure: Math.max(0.85, Math.min(1.3, scene.post.tonemap.exposure)) } } } as never) });
  };

  const exportPhoto = async (a: StageApi) => {
    setBusy("photo");
    setDone(null);
    try {
      const blob = await exportImage(a.handles.render, { format: "png", width: 3840, height: 3840, samples: 32, transparent: c.scene.post.tonemap.clipBackground });
      download(blob, fileSlug(c.model.name) + "-4k.png");
      setDone("La photo 4K est enregistrée dans vos téléchargements.");
    } finally {
      setBusy(null);
    }
  };
  const exportMovie = async (a: StageApi) => {
    setBusy("film");
    setDone(null);
    try {
      const result = await exportFilm(a.handles.render, { path: "turn", seconds: 8, width: 1080, height: 1080 });
      download(result.blob, fileSlug(c.model.name) + "-tour." + (result.mime.includes("webm") ? "webm" : "mp4"));
      setDone("Le film est enregistré dans vos téléchargements.");
    } finally {
      setBusy(null);
    }
  };

  const section = "grid gap-3 border-b border-white/10 pb-5";
  const big = "flex min-h-14 w-full items-center justify-center gap-2 border px-4 text-base";
  return (
    <div className="grid gap-5" data-simple-mode>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-mist">Tout est réglé par le moteur. Changez seulement ce que vous voulez.</p>
        <button type="button" onClick={() => c.set(perfectSettings(settings, analysis))} className="inline-flex min-h-12 items-center gap-2 text-base text-rose-light underline-offset-4 hover:underline" data-perfect>
          <RotateCcw className="size-4" aria-hidden="true" /> Revenir au réglage parfait
        </button>
      </div>

      {problems.length > 0 ? (
        <div className="grid gap-2 border border-rose-light/60 bg-rose-deep/20 p-3" role="alert" data-stone-warning>
          {problems.map((p) => (
            <div key={p.layer} className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-start gap-2 text-base text-white">
                <TriangleAlert className="mt-1 size-4 shrink-0 text-rose-light" aria-hidden="true" />
                {p.text}
              </p>
              <button type="button" onClick={() => fix(p.layer)} className="min-h-12 border border-rose-light px-4 text-base text-white hover:bg-rose-light hover:text-ink" data-fix={p.layer}>
                Corriger
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {apartLayers.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border border-white/15 p-3" data-apart-note>
          <p className="text-base text-bone">
            {apartLayers.length === 1 ? "Une partie posée à part dans le fichier est cachée" : apartLayers.length + " parties posées à part dans le fichier sont cachées"} (calque {apartLayers.map((n) => "« " + n + " »").join(", ")}).
          </p>
          <button
            type="button"
            onClick={() => {
              const next = { ...settings.layers };
              for (const n of apartLayers) next[n] = { ...(next[n] ?? { role: "metal" as const }), showApart: true };
              c.set({ ...settings, layers: next });
            }}
            className="min-h-12 border border-white/30 px-4 text-base text-white hover:border-rose-light"
            data-show-apart
          >
            Afficher
          </button>
        </div>
      ) : null}

      <section className={section} aria-labelledby="simple-ambiance">
        <h3 id="simple-ambiance" className="text-lg text-white">1. Ambiance</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SIMPLE_AMBIANCES.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={ambiance === a.id}
              onClick={() => c.set(a.apply(settings))}
              className={"group grid gap-1 border p-1 text-start " + (ambiance === a.id ? "border-rose-light" : "border-white/15 hover:border-white/40")}
              data-ambiance={a.id}
            >
              <img src={thumb("ambiance", a.id)} alt="" width={240} height={240} loading="lazy" className="aspect-square w-full object-cover" />
              <span className="flex min-h-8 items-center gap-1 px-1 text-base text-white">
                {ambiance === a.id ? <Check className="size-4 text-rose-light" aria-hidden="true" /> : null}
                {a.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {names.metal.length > 0 ? (
        <section className={section} aria-labelledby="simple-metal">
          <h3 id="simple-metal" className="text-lg text-white">2. Métal</h3>
          {(byPart.metal ? names.metal : [null]).map((n, i) => {
            const list = n ? [n] : names.metal;
            const current = metalOf(list[0]!);
            const same = list.every((x) => metalOf(x) === current);
            return (
              <div key={n ?? "all"} className="grid gap-2" data-metal-part={n ?? "all"}>
                {byPart.metal ? <p className="text-sm text-bone">{friendlyName(n!, "metal", i, analysis?.[n!])}</p> : null}
                <div className="flex flex-wrap gap-2">
                  {SIMPLE_METALS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      aria-pressed={same && current === m.id}
                      onClick={() => setMetal(list, m.id)}
                      className={"flex min-h-12 items-center gap-2 border px-3 text-base " + (same && current === m.id ? "border-rose-light text-white" : "border-white/15 text-bone hover:border-white/40")}
                      data-metal={m.id}
                    >
                      <span className="size-5 rounded-full border border-white/30" style={{ background: METAL_LOOKS[m.id].swatch }} aria-hidden="true" />
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {names.metal.length > 1 ? (
            <button type="button" onClick={() => setByPart((b) => ({ ...b, metal: !b.metal }))} className="inline-flex min-h-12 items-center gap-1 text-start text-base text-bone underline-offset-4 hover:underline" aria-expanded={byPart.metal}>
              <ChevronDown className={"size-4 transition-transform " + (byPart.metal ? "rotate-180" : "")} aria-hidden="true" /> {byPart.metal ? "Le même métal partout" : "Un métal par partie (" + names.metal.length + ")"}
            </button>
          ) : null}
        </section>
      ) : null}

      {names.stone.length > 0 ? (
        <section className={section} aria-labelledby="simple-stone">
          <h3 id="simple-stone" className="text-lg text-white">3. Pierres</h3>
          {(byPart.stone ? names.stone : [null]).map((n, i) => {
            const list = n ? [n] : names.stone;
            const current = stoneOf(list[0]!);
            const same = list.every((x) => stoneOf(x) === current);
            return (
              <div key={n ?? "all"} className="grid gap-2" data-stone-part={n ?? "all"}>
                {byPart.stone ? <p className="text-sm text-bone">{friendlyName(n!, "stone", i, analysis?.[n!])}</p> : null}
                <div className="flex flex-wrap gap-2">
                  {SIMPLE_STONES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={same && current === s.material}
                      onClick={() => setStone(list, s.material)}
                      className={"flex min-h-12 items-center gap-2 border px-3 text-base " + (same && current === s.material ? "border-rose-light text-white" : "border-white/15 text-bone hover:border-white/40")}
                      data-stone={s.id}
                    >
                      <img src={thumb("mat", s.material)} alt="" width={28} height={28} className="size-7 rounded-full object-cover" />
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {names.stone.length > 1 ? (
            <button type="button" onClick={() => setByPart((b) => ({ ...b, stone: !b.stone }))} className="inline-flex min-h-12 items-center gap-1 text-start text-base text-bone underline-offset-4 hover:underline" aria-expanded={byPart.stone}>
              <ChevronDown className={"size-4 transition-transform " + (byPart.stone ? "rotate-180" : "")} aria-hidden="true" /> {byPart.stone ? "Les mêmes pierres partout" : "Une pierre par partie (" + names.stone.length + ")"}
            </button>
          ) : null}
        </section>
      ) : null}

      <section className={section} aria-labelledby="simple-view">
        <h3 id="simple-view" className="text-lg text-white">4. Vue</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SIMPLE_VIEWS.map((v) => (
            <button key={v.id} type="button" onClick={() => api?.look(v.azimuth, v.polar)} className="min-h-12 border border-white/15 px-3 text-base text-bone hover:border-white/40 hover:text-white" data-simple-view={v.id}>
              {v.name}
            </button>
          ))}
        </div>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 text-base text-white">
          <input type="checkbox" checked={autoRotate} onChange={(e) => onAutoRotate(e.target.checked)} className="size-5 accent-[#e8b4a0]" data-simple-rotate />
          Rotation automatique
        </label>
      </section>

      <section className="grid gap-3" aria-labelledby="simple-export">
        <h3 id="simple-export" className="text-lg text-white">Exporter</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" disabled={!api || busy !== null} onClick={() => api && void exportPhoto(api)} className={big + " border-rose-light bg-rose-light/10 text-white hover:bg-rose-light hover:text-ink disabled:opacity-50"} data-export-photo>
            <Camera className="size-5" aria-hidden="true" /> {busy === "photo" ? "Photo en cours…" : "Photo 4K"}
          </button>
          <button type="button" disabled={!api || busy !== null} onClick={() => api && void exportMovie(api)} className={big + " border-white/30 text-white hover:border-rose-light disabled:opacity-50"} data-export-film>
            <Film className="size-5" aria-hidden="true" /> {busy === "film" ? "Film en cours…" : "Film (8 s)"}
          </button>
        </div>
        {done ? (
          <p role="status" className="text-base text-bone" data-export-done>
            {done}
          </p>
        ) : null}
      </section>

      <button type="button" onClick={onExpert} className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/15 px-4 text-base text-bone hover:border-white/40 hover:text-white" data-open-expert>
        <Sparkles className="size-4" aria-hidden="true" /> Mode expert (tous les réglages)
      </button>
    </div>
  );
}

/** The stones the engine measured too dark (no reflection) or flat white, in simple words. A black stone chosen as such is not a problem. */
export function stoneProblems(measures: Record<string, StoneMeasure>, settings: ModelSettings): { layer: string; text: string }[] {
  const out: { layer: string; text: string }[] = [];
  for (const [layer, m] of Object.entries(measures)) {
    if (m.pixels < 30) continue;
    const material = settings.layers[layer]?.material ?? "";
    const darkByChoice = /black|noir|onyx/.test(material) || /^#(0|1)/i.test(settings.layers[layer]?.diamond?.color ?? "");
    if (!darkByChoice && (m.mean < 0.14 || m.black > 0.45)) out.push({ layer, text: "Certaines pierres sont trop sombres (presque sans reflet). Le moteur peut les corriger." });
    else if (m.mean > 0.9 || m.white > 0.55) out.push({ layer, text: "Certaines pierres sont blanches et plates (trop de lumière). Le moteur peut les corriger." });
  }
  return out;
}
