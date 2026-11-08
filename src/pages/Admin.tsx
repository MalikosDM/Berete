import { useCallback, useEffect, useState, useSyncExternalStore, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, LoaderCircle, LogOut, Pencil, Plus, Trash2, X } from "lucide-react";
import { PIECE_TYPES, type MediaItem, type Translations } from "@/data/types";
import { bundleOf, loadLocale, LOCALE_INFO } from "@/i18n";

/*
 * Back-office of the site (/admin), in French for the owner. It edits the same
 * catalogue the site shows (server/routes/site.ts): stories, people, pieces,
 * boxes, and reads the messages sent from the site. Password: ADMIN_PASSWORD.
 */

type Rec = Record<string, unknown> & { id?: string };
type Kind = "stories" | "people" | "pieces" | "boxes";
type Tab = Kind | "messages";

type Field =
  | { key: string; label: string; type: "text" | "textarea" | "number" | "checkbox" | "slugs" }
  | { key: string; label: string; type: "select"; options: readonly (readonly [string, string])[] }
  | { key: string; label: string; type: "image" | "media" | "medialist" }
  | { key: string; label: string; type: "specs" | "press" }
  /** The texts of the item in French, Spanish and Arabic: [field, its name, long text]. */
  | { key: string; label: string; type: "translations"; fields: readonly (readonly [string, string, boolean])[] };

const TRANSLATIONS_LABEL = "Traductions (français, espagnol, arabe)";

const TYPE_NAMES: Record<string, string> = { chain: "Chaîne", pendant: "Pendentif", ring: "Bague", bracelet: "Bracelet", watch: "Montre" };

const KINDS: Record<Kind, { label: string; name: string; fields: Field[]; empty: Rec }> = {
  stories: {
    label: "Stories",
    name: "title",
    fields: [
      { key: "title", label: "Titre", type: "text" },
      { key: "slug", label: "Adresse (minuscules et tirets)", type: "text" },
      { key: "cover", label: "Couverture (bulle)", type: "image" },
      { key: "media", label: "Photos et vidéos de la story, dans l'ordre", type: "medialist" },
      { key: "people", label: "Joueurs, clubs ou personnalités liés (adresses séparées par des virgules)", type: "slugs" },
      { key: "pieceSlug", label: "Pièce liée (adresse, ajoute « View the piece »)", type: "text" },
      { key: "articleUrl", label: "Lien d'article (le bouton devient « Read the article »)", type: "text" },
      { key: "translations", label: TRANSLATIONS_LABEL, type: "translations", fields: [["title", "Titre", false]] },
    ],
    empty: { title: "", slug: "", cover: "", media: [], people: [], pieceSlug: "", articleUrl: "" },
  },
  people: {
    label: "Joueurs",
    name: "name",
    fields: [
      { key: "name", label: "Nom", type: "text" },
      { key: "slug", label: "Adresse (minuscules et tirets)", type: "text" },
      { key: "kind", label: "Type", type: "select", options: [["player", "Joueur"], ["club", "Club"], ["personality", "Personnalité"]] },
      { key: "number", label: "Numéro", type: "number" },
      { key: "club", label: "Club", type: "text" },
      { key: "portrait", label: "Portrait (vide : la couverture de sa story)", type: "image" },
      { key: "bio", label: "Texte", type: "textarea" },
      { key: "translations", label: TRANSLATIONS_LABEL, type: "translations", fields: [["name", "Nom", false], ["bio", "Texte", true]] },
    ],
    empty: { name: "", slug: "", kind: "player", number: null, club: "", portrait: "", bio: "" },
  },
  pieces: {
    label: "Pièces",
    name: "title",
    fields: [
      { key: "title", label: "Titre", type: "text" },
      { key: "slug", label: "Adresse (minuscules et tirets)", type: "text" },
      { key: "type", label: "Type", type: "select", options: PIECE_TYPES.map((t) => [t, TYPE_NAMES[t] ?? t] as const) },
      { key: "line", label: "Phrase d'accroche", type: "text" },
      { key: "story", label: "Texte", type: "textarea" },
      { key: "client", label: "Client", type: "text" },
      { key: "clientPublic", label: "Afficher le client", type: "checkbox" },
      { key: "featured", label: "Capsule à la une (accueil)", type: "checkbox" },
      { key: "draft", label: "Brouillon : textes à faire valider par le client", type: "checkbox" },
      { key: "cover", label: "Photo d'ouverture", type: "media" },
      { key: "gallery", label: "Détails (photos et vidéos)", type: "medialist" },
      { key: "handover", label: "Remise au client", type: "medialist" },
      { key: "specs", label: "Fiche technique (une ligne par info, ex. Or : 18 carats)", type: "specs" },
      { key: "press", label: "Presse (une ligne par article : Média | Titre | Lien)", type: "press" },
      { key: "people", label: "Joueurs et clubs liés (adresses séparées par des virgules)", type: "slugs" },
      { key: "boxSlug", label: "Écrin lié (adresse)", type: "text" },
      { key: "translations", label: TRANSLATIONS_LABEL, type: "translations", fields: [["title", "Titre", false], ["line", "Phrase d'accroche", false], ["story", "Texte", true]] },
    ],
    empty: { title: "", slug: "", type: "ring", line: "", story: "", client: "", clientPublic: false, featured: false, draft: false, cover: { type: "image", src: "" }, gallery: [], handover: [], specs: [], press: [], people: [], boxSlug: "" },
  },
  boxes: {
    label: "Écrins",
    name: "name",
    fields: [
      { key: "name", label: "Nom", type: "text" },
      { key: "slug", label: "Adresse (minuscules et tirets)", type: "text" },
      { key: "description", label: "Texte", type: "textarea" },
      { key: "images", label: "Photos", type: "medialist" },
      { key: "pieceSlug", label: "Pièce liée (adresse)", type: "text" },
      { key: "translations", label: TRANSLATIONS_LABEL, type: "translations", fields: [["name", "Nom", false], ["description", "Texte", true]] },
    ],
    empty: { name: "", slug: "", description: "", images: [], pieceSlug: "" },
  },
};

const TABS: { key: Tab; label: string }[] = [...(Object.keys(KINDS) as Kind[]).map((k) => ({ key: k as Tab, label: KINDS[k].label })), { key: "messages", label: "Messages" }];

/* The session token, kept for the visit. */
const TOKEN_KEY = "bj-admin-token";
const tokenListeners = new Set<() => void>();

function readToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeToken(token: string): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
  tokenListeners.forEach((l) => l());
}

function subscribeToken(callback: () => void): () => void {
  tokenListeners.add(callback);
  return () => tokenListeners.delete(callback);
}
const inputCls = "mt-2 block min-h-12 w-full border border-white/30 bg-ink px-4 text-base text-white focus:border-rose-light focus:outline-none";
const btn = "inline-flex min-h-12 items-center justify-center gap-2 border border-white/30 px-5 text-base font-semibold text-white hover:border-rose-light hover:text-rose-light disabled:opacity-50";
const btnMain = "inline-flex min-h-12 items-center justify-center gap-2 bg-white px-6 text-base font-semibold text-ink hover:bg-rose-light disabled:opacity-60";
const iconBtn = "inline-flex size-12 items-center justify-center border border-white/30 text-white hover:border-rose-light hover:text-rose-light";

async function api(token: string, method: string, url: string, body?: unknown): Promise<Rec> {
  const headers: Record<string, string> = { Authorization: "Bearer " + token, Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as Rec;
  if (res.status === 401) throw new Error("expired");
  if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Une erreur est survenue, réessayez.");
  return json;
}

async function upload(token: string, file: File): Promise<MediaItem> {
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) },
    body: file,
  });
  const json = (await res.json().catch(() => ({}))) as Rec;
  if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Le fichier n'a pas pu être envoyé.");
  return { src: String(json.url), type: json.type === "video" ? "video" : "image" };
}

const asList = (v: unknown): MediaItem[] => (Array.isArray(v) ? (v as MediaItem[]).filter((m) => m && typeof m.src === "string") : []);
const asText = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

function Thumb({ m }: { m: MediaItem }) {
  if (!m.src) return null;
  return m.type === "video" ? <video src={m.src} poster={m.poster} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : <img src={m.src} alt={m.alt ?? ""} className="h-full w-full object-cover" />;
}

function MediaField({ token, label, value, onChange, single, imagesOnly }: { token: string; label: string; value: MediaItem[]; onChange: (v: MediaItem[]) => void; single?: boolean; imagesOnly?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    setErr("");
    try {
      const added: MediaItem[] = [];
      for (const f of single ? files.slice(0, 1) : files) added.push(await upload(token, f));
      onChange(single ? added : [...value, ...added]);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  return (
    <fieldset className="border border-white/15 p-4">
      <legend className="px-2 text-base text-bone">{label}</legend>
      {value.length > 0 ? (
        <ul className="mt-2 grid gap-3 sm:grid-cols-2">
          {value.map((m, i) => (
            <li key={m.src + i} className="flex gap-3 border border-white/10 p-2">
              <span className="block size-20 shrink-0 overflow-hidden bg-ink-soft">
                <Thumb m={m} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <input aria-label="Légende" placeholder="Légende" value={m.caption ?? ""} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} className={inputCls + " mt-0"} />
                <span className="flex gap-2">
                  {!single ? (
                    <>
                      <button type="button" aria-label="Avancer" onClick={() => move(i, -1)} className={iconBtn}><ArrowLeft className="size-4" aria-hidden="true" /></button>
                      <button type="button" aria-label="Reculer" onClick={() => move(i, 1)} className={iconBtn}><ArrowRight className="size-4" aria-hidden="true" /></button>
                    </>
                  ) : null}
                  <button type="button" aria-label="Retirer" onClick={() => onChange(value.filter((_, j) => j !== i))} className={iconBtn}><X className="size-4" aria-hidden="true" /></button>
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <label className={btn + " mt-3 cursor-pointer"}>
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
        {single ? "Choisir un fichier" : "Ajouter des photos ou vidéos"}
        <input type="file" accept={imagesOnly ? "image/*" : "image/*,video/*"} multiple={!single} onChange={onFiles} className="sr-only" disabled={busy} />
      </label>
      {err ? <p role="alert" className="mt-2 text-base text-rose-light">{err}</p> : null}
    </fieldset>
  );
}

/* ---------- Translations ---------- */

const OTHER_LANGUAGES = ["fr", "es", "ar"] as const;

function asTranslations(v: unknown): Translations {
  return v !== null && typeof v === "object" ? (v as Translations) : {};
}

/** Only the texts actually written: an empty field uses the translation of the site. */
function cleanTranslations(v: unknown): Translations {
  const out: Translations = {};
  for (const l of OTHER_LANGUAGES) {
    const fields = Object.entries(asTranslations(v)[l] ?? {}).filter(([, text]) => typeof text === "string" && text.trim() !== "");
    if (fields.length > 0) out[l] = Object.fromEntries(fields.map(([k, text]) => [k, text.trim()]));
  }
  return out;
}

/**
 * The texts of an item in the other languages. Empty, a field shows (in grey)
 * the translation the site already uses; written, it replaces it. A text
 * changed in English stays in English in the other languages until it has
 * its translation here.
 */
function TranslationsField({ label, fields, value, source, onChange }: { label: string; fields: readonly (readonly [string, string, boolean])[]; value: Translations; source: Rec; onChange: (v: Translations) => void }) {
  const [, setLoaded] = useState(0);
  useEffect(() => {
    Promise.all(OTHER_LANGUAGES.map((l) => loadLocale(l)))
      .then(() => setLoaded((n) => n + 1))
      .catch(() => undefined);
  }, []);
  return (
    <fieldset className="border border-white/15 p-4" data-translations>
      <legend className="px-2 text-base text-bone">{label}</legend>
      <p className="text-base text-mist">Laissez un champ vide pour garder la traduction du site, affichée en gris. Si vous changez un texte anglais plus haut, écrivez aussi sa traduction ici : sinon cette langue l'affiche en anglais.</p>
      {OTHER_LANGUAGES.map((l) => (
        <div key={l} className="mt-6 border-t border-white/10 pt-4">
          <p className="eyebrow">{LOCALE_INFO[l].name}</p>
          {fields.map(([key, name, long]) => {
            const english = asText(source[key]);
            const own = asTranslations(value)[l]?.[key] ?? "";
            const site = bundleOf(l).content[english] ?? (key === "name" && LOCALE_INFO[l].dir === "ltr" ? english : "");
            const set = (text: string) => onChange({ ...asTranslations(value), [l]: { ...(asTranslations(value)[l] ?? {}), [key]: text } });
            const props = { lang: l, dir: LOCALE_INFO[l].dir, value: own, placeholder: site, onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(e.target.value) };
            return (
              <label key={key} className="mt-3 block text-base text-bone">
                {name}
                {long ? <textarea rows={4} {...props} className={inputCls + " py-3 placeholder:text-mist/60"} /> : <input type="text" {...props} className={inputCls + " placeholder:text-mist/60"} />}
                {english && !own && !site ? <span className="mt-1 block text-base text-rose-light">Pas encore traduit : cette langue affiche le texte anglais.</span> : null}
              </label>
            );
          })}
        </div>
      ))}
    </fieldset>
  );
}

/* Form values <-> API bodies */

function toForm(kind: Kind, item: Rec): Rec {
  const f: Rec = { ...KINDS[kind].empty, ...item };
  for (const field of KINDS[kind].fields) {
    const v = f[field.key];
    if (field.type === "slugs") f[field.key] = Array.isArray(v) ? v.join(", ") : asText(v);
    if (field.type === "specs") f[field.key] = Array.isArray(v) ? (v as { label: string; value: string }[]).map((s) => s.label + " : " + s.value).join("\n") : "";
    if (field.type === "press") f[field.key] = Array.isArray(v) ? (v as { outlet: string; title: string; url: string | null }[]).map((p) => [p.outlet, p.title, p.url ?? ""].join(" | ")).join("\n") : "";
  }
  return f;
}

function toBody(kind: Kind, f: Rec, initial: Rec): Rec {
  const pressBefore = Array.isArray(initial.press) ? (initial.press as { outlet: string; image: string | null }[]) : [];
  const body: Rec = {};
  for (const field of KINDS[kind].fields) {
    const v = f[field.key];
    if (field.type === "slugs") body[field.key] = asText(v).split(",").map((s) => s.trim()).filter(Boolean);
    else if (field.type === "number") body[field.key] = asText(v).trim() === "" || Number.isNaN(Number(v)) ? null : Math.round(Number(v));
    else if (field.type === "checkbox") body[field.key] = Boolean(v);
    else if (field.type === "image") body[field.key] = asText(v);
    else if (field.type === "media") body[field.key] = asList([v])[0] ?? { type: "image", src: "" };
    else if (field.type === "medialist") body[field.key] = asList(v);
    else if (field.type === "specs")
      body[field.key] = asText(v)
        .split("\n")
        .map((l) => l.split(":"))
        .filter((p) => p.length > 1 && p[0]!.trim())
        .map((p) => ({ label: p[0]!.trim(), value: p.slice(1).join(":").trim() }));
    else if (field.type === "translations") body[field.key] = cleanTranslations(v);
    else if (field.type === "press")
      body[field.key] = asText(v)
        .split("\n")
        .map((l) => l.split("|").map((x) => x.trim()))
        .filter((p) => p[0])
        .map((p) => ({ outlet: p[0] ?? "", title: p[1] ?? "", url: p[2] || null, image: pressBefore.find((b) => b.outlet === p[0])?.image ?? null }));
    else body[field.key] = asText(v);
  }
  return body;
}

function Editor({ kind, token, initial, onDone, onExpired }: { kind: Kind; token: string; initial: Rec; onDone: (saved: boolean) => void; onExpired: () => void }) {
  const [f, setF] = useState<Rec>(() => toForm(kind, initial));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const body = toBody(kind, f, initial);
      if (initial.id) await api(token, "PUT", "/api/admin/" + kind + "/" + initial.id, body);
      else await api(token, "POST", "/api/admin/" + kind, body);
      onDone(true);
    } catch (x) {
      if (x instanceof Error && x.message === "expired") return onExpired();
      setErr(x instanceof Error ? x.message : "Enregistrement impossible.");
      setBusy(false);
    }
  };

  const field = (d: Field): ReactNode => {
    const v = f[d.key];
    if (d.type === "translations") return <TranslationsField key={d.key} label={d.label} fields={d.fields} value={asTranslations(v)} source={f} onChange={(t) => set(d.key, t)} />;
    if (d.type === "image") return <MediaField key={d.key} token={token} single imagesOnly label={d.label} value={asText(v) ? [{ type: "image", src: asText(v) }] : []} onChange={(l) => set(d.key, l[0]?.src ?? "")} />;
    if (d.type === "media") return <MediaField key={d.key} token={token} single label={d.label} value={asList([v]).filter((m) => m.src)} onChange={(l) => set(d.key, l[0] ?? { type: "image", src: "" })} />;
    if (d.type === "medialist") return <MediaField key={d.key} token={token} label={d.label} value={asList(v)} onChange={(l) => set(d.key, l)} />;
    if (d.type === "checkbox")
      return (
        <label key={d.key} className="flex min-h-12 items-center gap-3 text-base text-bone">
          <input type="checkbox" checked={Boolean(v)} onChange={(e) => set(d.key, e.target.checked)} className="size-5" /> {d.label}
        </label>
      );
    if (d.type === "select")
      return (
        <label key={d.key} className="block text-base text-bone">
          {d.label}
          <select value={asText(v)} onChange={(e) => set(d.key, e.target.value)} className={inputCls}>
            {d.options.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      );
    const area = d.type === "textarea" || d.type === "specs" || d.type === "press";
    return (
      <label key={d.key} className="block text-base text-bone">
        {d.label}
        {area ? <textarea rows={5} value={asText(v)} onChange={(e) => set(d.key, e.target.value)} className={inputCls + " py-3"} /> : <input type={d.type === "number" ? "number" : "text"} value={asText(v)} onChange={(e) => set(d.key, e.target.value)} className={inputCls} />}
      </label>
    );
  };

  return (
    <form onSubmit={submit} className="mt-8 grid gap-6 border border-rose-light/40 p-5 sm:p-8">
      <h2 className="title-caps text-2xl tracking-[0.12em]">{initial.id ? "Modifier" : "Ajouter"}</h2>
      {KINDS[kind].fields.map(field)}
      {err ? <p role="alert" className="text-base text-rose-light">{err}</p> : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={busy} className={btnMain}>{busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null} Enregistrer</button>
        <button type="button" onClick={() => onDone(false)} className={btn}>Annuler</button>
      </div>
    </form>
  );
}

function Section({ kind, token, onExpired }: { kind: Kind; token: string; onExpired: () => void }) {
  const [items, setItems] = useState<Rec[] | null>(null);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<Rec | null>(null);
  const name = KINDS[kind].name;

  const load = useCallback(async () => {
    try {
      const res = await api(token, "GET", "/api/admin/" + kind);
      setItems(Array.isArray(res.items) ? (res.items as Rec[]) : []);
      setErr("");
    } catch (x) {
      if (x instanceof Error && x.message === "expired") return onExpired();
      setErr(x instanceof Error ? x.message : "Chargement impossible.");
    }
  }, [kind, token, onExpired]);

  // One Section per tab (key): it loads its list once.
  useEffect(() => {
    let alive = true;
    api(token, "GET", "/api/admin/" + kind)
      .then((res) => {
        if (alive) setItems(Array.isArray(res.items) ? (res.items as Rec[]) : []);
      })
      .catch((x: unknown) => {
        if (!alive) return;
        if (x instanceof Error && x.message === "expired") onExpired();
        else setErr(x instanceof Error ? x.message : "Chargement impossible.");
      });
    return () => {
      alive = false;
    };
  }, [kind, token, onExpired]);

  const move = async (i: number, d: number) => {
    if (!items) return;
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const list = [...items];
    [list[i], list[j]] = [list[j]!, list[i]!];
    setItems(list);
    try {
      await api(token, "POST", "/api/admin/" + kind + "/reorder", { ids: list.map((x) => x.id) });
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Réordonnancement impossible.");
      void load();
    }
  };

  const remove = async (item: Rec) => {
    if (!window.confirm("Supprimer « " + asText(item[name]) + " » ? Cette action est définitive.")) return;
    try {
      await api(token, "DELETE", "/api/admin/" + kind + "/" + item.id);
      void load();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Suppression impossible.");
    }
  };

  if (editing) return <Editor kind={kind} token={token} initial={editing} onExpired={onExpired} onDone={(saved) => { setEditing(null); if (saved) void load(); }} />;

  const thumbOf = (item: Rec): string => {
    if (typeof item.cover === "string") return item.cover;
    const cover = item.cover as MediaItem | undefined;
    if (cover?.src) return cover.type === "video" ? (cover.poster ?? "") : cover.src;
    if (typeof item.portrait === "string" && item.portrait) return item.portrait;
    return asList(item.images)[0]?.src ?? "";
  };

  return (
    <div className="mt-8">
      <button type="button" onClick={() => setEditing({ ...KINDS[kind].empty })} className={btnMain}>
        <Plus className="size-4" aria-hidden="true" /> Ajouter
      </button>
      {err ? <p role="alert" className="mt-4 text-base text-rose-light">{err}</p> : null}
      {items === null ? (
        <p className="mt-8 flex items-center gap-3 text-bone"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Chargement</p>
      ) : items.length === 0 ? (
        <p className="mt-8 border border-white/15 p-8 text-center text-bone">Rien pour l'instant.</p>
      ) : (
        <ul className="mt-8 border-t border-white/15">
          {items.map((item, i) => (
            <li key={String(item.id)} className="flex flex-wrap items-center gap-4 border-b border-white/15 py-4">
              <span className="size-14 shrink-0 overflow-hidden bg-ink-soft">{thumbOf(item) ? <img src={thumbOf(item)} alt="" className="h-full w-full object-cover" /> : null}</span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-lg text-white">
                  {asText(item[name])}
                  {item.draft === true ? <span className="ml-3 inline-block border border-rose-light/60 px-2 align-middle text-base text-rose-light">Brouillon</span> : null}
                </span>
                <span className="block text-base text-mist">/{asText(item.slug)}{Array.isArray(item.media) ? " · " + item.media.length + " fichiers" : ""}</span>
              </span>
              <span className="flex gap-2">
                <button type="button" aria-label="Monter" onClick={() => void move(i, -1)} className={iconBtn}><ArrowUp className="size-4" aria-hidden="true" /></button>
                <button type="button" aria-label="Descendre" onClick={() => void move(i, 1)} className={iconBtn}><ArrowDown className="size-4" aria-hidden="true" /></button>
                <button type="button" aria-label="Modifier" onClick={() => setEditing(item)} className={iconBtn}><Pencil className="size-4" aria-hidden="true" /></button>
                <button type="button" aria-label="Supprimer" onClick={() => void remove(item)} className={iconBtn}><Trash2 className="size-4" aria-hidden="true" /></button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Messages({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [data, setData] = useState<{ messages: Rec[]; callbacks: Rec[] } | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api(token, "GET", "/api/admin/messages")
      .then((res) => setData({ messages: (res.messages as Rec[]) ?? [], callbacks: (res.callbacks as Rec[]) ?? [] }))
      .catch((x: unknown) => {
        if (x instanceof Error && x.message === "expired") onExpired();
        else setErr(x instanceof Error ? x.message : "Chargement impossible.");
      });
  }, [token, onExpired]);
  if (err) return <p role="alert" className="mt-8 text-base text-rose-light">{err}</p>;
  if (!data) return <p className="mt-8 flex items-center gap-3 text-bone"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Chargement</p>;
  const date = (v: unknown) => new Date(asText(v)).toLocaleString("fr-FR");
  const languageName = (v: unknown) => "écrit depuis le site en " + ({ en: "anglais", fr: "français", es: "espagnol", ar: "arabe" }[asText(v)] ?? "anglais");
  return (
    <div className="mt-8 grid gap-12">
      <div>
        <h2 className="title-caps text-2xl tracking-[0.12em]">Demandes de rappel</h2>
        {data.callbacks.length === 0 ? <p className="mt-4 text-bone">Aucune pour l'instant.</p> : null}
        <ul className="mt-4 border-t border-white/15">
          {data.callbacks.map((c) => (
            <li key={String(c.id)} className="border-b border-white/15 py-4 text-base">
              <span className="text-white">{asText(c.name)}</span> · <a href={"tel:" + asText(c.phone)} className="text-rose-light">{asText(c.phone)}</a>
              {c.interest ? <span className="text-bone"> · {asText(c.interest)}</span> : null}
              <span className="block text-mist">{date(c.createdAt)} · {languageName(c.language)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="title-caps text-2xl tracking-[0.12em]">Messages</h2>
        {data.messages.length === 0 ? <p className="mt-4 text-bone">Aucun pour l'instant.</p> : null}
        <ul className="mt-4 border-t border-white/15">
          {data.messages.map((m) => (
            <li key={String(m.id)} className="border-b border-white/15 py-4 text-base">
              <span className="text-white">{asText(m.name)}</span> · <a href={"mailto:" + asText(m.email)} className="text-rose-light">{asText(m.email)}</a>
              <span className="block text-mist">{date(m.createdAt)} · {languageName(m.language)}</span>
              <p className="mt-2 whitespace-pre-line text-bone" dir="auto">{asText(m.message)}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Admin() {
  const token = useSyncExternalStore(subscribeToken, readToken, () => "");
  const [tab, setTab] = useState<Tab>("stories");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const logout = useCallback(() => writeToken(""), []);

  const login = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const json = (await res.json().catch(() => ({}))) as Rec;
      if (!res.ok || typeof json.token !== "string") throw new Error(typeof json.error === "string" ? json.error : "Connexion impossible.");
      writeToken(json.token);
      setPassword("");
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-5xl px-5 pt-36 pb-24 sm:px-8 lg:pt-44">
      <p className="eyebrow">Back-office</p>
      <h1 className="title-caps mt-5 text-[clamp(2.25rem,6vw,4.5rem)] tracking-[0.12em]">Administration</h1>
      {!token ? (
        <form onSubmit={login} className="mt-10 grid max-w-md gap-5">
          <label className="block text-base text-bone">
            Mot de passe
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          </label>
          {err ? <p role="alert" className="text-base text-rose-light">{err}</p> : null}
          <button type="submit" disabled={busy || !password} className={btnMain}>{busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null} Se connecter</button>
        </form>
      ) : (
        <>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <div role="tablist" aria-label="Contenus" className="flex flex-wrap gap-3">
              {TABS.map((t) => (
                <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={btn + (tab === t.key ? " border-rose-light text-rose-light" : "")}>
                  {t.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={logout} className={btn}><LogOut className="size-4" aria-hidden="true" /> Déconnexion</button>
          </div>
          {tab === "messages" ? <Messages token={token} onExpired={logout} /> : <Section key={tab} kind={tab} token={token} onExpired={logout} />}
        </>
      )}
    </section>
  );
}
