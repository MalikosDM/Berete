import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, Check, ChevronDown, Code2, Copy, LoaderCircle, Plus, RefreshCw, Rotate3d, Trash2, Undo2, Upload } from "lucide-react";
import type { LayerRole, ModelSettings, PublicModel } from "@/data/models";
import type { ViewerHandle } from "@/viewer";
import type { StageApi } from "@/viewer/Stage";
import Editor3D from "./editor3d/Editor3D";
import type { EditorTools } from "./editor3d/Confort";
import { useHistory } from "./editor3d/history";
import SealedShare from "./SealedShare";
import { adminCall as call, btn, btnMain, iconBtn, inputCls } from "./ui";

/*
 * Admin "3D": send a model of the jeweller (.3dm, .glb, .gltf, .obj, .stl, up to
 * 800 MB, sent in pieces), follow its processing, put it on the page of a piece
 * (one model per piece), give each layer its role, choose the metals offered and
 * the first view, share it with VIP clients or by a private link. In French,
 * for the owner. A model with volumes missing (a .3dm saved without its render
 * meshes) is "incomplete": a draft, shown here with a warning, never on the site.
 */

type LayerInfo = { name: string; meshes: number; copies: number; triangles: number; size: [number, number, number]; guess: LayerRole; check: boolean };
type StoneCount = { material: string; count: number; triangles: number; size: string; known: boolean; fused?: boolean };
/** What a .3dm held and the model does not show (server/models/pipeline/read.ts). */
type Skipped = { noMesh: { breps: number; extrusions: number; subds: number; layers: string[] }; stray: { count: number; names: string[] }; hidden: number; drawings: number };
type Stats = {
  kind?: string;
  sourceTriangles?: number;
  pieces?: number;
  unaligned?: number;
  size?: [number, number, number];
  stones?: StoneCount[];
  stonesMissing?: boolean;
  skipped?: Skipped;
  /** Volumes missing from the model: more than 0, it is a draft. */
  incomplete?: number;
  /** Volumes saved without render mesh, meshed by the site. */
  tessellated?: number;
  /** What the admin should know, in simple French. */
  notes?: string[];
  checks?: { triangles: number; tooMany: boolean; units: { label: string }; flipped: number; instanced: number; copies: number };
  seconds?: number;
  versions?: Record<"full" | "light", { bytes: number; triangles: number; drawn: number }>;
};
type LinkRow = { id: string; token: string; title: string; expiresAt: string | null; hasPassword: boolean; createdAt: string };
type ModelRow = {
  id: string;
  name: string;
  sourceName: string;
  sourceKind: string;
  status: "queued" | "processing" | "ready" | "incomplete" | "failed";
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

const STEP_NAMES: Record<string, string> = { read: "lecture du fichier", pieces: "pièces et pierres", full: "version ordinateur", light: "version téléphone" };


function mb(bytes: number | undefined): string {
  if (!bytes) return "–";
  return bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(1).replace(".", ",") + " Mo" : Math.max(1, Math.round(bytes / 1024)) + " Ko";
}

function count(n: number | undefined): string {
  return n === undefined ? "–" : n.toLocaleString("fr-FR");
}

type PieceChoice = { slug: string; title: string };

/** Sends the image of the viewer as the still image of the model (WebP, 1200 px wide at most). */
async function sendPoster(token: string, id: string, viewer: ViewerHandle | null): Promise<boolean> {
  const png = viewer?.capture();
  if (!png) return false;
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
    if (!blob) return false;
    const res = await fetch("/api/admin/models/" + id + "/poster", { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "image/webp" }, body: blob });
    return res.ok;
  } catch {
    return false;
  }
}

/** The pieces of the site, in the order of the admin, to choose where a model is shown. */
async function piecesOf(token: string): Promise<PieceChoice[]> {
  const res = await call(token, "GET", "/api/admin/pieces");
  return ((res.items as PieceChoice[]) ?? []).map((p) => ({ slug: p.slug, title: p.title }));
}

/** Puts a model on the page of a piece (the model the piece had leaves it), or takes it off ("" ). */
async function showOnPiece(token: string, model: { id: string; pieceSlug: string | null }, slug: string): Promise<void> {
  if (slug) await call(token, "PUT", "/api/admin/pieces/" + encodeURIComponent(slug) + "/model", { modelId: model.id });
  else if (model.pieceSlug) await call(token, "PUT", "/api/admin/pieces/" + encodeURIComponent(model.pieceSlug) + "/model", { modelId: null });
}

/** The still image of a model, or a 3D mark while it has none. */
function Poster({ m, className }: { m: { preview: PublicModel | null }; className: string }) {
  return (
    <span className={"flex items-center justify-center overflow-hidden bg-ink-soft " + className}>
      {m.preview?.poster ? <img src={m.preview.poster} alt="" className="h-full w-full object-cover" /> : <Rotate3d className="size-7 text-mist" aria-hidden="true" />}
    </span>
  );
}

/** Where a model is shown: the select of the pieces, and a link to the page. */
function PieceSelect({ value, pieces, onChange, busy }: { value: string; pieces: PieceChoice[]; onChange: (slug: string) => void; busy?: boolean }) {
  return (
    <label className="block text-base text-bone">
      Page du site où il apparaît
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={busy} className={inputCls} data-piece-select>
        <option value="">Aucune (pas encore sur le site)</option>
        {pieces.map((p) => (
          <option key={p.slug} value={p.slug}>{p.title}</option>
        ))}
      </select>
    </label>
  );
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
          <li key={s.material + (s.fused ? " fused" : "")}>
            <span className="text-white">{count(s.count)}</span> × {s.material.startsWith("stone_round") ? "rondes" : "fantaisie"} {s.size.replace("x", " × ").replace("mm", " mm")}
            {s.fused ? <span className="ml-2">(soudées au métal, reconstituées)</span> : null}
            {!s.known ? <span className="ml-2 text-rose-light">(à vérifier)</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** « 59 volumes de métal ignorés : … », for a .3dm saved without its render meshes. */
function missingText(n: number): string {
  return count(n) + (n > 1 ? " volumes n'ont pas pu être affichés" : " volume n'a pas pu être affiché") + " : dans Rhino, passer la vue en « Ombré », décocher « Enregistrer petit » (Save small) puis enregistrer ; ou exporter en .glb ou .obj";
}

/** An incomplete model: what is missing, and why it stays a draft. */
function IncompleteWarning({ stats }: { stats: Stats }) {
  return (
    <div role="alert" className="grid gap-1 border border-rose-light/60 p-4 text-base" data-model-incomplete={stats.incomplete ?? 0}>
      <p className="text-rose-light">{missingText(stats.incomplete ?? 0)}</p>
      <p className="text-mist">Modèle incomplet, gardé comme brouillon : il ne peut aller ni sur une page du site, ni dans l'espace VIP, ni dans un lien privé.</p>
    </div>
  );
}

/** For the jeweller's designer: how to save a Rhino file the way jewellers' viewers read it best. */
function RhinoHelp() {
  return (
    <details className="group mt-4" data-rhino-help>
      <summary className="inline-flex min-h-12 cursor-pointer list-none items-center gap-2 text-base text-bone hover:text-white">
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" /> Comment enregistrer un fichier Rhino pour la 3D
      </summary>
      <ol className="mt-2 grid list-decimal gap-1 ps-6 text-base text-mist">
        <li>Dans Rhino, passer la vue en mode « Ombré » (Shaded) : Rhino prépare les maillages de rendu.</li>
        <li>Menu Fichier, « Enregistrer sous » : décocher « Enregistrer petit » (Save small), qui les efface.</li>
        <li>Enregistrer. Ou bien exporter en .glb ou .obj.</li>
        <li>Conseils des joailliers : en millimètres, un calque par matière (« Metal 01 », « Gem 01 »…), un calque de pierres par taille, les pierres identiques en blocs, moins de 200 000 triangles.</li>
      </ol>
      <p className="mt-2 text-base text-mist">Sans maillages de rendu, le site maille lui-même les surfaces (cela marche sur les fichiers reçus jusqu'ici) ; un volume qu'il ne sait pas mailler est signalé ici.</p>
    </details>
  );
}

/** What the import found, in simple words (server/models/pipeline: notes and checks). */
function ImportNotes({ stats }: { stats: Stats }) {
  const notes = stats.notes ?? [];
  const c = stats.checks;
  if (notes.length === 0 && !c) return null;
  return (
    <div className="grid gap-1 text-base" data-import-notes>
      {c?.tooMany ? (
        <p className="text-rose-light" data-too-many>
          {count(c.triangles)} triangles : au-dessus des 200 000 conseillés. Le site en fait déjà des versions allégées pour l'affichage ({count(stats.versions?.full.triangles)} sur ordinateur, {count(stats.versions?.light.triangles)} sur téléphone) ; pour un fichier plus léger, le dessinateur peut simplifier les maillages dans Rhino.
        </p>
      ) : null}
      {c ? (
        <p className="text-mist">
          Unités : {c.units.label}
          {c.flipped > 0 ? " · " + count(c.flipped) + (c.flipped > 1 ? " pièces retournées (faces à l'envers), corrigées" : " pièce retournée (faces à l'envers), corrigée") : ""}
          {c.instanced > 0 ? " · " + count(c.copies) + " pierres identiques dessinées comme des copies" : ""}
        </p>
      ) : null}
      {notes.map((n) => (
        <p key={n} className="text-mist">
          {n}
        </p>
      ))}
    </div>
  );
}

/** What the file held and the model leaves out: volumes without render mesh, reference pictures, hidden objects, curves. */
function SkippedNotes({ stats }: { stats: Stats }) {
  const s = stats.skipped;
  if (!s) return null;
  const missing = s.noMesh.breps + s.noMesh.extrusions + s.noMesh.subds;
  const notes = [
    missing > 0 ? "Volumes sans maillage de rendu : " + count(missing) + (s.noMesh.layers.length ? " (calques " + s.noMesh.layers.join(", ") + ")" : "") : "",
    s.stray.count > 0 ? "Images de référence écartées (cadre plat avec une photo) : " + count(s.stray.count) : "",
    s.hidden > 0 ? "Objets masqués dans Rhino, laissés de côté : " + count(s.hidden) : "",
    s.drawings > 0 ? "Courbes, cotes et textes (jamais montrés) : " + count(s.drawings) : "",
  ].filter(Boolean);
  if (notes.length === 0) return null;
  return (
    <ul className="grid gap-1 text-base text-mist" data-skipped>
      {notes.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
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
  const [pieces, setPieces] = useState<PieceChoice[]>([]);
  const [placing, setPlacing] = useState<string | null>(null);
  const [placed, setPlaced] = useState<string | null>(null);

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
    piecesOf(token)
      .then((p) => alive && setPieces(p))
      .catch(() => undefined);
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

  // The page of the site where a model is shown, changed from the list (saved at once).
  const place = async (m: ModelRow, slug: string) => {
    setPlacing(m.id);
    setErr("");
    try {
      await showOnPiece(token, m, slug);
      await load();
      setPlaced(m.id);
      window.setTimeout(() => setPlaced((x) => (x === m.id ? null : x)), 2500);
    } catch (x) {
      if (x instanceof Error && x.message === "expired") return onExpired();
      setErr(x instanceof Error ? x.message : "Enregistrement impossible.");
    } finally {
      setPlacing(null);
    }
  };

  const titleOf = (slug: string) => pieces.find((p) => p.slug === slug)?.title ?? slug;

  if (open) return <Editor id={open} token={token} onExpired={onExpired} onClose={() => (setOpen(null), void load())} />;

  return (
    <div className="mt-8 grid gap-8" data-admin-3d>
      <div className="border border-white/15 p-5 sm:p-6">
        <h2 className="title-caps text-2xl tracking-[0.12em]">Envoyer un modèle 3D</h2>
        <p className="mt-2 text-base text-mist">.3dm (le mieux), .glb, .gltf, .fbx, .obj ou .stl, jusqu'à 800 Mo. Les calques nommés « Metal », « Metal 01 »… « Head » deviennent du métal, « Gem », « Gem 01 »… « Diamond » des diamants.</p>
        <RhinoHelp />
        <label className={btnMain + " mt-4 cursor-pointer"}>
          {sending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
          Choisir un fichier
          <input type="file" accept=".3dm,.glb,.gltf,.obj,.stl,.fbx" onChange={onFile} className="sr-only" disabled={sending !== null} data-model-input />
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
        // One card per model, with its image (25/11/2026: simpler for Yoni).
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((m) => (
            <li key={m.id} className="grid content-start gap-4 border border-white/15 p-4" data-model-row={m.sourceName} data-status={m.status} data-model-card>
              {m.status === "ready" || m.status === "incomplete" ? (
                <button type="button" onClick={() => setOpen(m.id)} aria-label={"Régler le modèle " + m.name} className="block">
                  <Poster m={m} className="aspect-square w-full" />
                </button>
              ) : (
                <Poster m={m} className="aspect-square w-full" />
              )}
              <div className="grid min-w-0 gap-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="break-words text-xl text-white">{m.name}</p>
                    {m.status === "ready" ? (
                      m.pieceSlug ? (
                        <a href={"/pieces/" + m.pieceSlug} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-12 items-center gap-2 text-base text-bone hover:text-rose-light" data-model-on-piece={m.pieceSlug}>
                          Sur la page « {titleOf(m.pieceSlug)} » <ArrowUpRight className="size-4" aria-hidden="true" />
                        </a>
                      ) : (
                        <p className="mt-1 text-base text-rose-light">Pas encore sur le site</p>
                      )
                    ) : m.status === "incomplete" ? (
                      <p className="mt-1 text-base text-rose-light">Brouillon incomplet : pas sur le site</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    {m.status === "ready" || m.status === "incomplete" ? (
                      <button type="button" className={btn} onClick={() => setOpen(m.id)} data-open-model>
                        {m.status === "ready" ? "Régler le modèle" : "Voir le brouillon"}
                      </button>
                    ) : null}
                    <button type="button" aria-label="Supprimer le modèle" className={iconBtn} onClick={() => void remove(m)}>
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
                {m.status === "incomplete" ? (
                  <>
                    <IncompleteWarning stats={m.stats} />
                    <details className="group">
                      <summary className="inline-flex min-h-12 cursor-pointer list-none items-center gap-2 text-base text-mist hover:text-white">
                        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" /> Détails techniques
                      </summary>
                      <div className="mt-2 grid gap-3">
                        <p className="text-base text-mist">Fichier : {m.sourceName}</p>
                        <ImportNotes stats={m.stats} />
                        <SkippedNotes stats={m.stats} />
                        <Weights m={m} />
                      </div>
                    </details>
                  </>
                ) : null}
                {m.status === "ready" ? (
                  <>
                    <div className="grid gap-2 sm:max-w-md">
                      <PieceSelect value={m.pieceSlug ?? ""} pieces={pieces} busy={placing === m.id} onChange={(slug) => void place(m, slug)} />
                      {placed === m.id ? <p role="status" className="text-base text-bone">Enregistré.</p> : null}
                    </div>
                    {m.stats.stonesMissing ? <p className="text-base text-mist" data-stones-missing>Pierres fondues dans le métal : envoyez le .3dm pour voir les diamants.</p> : null}
                    <details className="group">
                      <summary className="inline-flex min-h-12 cursor-pointer list-none items-center gap-2 text-base text-mist hover:text-white">
                        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" /> Détails techniques
                      </summary>
                      <div className="mt-2 grid gap-3">
                        <p className="text-base text-mist">Fichier : {m.sourceName}{m.links.length > 0 ? " · " + m.links.length + (m.links.length > 1 ? " liens privés" : " lien privé") : ""}</p>
                        <Weights m={m} />
                        <ImportNotes stats={m.stats} />
                        <SkippedNotes stats={m.stats} />
                        {!m.stats.stonesMissing ? <StonesTable stats={m.stats} /> : null}
                      </div>
                    </details>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- One model: layers, metals, view, piece, links ---------- */

function Editor({ id, token, onExpired, onClose }: { id: string; token: string; onExpired: () => void; onClose: () => void }) {
  const [model, setModel] = useState<ModelRow | null>(null);
  const [name, setName] = useState("");
  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [pieceSlug, setPieceSlug] = useState("");
  const [pieces, setPieces] = useState<PieceChoice[]>([]);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  // The stage of the editor: its image (still image of the model) and its camera (first view).
  const stage = useRef<StageApi | null>(null);
  const takeApi = useCallback((a: StageApi | null) => {
    stage.current = a;
  }, []);
  const viewer = useRef<ViewerHandle>({ getView: () => stage.current?.getView() ?? null, capture: () => stage.current?.capture() ?? null, isReady: () => Boolean(stage.current?.handles.jewel()), seek: () => undefined });
  // « Annuler »: back to the settings saved last.
  const [saved, setSaved] = useState<ModelSettings | null>(null);
  // « Annuler » / « Rétablir » every change of the editor (editor3d/history.ts, up to 100 steps), the settings shown
  // instead of the draft while « Comparer » draws the saved ones, and the time of the last save (« Versions » read again).
  const history = useHistory<ModelSettings>(settings, setSettings);
  const [shown, setShown] = useState<ModelSettings | null>(null);
  const [savedAt, setSavedAt] = useState(0);

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
        setSaved(m.settings);
        setPieceSlug(m.pieceSlug ?? "");
      })
      .catch(fail);
    piecesOf(token)
      .then(setPieces)
      .catch(() => undefined);
  }, [id, token, fail]);

  // A model without a still image gets one, from the first view, once drawn: the lists of the admin and the
  // page of the piece (while the model loads) show it.
  const noPoster = model !== null && model.preview !== null && model.preview.poster === null;
  useEffect(() => {
    if (!noPoster) return undefined;
    let done = false;
    let wait = 0;
    const timer = window.setInterval(() => {
      if (done || !viewer.current?.isReady()) return;
      done = true;
      window.clearInterval(timer);
      // Time for the progressive rendering to smooth the image.
      wait = window.setTimeout(() => {
        void sendPoster(token, id, viewer.current).then((sent) => sent && void load());
      }, 2500);
    }, 500);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(wait);
    };
  }, [noPoster, id, token, load]);

  if (!model || !settings) return <p className="mt-8 flex items-center gap-3 text-bone"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Chargement</p>;

  // An incomplete model (volumes missing): a draft, seen here only.
  const draft = model.status === "incomplete";

  const save = async (extra?: Partial<ModelSettings>) => {
    setSaving(true);
    setErr("");
    setNote("");
    try {
      const next = { ...settings, ...extra };
      // A draft never goes on a page of the site.
      await call(token, "PUT", "/api/admin/models/" + id, { name, settings: next, pieceSlug: draft ? null : pieceSlug || null });
      history.change(next);
      setSaved(next);
      setSavedAt(Date.now());
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
    await sendPoster(token, id, viewer.current);
    await save({ view });
  };

  const preview = model.preview;
  // The row above the editor (editor3d/Confort.tsx): undo / redo, compare, presets, versions, the page of the piece.
  const tools: EditorTools = {
    token,
    modelId: id,
    modelName: name.trim() || model.name,
    pieceSlug: draft ? null : model.pieceSlug,
    draft: settings,
    saved,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    put: history.change,
    show: setShown,
    save: () => void save(),
    saving,
    savedAt,
    onError: fail,
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 pb-28" data-model-editor={model.sourceName}>
      <button type="button" onClick={onClose} className={btn + " justify-self-start"}>
        <ArrowLeft className="size-4" aria-hidden="true" /> Revenir aux modèles
      </button>

      {draft ? <IncompleteWarning stats={model.stats} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-base text-bone">
          Nom du modèle
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </label>
        <div className="grid gap-2">
          {draft ? <p className="text-base text-bone">Page du site où il apparaît : aucune (brouillon incomplet)</p> : <PieceSelect value={pieceSlug} pieces={pieces} onChange={setPieceSlug} />}
          {model.pieceSlug && !draft ? (
            <a href={"/pieces/" + model.pieceSlug} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 text-base text-bone hover:text-rose-light">
              Voir la page <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>

      {preview ? <Editor3D model={preview} layers={model.layers} settings={shown ?? settings} token={token} onChange={history.change} onApi={takeApi} tools={tools} /> : null}

      {/* The first view of the jewel (and its still image), from where the camera stands now. */}
      <div className="flex flex-wrap items-center gap-3 border border-white/15 p-4 sm:p-5" data-model-start-view>
        <p className="min-w-0 flex-1 text-base text-bone">Angle de départ : tournez le bijou comme vous voulez qu'il apparaisse, puis gardez cet angle (il sert aussi d'image d'aperçu).</p>
        <button type="button" onClick={() => void saveView()} disabled={saving} className={btn} data-save-view>
          Garder cet angle
        </button>
        {settings.view ? (
          <button type="button" onClick={() => void save({ view: null })} disabled={saving} className={btn}>
            Revenir à l'angle de face
          </button>
        ) : null}
      </div>

      {draft ? null : (
        <>
          <ShareVip model={model} token={token} onError={fail} />
          <Links model={model} token={token} onChange={() => void load()} onError={fail} />
          {model.preview ? <SealedShare token={token} model={{ id: model.id, name: model.name, files: model.preview.files, settings, size: model.preview.size }} onError={fail} /> : null}
        </>
      )}

      <details className="group border border-white/15 p-4 sm:p-5">
        <summary className="inline-flex min-h-12 cursor-pointer list-none items-center gap-2 text-base text-white">
          <ChevronDown className="size-5 transition-transform group-open:rotate-180" aria-hidden="true" /> Détails techniques
        </summary>
        <div className="mt-3 grid gap-4">
          <p className="text-base text-mist">Fichier : {model.sourceName}</p>
          <Weights m={model} />
          <ImportNotes stats={model.stats} />
          <SkippedNotes stats={model.stats} />
          <StonesTable stats={model.stats} />
          <button type="button" onClick={() => void call(token, "POST", "/api/admin/models/" + id + "/reprocess").then(onClose, fail)} className={btn + " justify-self-start"}>
            <RefreshCw className="size-4" aria-hidden="true" /> Relancer l'optimisation
          </button>
        </div>
      </details>

      {/* Always at hand: save the name, the page, the materials and the presentation. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-ink/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-3 sm:px-8">
          <button type="button" onClick={() => void save()} disabled={saving} className={btnMain} data-save-model>
            {saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />} Enregistrer
          </button>
          <button type="button" onClick={() => saved && (history.change(saved), setNote("Réglages enregistrés remis."))} disabled={saving || !saved || JSON.stringify(saved) === JSON.stringify(settings)} className={btn} data-cancel-model>
            <Undo2 className="size-4" aria-hidden="true" /> Revenir à l'enregistré
          </button>
          {note ? <p role="status" className="text-base text-bone">{note}</p> : null}
          {err ? <p role="alert" className="text-base text-rose-light">{err}</p> : null}
        </div>
      </div>
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

/**
 * « Intégrer » (27/11/2026): the code to paste in another site (a page of a partner, a shop) to show the piece in 3D there,
 * the viewer alone in a frame (/embed/<token>, the same link: it stops with it). Its language, a transparent background,
 * the small logo, the turning.
 */
function EmbedCode({ origin, token, title }: { origin: string; token: string; title: string }) {
  const [lang, setLang] = useState("");
  const [transparent, setTransparent] = useState(false);
  const [logo, setLogo] = useState(true);
  const [rotate, setRotate] = useState("");
  const [copied, setCopied] = useState(false);
  const query = [transparent ? "bg=transparent" : "", logo ? "" : "logo=0", rotate ? "rotate=" + rotate : ""].filter(Boolean).join("&");
  const src = origin + (lang ? "/" + lang : "") + "/embed/" + token + (query ? "?" + query : "");
  const safeTitle = (title + " — Berete Jewellers").replace(/[&"<>]/g, (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[c]!);
  const code = '<iframe src="' + src + '" title="' + safeTitle + '" width="100%" style="aspect-ratio: 1; border: 0;" loading="lazy" allow="fullscreen; xr-spatial-tracking; camera" allowfullscreen></iframe>';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      window.prompt("Copiez le code :", code);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="grid w-full gap-3 border border-white/15 p-3 sm:p-4" data-embed-panel>
      <p className="text-base text-mist">Collez ce code dans une page d'un autre site : la pièce y tourne en 3D, seule, à la largeur de la page. Il s'arrête avec ce lien (date, suppression).</p>
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <label className="block text-base text-bone">
          Langue
          <select value={lang} onChange={(e) => setLang(e.target.value)} className={inputCls + " w-44"} data-embed-lang>
            <option value="">Anglais</option>
            <option value="fr">Français</option>
            <option value="es">Espagnol</option>
            <option value="de">Allemand</option>
            <option value="nl">Néerlandais</option>
            <option value="ar">Arabe</option>
          </select>
        </label>
        <label className="block text-base text-bone">
          Rotation
          <select value={rotate} onChange={(e) => setRotate(e.target.value)} className={inputCls + " w-56"}>
            <option value="">Comme réglé dans la 3D</option>
            <option value="1">Tourne toute seule</option>
            <option value="0">Immobile</option>
          </select>
        </label>
        <label className="flex min-h-12 items-center gap-3 text-base text-bone">
          <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} className="size-5 accent-[#e8b4a0]" data-embed-transparent /> Fond transparent
        </label>
        <label className="flex min-h-12 items-center gap-3 text-base text-bone">
          <input type="checkbox" checked={logo} onChange={(e) => setLogo(e.target.checked)} className="size-5 accent-[#e8b4a0]" /> Petit logo Berete
        </label>
      </div>
      <textarea readOnly value={code} rows={3} onFocus={(e) => e.currentTarget.select()} className="block w-full resize-none border border-white/30 bg-ink p-3 font-mono text-base text-bone" aria-label="Code à intégrer" data-embed-code />
      <div className="flex flex-wrap gap-3">
        <button type="button" className={btnMain} onClick={() => void copy()} data-embed-copy>
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />} {copied ? "Copié" : "Copier"}
        </button>
        <a href={src} target="_blank" rel="noreferrer" className={btn}>
          <ArrowUpRight className="size-4" aria-hidden="true" /> Voir
        </a>
      </div>
    </div>
  );
}

function Links({ model, token, onChange, onError }: { model: ModelRow; token: string; onChange: () => void; onError: (x: unknown) => void }) {
  const [title, setTitle] = useState(model.name);
  const [expires, setExpires] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  // The link whose embed code is shown (« Intégrer »).
  const [embedFor, setEmbedFor] = useState("");
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
                <button type="button" className={btn} aria-expanded={embedFor === link.id} onClick={() => setEmbedFor(embedFor === link.id ? "" : link.id)} data-embed-open>
                  <Code2 className="size-4" aria-hidden="true" /> Intégrer
                </button>
                <button type="button" aria-label="Supprimer le lien" className={iconBtn} onClick={() => void remove(link)}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
                {embedFor === link.id ? <EmbedCode origin={origin} token={link.token} title={link.title || model.name} /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </fieldset>
  );
}
