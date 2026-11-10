import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft, Check, Copy, Eye, EyeOff, LoaderCircle, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { AMBIANCES, BACKGROUNDS, LAYER_ROLES, METALS, type LayerRole, type LayerSetting, type ModelSettings, type PublicModel } from "@/data/models";
import { bundleOf, loadLocale, useI18n, type Messages } from "@/i18n";
import { Jewel3D, type ViewerHandle } from "@/viewer";

/*
 * Admin "3D": send a model of the jeweller (.3dm, .glb, .stl, up to 800 MB,
 * sent in pieces), follow its processing, give each layer its role, choose
 * the metals offered and the first view, attach it to a piece or make a
 * private link for a client. In French, for the owner.
 */

type LayerInfo = { name: string; meshes: number; copies: number; triangles: number; size: [number, number, number]; guess: LayerRole; check: boolean };
type StoneCount = { material: string; count: number; triangles: number; size: string; known: boolean };
type Stats = { kind?: string; sourceTriangles?: number; pieces?: number; unaligned?: number; size?: [number, number, number]; stones?: StoneCount[]; stonesMissing?: boolean; seconds?: number; versions?: Record<"full" | "light", { bytes: number; triangles: number; drawn: number }> };
type LinkRow = { id: string; token: string; title: string; expiresAt: string | null; hasPassword: boolean; createdAt: string };
type ModelRow = {
  id: string;
  name: string;
  sourceName: string;
  sourceKind: string;
  status: "queued" | "processing" | "ready" | "failed";
  progress: number;
  step: string;
  error: string | null;
  sizes: { original?: number; full?: number; light?: number };
  stats: Stats;
  layers: LayerInfo[];
  settings: ModelSettings;
  pieceSlug: string | null;
  preview: PublicModel | null;
  links: LinkRow[];
};

const ROLE_NAMES: Record<LayerRole, string> = { metal: "Métal", diamond: "Diamant", stone: "Pierre de couleur", enamel: "Émail", hide: "Masquer" };
const METAL_NAMES: Record<string, string> = { "yellow-gold": "Or jaune 18 carats", "white-gold": "Or blanc 18 carats", "rose-gold": "Or rose 18 carats", platinum: "Platine", "black-rhodium": "Rhodium noir" };
const AMBIANCE_NAMES: Record<string, string> = { studio: "Studio", warm: "Chaude", spotlight: "Projecteur (scintillement)" };
const BACKGROUND_NAMES: Record<string, string> = { "studio-dark": "Studio sombre", black: "Noir", "studio-light": "Studio clair", white: "Blanc", rose: "Rosé", wood: "Table en noyer", velvet: "Velours noir", satin: "Satin champagne", leather: "Cuir blanc" };
const STEP_NAMES: Record<string, string> = { read: "lecture du fichier", pieces: "pièces et pierres", full: "version ordinateur", light: "version téléphone" };

const inputCls = "mt-2 block min-h-12 w-full border border-white/30 bg-ink px-4 text-base text-white focus:border-rose-light focus:outline-none";
const btn = "inline-flex min-h-12 items-center justify-center gap-2 border border-white/30 px-5 text-base font-semibold text-white hover:border-rose-light hover:text-rose-light disabled:opacity-50";
const btnMain = "inline-flex min-h-12 items-center justify-center gap-2 bg-white px-6 text-base font-semibold text-ink hover:bg-rose-light disabled:opacity-60";
const iconBtn = "inline-flex size-12 shrink-0 items-center justify-center border border-white/30 text-white hover:border-rose-light hover:text-rose-light";

function mb(bytes: number | undefined): string {
  if (!bytes) return "–";
  return bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1).replace(".", ",") + " Mo" : Math.max(1, Math.round(bytes / 1024)) + " Ko";
}

function count(n: number | undefined): string {
  return n === undefined ? "–" : n.toLocaleString("fr-FR");
}

async function call(token: string, method: string, url: string, body?: unknown): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { Authorization: "Bearer " + token, Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401) throw new Error("expired");
  if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Une erreur est survenue, réessayez.");
  return json;
}

/** Sends a big file in pieces of a few MB; a piece that fails is sent again. */
async function sendFile(token: string, file: File, onProgress: (fraction: number) => void): Promise<string> {
  const start = await call(token, "POST", "/api/admin/models/uploads", { name: file.name, size: file.size });
  const uploadId = String(start.uploadId);
  const chunk = Number(start.chunkBytes) || 8 * 1024 * 1024;
  let offset = 0;
  let failures = 0;
  while (offset < file.size) {
    const piece = file.slice(offset, Math.min(file.size, offset + chunk));
    const res = await fetch("/api/admin/models/uploads/" + uploadId + "?offset=" + offset, { method: "PUT", headers: { Authorization: "Bearer " + token, "Content-Type": "application/octet-stream" }, body: piece }).catch(() => null);
    if (res && res.ok) {
      offset = Number(((await res.json()) as { received: number }).received);
      failures = 0;
    } else if (res && res.status === 409) {
      offset = Number(((await res.json()) as { received: number }).received);
    } else {
      if (res && res.status === 401) throw new Error("expired");
      if (++failures > 4) throw new Error("L'envoi a échoué, vérifiez la connexion et recommencez.");
      await new Promise((r) => setTimeout(r, 1000 * failures));
    }
    onProgress(offset / file.size);
  }
  const done = await call(token, "POST", "/api/admin/models/uploads/" + uploadId + "/complete", { name: file.name, size: file.size });
  return String(done.id);
}

function Bar({ value }: { value: number }) {
  return (
    <span className="mt-2 block h-1 w-full bg-white/10" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <span className="block h-1 bg-rose-gold transition-[width] duration-500" style={{ width: Math.max(2, value) + "%" }} />
    </span>
  );
}

function StonesTable({ stats }: { stats: Stats }) {
  const stones = stats.stones ?? [];
  if (stats.stonesMissing) return <p role="note" className="border border-rose-light/50 p-4 text-base text-rose-light" data-stones-missing>Les pierres sont fondues dans le métal ou absentes de ce fichier : envoyez le .3dm pour un rendu complet.</p>;
  if (stones.length === 0) return null;
  const total = stones.reduce((s, x) => s + x.count, 0);
  return (
    <div>
      <p className="text-base text-bone">Pierres détectées : {count(total)}</p>
      <ul className="mt-2 grid gap-1 text-base text-mist sm:grid-cols-2" data-stones>
        {stones.map((s) => (
          <li key={s.material}>
            <span className="text-white">{count(s.count)}</span> × {s.material.startsWith("stone_round") ? "rondes" : "fantaisie"} {s.size.replace("x", " × ").replace("mm", " mm")}
            {!s.known ? <span className="ml-2 text-rose-light">(à vérifier)</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Weights({ m }: { m: ModelRow }) {
  const v = m.stats.versions;
  return (
    <p className="text-base text-mist" data-weights>
      Original <span className="text-white">{mb(m.sizes.original)}</span> · ordinateur <span className="text-white">{mb(m.sizes.full)}</span> · téléphone <span className="text-white">{mb(m.sizes.light)}</span>
      {v && m.stats.seconds !== undefined ? <> · prêt en {String(m.stats.seconds).replace(".", ",")} s</> : null}
    </p>
  );
}

/* ---------- The list ---------- */

export default function Models3D({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [items, setItems] = useState<ModelRow[] | null>(null);
  const [err, setErr] = useState("");
  const [sending, setSending] = useState<{ name: string; fraction: number } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await call(token, "GET", "/api/admin/models");
      setItems((res.items as ModelRow[]) ?? []);
    } catch (x) {
      if (x instanceof Error && x.message === "expired") onExpired();
      else setErr(x instanceof Error ? x.message : "Chargement impossible.");
    }
  }, [token, onExpired]);

  useEffect(() => {
    let alive = true;
    call(token, "GET", "/api/admin/models")
      .then((res) => alive && setItems((res.items as ModelRow[]) ?? []))
      .catch((x: unknown) => {
        if (!alive) return;
        if (x instanceof Error && x.message === "expired") onExpired();
        else setErr(x instanceof Error ? x.message : "Chargement impossible.");
      });
    return () => {
      alive = false;
    };
  }, [token, onExpired]);

  // While a model is being processed, its progress is read again.
  const busy = items?.some((m) => m.status === "queued" || m.status === "processing") ?? false;
  useEffect(() => {
    if (!busy) return undefined;
    const timer = window.setInterval(() => void load(), 1500);
    return () => window.clearInterval(timer);
  }, [busy, load]);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    setSending({ name: file.name, fraction: 0 });
    try {
      await sendFile(token, file, (fraction) => setSending({ name: file.name, fraction }));
      await load();
    } catch (x) {
      if (x instanceof Error && x.message === "expired") return onExpired();
      setErr(x instanceof Error ? x.message : "Envoi impossible.");
    } finally {
      setSending(null);
    }
  };

  const remove = async (m: ModelRow) => {
    if (!window.confirm("Supprimer le modèle « " + m.name + " », ses liens privés et ses fichiers ? Cette action est définitive.")) return;
    try {
      await call(token, "DELETE", "/api/admin/models/" + m.id);
      await load();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Suppression impossible.");
    }
  };

  if (open) return <Editor id={open} token={token} onExpired={onExpired} onClose={() => (setOpen(null), void load())} />;

  return (
    <div className="mt-8 grid gap-8" data-admin-3d>
      <div className="border border-white/15 p-5 sm:p-6">
        <h2 className="title-caps text-2xl tracking-[0.12em]">Envoyer un modèle 3D</h2>
        <p className="mt-2 text-base text-mist">.3dm (le mieux), .glb ou .stl, jusqu'à 800 Mo.</p>
        <label className={btnMain + " mt-4 cursor-pointer"}>
          {sending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
          Choisir un fichier
          <input type="file" accept=".3dm,.glb,.stl" onChange={onFile} className="sr-only" disabled={sending !== null} data-model-input />
        </label>
        {sending ? (
          <div className="mt-4">
            <p className="text-base text-bone">Envoi de {sending.name} : {Math.round(sending.fraction * 100)} %</p>
            <Bar value={sending.fraction * 100} />
          </div>
        ) : null}
        {err ? <p role="alert" className="mt-4 text-base text-rose-light">{err}</p> : null}
      </div>

      {items === null ? (
        <p className="flex items-center gap-3 text-bone"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Chargement</p>
      ) : items.length === 0 ? (
        <p className="border border-white/15 p-8 text-center text-bone">Aucun modèle pour l'instant.</p>
      ) : (
        <ul className="border-t border-white/15">
          {items.map((m) => (
            <li key={m.id} className="grid gap-3 border-b border-white/15 py-5" data-model-row={m.sourceName} data-status={m.status}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="break-words text-lg text-white">{m.name}</p>
                  <p className="text-base text-mist">
                    {m.sourceName}
                    {m.pieceSlug ? " · sur la pièce /" + m.pieceSlug : ""}
                    {m.links.length > 0 ? " · " + m.links.length + (m.links.length > 1 ? " liens privés" : " lien privé") : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {m.status === "ready" ? (
                    <button type="button" className={btn} onClick={() => setOpen(m.id)} data-open-model>
                      Régler le modèle
                    </button>
                  ) : null}
                  <button type="button" aria-label="Supprimer" className={iconBtn} onClick={() => void remove(m)}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              {m.status === "queued" || m.status === "processing" ? (
                <div>
                  <p className="text-base text-bone">
                    {m.status === "queued" ? "En attente…" : "Optimisation : " + m.progress + " % (" + (STEP_NAMES[m.step] ?? m.step) + ")"}
                  </p>
                  <Bar value={m.progress} />
                </div>
              ) : null}
              {m.status === "failed" ? <p role="alert" className="text-base text-rose-light">Échec du traitement : {m.error}</p> : null}
              {m.status === "ready" ? (
                <>
                  <Weights m={m} />
                  <StonesTable stats={m.stats} />
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- One model: layers, metals, view, piece, links ---------- */

function Editor({ id, token, onExpired, onClose }: { id: string; token: string; onExpired: () => void; onClose: () => void }) {
  const { t } = useI18n();
  const [model, setModel] = useState<ModelRow | null>(null);
  const [name, setName] = useState("");
  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [pieceSlug, setPieceSlug] = useState("");
  const [pieces, setPieces] = useState<{ slug: string; title: string }[]>([]);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [words, setWords] = useState<Messages["viewer"]>(t.viewer);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const viewer = useRef<ViewerHandle>(null);

  const fail = useCallback(
    (x: unknown) => {
      if (x instanceof Error && x.message === "expired") onExpired();
      else setErr(x instanceof Error ? x.message : "Une erreur est survenue.");
    },
    [onExpired],
  );

  const load = useCallback(async () => {
    try {
      const m = (await call(token, "GET", "/api/admin/models/" + id)) as unknown as ModelRow;
      setModel(m);
      return m;
    } catch (x) {
      fail(x);
      return null;
    }
  }, [id, token, fail]);

  useEffect(() => {
    call(token, "GET", "/api/admin/models/" + id)
      .then((res) => {
        const m = res as unknown as ModelRow;
        setModel(m);
        setName(m.name);
        setSettings(m.settings);
        setPieceSlug(m.pieceSlug ?? "");
      })
      .catch(fail);
    call(token, "GET", "/api/admin/pieces")
      .then((res) => setPieces(((res.items as { slug: string; title: string }[]) ?? []).map((p) => ({ slug: p.slug, title: p.title }))))
      .catch(() => undefined);
    // The viewer speaks French here.
    loadLocale("fr")
      .then(() => setWords(bundleOf("fr").ui.viewer))
      .catch(() => undefined);
  }, [id, token, fail]);

  if (!model || !settings) return <p className="mt-8 flex items-center gap-3 text-bone"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Chargement</p>;

  const setLayer = (layer: string, patch: Partial<LayerSetting>) => setSettings((s) => (s ? { ...s, layers: { ...s.layers, [layer]: { ...(s.layers[layer] ?? { role: "metal" }), ...patch } } } : s));

  const save = async (extra?: Partial<ModelSettings>) => {
    setSaving(true);
    setErr("");
    setNote("");
    try {
      const next = { ...settings, ...extra };
      await call(token, "PUT", "/api/admin/models/" + id, { name, settings: next, pieceSlug: pieceSlug || null });
      setSettings(next);
      setNote("Enregistré.");
      await load();
    } catch (x) {
      fail(x);
    } finally {
      setSaving(false);
    }
  };

  // "Save this view": the camera place, and a still image shown while the model loads.
  const saveView = async () => {
    const view = viewer.current?.getView();
    if (!view) return;
    const png = viewer.current?.capture();
    if (png) {
      try {
        const img = new Image();
        img.src = png;
        await img.decode();
        const scale = Math.min(1, 1200 / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
        if (blob) await fetch("/api/admin/models/" + id + "/poster", { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "image/webp" }, body: blob });
      } catch {
        /* the view is saved without its image */
      }
    }
    await save({ view });
  };

  const preview = model.preview;
  return (
    <div className="mt-8 grid gap-8" data-model-editor={model.sourceName}>
      <button type="button" onClick={onClose} className={btn + " justify-self-start"}>
        <ArrowLeft className="size-4" aria-hidden="true" /> Revenir aux modèles
      </button>
      <div className="grid gap-3">
        <label className="block text-base text-bone">
          Nom du modèle
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </label>
        <Weights m={model} />
        <StonesTable stats={model.stats} />
      </div>

      {preview ? <Jewel3D ref={viewer} model={preview} words={words} settings={settings} highlight={highlight} eager /> : null}

      {/* Layers */}
      <fieldset className="border border-white/15 p-4 sm:p-5">
        <legend className="px-2 text-base text-bone">Matières</legend>
        <p className="text-base text-mist">Choisissez le rôle de chaque calque. « Voir seul » montre un calque.</p>
        <ul className="mt-4 grid gap-4">
          {model.layers.map((layer) => {
            const s = settings.layers[layer.name] ?? { role: layer.guess };
            const solo = highlight === layer.name;
            return (
              <li key={layer.name} className={"grid gap-3 border p-4 " + (solo ? "border-rose-light" : "border-white/10")} data-layer={layer.name}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="min-w-0 break-words text-base text-white">
                    {layer.name}
                    {layer.check ? <span className="ml-3 inline-block border border-rose-light/60 px-2 text-base text-rose-light">À vérifier</span> : null}
                    <span className="block text-mist">
                      {count(layer.copies)} {layer.copies > 1 ? "exemplaires" : "exemplaire"} · proposé : {ROLE_NAMES[layer.guess]}
                    </span>
                  </p>
                  <button type="button" className={btn} aria-pressed={solo} onClick={() => setHighlight(solo ? null : layer.name)}>
                    {solo ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />} {solo ? "Tout voir" : "Voir seul"}
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block text-base text-bone">
                    Rôle
                    <select value={s.role} onChange={(e) => setLayer(layer.name, { role: e.target.value as LayerRole })} className={inputCls} data-role-select>
                      {LAYER_ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_NAMES[r]}</option>
                      ))}
                    </select>
                  </label>
                  {s.role === "metal" ? (
                    <>
                      <label className="block text-base text-bone">
                        Métal de départ
                        <select value={s.metal ?? "rose-gold"} onChange={(e) => setLayer(layer.name, { metal: e.target.value as LayerSetting["metal"] })} className={inputCls}>
                          {METALS.map((m) => (
                            <option key={m} value={m}>{METAL_NAMES[m]}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-base text-bone">
                        Nom pour le client
                        <input value={s.label ?? ""} placeholder="ex. Maillons" onChange={(e) => setLayer(layer.name, { label: e.target.value })} className={inputCls + " placeholder:text-mist/60"} />
                      </label>
                    </>
                  ) : null}
                  {s.role === "stone" || s.role === "enamel" ? (
                    <label className="block text-base text-bone">
                      Couleur
                      <input type="color" value={s.color ?? "#9b111e"} onChange={(e) => setLayer(layer.name, { color: e.target.value })} className={inputCls + " cursor-pointer px-2"} />
                    </label>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {/* Metals, lighting, background, piece */}
      <fieldset className="grid gap-5 border border-white/15 p-4 sm:p-5">
        <legend className="px-2 text-base text-bone">Présentation</legend>
        <div>
          <p className="text-base text-bone">Métaux proposés au client</p>
          <div className="mt-2 flex flex-wrap gap-x-6">
            {METALS.map((m) => (
              <label key={m} className="flex min-h-12 items-center gap-3 text-base text-bone">
                <input type="checkbox" className="size-5" checked={settings.metals.includes(m)} onChange={(e) => setSettings({ ...settings, metals: e.target.checked ? [...settings.metals, m] : settings.metals.filter((x) => x !== m) })} />
                {METAL_NAMES[m]}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-base text-bone">
            Lumière de départ
            <select value={settings.ambiance} onChange={(e) => setSettings({ ...settings, ambiance: e.target.value as ModelSettings["ambiance"] })} className={inputCls}>
              {AMBIANCES.map((a) => (
                <option key={a} value={a}>{AMBIANCE_NAMES[a]}</option>
              ))}
            </select>
          </label>
          <label className="block text-base text-bone">
            Fond de départ
            <select value={settings.background} onChange={(e) => setSettings({ ...settings, background: e.target.value as ModelSettings["background"] })} className={inputCls}>
              {BACKGROUNDS.map((b) => (
                <option key={b} value={b}>{BACKGROUND_NAMES[b]}</option>
              ))}
            </select>
          </label>
          <label className="block text-base text-bone">
            Afficher sur la page d'une pièce
            <select value={pieceSlug} onChange={(e) => setPieceSlug(e.target.value)} className={inputCls} data-piece-select>
              <option value="">Aucune</option>
              {pieces.map((p) => (
                <option key={p.slug} value={p.slug}>{p.title}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={() => void saveView()} disabled={saving} className={btn} data-save-view>
            Enregistrer la vue
          </button>
          {settings.view ? (
            <button type="button" onClick={() => void save({ view: null })} disabled={saving} className={btn}>
              Effacer la vue
            </button>
          ) : null}
          <button type="button" onClick={() => void save()} disabled={saving} className={btnMain} data-save-model>
            {saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />} Enregistrer
          </button>
          <button type="button" onClick={() => void call(token, "POST", "/api/admin/models/" + id + "/reprocess").then(onClose, fail)} className={btn}>
            <RefreshCw className="size-4" aria-hidden="true" /> Relancer l'optimisation
          </button>
        </div>
        {note ? <p role="status" className="text-base text-bone">{note}</p> : null}
        {err ? <p role="alert" className="text-base text-rose-light">{err}</p> : null}
      </fieldset>

      <ShareVip model={model} token={token} onError={fail} />
      <Links model={model} token={token} onChange={() => void load()} onError={fail} />
    </div>
  );
}

/** The VIP clients who see this model in their private space. */
function ShareVip({ model, token, onError }: { model: ModelRow; token: string; onError: (x: unknown) => void }) {
  const [clients, setClients] = useState<{ id: string; name: string; email: string | null; phone: string | null; modelIds: string[] }[] | null>(null);
  useEffect(() => {
    let alive = true;
    call(token, "GET", "/api/admin/clients")
      .then((res) => alive && setClients((res.items as typeof clients) ?? []))
      .catch((x: unknown) => alive && onError(x));
    return () => {
      alive = false;
    };
  }, [token, onError]);
  const toggle = async (id: string) => {
    const client = clients?.find((c) => c.id === id);
    if (!client || !clients) return;
    const modelIds = client.modelIds.includes(model.id) ? client.modelIds.filter((m) => m !== model.id) : [...client.modelIds, model.id];
    setClients(clients.map((c) => (c.id === id ? { ...c, modelIds } : c)));
    try {
      await call(token, "PUT", "/api/admin/clients/" + id, { name: client.name, email: client.email, phone: client.phone, modelIds });
    } catch (x) {
      onError(x);
    }
  };
  return (
    <fieldset className="grid gap-4 border border-white/15 p-4 sm:p-5" data-share-vip>
      <legend className="px-2 text-base text-bone">Partager dans l'espace VIP</legend>
      <p className="text-base text-mist">Cochez les clients qui voient cette pièce dans leur espace privé.</p>
      {clients === null ? null : clients.length === 0 ? (
        <p className="text-base text-mist">Ajoutez d'abord un client dans l'onglet Clients VIP.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {clients.map((c) => (
            <li key={c.id}>
              <label className="flex min-h-12 items-center gap-3 border border-white/10 px-3 text-base text-white">
                <input type="checkbox" className="size-5" checked={c.modelIds.includes(model.id)} onChange={() => void toggle(c.id)} />
                {c.name}
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

function Links({ model, token, onChange, onError }: { model: ModelRow; token: string; onChange: () => void; onError: (x: unknown) => void }) {
  const [title, setTitle] = useState(model.name);
  const [expires, setExpires] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [now] = useState(() => Date.now());
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      // The link works until the end of the chosen day (Dubai time is close enough to the browser's).
      const expiresAt = expires ? new Date(expires + "T23:59:59").toISOString() : null;
      await call(token, "POST", "/api/admin/models/" + model.id + "/links", { title, expiresAt, password: password || null });
      setPassword("");
      onChange();
    } catch (x) {
      onError(x);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (link: LinkRow) => {
    const url = origin + "/view/" + link.token;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copiez le lien :", url);
    }
    setCopied(link.id);
    window.setTimeout(() => setCopied(""), 2000);
  };

  const remove = async (link: LinkRow) => {
    if (!window.confirm("Supprimer ce lien ? Le client ne pourra plus voir la pièce.")) return;
    try {
      await call(token, "DELETE", "/api/admin/links/" + link.id);
      onChange();
    } catch (x) {
      onError(x);
    }
  };

  return (
    <fieldset className="grid gap-5 border border-white/15 p-4 sm:p-5" data-links>
      <legend className="px-2 text-base text-bone">Partager par lien</legend>
      <p className="text-base text-mist">Envoyez ce lien à un client : il voit la pièce en 3D, sans compte.</p>
      <form onSubmit={create} className="grid gap-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <label className="block text-base text-bone">
          Titre pour le client
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </label>
        <label className="block text-base text-bone">
          Expire le (facultatif)
          <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={inputCls} />
        </label>
        <label className="block text-base text-bone">
          Mot de passe (facultatif)
          <input type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </label>
        <button type="submit" disabled={busy} className={btnMain} data-create-link>
          <Plus className="size-4" aria-hidden="true" /> Créer le lien
        </button>
      </form>
      {model.links.length > 0 ? (
        <ul className="border-t border-white/15">
          {model.links.map((link) => {
            const expired = link.expiresAt !== null && new Date(link.expiresAt).getTime() < now;
            return (
              <li key={link.id} className="flex flex-wrap items-center gap-3 border-b border-white/15 py-3" data-link={link.token}>
                <span className="min-w-0 flex-1 text-base">
                  <span className="block break-words text-white">{link.title || model.name}</span>
                  <span className="block break-all text-mist">{origin}/view/{link.token}</span>
                  <span className={"block " + (expired ? "text-rose-light" : "text-mist")}>
                    {link.expiresAt ? (expired ? "Expiré le " : "Expire le ") + new Date(link.expiresAt).toLocaleDateString("fr-FR") : "Sans date d'expiration"}
                    {link.hasPassword ? " · avec mot de passe" : ""}
                  </span>
                </span>
                <button type="button" className={btn} onClick={() => void copy(link)}>
                  {copied === link.id ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />} {copied === link.id ? "Copié" : "Copier le lien"}
                </button>
                <button type="button" aria-label="Supprimer le lien" className={iconBtn} onClick={() => void remove(link)}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </fieldset>
  );
}
