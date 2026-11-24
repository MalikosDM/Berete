import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Check, ImagePlus, LoaderCircle, Send, Trash2, X } from "lucide-react";
import { fr } from "@/i18n/ui/fr";
import { preparePhoto } from "@/lib/photos";
import { adminCall, btn, btnMain, iconBtn, inputCls } from "./ui";

/*
 * Admin "Clients VIP" > "Suivi de la commande" (Yoni, 24/11/2026): what the client follows in his space (/vip), like a
 * parcel tracking, instead of part of the WhatsApp messages: the step of his piece among the six of The Bespoke Journey,
 * the estimated date (each change kept: the client sees that it changed), the news of the atelier (photos and videos,
 * from a phone too, each news with a short note and its day). Photos are made lighter in the browser; videos go as they
 * are (300 MB at most), sent in pieces.
 */

/** The six steps, under their French titles (the same as the page The Bespoke Journey); 6: every step done. */
export const STEPS = fr.process.steps.map((s) => s.title);
const DONE = STEPS.length;

export function stageLabel(stage: number): string {
  return stage >= DONE ? "Pièce remise" : stage + 1 + ". " + (STEPS[stage] ?? "");
}

/** "12 mars 2027" (a day kept without its time). */
export function dayFr(day: string | null): string {
  if (!day) return "aucune";
  const words = new Date(day + "T00:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return words.replace(/^1(?=\s)/, "1er");
}

/** Today in the calendar of the computer or the phone: "2026-11-24". */
function today(): string {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

type NewsFile = { id: string; kind: "image" | "video"; url: string; width: number | null; height: number | null; name: string; size: number };
type News = { id: string; date: string; note: string; files: NewsFile[] };
type Tracking = { stage: number; estimatedAt: string | null; dateChanges: { id: string; previous: string | null; next: string | null; at: string }[]; updates: News[] };
type Picked = { key: string; kind: "image" | "video"; name: string; blob: Blob | null; preview: string | null; width: number | null; height: number | null; error: string | null };

const MAX_FILES = 12;
const MAX_VIDEO = 300 * 1024 * 1024;

const mb = (bytes: number) => (bytes / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " Mo";

/** The size of a video, read from its first bytes in the browser (null when it cannot say). */
function videoSize(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const done = (size: { width: number; height: number } | null) => {
      window.clearTimeout(timer);
      v.removeAttribute("src");
      v.load();
      resolve(size);
    };
    const timer = window.setTimeout(() => done(null), 6000);
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => done(v.videoWidth && v.videoHeight ? { width: v.videoWidth, height: v.videoHeight } : null);
    v.onerror = () => done(null);
    v.src = url;
  });
}

/** A photo or a video sent in pieces of a few MB; a piece that fails is sent again. */
async function sendFile(token: string, clientId: string, blob: Blob, name: string, onSent: (bytes: number) => void): Promise<string> {
  const start = await adminCall(token, "POST", "/api/admin/clients/" + clientId + "/uploads", { name, size: blob.size });
  const uploadId = String(start.uploadId);
  const chunk = Number(start.chunkBytes) || 8 * 1024 * 1024;
  let offset = 0;
  let failures = 0;
  while (offset < blob.size) {
    const piece = blob.slice(offset, Math.min(blob.size, offset + chunk));
    const res = await fetch("/api/admin/clients/" + clientId + "/uploads/" + uploadId + "?offset=" + offset, {
      method: "PUT",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/octet-stream" },
      body: piece,
    }).catch(() => null);
    if (res && (res.ok || res.status === 409)) {
      offset = Number(((await res.json()) as { received: number }).received);
      if (res.ok) failures = 0;
    } else {
      if (res && res.status === 401) throw new Error("expired");
      if (res && res.status === 413) throw new Error("Fichier trop lourd (300 Mo au plus pour une vidéo).");
      if (++failures > 4) throw new Error("L'envoi a échoué, vérifiez la connexion et recommencez.");
      await new Promise((r) => setTimeout(r, 1000 * failures));
    }
    onSent(offset);
  }
  return uploadId;
}

export default function ClientTracking({ token, clientId, onExpired, onChanged }: { token: string; clientId: string; onExpired: () => void; onChanged: () => void }) {
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [dateDraft, setDateDraft] = useState("");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [note, setNote] = useState("");
  const [newsDate, setNewsDate] = useState(today);
  const [progress, setProgress] = useState<number | null>(null);
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useRef(new Set<string>());

  const fail = useCallback(
    (x: unknown) => {
      if (x instanceof Error && x.message === "expired") onExpired();
      else setErr(x instanceof Error ? x.message : "Une erreur est survenue.");
    },
    [onExpired],
  );

  const show = useCallback((t: Tracking) => {
    setTracking(t);
    setDateDraft(t.estimatedAt ?? "");
  }, []);

  useEffect(() => {
    let alive = true;
    adminCall(token, "GET", "/api/admin/clients/" + clientId + "/tracking")
      .then((t) => alive && show(t as unknown as Tracking))
      .catch((x: unknown) => alive && fail(x));
    return () => {
      alive = false;
    };
  }, [token, clientId, show, fail]);

  // The previews made in the browser are let go with the panel.
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const flash = (key: string) => {
    setSaved(key);
    window.setTimeout(() => setSaved((s) => (s === key ? "" : s)), 2500);
  };

  const save = async (body: { stage?: number; estimatedAt?: string | null }, key: string) => {
    setErr("");
    try {
      show((await adminCall(token, "PUT", "/api/admin/clients/" + clientId + "/tracking", body)) as unknown as Tracking);
      flash(key);
      onChanged();
    } catch (x) {
      fail(x);
    }
  };

  const pick = async (list: FileList | null) => {
    if (!list) return;
    setErr("");
    const files = [...list].slice(0, Math.max(0, MAX_FILES - picked.length));
    if (list.length > files.length) setErr("Douze photos ou vidéos au plus par nouvelle.");
    const items: Picked[] = files.map((f, i) => ({ key: Date.now() + "-" + i + "-" + f.name, kind: f.type.startsWith("video/") || /\.(mov|mp4|m4v|webm)$/i.test(f.name) ? "video" : "image", name: f.name, blob: null, preview: null, width: null, height: null, error: null }));
    setPicked((p) => [...p, ...items]);
    if (inputRef.current) inputRef.current.value = "";
    await Promise.all(
      files.map(async (file, i) => {
        const item = items[i]!;
        let ready: Partial<Picked>;
        if (item.kind === "video") {
          if (file.size > MAX_VIDEO) ready = { error: "Trop lourde (" + mb(file.size) + ", 300 Mo au plus)." };
          else {
            const url = URL.createObjectURL(file);
            previews.current.add(url);
            const size = await videoSize(url);
            ready = { blob: file, preview: url, width: size?.width ?? null, height: size?.height ?? null };
          }
        } else {
          const photo = await preparePhoto(file);
          if (!photo) ready = { error: "Photo illisible ou trop lourde." };
          else {
            if (photo.preview) previews.current.add(photo.preview);
            const bitmap = await createImageBitmap(photo.blob).catch(() => null);
            ready = { blob: photo.blob, name: photo.name, preview: photo.preview, width: bitmap?.width ?? null, height: bitmap?.height ?? null };
            bitmap?.close();
          }
        }
        setPicked((p) => p.map((x) => (x.key === item.key ? { ...x, ...ready } : x)));
      }),
    );
  };

  const unpick = (key: string) => setPicked((p) => p.filter((x) => x.key !== key));

  const preparing = picked.some((p) => !p.blob && !p.error);
  const sendable = picked.filter((p) => p.blob);

  const publish = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || preparing || (note.trim() === "" && sendable.length === 0)) return;
    setBusy(true);
    setErr("");
    try {
      const total = sendable.reduce((s, p) => s + p.blob!.size, 0) || 1;
      let before = 0;
      setProgress(0);
      const files = [];
      for (const p of sendable) {
        const uploadId = await sendFile(token, clientId, p.blob!, p.name, (bytes) => setProgress((before + bytes) / total));
        before += p.blob!.size;
        files.push({ uploadId, name: p.name, size: p.blob!.size, width: p.width, height: p.height });
      }
      await adminCall(token, "POST", "/api/admin/clients/" + clientId + "/updates", { note: note.trim(), date: newsDate, files });
      setPicked([]);
      setNote("");
      setNewsDate(today());
      show((await adminCall(token, "GET", "/api/admin/clients/" + clientId + "/tracking")) as unknown as Tracking);
      flash("news");
      onChanged();
    } catch (x) {
      fail(x);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const remove = async (news: News) => {
    if (!window.confirm("Supprimer cette nouvelle du " + dayFr(news.date) + " ? Le client ne la verra plus.")) return;
    try {
      await adminCall(token, "DELETE", "/api/admin/clients/" + clientId + "/updates/" + news.id);
      setTracking((t) => (t ? { ...t, updates: t.updates.filter((u) => u.id !== news.id) } : t));
      onChanged();
    } catch (x) {
      fail(x);
    }
  };

  if (!tracking) {
    return (
      <p className="flex items-center gap-3 text-base text-bone">
        {err ? <span role="alert" className="text-rose-light">{err}</span> : <><LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Chargement du suivi</>}
      </p>
    );
  }

  const ok = (key: string) => (saved === key ? <span className="inline-flex items-center gap-1 text-base text-rose-light" role="status"><Check className="size-4" aria-hidden="true" /> Enregistré</span> : null);

  return (
    <div className="grid gap-10 border border-white/15 p-5 sm:p-8" data-client-tracking>
      <p className="text-base text-mist">Ce que le client suit dans son espace privé : l'étape de sa pièce, la date prévue et les nouvelles de l'atelier.</p>

      {/* The step */}
      <div className="grid gap-3">
        <label className="block text-base text-bone">
          Étape de la pièce
          <select value={tracking.stage} onChange={(e) => void save({ stage: Number(e.target.value) }, "stage")} className={inputCls} data-stage-select>
            {STEPS.map((title, i) => (
              <option key={title} value={i}>
                {i + 1}. {title}
              </option>
            ))}
            <option value={DONE}>Pièce remise (toutes les étapes terminées)</option>
          </select>
        </label>
        {ok("stage")}
      </div>

      {/* The estimated date and its history */}
      <div className="grid gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-base text-bone">
            Date d'achèvement estimée
            <input type="date" value={dateDraft} onChange={(e) => setDateDraft(e.target.value)} className={inputCls + " [color-scheme:dark]"} data-estimate-input />
          </label>
          <button type="button" className={btn} disabled={dateDraft === (tracking.estimatedAt ?? "") || dateDraft === ""} onClick={() => void save({ estimatedAt: dateDraft }, "date")} data-estimate-save>
            <Check className="size-4" aria-hidden="true" /> Enregistrer la date
          </button>
          {tracking.estimatedAt ? (
            <button type="button" className={btn} onClick={() => void save({ estimatedAt: null }, "date")} data-estimate-clear>
              <X className="size-4" aria-hidden="true" /> Retirer la date
            </button>
          ) : null}
        </div>
        {ok("date")}
        {tracking.dateChanges.length > 0 ? (
          <div>
            <p className="text-base text-mist">Historique (le client voit seulement le dernier changement) :</p>
            <ul className="mt-2 grid gap-1 text-base text-bone" data-estimate-history>
              {tracking.dateChanges.map((d) => (
                <li key={d.id}>
                  Le {new Date(d.at).toLocaleDateString("fr-FR")} à {new Date(d.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} : {d.previous ? dayFr(d.previous) + " → " : ""}
                  {d.next ? dayFr(d.next) : "date retirée"}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* A new news */}
      <form onSubmit={publish} className="grid gap-4 border-t border-white/15 pt-8" data-news-form>
        <h3 className="title-caps t-sub tracking-[0.12em]">Nouvelle de l'atelier</h3>
        <label className={btn + " w-full cursor-pointer sm:w-auto sm:justify-self-start"}>
          <ImagePlus className="size-4" aria-hidden="true" /> Ajouter des photos ou des vidéos
          <input ref={inputRef} type="file" accept="image/*,video/*" multiple className="sr-only" onChange={(e) => void pick(e.target.files)} data-news-files />
        </label>
        {picked.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-news-picked>
            {picked.map((p) => (
              <li key={p.key} className="relative border border-white/15" data-news-pick={p.kind}>
                {p.error ? (
                  <p className="flex aspect-square items-center p-3 text-base text-rose-light">{p.name} : {p.error}</p>
                ) : !p.blob ? (
                  <p className="flex aspect-square items-center justify-center" role="status">
                    <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> <span className="sr-only">Préparation</span>
                  </p>
                ) : p.kind === "video" && p.preview ? (
                  <video src={p.preview + "#t=0.1"} muted playsInline preload="metadata" className="aspect-square w-full object-cover" />
                ) : p.preview ? (
                  <img src={p.preview} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <p className="flex aspect-square items-center p-3 text-base text-bone">{p.name}</p>
                )}
                <button type="button" aria-label={"Retirer " + p.name} className={iconBtn + " absolute end-1 top-1 bg-ink/80"} onClick={() => unpick(p.key)} disabled={busy}>
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <label className="block text-base text-bone">
          Un mot pour le client (facultatif)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} className={inputCls + " py-3"} placeholder="Le sertissage des diamants a commencé." data-news-note />
        </label>
        <label className="block text-base text-bone sm:max-w-xs">
          Date de la nouvelle
          <input type="date" value={newsDate} onChange={(e) => setNewsDate(e.target.value)} required className={inputCls + " [color-scheme:dark]"} data-news-date />
        </label>
        {progress !== null ? (
          <span className="block h-1 w-full bg-white/10" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <span className="block h-1 bg-rose-gold transition-[width] duration-300" style={{ width: Math.max(2, progress * 100) + "%" }} />
          </span>
        ) : null}
        {err ? <p role="alert" className="text-base text-rose-light">{err}</p> : null}
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className={btnMain} disabled={busy || preparing || (note.trim() === "" && sendable.length === 0)} data-news-publish>
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />} Publier dans son espace
          </button>
          {ok("news")}
        </div>
      </form>

      {/* The news already published, newest first */}
      <div className="grid gap-4 border-t border-white/15 pt-8">
        <h3 className="title-caps t-sub tracking-[0.12em]">Nouvelles publiées ({tracking.updates.length})</h3>
        {tracking.updates.length === 0 ? <p className="text-base text-mist">Aucune nouvelle pour l'instant.</p> : null}
        <ul className="grid gap-6">
          {tracking.updates.map((u) => (
            <li key={u.id} className="grid gap-3 border-b border-white/10 pb-6" data-admin-news-item={u.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-base text-rose-light">{dayFr(u.date)}</p>
                  {u.note ? <p className="mt-1 text-base whitespace-pre-line text-bone">{u.note}</p> : null}
                </div>
                <button type="button" aria-label="Supprimer la nouvelle" className={iconBtn} onClick={() => void remove(u)} data-admin-news-delete>
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
              {u.files.length > 0 ? (
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {u.files.map((f) => (
                    <li key={f.id} title={f.name + " · " + mb(f.size)}>
                      {f.kind === "video" ? (
                        <video src={f.url + "#t=0.1"} controls playsInline preload="metadata" className="aspect-square w-full bg-ink-soft object-cover" />
                      ) : (
                        <a href={f.url} target="_blank" rel="noreferrer">
                          <img src={f.url} alt={f.name} loading="lazy" className="aspect-square w-full bg-ink-soft object-cover" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
