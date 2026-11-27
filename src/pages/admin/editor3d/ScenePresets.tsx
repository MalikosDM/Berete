/*
 * « Préréglages de scène » of the 3D editor (27/11/2026): the scene of a model (lightings, effects, ground, stand, background,
 * ambiance, how the diamonds are drawn) kept under a name on the server, put back on this model in one click, or applied to
 * several models at once (each keeps its parts, its metals and stones, its views, its configurators). In simple French.
 */
import { useCallback, useEffect, useState } from "react";
import { Check, LoaderCircle, Trash2, X } from "lucide-react";
import type { ModelSettings } from "@/data/models";
import type { StageApi } from "@/viewer/Stage";
import { adminCall } from "../ui";

export type PresetPart = Pick<ModelSettings, "scene" | "background" | "ambiance" | "diamonds">;
export type Preset = { id: string; name: string; createdAt: string; from: string | null; part: PresetPart; image: string | null };

/** The scene part of settings: what a preset keeps. */
export function presetPart(settings: ModelSettings): PresetPart {
  return { ...(settings.scene ? { scene: settings.scene } : {}), background: settings.background, ambiance: settings.ambiance, diamonds: settings.diamonds ?? "realistic" };
}

/** A model's settings with the scene of a preset: its parts, metals, views, configurators and try-on stay its own. */
export function withPreset(settings: ModelSettings, part: PresetPart): ModelSettings {
  const { scene: _scene, ...rest } = settings;
  void _scene;
  return { ...rest, ...(part.scene ? { scene: part.scene } : {}), background: part.background, ambiance: part.ambiance, diamonds: part.diamonds ?? "realistic" };
}

/** A small picture of what the editor shows (WebP, 240 px wide), for the list of presets. */
export async function smallPicture(api: StageApi | null): Promise<string | null> {
  const png = api?.capture();
  if (!png) return null;
  try {
    const img = new Image();
    img.src = png;
    await img.decode();
    const scale = Math.min(1, 240 / img.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    // Safari makes no WebP: a JPEG then.
    const webp = canvas.toDataURL("image/webp", 0.72);
    const out = webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.75);
    return out.length < 80_000 ? out : null;
  } catch {
    return null;
  }
}

export function usePresets(token: string, onError: (x: unknown) => void) {
  const [items, setItems] = useState<Preset[] | null>(null);
  const reload = useCallback(async () => {
    try {
      const res = await adminCall(token, "GET", "/api/admin/3d-presets");
      setItems((res.items as Preset[]) ?? []);
    } catch (x) {
      onError(x);
    }
  }, [token, onError]);
  const create = async (name: string, part: PresetPart, from: string, image: string | null) => {
    const preset = (await adminCall(token, "POST", "/api/admin/3d-presets", { name, part, from, image })) as unknown as Preset;
    setItems((list) => [preset, ...(list ?? [])]);
    return preset;
  };
  const remove = async (id: string) => {
    await adminCall(token, "DELETE", "/api/admin/3d-presets/" + id);
    setItems((list) => (list ?? []).filter((p) => p.id !== id));
  };
  return { items, reload, create, remove };
}

const small = "inline-flex min-h-12 items-center justify-center gap-2 border border-white/25 px-4 text-base text-white hover:border-rose-light hover:text-rose-light disabled:opacity-40";
const date = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

type PanelProps = {
  presets: ReturnType<typeof usePresets>;
  modelName: string;
  settings: ModelSettings;
  api: StageApi | null;
  onApplyHere: (preset: Preset) => void;
  onApplyMany: (preset: Preset | null) => void;
  onError: (x: unknown) => void;
  say: (text: string) => void;
};

/** The panel under « Préréglages »: save the scene under a name, the list (apply here, delete), apply to several models. */
export function PresetsPanel({ presets, modelName, settings, api, onApplyHere, onApplyMany, onError, say }: PanelProps) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { items, reload } = presets;
  useEffect(() => {
    void reload();
  }, [reload]);

  const save = async () => {
    const chosen = name.trim() || "Scène de " + modelName;
    setBusy(true);
    try {
      await presets.create(chosen, presetPart(settings), modelName, await smallPicture(api));
      setName("");
      say("Préréglage « " + chosen + " » enregistré.");
    } catch (x) {
      onError(x);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (p: Preset) => {
    if (!window.confirm("Supprimer le préréglage « " + p.name + " » ? Les modèles qui l'utilisent gardent leurs réglages.")) return;
    try {
      await presets.remove(p.id);
      say("Préréglage supprimé.");
    } catch (x) {
      onError(x);
    }
  };

  return (
    <div className="grid gap-4" data-presets-panel>
      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label className="grid gap-1 text-base text-bone">
          Enregistrer la scène de ce modèle comme préréglage
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={"Scène de " + modelName} maxLength={80} className="block min-h-12 w-full border border-white/30 bg-ink px-3 text-base text-white placeholder:text-mist focus:border-rose-light focus:outline-none" data-preset-name />
        </label>
        <p className="text-sm text-mist">Garde les éclairages, le fond, le sol, le socle, les effets et le rendu des diamants ; jamais les métaux ni les pierres des parties.</p>
        <button type="submit" disabled={busy} className={small + " justify-self-start"} data-preset-save>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />} Enregistrer comme préréglage
        </button>
      </form>
      <div className="grid gap-2 border-t border-white/15 pt-3">
        <p className="text-base text-white">Préréglages enregistrés</p>
        {items === null ? (
          <p className="flex items-center gap-2 text-base text-bone">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Chargement
          </p>
        ) : items.length === 0 ? (
          <p className="text-base text-mist">Aucun préréglage pour l'instant.</p>
        ) : (
          <ul className="grid gap-2" data-preset-list>
            {items.map((p) => (
              <li key={p.id} className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3 border border-white/10 p-2" data-preset={p.name}>
                <span className="flex size-16 items-center justify-center overflow-hidden bg-ink-soft">{p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : null}</span>
                <span className="grid min-w-0 gap-1">
                  <span className="break-words text-base text-white">{p.name}</span>
                  <span className="text-sm text-mist">
                    {date(p.createdAt)}
                    {p.from ? " · depuis « " + p.from + " »" : ""}
                  </span>
                </span>
                <span className="col-span-2 flex flex-wrap gap-2">
                  <button type="button" className={small} onClick={() => onApplyHere(p)} data-preset-apply-here>
                    Appliquer ici
                  </button>
                  <button type="button" className={small} onClick={() => onApplyMany(p)} data-preset-apply-many>
                    Appliquer à plusieurs modèles
                  </button>
                  <button type="button" aria-label={"Supprimer le préréglage " + p.name} className={small + " px-3"} onClick={() => void remove(p)} data-preset-delete>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type ModelChoice = { id: string; name: string; status: string };
type ManyProps = {
  token: string;
  presets: Preset[];
  first: Preset | null;
  /** The model open in the editor: it takes the preset in its draft (saved with « Enregistrer »), never behind its back. */
  openId: string;
  onApplyHere: (preset: Preset) => void;
  onClose: () => void;
  onError: (x: unknown) => void;
  say: (text: string) => void;
};

/** « Appliquer à plusieurs modèles »: a preset, the models ticked, a confirmation, then each model saved with the new scene. */
export function ApplyMany({ token, presets, first, openId, onApplyHere, onClose, onError, say }: ManyProps) {
  const [presetId, setPresetId] = useState(first?.id ?? presets[0]?.id ?? "");
  const [models, setModels] = useState<ModelChoice[] | null>(null);
  const [ticked, setTicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");

  useEffect(() => {
    let alive = true;
    adminCall(token, "GET", "/api/admin/models")
      .then((res) => alive && setModels(((res.items as ModelChoice[]) ?? []).filter((m) => m.status === "ready" || m.status === "incomplete")))
      .catch((x: unknown) => alive && onError(x));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      window.removeEventListener("keydown", onKey);
    };
  }, [token, onError, onClose]);

  const preset = presets.find((p) => p.id === presetId) ?? null;
  const toggle = (id: string) => setTicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const apply = async () => {
    if (!preset || ticked.length === 0) return;
    const names = (models ?? []).filter((m) => ticked.includes(m.id)).map((m) => m.name);
    const text = "Appliquer le préréglage « " + preset.name + " » à " + (ticked.length > 1 ? ticked.length + " modèles" : "1 modèle") + " (" + names.join(", ") + ") ?\n\nLeur scène (éclairages, fond, sol, socle, effets, diamants) est remplacée ; leurs métaux, pierres, vues et configurateurs restent. Chaque modèle garde son réglage d'avant dans « Versions ».";
    if (!window.confirm(text)) return;
    setBusy(true);
    setDone("");
    let saved = 0;
    let here = false;
    const failed: string[] = [];
    for (const id of ticked) {
      const name = models?.find((m) => m.id === id)?.name ?? id;
      if (id === openId) {
        onApplyHere(preset);
        here = true;
        continue;
      }
      try {
        const row = (await adminCall(token, "GET", "/api/admin/models/" + id)) as unknown as { name: string; settings: ModelSettings; pieceSlug: string | null; status: string };
        await adminCall(token, "PUT", "/api/admin/models/" + id, { name: row.name, settings: withPreset(row.settings, preset.part), pieceSlug: row.status === "incomplete" ? null : row.pieceSlug });
        saved++;
      } catch (x) {
        if (x instanceof Error && x.message === "expired") return onError(x);
        failed.push(name);
      }
    }
    setBusy(false);
    const parts = [saved > 0 ? (saved > 1 ? saved + " modèles enregistrés" : "1 modèle enregistré") + " avec « " + preset.name + " »." : "", here ? "Le modèle ouvert l'a reçu dans ses réglages : cliquez sur « Enregistrer » pour le garder." : "", failed.length ? "Échec pour : " + failed.join(", ") + "." : ""].filter(Boolean);
    setDone(parts.join(" "));
    say(parts[0] ?? parts.join(" "));
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="apply-many-title" className="fixed inset-0 z-[130] overflow-y-auto bg-black/80 p-4" data-apply-many>
      <div className="mx-auto grid max-w-2xl gap-4 border border-white/20 bg-ink p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="apply-many-title" className="text-xl text-white">
            Appliquer un préréglage à plusieurs modèles
          </h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="inline-flex size-12 shrink-0 items-center justify-center border border-white/30 text-white hover:border-rose-light hover:text-rose-light" data-apply-many-close>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <label className="grid gap-1 text-base text-bone">
          Préréglage
          <select value={presetId} onChange={(e) => setPresetId(e.target.value)} className="block min-h-12 w-full border border-white/30 bg-ink px-3 text-base text-white focus:border-rose-light focus:outline-none" data-apply-many-preset>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-base text-bone">Modèles à mettre à jour</legend>
          {models === null ? (
            <p className="flex items-center gap-2 text-base text-bone">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Chargement
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {models.map((m) => (
                <li key={m.id}>
                  <label className="flex min-h-12 items-center gap-3 border border-white/10 px-3 text-base text-white">
                    <input type="checkbox" className="size-5 shrink-0 accent-[#e8b4a0]" checked={ticked.includes(m.id)} onChange={() => toggle(m.id)} data-apply-many-model={m.name} />
                    <span className="min-w-0 break-words">
                      {m.name}
                      {m.id === openId ? <span className="text-mist"> (ouvert)</span> : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy || !preset || ticked.length === 0} onClick={() => void apply()} className="inline-flex min-h-12 items-center justify-center gap-2 bg-white px-6 text-base font-medium text-ink hover:bg-rose-light disabled:opacity-60" data-apply-many-go>
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />} Appliquer{ticked.length ? " à " + (ticked.length > 1 ? ticked.length + " modèles" : "1 modèle") : ""}
          </button>
          <button type="button" onClick={onClose} className={small}>
            Fermer
          </button>
        </div>
        {done ? (
          <p role="status" className="text-base text-bone" data-apply-many-done>
            {done}
          </p>
        ) : null}
      </div>
    </div>
  );
}
