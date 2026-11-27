import { useEffect, useRef, useState, type FormEvent } from "react";
import { ImagePlus, LoaderCircle, Send, Trash2, X } from "lucide-react";
import { adminCall, btn, btnMain, iconBtn, inputCls } from "../ui";
import type { Section } from "./ProjectPage";
import { areaCls, Block, dayShort, ErrorLine, labelCls, Saved, Tag, today, useFail, useFlash } from "./shared";
import { prepareJournalFile, sendClientFile, type Picked } from "./upload";

/*
 * The journal of the atelier of a project: photos and videos with a short note and their day, like the news of the follow-up
 * of the clients (the same sending in pieces, a video of 300 MB at most). Kept as a draft (the client does not see it) or
 * published at once (the client is told by e-mail); a draft is published later with one button.
 */

const MAX_FILES = 12;

export default function Journal({ token, project: p, reload, onExpired }: Section) {
  const [picked, setPicked] = useState<Picked[]>([]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);
  const [draft, setDraft] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState("");
  const [err, fail, setErr] = useFail(onExpired);
  const [saved, flash] = useFlash();
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useRef(new Set<string>());

  // The previews made in the browser are let go with the section.
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const pick = async (list: FileList | null) => {
    if (!list) return;
    setErr("");
    const files = [...list].slice(0, Math.max(0, MAX_FILES - picked.length));
    if (list.length > files.length) setErr("Douze photos ou vidéos au plus par page du journal.");
    const items: Picked[] = files.map((f, i) => ({ key: Date.now() + "-" + i + "-" + f.name, kind: f.type.startsWith("video/") || /\.(mov|mp4|m4v|webm)$/i.test(f.name) ? "video" : "image", name: f.name, blob: null, preview: null, width: null, height: null, error: null }));
    setPicked((x) => [...x, ...items]);
    if (inputRef.current) inputRef.current.value = "";
    await Promise.all(
      files.map(async (file, i) => {
        const ready = await prepareJournalFile(file, (u) => previews.current.add(u));
        setPicked((x) => x.map((y) => (y.key === items[i]!.key ? { ...y, ...ready } : y)));
      }),
    );
  };

  const preparing = picked.some((x) => !x.blob && !x.error);
  const sendable = picked.filter((x) => x.blob);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || preparing || (note.trim() === "" && sendable.length === 0)) return;
    setBusy("send");
    setErr("");
    try {
      const total = sendable.reduce((s, x) => s + x.blob!.size, 0) || 1;
      let before = 0;
      setProgress(0);
      const files = [];
      for (const x of sendable) {
        const uploadId = await sendClientFile(token, p.client.id, x.blob!, x.name, (bytes) => setProgress((before + bytes) / total));
        before += x.blob!.size;
        files.push({ uploadId, name: x.name, size: x.blob!.size, width: x.width, height: x.height });
      }
      await adminCall(token, "POST", "/api/admin/clients/" + p.client.id + "/updates", { note: note.trim(), date, files, projectId: p.id, draft });
      setPicked([]);
      setNote("");
      setDate(today());
      await reload();
      flash(draft ? "draft" : "published");
    } catch (x) {
      fail(x);
    } finally {
      setBusy("");
      setProgress(null);
    }
  };

  const publish = async (id: string) => {
    setBusy("p" + id);
    setErr("");
    try {
      await adminCall(token, "POST", "/api/admin/atelier/projects/" + p.id + "/updates/" + id + "/publish");
      await reload();
      flash("published");
    } catch (x) {
      fail(x);
    } finally {
      setBusy("");
    }
  };

  const remove = async (id: string, day: string | null) => {
    if (!window.confirm("Supprimer cette page du journal" + (day ? " du " + dayShort(day) : "") + " ? Le client ne la verra plus.")) return;
    try {
      await adminCall(token, "DELETE", "/api/admin/clients/" + p.client.id + "/updates/" + id);
      await reload();
    } catch (x) {
      fail(x);
    }
  };

  return (
    <Block id="journal" title="Journal de l'atelier" intro="Des photos et des vidéos de la fabrication, avec un mot et leur date. En brouillon, le client ne les voit pas encore." data-journal>
      <form onSubmit={submit} className="grid gap-4 border border-rose-light/30 p-4 sm:p-5" data-journal-upload>
        <label className={btn + " w-full cursor-pointer sm:w-auto sm:justify-self-start"}>
          <ImagePlus className="size-4" aria-hidden="true" /> Ajouter des photos ou des vidéos
          <input ref={inputRef} type="file" accept="image/*,video/*" multiple className="sr-only" onChange={(e) => void pick(e.target.files)} />
        </label>
        {picked.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-journal-picked>
            {picked.map((x) => (
              <li key={x.key} className="relative border border-white/15">
                {x.error ? (
                  <p className="flex aspect-square items-center p-3 text-base text-rose-light">
                    {x.name} : {x.error}
                  </p>
                ) : !x.blob ? (
                  <p className="flex aspect-square items-center justify-center" role="status">
                    <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> <span className="sr-only">Préparation</span>
                  </p>
                ) : x.kind === "video" && x.preview ? (
                  <video src={x.preview + "#t=0.1"} muted playsInline preload="metadata" className="aspect-square w-full object-cover" />
                ) : x.preview ? (
                  <img src={x.preview} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <p className="flex aspect-square items-center p-3 text-base text-bone">{x.name}</p>
                )}
                <button type="button" aria-label={"Retirer " + x.name} className={iconBtn + " absolute end-1 top-1 bg-ink/80"} onClick={() => setPicked((y) => y.filter((z) => z.key !== x.key))} disabled={busy === "send"}>
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <label className={labelCls}>
          Un mot pour le client (facultatif)
          <textarea name="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} className={inputCls + " " + areaCls} placeholder="The setting of the diamonds has begun." />
        </label>
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <label className={labelCls}>
            Date
            <input type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputCls + " [color-scheme:dark]"} />
          </label>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 text-base text-white">
            <input type="checkbox" name="draft" checked={draft} onChange={(e) => setDraft(e.target.checked)} className="size-5 accent-[#e8b4a0]" />
            Garder en brouillon (le client ne le voit pas encore)
          </label>
        </div>
        {progress !== null ? (
          <span className="block h-1 w-full bg-white/10" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <span className="block h-1 bg-rose-gold transition-[width] duration-300" style={{ width: Math.max(2, progress * 100) + "%" }} />
          </span>
        ) : null}
        <ErrorLine text={err} />
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className={btnMain} disabled={busy === "send" || preparing || (note.trim() === "" && sendable.length === 0)}>
            {busy === "send" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />} {draft ? "Enregistrer le brouillon" : "Publier dans son espace"}
          </button>
          <Saved show={saved === "draft"} text="Brouillon enregistré" />
          <Saved show={saved === "published"} text="Publié : le client est prévenu" />
        </div>
      </form>

      {p.journal.length === 0 ? <p className="text-base text-mist">Aucune page dans le journal pour l'instant.</p> : null}
      <ul className="grid gap-5">
        {p.journal.map((u) => (
          <li key={u.id} className="grid gap-3 border-b border-white/10 pb-5" data-journal-item={u.id} data-journal-draft={u.draft ? "1" : "0"}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-base text-rose-light">
                  {dayShort(u.date)} {u.draft ? <Tag tone="wait">Brouillon</Tag> : <Tag tone="good">Publié</Tag>}
                </p>
                {u.note ? <p className="mt-2 text-base whitespace-pre-line text-bone">{u.note}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {u.draft ? (
                  <button type="button" className={btnMain} onClick={() => void publish(u.id)} disabled={busy === "p" + u.id} data-publish-update={u.id}>
                    {busy === "p" + u.id ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />} Publier
                  </button>
                ) : null}
                <button type="button" aria-label="Supprimer cette page du journal" className={iconBtn} onClick={() => void remove(u.id, u.date)}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            {u.files.length > 0 ? (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {u.files.map((f) => (
                  <li key={f.id}>
                    {f.kind === "video" ? (
                      <video src={f.url + "#t=0.1"} controls muted playsInline preload="metadata" className="aspect-square w-full bg-ink-soft object-cover" />
                    ) : (
                      <a href={f.url} target="_blank" rel="noreferrer">
                        <img src={f.url} alt="" loading="lazy" className="aspect-square w-full bg-ink-soft object-cover" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </Block>
  );
}
