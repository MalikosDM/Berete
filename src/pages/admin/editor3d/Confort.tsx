/*
 * The row above the 3D editor (27/11/2026), the comforts of jewellers' tools: « Annuler » / « Rétablir » every change (and
 * Ctrl/⌘ + Z), « Comparer » before / after with a line to slide, « Préréglages » of a scene (saved, applied to several
 * models), « Versions » kept at each save, « Voir sur la page de la pièce » with the settings not saved yet, and the
 * keyboard shortcuts (« ? Raccourcis »). In simple French; never a shortcut while typing in a field.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Columns2, History as HistoryIcon, Keyboard, LoaderCircle, Palette, Redo2, Undo2 } from "lucide-react";
import type { ModelSettings } from "@/data/models";
import type { StageApi } from "@/viewer/Stage";
import Compare from "./Compare";
import { ApplyMany, PresetsPanel, usePresets, withPreset, type Preset } from "./ScenePresets";
import { VersionsPanel, type Version } from "./Versions";

/** What the page of the model (Models3D) gives the row. */
export type EditorTools = {
  token: string;
  modelId: string;
  modelName: string;
  /** The piece whose page shows the model (saved), else null. */
  pieceSlug: string | null;
  /** The draft (what « Enregistrer » would save). */
  draft: ModelSettings;
  /** The settings saved last: « Avant » of the comparison. */
  saved: ModelSettings | null;
  undo(): boolean;
  redo(): boolean;
  canUndo: boolean;
  canRedo: boolean;
  /** Puts settings in the draft as one step of the history (a version, a preset). */
  put(next: ModelSettings): void;
  /** Shows other settings in the picture without touching the draft (the comparison); null: the draft again. */
  show(settings: ModelSettings | null): void;
  save(): void;
  saving: boolean;
  /** Changes at each save (the versions are read again). */
  savedAt: number;
  onError(x: unknown): void;
};

type Props = {
  tools: EditorTools;
  api: StageApi | null;
  mode: "simple" | "expert";
  onMode: (mode: "simple" | "expert") => void;
  autoRotate: boolean;
  onAutoRotate: (on: boolean) => void;
};

/** The views of the keys 1 to 4: azimuth and polar angle (radians). */
const VIEWS: [number, number, string][] = [
  [0, Math.PI / 2 - 0.05, "Vue de face"],
  [Math.PI / 2, Math.PI / 2 - 0.05, "Vue de profil"],
  [Math.PI / 4, 1.0, "Vue de trois quarts"],
  [0, 0.0001, "Vue de dessus"],
];

const PREVIEW_MINUTES = 30;
export const previewKey = (modelId: string) => "bj-3d-preview:" + modelId;

/** The draft, for the page of the piece opened with ?preview3d=1 (read by src/components/Piece3D.tsx), 30 minutes. */
function keepPreview(modelId: string, settings: ModelSettings): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith("bj-3d-preview:")) continue;
      const old = JSON.parse(localStorage.getItem(key) ?? "null") as { expires?: number } | null;
      if (!old || (old.expires ?? 0) < Date.now()) localStorage.removeItem(key);
    }
    localStorage.setItem(previewKey(modelId), JSON.stringify({ settings, expires: Date.now() + PREVIEW_MINUTES * 60_000 }));
  } catch {
    // A private window: the page shows the saved settings.
  }
}

/** A key typed in a field (text, number, list…): never a shortcut. A slider, a box or a button keeps the shortcuts. */
function typing(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== "function") return false;
  if (el.closest("textarea, select, [contenteditable=''], [contenteditable='true']")) return true;
  const input = el.closest("input");
  return input !== null && !["range", "checkbox", "radio", "button", "submit", "reset", "color", "file", "image"].includes(input.type);
}

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

const SHORTCUTS: [string, string][] = [
  ["Ctrl / ⌘ + Z  ou  Z", "Annuler le dernier changement"],
  ["Ctrl / ⌘ + Maj + Z, Ctrl + Y  ou  Maj + Z", "Rétablir"],
  ["S  ou  Ctrl / ⌘ + S", "Enregistrer"],
  ["F", "Cadrer le bijou"],
  ["1  2  3  4", "Vue de face, de profil, de trois quarts, de dessus"],
  ["R", "Rotation automatique"],
  ["E", "Mode expert / mode simple"],
  ["?", "Cette aide"],
  ["Échap", "Fermer"],
];

type Panel = "presets" | "versions" | "keys" | null;

export default function ConfortBar({ tools, api, mode, onMode, autoRotate, onAutoRotate }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [note, setNote] = useState("");
  const noteTimer = useRef(0);
  const say = useCallback((text: string) => {
    setNote(text);
    window.clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setNote(""), 3500);
  }, []);
  const presets = usePresets(tools.token, tools.onError);
  const [many, setMany] = useState<{ first: Preset | null } | null>(null);

  // The comparison: « busy » while the saved settings are drawn and captured, then the two pictures.
  const [compare, setCompare] = useState<{ before: string; after: string; host: HTMLElement; draft: string } | null>(null);
  const [comparing, setComparing] = useState(false);
  const latest = useRef({ api, tools });
  useEffect(() => {
    latest.current = { api, tools };
  });
  const savedNow = useMemo(() => (tools.saved ? JSON.stringify(tools.saved) : null), [tools.saved]);
  const draftNow = useMemo(() => JSON.stringify(tools.draft), [tools.draft]);
  const dirty = savedNow !== null && savedNow !== draftNow;
  // A change of the draft, or a new picture (the mode changed): the comparison is out of date.
  const shownCompare = compare && compare.draft === draftNow && compare.host.isConnected ? compare : null;

  const startCompare = async () => {
    if (!api || !tools.saved || comparing) return;
    const host = root.current?.parentElement?.querySelector<HTMLElement>("[data-editor-3d] [data-editor-canvas]");
    if (!host) return;
    setPanel(null);
    setComparing(true);
    if (autoRotate) onAutoRotate(false);
    // The camera held where it is going (a view still gliding ends at once), the same for both pictures and after.
    const view = api.getView();
    const hold = () => view && latest.current.api?.goTo(view, 0);
    hold();
    // The picture settles (progressive rendering) before each capture.
    await wait(900);
    const after = latest.current.api?.capture() ?? null;
    const draft = JSON.stringify(latest.current.tools.draft);
    tools.show(tools.saved);
    await wait(100);
    hold();
    await wait(1500);
    const before = latest.current.api?.capture() ?? null;
    tools.show(null);
    window.setTimeout(hold, 100);
    setComparing(false);
    if (!before || !after) return say("La comparaison n'a pas pu être faite.");
    setCompare({ before, after, host, draft });
  };
  const closeCompare = useCallback(() => setCompare(null), []);
  const closeMany = useCallback(() => setMany(null), []);

  const undo = useCallback(() => {
    if (latest.current.tools.undo()) say("Changement annulé.");
  }, [say]);
  const redo = useCallback(() => {
    if (latest.current.tools.redo()) say("Changement rétabli.");
  }, [say]);
  const save = useCallback(() => {
    const t = latest.current.tools;
    if (!t.saving) t.save();
  }, []);

  // The keyboard shortcuts, on the whole page while the editor is open (never in a field, never under another window).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (comparing || e.defaultPrevented || e.isComposing || typing(e.target)) return;
      if (document.querySelector("[role=dialog][aria-modal=true]")) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === "z" && !e.altKey) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (key === "y" && e.ctrlKey && !e.altKey) {
        e.preventDefault();
        redo();
        return;
      }
      if (key === "s" && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        save();
        return;
      }
      if (mod || e.altKey) return;
      if (key === "Escape" && panel) {
        setPanel(null);
        return;
      }
      if (key === "?") {
        e.preventDefault();
        setPanel((p) => (p === "keys" ? null : "keys"));
        return;
      }
      if (e.repeat) return;
      const a = latest.current.api;
      const digit = /^(?:Digit|Numpad)([1-4])$/.exec(e.code)?.[1] ?? (/^[1-4]$/.test(key) ? key : null);
      if (digit && a) {
        const [azimuth, polar, name] = VIEWS[Number(digit) - 1]!;
        if (autoRotate) onAutoRotate(false);
        a.look(azimuth, polar);
        say(name);
      } else if (key === "f" && a) {
        a.fit();
        say("Bijou cadré.");
      } else if (key === "r") {
        onAutoRotate(!autoRotate);
        say(autoRotate ? "Rotation arrêtée." : "Rotation automatique.");
      } else if (key === "e") {
        onMode(mode === "simple" ? "expert" : "simple");
        say(mode === "simple" ? "Mode expert." : "Mode simple.");
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, save, say, panel, comparing, autoRotate, onAutoRotate, mode, onMode]);

  // A panel closes with a click elsewhere.
  useEffect(() => {
    if (!panel) return undefined;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setPanel(null);
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [panel]);

  const applyHere = (p: Preset) => {
    tools.put(withPreset(latest.current.tools.draft, p.part));
    say("Préréglage « " + p.name + " » appliqué : « Enregistrer » pour le garder.");
  };
  const restore = (v: Version) => {
    tools.put(v.settings);
    setPanel(null);
    say("Version rétablie : « Enregistrer » pour la garder, « Annuler » (en haut) pour revenir.");
  };

  const btn = "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 border border-white/20 px-4 text-base text-white hover:border-rose-light hover:text-rose-light disabled:cursor-not-allowed disabled:opacity-40 aria-expanded:border-rose-light aria-expanded:text-rose-light";
  const toggle = (p: Exclude<Panel, null>) => setPanel((now) => (now === p ? null : p));
  const drop = (p: Exclude<Panel, null>, title: string, body: ReactNode) =>
    panel === p ? (
      <div role="dialog" aria-label={title} className="absolute start-0 top-full z-50 mt-1 max-h-[min(70svh,40rem)] w-[min(34rem,calc(100vw-3rem))] overflow-y-auto overscroll-contain border border-white/20 bg-ink p-4 shadow-[0_18px_40px_rgba(0,0,0,0.6)]" data-lenis-prevent data-confort-panel={p}>
        <p className="mb-3 text-lg text-white">{title}</p>
        {body}
      </div>
    ) : null;

  return (
    <div
      ref={root}
      className={"relative left-1/2 z-30 -mb-6 flex w-[calc(100vw-3rem)] -translate-x-1/2 flex-wrap items-center gap-2 border border-white/15 bg-ink p-2 " + (mode === "simple" ? "max-w-[1600px]" : "max-w-[1800px]")}
      role="toolbar"
      aria-label="Outils de l'éditeur"
      data-confort-bar
    >
      <button type="button" className={btn} onClick={undo} disabled={!tools.canUndo} title="Annuler le dernier changement (Ctrl / ⌘ + Z)" data-undo>
        <Undo2 className="size-4" aria-hidden="true" /> Annuler
      </button>
      <button type="button" className={btn} onClick={redo} disabled={!tools.canRedo} title="Rétablir (Ctrl / ⌘ + Maj + Z)" data-redo>
        <Redo2 className="size-4" aria-hidden="true" /> Rétablir
      </button>
      <span className="mx-1 hidden h-8 w-px bg-white/15 sm:block" aria-hidden="true" />
      <button type="button" className={btn} onClick={() => void startCompare()} disabled={!dirty || !api || comparing} title={dirty ? "Comparer avec les réglages enregistrés" : "Rien à comparer : aucun changement depuis le dernier enregistrement"} data-compare-open>
        {comparing ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Columns2 className="size-4" aria-hidden="true" />} {comparing ? "Préparation…" : "Comparer"}
      </button>
      <div className="relative">
        <button type="button" className={btn} aria-expanded={panel === "presets"} onClick={() => toggle("presets")} data-presets-open>
          <Palette className="size-4" aria-hidden="true" /> Préréglages
        </button>
        {drop(
          "presets",
          "Préréglages de scène",
          <PresetsPanel presets={presets} modelName={tools.modelName} settings={tools.draft} api={api} onApplyHere={applyHere} onApplyMany={(p) => (setPanel(null), setMany({ first: p }))} onError={tools.onError} say={say} />,
        )}
      </div>
      <div className="relative">
        <button type="button" className={btn} aria-expanded={panel === "versions"} onClick={() => toggle("versions")} data-versions-open>
          <HistoryIcon className="size-4" aria-hidden="true" /> Versions
        </button>
        {drop("versions", "Versions enregistrées", <VersionsPanel token={tools.token} modelId={tools.modelId} savedAt={tools.savedAt} draft={tools.draft} onRestore={restore} onError={tools.onError} />)}
      </div>
      {tools.pieceSlug ? (
        <a
          href={"/pieces/" + tools.pieceSlug + "?preview3d=1"}
          target="_blank"
          rel="noopener"
          className={btn}
          onClick={() => keepPreview(tools.modelId, tools.draft)}
          onAuxClick={() => keepPreview(tools.modelId, tools.draft)}
          title="Ouvre la page de la pièce avec les réglages en cours (pas encore enregistrés), sur cet ordinateur seulement, pendant 30 minutes"
          data-preview-page
        >
          <ArrowUpRight className="size-4" aria-hidden="true" /> Voir sur la page de la pièce
        </a>
      ) : null}
      {/* What a click or a key just did, on the same line (the editor below never moves). */}
      <p role="status" aria-live="polite" className="min-w-0 flex-1 truncate px-1 text-base text-bone" data-confort-note>
        {note}
      </p>
      <div className="relative">
        <button type="button" className={btn} aria-expanded={panel === "keys"} onClick={() => toggle("keys")} title="Raccourcis clavier (?)" data-keys-open>
          <Keyboard className="size-4" aria-hidden="true" /> ? Raccourcis
        </button>
        {panel === "keys" ? (
          <div role="dialog" aria-label="Raccourcis clavier" className="absolute end-0 top-full z-50 mt-1 w-[min(30rem,calc(100vw-3rem))] border border-white/20 bg-ink p-4 shadow-[0_18px_40px_rgba(0,0,0,0.6)]" data-confort-panel="keys">
            <p className="mb-3 text-lg text-white">Raccourcis clavier</p>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-base">
              {SHORTCUTS.map(([keys, what]) => (
                <div key={keys} className="contents">
                  <dt className="whitespace-pre text-rose-light">{keys}</dt>
                  <dd className="text-bone">{what}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-mist">Jamais pendant la saisie d'un texte.</p>
          </div>
        ) : null}
      </div>
      {/* Out of the row (it is moved by a transform, which would hold a fixed layer): over the whole page. */}
      {comparing ? createPortal(<div className="fixed inset-0 z-[60] cursor-wait" aria-hidden="true" data-compare-wait />, document.body) : null}
      {shownCompare ? <Compare host={shownCompare.host} before={shownCompare.before} after={shownCompare.after} onClose={closeCompare} /> : null}
      {many && presets.items && presets.items.length > 0 ? createPortal(<ApplyMany token={tools.token} presets={presets.items} first={many.first} openId={tools.modelId} onApplyHere={applyHere} onClose={closeMany} onError={tools.onError} say={say} />, document.body) : null}
    </div>
  );
}
