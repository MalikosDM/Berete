/*
 * « Versions » of the 3D editor (27/11/2026): the settings a model had before each save (the server keeps the last 20,
 * server/routes/model-extras.ts), with their date and a few words on their scene. « Rétablir » puts one in the settings
 * being edited (one step of « Annuler »); « Enregistrer » keeps it.
 */
import { useEffect, useState } from "react";
import { History as HistoryIcon, LoaderCircle } from "lucide-react";
import { sceneOf, type ModelSettings } from "@/data/models";
import { hdriName } from "@/viewer/hdri";
import { adminCall } from "../ui";
import { BACKGROUND_NAMES_FR, SIMPLE_AMBIANCES, ambianceOf } from "./presets";

export type Version = { id: string; at: string; settings: ModelSettings };

/** A few words on a scene: « Studio noir · fond Studio sombre · métal : Studio chaud · pierres : Studio ». */
export function sceneWords(settings: ModelSettings): string {
  try {
    const scene = sceneOf(settings);
    const ambiance = SIMPLE_AMBIANCES.find((a) => a.id === ambianceOf(settings))?.name;
    return [ambiance ? "Ambiance « " + ambiance + " »" : "", "fond " + (BACKGROUND_NAMES_FR[settings.background] ?? settings.background), "métal : " + hdriName(scene.envMetal.id), "pierres : " + hdriName(scene.envGem.id)].filter(Boolean).join(" · ");
  } catch {
    return "";
  }
}

type Props = {
  token: string;
  modelId: string;
  /** Changes after each save: the list is read again. */
  savedAt: number;
  draft: ModelSettings;
  onRestore: (version: Version) => void;
  onError: (x: unknown) => void;
};

export function VersionsPanel({ token, modelId, savedAt, draft, onRestore, onError }: Props) {
  const [items, setItems] = useState<Version[] | null>(null);
  useEffect(() => {
    let alive = true;
    adminCall(token, "GET", "/api/admin/3d-versions/" + modelId)
      .then((res) => alive && setItems((res.items as Version[]) ?? []))
      .catch((x: unknown) => alive && onError(x));
    return () => {
      alive = false;
    };
  }, [token, modelId, savedAt, onError]);
  const now = JSON.stringify(draft);

  return (
    <div className="grid gap-3" data-versions-panel>
      <p className="text-sm text-mist">À chaque « Enregistrer », le réglage d'avant est gardé ici (les 20 derniers). « Rétablir » le remet dans l'éditeur ; « Enregistrer » le garde.</p>
      {items === null ? (
        <p className="flex items-center gap-2 text-base text-bone">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Chargement
        </p>
      ) : items.length === 0 ? (
        <p className="text-base text-mist">Aucune version pour l'instant : elles arrivent avec les enregistrements.</p>
      ) : (
        <ol className="grid gap-2" data-version-list>
          {items.map((v, i) => {
            const same = JSON.stringify(v.settings) === now;
            return (
              <li key={v.id} className="flex flex-wrap items-center gap-3 border border-white/10 p-3" data-version={v.id}>
                <HistoryIcon className="size-5 shrink-0 text-rose-light" aria-hidden="true" />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="text-base text-white">
                    {new Date(v.at).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {i === 0 ? <span className="text-mist"> · avant le dernier enregistrement</span> : null}
                  </span>
                  <span className="break-words text-sm text-mist">{sceneWords(v.settings)}</span>
                </span>
                <button type="button" disabled={same} onClick={() => onRestore(v)} className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/25 px-4 text-base text-white hover:border-rose-light hover:text-rose-light disabled:opacity-40" title={same ? "Ce sont déjà les réglages affichés" : "Remettre ce réglage dans l'éditeur"} data-version-restore>
                  {same ? "Affiché" : "Rétablir"}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
