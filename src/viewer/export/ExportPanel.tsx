/*
 * The export panel of the 3D editor (admin, 26/11/2026), in plain French: an image up to 4K, a film (one turn, or the
 * path through the saved views), a series (every view × every metal, in one zip), and the jewel as a .glb file.
 * One export at a time (they all use the stage); each file goes to the downloads, with its name and size shown.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CircleStop, Download, Film, ImageIcon, Images, LoaderCircle, Package } from "lucide-react";
import type { MetalId } from "@/data/models";
import { btn, btnMain, inputCls } from "@/pages/admin/ui";
import type { PathKind, RenderApi } from "../types";
import { download, exportFilm, exportImage, exportSeries, extensionOf, fileSlug, FILM_SECONDS, filmSize, isAbort, MAX_SIDE, naturalFilmSeconds, type ImageFormat } from "./exporter";

type Props = {
  api: RenderApi | null;
  metals: MetalId[];
  metalNames: Record<string, string>;
  pieceName: string;
  onExportGlb?: () => Promise<Blob>;
};

type Task = "image" | "film" | "series" | "glb";
type Outcome = { kind: "done"; name: string; blob: Blob; note?: string } | { kind: "error"; message: string } | { kind: "stopped" };
type Size = { preset: string; width: number; height: number };

const SIZES = [
  { id: "1080", label: "1080 × 1080 (carré)", width: 1080, height: 1080 },
  { id: "1920x1080", label: "1920 × 1080 (paysage)", width: 1920, height: 1080 },
  { id: "1080x1920", label: "1080 × 1920 (vertical, stories)", width: 1080, height: 1920 },
  { id: "2048", label: "2048 × 2048 (carré)", width: 2048, height: 2048 },
  { id: "4k", label: "4K, 3840 × 2160 (paysage)", width: 3840, height: 2160 },
  { id: "4k-square", label: "Carré 4K, 3840 × 3840", width: 3840, height: 3840 },
] as const;

const FORMATS: { id: ImageFormat; label: string }[] = [
  { id: "png", label: "PNG (le plus net)" },
  { id: "jpeg", label: "JPEG (plus léger)" },
  { id: "webp", label: "WebP (léger, pour le web)" },
];

const SHAPES = [
  { id: "square", label: "Carré" },
  { id: "vertical", label: "Vertical 9:16 (stories)" },
  { id: "wide", label: "Paysage 16:9" },
] as const;
type Shape = (typeof SHAPES)[number]["id"];

const legend = "px-2 text-lg text-white";
const radioRow = "flex min-h-12 items-center gap-3 text-base text-bone";

/** « 12,4 Mo », « 850 Ko ». */
function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " Mo";
  return Math.max(1, Math.round(bytes / 1024)).toLocaleString("fr-FR") + " Ko";
}

type ProgressState = { fraction: number; left: string };

/** Turns the fraction done into a progress with the time left (« encore environ 40 s », « encore environ 3 min »). */
function progressReporter(set: (p: ProgressState) => void): (fraction: number) => void {
  const startedAt = performance.now();
  return (fraction) => {
    let left = "";
    if (fraction >= 0.04 && fraction < 1) {
      const seconds = ((performance.now() - startedAt) / 1000) * ((1 - fraction) / fraction);
      left = seconds < 60 ? "encore environ " + Math.max(5, Math.round(seconds / 5) * 5) + " s" : "encore environ " + Math.round(seconds / 60) + " min";
    }
    set({ fraction, left });
  };
}

function errorText(error: unknown, task: Task): string {
  const message = error instanceof Error ? error.message : "";
  if (message === "no-encoder") return "Ce navigateur ne sait pas fabriquer de film. Essayez avec Chrome ou Safari à jour.";
  if (task === "glb") return "Le fichier 3D n'a pas pu être créé. Réessayez dans un instant.";
  return "L'export n'a pas abouti. Réessayez, ou choisissez une taille plus petite.";
}

function SizePicker({ value, onChange, id }: { value: Size; onChange: (size: Size) => void; id: string }) {
  return (
    <div className="grid gap-2">
      <label className="block text-base text-bone" htmlFor={id}>
        Taille (en pixels)
      </label>
      <select
        id={id}
        value={value.preset}
        onChange={(e) => {
          const preset = SIZES.find((s) => s.id === e.target.value);
          onChange(preset ? { preset: preset.id, width: preset.width, height: preset.height } : { ...value, preset: "custom" });
        }}
        className={inputCls + " mt-0"}
      >
        {SIZES.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
        <option value="custom">Personnalisée</option>
      </select>
      {value.preset === "custom" ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-base text-bone">
            Largeur
            <input type="number" inputMode="numeric" min={16} max={MAX_SIDE} step={1} value={value.width} onChange={(e) => onChange({ ...value, width: Number(e.target.value) })} className={inputCls} />
          </label>
          <label className="block text-base text-bone">
            Hauteur
            <input type="number" inputMode="numeric" min={16} max={MAX_SIDE} step={1} value={value.height} onChange={(e) => onChange({ ...value, height: Number(e.target.value) })} className={inputCls} />
          </label>
          <p className="col-span-2 text-base text-mist">De 16 à {MAX_SIDE.toLocaleString("fr-FR")} pixels de côté.</p>
        </div>
      ) : null}
    </div>
  );
}

const sizeValid = (s: Size) => [s.width, s.height].every((v) => Number.isFinite(v) && v >= 16 && v <= MAX_SIDE);

function FormatPicker({ value, onChange, id }: { value: ImageFormat; onChange: (f: ImageFormat) => void; id: string }) {
  return (
    <label className="block text-base text-bone" htmlFor={id}>
      Format
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as ImageFormat)} className={inputCls}>
        {FORMATS.map((f) => (
          <option key={f.id} value={f.id}>{f.label}</option>
        ))}
      </select>
    </label>
  );
}

function Transparent({ checked, format, onChange }: { checked: boolean; format: ImageFormat; onChange: (v: boolean) => void }) {
  const off = format === "jpeg";
  return (
    <label className={radioRow + (off ? " opacity-60" : "")}>
      <input type="checkbox" className="size-5" checked={checked && !off} disabled={off} onChange={(e) => onChange(e.target.checked)} />
      Fond transparent{off ? " (pas en JPEG)" : ""}
    </label>
  );
}

function Progress({ label, value: { fraction, left }, onStop }: { label: string; value: ProgressState; onStop: () => void }) {
  const percent = Math.round(fraction * 100);
  return (
    <div className="grid gap-2" data-export-progress>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-bone" aria-hidden="true">
          {label} : {percent} %{left ? " · " + left : ""}
        </p>
        <button type="button" onClick={onStop} className={btn}>
          <CircleStop className="size-4" aria-hidden="true" /> Arrêter
        </button>
      </div>
      <span className="block h-1 w-full bg-white/10" role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <span className="block h-1 bg-rose-gold" style={{ width: Math.max(2, percent) + "%" }} />
      </span>
      {/* Read out every 10 %, not at every frame. */}
      <p className="sr-only" aria-live="polite">
        {label} : {Math.floor(percent / 10) * 10} %
      </p>
    </div>
  );
}

function Result({ outcome }: { outcome: Outcome | undefined }) {
  if (!outcome) return null;
  if (outcome.kind === "error") return <p role="alert" className="text-base text-rose-light">{outcome.message}</p>;
  if (outcome.kind === "stopped") return <p role="status" className="text-base text-bone">Arrêté. Rien n'a été enregistré.</p>;
  return (
    <div role="status" className="grid gap-2" data-export-result={outcome.name}>
      <p className="break-words text-base text-bone">
        Prêt : <span className="text-white">{outcome.name}</span> ({fileSize(outcome.blob.size)}), dans vos téléchargements.
      </p>
      {outcome.note ? <p className="text-base text-mist">{outcome.note}</p> : null}
      <button type="button" onClick={() => download(outcome.blob, outcome.name)} className={btn + " justify-self-start"}>
        <Download className="size-4" aria-hidden="true" /> Télécharger encore
      </button>
    </div>
  );
}

function Section({ title, icon, children, data }: { title: string; icon: ReactNode; children: ReactNode; data: string }) {
  return (
    <fieldset className="grid min-w-0 content-start gap-4 border border-white/15 p-4 sm:p-5" data-export-section={data}>
      <legend className={legend}>
        <span className="inline-flex items-center gap-2">
          {icon} {title}
        </span>
      </legend>
      {children}
    </fieldset>
  );
}

export default function ExportPanel({ api, metals, metalNames, pieceName, onExportGlb }: Props) {
  const base = fileSlug(pieceName) || "bijou";
  const views = api?.views() ?? [];
  const hasPath = views.length >= 2 && (api?.viewsDuration() ?? 0) > 0;

  const [busy, setBusy] = useState<Task | null>(null);
  const [outcomes, setOutcomes] = useState<Partial<Record<Task, Outcome>>>({});
  const [progress, setProgress] = useState<ProgressState>({ fraction: 0, left: "" });
  const controller = useRef<AbortController | null>(null);

  // Image
  const [imageFormat, setImageFormat] = useState<ImageFormat>("png");
  const [imageSize, setImageSize] = useState<Size>({ preset: "1080", width: 1080, height: 1080 });
  const [imageClear, setImageClear] = useState(false);
  // Film
  const [path, setPath] = useState<PathKind>("turn");
  const [seconds, setSeconds] = useState(8);
  const [quality, setQuality] = useState<"1080p" | "4k">("1080p");
  const [shape, setShape] = useState<Shape>("square");
  // Series
  const [offViews, setOffViews] = useState<Set<string>>(new Set());
  const [offMetals, setOffMetals] = useState<Set<string>>(new Set());
  const [seriesFormat, setSeriesFormat] = useState<ImageFormat>("png");
  const [seriesSize, setSeriesSize] = useState<Size>({ preset: "1080", width: 1080, height: 1080 });
  const [seriesClear, setSeriesClear] = useState(false);

  // Leaving the editor stops an export under way (the stage it draws on is going).
  useEffect(() => () => controller.current?.abort(), []);

  const filmPath: PathKind = hasPath ? path : "turn";
  const chosenViews = views.map((v, i) => ({ v, i })).filter(({ v }) => !offViews.has(v.id));
  const chosenMetals = metals.filter((m) => !offMetals.has(m));
  const seriesCount = Math.max(1, views.length > 0 ? chosenViews.length : 1) * Math.max(1, chosenMetals.length);
  const seriesReady = (views.length === 0 || chosenViews.length > 0) && (metals.length === 0 || chosenMetals.length > 0);

  async function run(task: Task, work: (signal: AbortSignal, onProgress: (fraction: number) => void) => Promise<Outcome>) {
    // One export at a time (a second click before the buttons are greyed is ignored).
    if (busy || controller.current) return;
    const ctrl = new AbortController();
    controller.current = ctrl;
    const onProgress = progressReporter(setProgress);
    onProgress(0);
    setBusy(task);
    setOutcomes((o) => ({ ...o, [task]: undefined }));
    let outcome: Outcome;
    try {
      outcome = await work(ctrl.signal, onProgress);
      if (outcome.kind === "done") download(outcome.blob, outcome.name);
    } catch (error) {
      if (isAbort(error)) outcome = { kind: "stopped" };
      else {
        console.error("[export]", error);
        outcome = { kind: "error", message: errorText(error, task) };
      }
    }
    if (controller.current === ctrl) controller.current = null;
    setOutcomes((o) => ({ ...o, [task]: outcome }));
    setBusy(null);
  }

  const onImage = () =>
    run("image", async () => {
      if (!api) throw new Error("no-api");
      const blob = await exportImage(api, { format: imageFormat, width: imageSize.width, height: imageSize.height, transparent: imageClear });
      const ext = extensionOf(blob.type);
      const note = imageFormat === "webp" && ext !== "webp" ? "Ce navigateur ne sait pas faire de WebP : l'image est en PNG." : undefined;
      return { kind: "done", name: `${base}_${imageSize.width}x${imageSize.height}.${ext}`, blob, note };
    });

  const onFilm = () =>
    run("film", async (signal, onProgress) => {
      if (!api) throw new Error("no-api");
      const { width, height } = filmSize(quality, shape);
      const film = await exportFilm(api, { path: filmPath, seconds, fps: 30, width, height, onProgress, signal });
      const ext = extensionOf(film.mime);
      const note =
        film.encoder === "mediarecorder"
          ? ext === "webm"
            ? "Ce navigateur ne sait pas faire de MP4 : le film est en WebM (il se lit dans Chrome ou VLC). Pour un MP4, utilisez Chrome ou Safari à jour."
            : "Film fait avec la méthode de secours de ce navigateur : vérifiez-le avant de le publier."
          : undefined;
      return { kind: "done", name: `${base}_${filmPath === "turn" ? "tour" : "parcours"}_${width}x${height}_${seconds}s.${ext}`, blob: film.blob, note };
    });

  const onSeries = () =>
    run("series", async (signal, onProgress) => {
      if (!api) throw new Error("no-api");
      const blob = await exportSeries(api, {
        views: views.length > 0 ? chosenViews.map(({ i }) => i) : undefined,
        metals: chosenMetals,
        format: seriesFormat,
        width: seriesSize.width,
        height: seriesSize.height,
        transparent: seriesClear,
        onProgress,
        signal,
      });
      return { kind: "done", name: `${base}_serie_${seriesSize.width}x${seriesSize.height}.zip`, blob, note: seriesCount + (seriesCount > 1 ? " images dans le fichier." : " image dans le fichier.") };
    });

  const onGlb = () =>
    run("glb", async () => {
      if (!onExportGlb) throw new Error("no-glb");
      const blob = await onExportGlb();
      return { kind: "done", name: `${base}.glb`, blob };
    });

  const waiting = !api ? <p className="text-base text-mist">Le modèle se charge encore : l'export sera possible dans un instant.</p> : null;
  const spinner = <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />;
  const stop = () => controller.current?.abort();

  return (
    <section className="grid gap-5" aria-labelledby="export-title" data-export-panel>
      <div>
        <h2 id="export-title" className="title-caps text-2xl tracking-[0.12em]">Exporter</h2>
        <p className="mt-2 text-base text-mist">Des images et des films du bijou tel qu'il est réglé, pour le site, les réseaux ou l'impression.</p>
      </div>
      {waiting}
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Image" icon={<ImageIcon className="size-5" aria-hidden="true" />} data="image">
          <FormatPicker id="export-image-format" value={imageFormat} onChange={setImageFormat} />
          <SizePicker id="export-image-size" value={imageSize} onChange={setImageSize} />
          <Transparent checked={imageClear} format={imageFormat} onChange={setImageClear} />
          <button type="button" onClick={onImage} disabled={!api || busy !== null || !sizeValid(imageSize)} className={btnMain + " justify-self-start"} data-export-image>
            {busy === "image" ? spinner : <ImageIcon className="size-4" aria-hidden="true" />} {busy === "image" ? "Image en cours…" : "Exporter l'image"}
          </button>
          {busy === "image" ? <p role="status" className="text-base text-bone">Image en cours, quelques secondes (plus en 4K).</p> : <Result outcome={outcomes.image} />}
        </Section>

        <Section title="Film" icon={<Film className="size-5" aria-hidden="true" />} data="film">
          <fieldset className="grid gap-1">
            <legend className="text-base text-white">Mouvement</legend>
            <label className={radioRow}>
              <input type="radio" name="export-path" className="size-5" checked={filmPath === "turn"} onChange={() => setPath("turn")} />
              Un tour complet
            </label>
            <label className={radioRow + (hasPath ? "" : " opacity-60")}>
              <input
                type="radio"
                name="export-path"
                className="size-5"
                checked={filmPath === "views"}
                disabled={!hasPath}
                aria-describedby={hasPath ? undefined : "export-path-hint"}
                onChange={() => {
                  setPath("views");
                  if (api) setSeconds(naturalFilmSeconds(api, "views"));
                }}
              />
              Le parcours des vues
            </label>
            {hasPath ? null : (
              <p id="export-path-hint" className="text-base text-mist">
                Enregistrez au moins deux vues de caméra pour faire ce film.
              </p>
            )}
          </fieldset>
          <label className="block text-base text-bone">
            Durée : <span className="text-white">{seconds} s</span>
            <input type="range" min={FILM_SECONDS.min} max={FILM_SECONDS.max} step={1} value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} className="mt-2 block min-h-12 w-full accent-rose-light" />
          </label>
          <fieldset className="grid gap-1">
            <legend className="text-base text-white">Qualité</legend>
            <div className="flex flex-wrap gap-x-6">
              <label className={radioRow}>
                <input type="radio" name="export-quality" className="size-5" checked={quality === "1080p"} onChange={() => setQuality("1080p")} />
                1080p (Full HD)
              </label>
              <label className={radioRow}>
                <input type="radio" name="export-quality" className="size-5" checked={quality === "4k"} onChange={() => setQuality("4k")} />
                4K
              </label>
            </div>
            {quality === "4k" ? <p className="text-base text-mist">Un film en 4K prend plusieurs minutes à fabriquer.</p> : null}
          </fieldset>
          <fieldset className="grid gap-1">
            <legend className="text-base text-white">Format</legend>
            <div className="flex flex-wrap gap-x-6">
              {SHAPES.map((s) => (
                <label key={s.id} className={radioRow}>
                  <input type="radio" name="export-shape" className="size-5" checked={shape === s.id} onChange={() => setShape(s.id)} />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>
          {busy === "film" ? (
            <Progress label="Film" value={progress} onStop={stop} />
          ) : (
            <>
              <button type="button" onClick={onFilm} disabled={!api || busy !== null} className={btnMain + " justify-self-start"} data-export-film>
                <Film className="size-4" aria-hidden="true" /> Exporter le film
              </button>
              <Result outcome={outcomes.film} />
            </>
          )}
        </Section>

        <Section title="Rendu en série" icon={<Images className="size-5" aria-hidden="true" />} data="series">
          <p className="text-base text-mist">Chaque vue cochée dans chaque métal coché, toutes les images dans un seul fichier .zip.</p>
          <fieldset className="grid gap-1">
            <legend className="text-base text-white">Vues</legend>
            {views.length === 0 ? (
              <p className="text-base text-mist">Aucune vue enregistrée : la série prend la caméra telle qu'elle est.</p>
            ) : (
              <div className="flex flex-wrap gap-x-6">
                {views.map((v, i) => (
                  <label key={v.id} className={radioRow}>
                    <input
                      type="checkbox"
                      className="size-5"
                      checked={!offViews.has(v.id)}
                      onChange={(e) => {
                        const next = new Set(offViews);
                        if (e.target.checked) next.delete(v.id);
                        else next.add(v.id);
                        setOffViews(next);
                      }}
                    />
                    {v.name || "Vue " + (i + 1)}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          {metals.length > 0 ? (
            <fieldset className="grid gap-1">
              <legend className="text-base text-white">Métaux</legend>
              <div className="flex flex-wrap gap-x-6">
                {metals.map((m) => (
                  <label key={m} className={radioRow}>
                    <input
                      type="checkbox"
                      className="size-5"
                      checked={!offMetals.has(m)}
                      onChange={(e) => {
                        const next = new Set(offMetals);
                        if (e.target.checked) next.delete(m);
                        else next.add(m);
                        setOffMetals(next);
                      }}
                    />
                    {metalNames[m] ?? m}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <FormatPicker id="export-series-format" value={seriesFormat} onChange={setSeriesFormat} />
          <SizePicker id="export-series-size" value={seriesSize} onChange={setSeriesSize} />
          <Transparent checked={seriesClear} format={seriesFormat} onChange={setSeriesClear} />
          {busy === "series" ? (
            <Progress label="Série" value={progress} onStop={stop} />
          ) : (
            <>
              <p className="text-base text-bone">{seriesReady ? seriesCount + (seriesCount > 1 ? " images." : " image.") : "Cochez au moins une vue et un métal."}</p>
              <button type="button" onClick={onSeries} disabled={!api || busy !== null || !seriesReady || !sizeValid(seriesSize)} className={btnMain + " justify-self-start"} data-export-series>
                <Images className="size-4" aria-hidden="true" /> Tout exporter (zip)
              </button>
              <Result outcome={outcomes.series} />
            </>
          )}
        </Section>

        {onExportGlb ? (
          <Section title="Fichier 3D (.glb)" icon={<Package className="size-5" aria-hidden="true" />} data="glb">
            <p className="text-base text-mist">Le bijou en fichier 3D, avec ses métaux et ses pierres, à ouvrir dans un autre logiciel ou à envoyer à un partenaire.</p>
            <button type="button" onClick={onGlb} disabled={!api || busy !== null} className={btnMain + " justify-self-start"} data-export-glb>
              {busy === "glb" ? spinner : <Package className="size-4" aria-hidden="true" />} {busy === "glb" ? "Fichier en cours…" : "Exporter le fichier 3D"}
            </button>
            {busy === "glb" ? null : <Result outcome={outcomes.glb} />}
          </Section>
        ) : null}
      </div>
    </section>
  );
}
