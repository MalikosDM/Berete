/*
 * « Éclairages importés » of the 3D editor (26/11/2026): the admin sends a lighting of his own (.hdr Radiance or .exr
 * OpenEXR, 40 MB at most), sees the list, gives one to the metal or to the stones (`onChoose`), deletes one.
 * Self-contained: it talks to /api/admin/hdri (server/routes/hdri.ts) with the admin's token. The viewer reads a chosen
 * lighting by its id "custom:<file>" (src/viewer/envs.ts), set as scene.envMetal.id or scene.envGem.id by the caller.
 */
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Check, Diamond, LoaderCircle, Sun, Trash2, Upload } from "lucide-react";
import { adminCall, btn } from "@/pages/admin/ui";

export type CustomHdri = {
  id: string;
  /** What the viewer is given: "custom:<id>.<ext>". */
  envId: string;
  name: string;
  ext: "hdr" | "exr";
  bytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  url: string;
};

type Props = {
  /** The admin's session (the editor's `token`). */
  token: string;
  /** A lighting given to the metal (Environment) or to the stones (Gem Environment): its id "custom:<file>". */
  onChoose: (kind: "metal" | "gem", id: string) => void;
  /** The lightings in use (scene.envMetal.id, scene.envGem.id), marked in the list. */
  current?: { metal?: string; gem?: string };
  /** A lighting deleted (its id "custom:<file>"): the caller puts back one of ours where it was used. */
  onDeleted?: (id: string) => void;
  /** The session ended (a 401). */
  onExpired?: () => void;
};

const MAX_BYTES = 40 * 1024 * 1024;
/** The button of the lighting in use: rose gold instead of white (swapped, not added: the two would conflict). */
const pressedBtn = btn.replace("border-white/30", "border-rose-light").replace("text-white", "text-rose-light");

/** « 12,4 Mo », « 850 Ko ». */
function weight(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " Mo";
  return Math.max(1, Math.round(bytes / 1024)).toLocaleString("fr-FR") + " Ko";
}

/** The kind of a file by its first bytes, as the server checks it. */
async function kindOf(file: File): Promise<"hdr" | "exr" | null> {
  const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
  const text = String.fromCharCode(...head);
  if (text.startsWith("#?RADIANCE") || text.startsWith("#?RGBE")) return "hdr";
  if (head[0] === 0x76 && head[1] === 0x2f && head[2] === 0x31 && head[3] === 0x01) return "exr";
  return null;
}

/** Sends the file with its progress (a fetch cannot tell it). */
function send(token: string, file: File, onProgress: (fraction: number) => void): Promise<CustomHdri> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/hdri?name=" + encodeURIComponent(file.name));
    xhr.setRequestHeader("Authorization", "Bearer " + token);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onerror = () => reject(new Error("Le fichier n'a pas pu être envoyé. Vérifiez la connexion, puis réessayez."));
    xhr.onload = () => {
      let json: { item?: CustomHdri; error?: string } = {};
      try {
        json = JSON.parse(xhr.responseText) as typeof json;
      } catch {
        /* an answer without JSON: the generic message below */
      }
      if (xhr.status === 401) reject(new Error("expired"));
      else if (xhr.status >= 200 && xhr.status < 300 && json.item) resolve(json.item);
      else reject(new Error(json.error ?? "Le fichier n'a pas pu être enregistré. Réessayez."));
    };
    xhr.send(file);
  });
}

export default function CustomHdr({ token, onChoose, current, onDeleted, onExpired }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<CustomHdri[] | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState<{ name: string; fraction: number } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const failed = useCallback(
    (error: unknown) => {
      const text = error instanceof Error ? error.message : "";
      if (text === "expired") {
        setMessage({ ok: false, text: "Session expirée, reconnectez-vous." });
        onExpired?.();
      } else setMessage({ ok: false, text: text || "Une erreur est survenue, réessayez." });
    },
    [onExpired],
  );

  useEffect(() => {
    let alive = true;
    adminCall(token, "GET", "/api/admin/hdri")
      .then((res) => alive && setItems((res.items as CustomHdri[]) ?? []))
      .catch((error: unknown) => {
        if (!alive) return;
        setItems([]);
        failed(error);
      });
    return () => {
      alive = false;
    };
  }, [token, failed]);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMessage(null);
    if (file.size > MAX_BYTES) return setMessage({ ok: false, text: "Fichier trop lourd : 40 Mo au plus (celui-ci fait " + weight(file.size) + ")." });
    if (!(await kindOf(file))) return setMessage({ ok: false, text: "Ce fichier n'est ni un .hdr (Radiance) ni un .exr (OpenEXR)." });
    setSending({ name: file.name, fraction: 0 });
    try {
      const item = await send(token, file, (fraction) => setSending({ name: file.name, fraction }));
      setItems((list) => [item, ...(list ?? [])]);
      setMessage({ ok: true, text: "« " + item.name + " » est importé : donnez-le au métal ou aux pierres." });
    } catch (error) {
      failed(error);
    } finally {
      setSending(null);
    }
  };

  const remove = async (item: CustomHdri) => {
    const used = current?.metal === item.envId || current?.gem === item.envId;
    const question = used ? "« " + item.name + " » éclaire ce modèle. Le supprimer quand même ? Nos éclairages reprendront sa place." : "Supprimer « " + item.name + " » ?";
    if (!window.confirm(question)) return;
    setRemoving(item.id);
    setMessage(null);
    try {
      await adminCall(token, "DELETE", "/api/admin/hdri/" + item.id);
      setItems((list) => (list ?? []).filter((i) => i.id !== item.id));
      setMessage({ ok: true, text: "« " + item.name + " » est supprimé." });
      onDeleted?.(item.envId);
    } catch (error) {
      failed(error);
    } finally {
      setRemoving(null);
    }
  };

  const percent = sending ? Math.round(sending.fraction * 100) : 0;

  return (
    <section className="grid gap-4" aria-labelledby="custom-hdr-title" data-custom-hdr>
      <div>
        <h3 id="custom-hdr-title" className="text-lg text-white">
          Éclairages importés
        </h3>
        <p className="mt-1 text-base text-mist">Un éclairage à vous, en .hdr ou .exr (une image panoramique, 40 Mo au plus), pour le métal ou pour les pierres.</p>
      </div>

      <div className="grid gap-2">
        <button type="button" onClick={() => input.current?.click()} disabled={sending !== null} className={btn + " justify-self-start"} data-custom-hdr-upload>
          {sending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />} {sending ? "Envoi en cours…" : "Importer un éclairage"}
        </button>
        <input ref={input} type="file" accept=".hdr,.exr,image/vnd.radiance,image/x-exr" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void onFile(e)} data-custom-hdr-input />
        {sending ? (
          <div className="grid gap-1">
            <p className="break-words text-base text-bone" aria-hidden="true">
              {sending.name} : {percent} %
            </p>
            <span className="block h-1 w-full bg-white/10" role="progressbar" aria-label={"Envoi de " + sending.name} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
              <span className="block h-1 bg-rose-gold" style={{ width: Math.max(2, percent) + "%" }} />
            </span>
          </div>
        ) : null}
        {message ? (
          <p role={message.ok ? "status" : "alert"} className={"text-base " + (message.ok ? "text-bone" : "text-rose-light")} data-custom-hdr-message>
            {message.text}
          </p>
        ) : null}
      </div>

      {items === null ? (
        <p className="text-base text-mist">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-base text-mist">Aucun éclairage importé pour l'instant.</p>
      ) : (
        <ul className="grid gap-3" data-custom-hdr-list>
          {items.map((item) => {
            const forMetal = current?.metal === item.envId;
            const forGem = current?.gem === item.envId;
            const size = item.width && item.height ? item.width.toLocaleString("fr-FR") + " × " + item.height.toLocaleString("fr-FR") + " px · " : "";
            return (
              <li key={item.id} className={"grid gap-3 border p-4 " + (forMetal || forGem ? "border-rose-light/60" : "border-white/15")} data-custom-hdr-item={item.envId}>
                <div className="min-w-0">
                  <p className="break-words text-base text-white">{item.name}</p>
                  <p className="text-base text-mist">
                    {item.ext.toUpperCase()} · {size}
                    {weight(item.bytes)}
                    {forMetal ? " · éclaire le métal" : ""}
                    {forGem ? " · éclaire les pierres" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => onChoose("metal", item.envId)} className={forMetal ? pressedBtn : btn} aria-pressed={forMetal} data-custom-hdr-metal>
                    {forMetal ? <Check className="size-4" aria-hidden="true" /> : <Sun className="size-4" aria-hidden="true" />} Pour le métal
                  </button>
                  <button type="button" onClick={() => onChoose("gem", item.envId)} className={forGem ? pressedBtn : btn} aria-pressed={forGem} data-custom-hdr-gem>
                    {forGem ? <Check className="size-4" aria-hidden="true" /> : <Diamond className="size-4" aria-hidden="true" />} Pour les pierres
                  </button>
                  <button type="button" onClick={() => void remove(item)} disabled={removing === item.id} className={btn} aria-label={"Supprimer " + item.name} data-custom-hdr-delete>
                    {removing === item.id ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />} Supprimer
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
