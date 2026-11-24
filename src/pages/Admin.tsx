import { useCallback, useEffect, useState, useSyncExternalStore, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, LoaderCircle, LogOut, Pencil, Plus, Trash2, X } from "lucide-react";
import Logo from "@/components/Logo";
import Universe, { universeProps } from "@/components/Universe";
import { ANGLE_LANGUAGES, cleanAngles } from "@/data/angles";
import { cleanAtelier, filmId, FILMS, filmTime, resolveAtelier, type Film, type FilmKind, type PieceAtelier } from "@/data/atelier";
import { cleanDetailPoints, pointsFor, type PieceDetailPoints } from "@/data/details3d";
import type { PublicModel } from "@/data/models";
import { HOUSE_PHOTO_PLACES } from "@/data/house";
import { cleanShowcase, CUTOUTS, cutoutSrc, resolveShowcase, SHOWCASE_BY_DEFAULT, type CutoutView, type PieceShowcase } from "@/data/showcase";
import {
  BACKDROPS,
  cleanTheme,
  EFFECT_NAMES,
  ENTRANCE_NAMES,
  LIGHT_NAMES,
  resolveTheme,
  TEXTURE_NAMES,
  THEME_EFFECTS,
  THEME_ENTRANCES,
  THEME_FONT_KEYS,
  THEME_FONTS,
  THEME_LIGHTS,
  THEME_PRESETS,
  THEME_TEXTURES,
  type PieceTheme,
  type ThemeFontSpec,
} from "@/data/themes";
import { PIECE_TYPES, type Angle, type MediaItem, type PieceAngles, type Translations } from "@/data/types";
import { bundleOf, loadLocale, LOCALE_INFO, useI18n } from "@/i18n";
import { Detail3D } from "@/viewer";
import Clients from "@/pages/admin/Clients";
import Models3D from "@/pages/admin/Models3D";
import { adminCall, btn, btnMain, iconBtn, inputCls, readyModels, type ModelSummary } from "@/pages/admin/ui";
import { HAS_SERVER } from "@/lib/site";

/*
 * Back-office of the site (/admin), in French for the owner. It edits the same
 * catalogue the site shows (server/routes/site.ts): stories, people, pieces,
 * boxes, and reads the messages sent from the site. Password: ADMIN_PASSWORD.
 */

type Rec = Record<string, unknown> & { id?: string };
type Kind = "stories" | "people" | "pieces" | "boxes";
type Tab = Kind | "messages" | "3d" | "clients" | "house" | "cutouts";

type Field =
  | { key: string; label: string; type: "text" | "textarea" | "number" | "checkbox" | "slugs" }
  | { key: string; label: string; type: "select"; options: readonly (readonly [string, string])[] }
  | { key: string; label: string; type: "image" | "media" | "medialist" }
  | { key: string; label: string; type: "specs" | "press" | "details" }
  /** The universe of the page of a piece (src/data/themes.ts). */
  | { key: string; label: string; type: "theme" }
  /** How the opening shows the jewel: one cut-out view or a showcase (src/data/showcase.ts). */
  | { key: string; label: string; type: "showcase" }
  /** Its atelier: the making-of and the finished piece played full screen, and their image (src/data/atelier.ts). */
  | { key: string; label: string; type: "atelier" }
  /** The 3D model shown on the page of the piece (kept with the model, not with the piece). */
  | { key: string; label: string; type: "model3d" }
  /** "The Art of Detail" in 3D: a point of the model for each detail, placed by a click on it (src/data/details3d.ts). */
  | { key: string; label: string; type: "detailPoints" }
  /** "Every Angle": a small title and a text for each photo of the piece, and their translations (src/data/angles.ts). */
  | { key: string; label: string; type: "angles" }
  /** The texts of the item in French, Spanish and Arabic: [field, its name, long text]. */
  | { key: string; label: string; type: "translations"; fields: readonly (readonly [string, string, boolean])[] };

const TRANSLATIONS_LABEL = "Traductions";

const TYPE_NAMES: Record<string, string> = { chain: "Chaîne", pendant: "Pendentif", ring: "Bague", bracelet: "Bracelet", watch: "Montre" };

/** add / edit: the words of the buttons and titles ("Ajouter une story", "Modifier la story"). */
const KINDS: Record<Kind, { label: string; add: string; edit: string; name: string; fields: Field[]; empty: Rec }> = {
  stories: {
    label: "Stories",
    add: "Ajouter une story",
    edit: "Modifier la story",
    name: "title",
    fields: [
      { key: "title", label: "Titre", type: "text" },
      { key: "slug", label: "Adresse web (ex. kevin-schade)", type: "text" },
      { key: "cover", label: "Image de la bulle", type: "image" },
      { key: "media", label: "Photos et vidéos, dans l'ordre", type: "medialist" },
      { key: "people", label: "Joueurs liés (adresses web, séparées par des virgules)", type: "slugs" },
      { key: "pieceSlug", label: "Pièce liée (adresse web)", type: "text" },
      { key: "articleUrl", label: "Lien d'un article", type: "text" },
      { key: "translations", label: TRANSLATIONS_LABEL, type: "translations", fields: [["title", "Titre", false]] },
    ],
    empty: { title: "", slug: "", cover: "", media: [], people: [], pieceSlug: "", articleUrl: "" },
  },
  people: {
    label: "Le Cercle Berete",
    add: "Ajouter un joueur",
    edit: "Modifier le joueur",
    name: "name",
    fields: [
      { key: "name", label: "Nom", type: "text" },
      { key: "slug", label: "Adresse web (ex. kevin-schade)", type: "text" },
      { key: "kind", label: "Type", type: "select", options: [["player", "Joueur"], ["club", "Club"], ["personality", "Personnalité"]] },
      { key: "number", label: "Numéro", type: "number" },
      { key: "club", label: "Club", type: "text" },
      { key: "portrait", label: "Photo de profil (vide : une photo des stories recadrée sur la personne, sinon ses initiales)", type: "image" },
      { key: "instagram", label: "Instagram (le pseudo seul, sans @ ; vide : pas de lien)", type: "text" },
      { key: "bio", label: "Texte", type: "textarea" },
      { key: "translations", label: TRANSLATIONS_LABEL, type: "translations", fields: [["name", "Nom", false], ["bio", "Texte", true]] },
    ],
    empty: { name: "", slug: "", kind: "player", number: null, club: "", portrait: "", instagram: "", bio: "" },
  },
  pieces: {
    label: "Pièces",
    add: "Ajouter une pièce",
    edit: "Modifier la pièce",
    name: "title",
    fields: [
      { key: "title", label: "Titre", type: "text" },
      { key: "slug", label: "Adresse web (ex. kevin-schade-pendant)", type: "text" },
      { key: "type", label: "Type", type: "select", options: PIECE_TYPES.map((t) => [t, TYPE_NAMES[t] ?? t] as const) },
      { key: "line", label: "Phrase d'accroche", type: "text" },
      { key: "story", label: "Texte (une ligne vide entre deux paragraphes ; « ## » au début d'un paragraphe = un titre de partie, « > » = la citation de fin)", type: "textarea" },
      { key: "client", label: "Client", type: "text" },
      { key: "clientPublic", label: "Afficher le client", type: "checkbox" },
      { key: "featured", label: "Mettre à la une de l'accueil", type: "checkbox" },
      { key: "draft", label: "Brouillon (textes à valider)", type: "checkbox" },
      { key: "published", label: "Publiée sur le site (décochée : la pièce n'apparaît nulle part sur le site ; son ancienne adresse mène à la page de son joueur)", type: "checkbox" },
      { key: "cover", label: "Photo d'ouverture", type: "media" },
      { key: "theme", label: "Univers de la page (le fond, la police du titre, l'entrée et les effets de la page de la pièce)", type: "theme" },
      { key: "showcase", label: "Vitrine de l'ouverture (le bijou détouré : une vue ou plusieurs vues)", type: "showcase" },
      { key: "atelier", label: "L'atelier de la pièce (« Entrer dans l'atelier » : la vidéo de fabrication, puis la pièce finie)", type: "atelier" },
      { key: "model3d", label: "Modèle 3D sur la page", type: "model3d" },
      { key: "gallery", label: "Photos de « Sous tous les angles », dans l'ordre", type: "medialist" },
      { key: "angles", label: "« Sous tous les angles » : une courte légende, seulement sur les photos où elle apprend quelque chose (en anglais, puis ses traductions si vous le voulez). Le site n'affiche que le titre, jamais le texte (Yoni, 23/11/2026)", type: "angles" },
      { key: "handover", label: "Remise au client", type: "medialist" },
      { key: "specs", label: "Composition & Savoir-faire (une ligne par info, ex. Gold : 18 carats ; une ligne vide n'apparaît pas sur le site ; « Precious Materials » : d'après les photos, à faire valider par Yoni ; jamais un chiffre inventé)", type: "specs" },
      { key: "details", label: "Les détails, un symbole par ligne : Titre | Texte | n° de la photo qui le montre (1 = photo d'ouverture, 2 = 1re photo des détails…)", type: "details" },
      { key: "detailPoints", label: "Les détails sur le modèle 3D (« The Art of Detail » : un point de la pièce pour chaque détail, relié à son étiquette)", type: "detailPoints" },
      { key: "press", label: "Presse (une ligne : Média | Titre | Lien)", type: "press" },
      { key: "people", label: "Joueurs liés (adresses web, séparées par des virgules)", type: "slugs" },
      { key: "boxSlug", label: "Écrin lié (adresse web)", type: "text" },
      { key: "translations", label: TRANSLATIONS_LABEL, type: "translations", fields: [["title", "Titre", false], ["line", "Phrase d'accroche", false], ["story", "Texte", true]] },
    ],
    empty: { title: "", slug: "", type: "ring", line: "", story: "", client: "", clientPublic: false, featured: false, draft: false, published: true, theme: null, showcase: null, atelier: null, detailPoints: null, angles: {}, cover: { type: "image", src: "" }, gallery: [], handover: [], specs: [], details: [], press: [], people: [], boxSlug: "" },
  },
  boxes: {
    label: "Écrins Signature",
    add: "Ajouter un écrin",
    edit: "Modifier l'écrin",
    name: "name",
    fields: [
      { key: "name", label: "Nom", type: "text" },
      { key: "slug", label: "Adresse web (ex. ecrin-inter)", type: "text" },
      { key: "description", label: "Texte", type: "textarea" },
      { key: "images", label: "Photos", type: "medialist" },
      { key: "pieceSlug", label: "Pièce liée (adresse web de la pièce, ex. the-hand : elle sort de l'écrin ouvert et « Découvrir la pièce » y mène ; vide = pièce pas encore connue, seulement « Créer votre écrin »)", type: "text" },
      { key: "published", label: "Publié sur le site (décoché : l'écrin n'apparaît nulle part sur le site)", type: "checkbox" },
      { key: "translations", label: TRANSLATIONS_LABEL, type: "translations", fields: [["name", "Nom", false], ["description", "Texte", true]] },
    ],
    empty: { name: "", slug: "", description: "", images: [], pieceSlug: "", published: true },
  },
};

/** The pieces and their 3D first: what the jeweller changes most. */
const TABS: { key: Tab; label: string }[] = [
  { key: "pieces", label: KINDS.pieces.label },
  { key: "3d", label: "Modèles 3D" },
  { key: "clients", label: "Clients VIP" },
  { key: "stories", label: KINDS.stories.label },
  { key: "people", label: KINDS.people.label },
  { key: "boxes", label: KINDS.boxes.label },
  { key: "cutouts", label: "Détourages" },
  { key: "house", label: "La Maison" },
  { key: "messages", label: "Messages" },
];

/* The open tab, kept for the visit (a reload stays on it). */
const TAB_KEY = "bj-admin-tab";


/** The lines of the composition of a piece, in English (the site translates them: piece.composition in src/i18n/ui). */
const COMPOSITION_LINES = ["Gold", "Gold weight", "Diamonds", "Total diamond weight", "Coloured stones", "Hours of work"];

function readTab(): Tab {
  try {
    const tab = sessionStorage.getItem(TAB_KEY);
    return TABS.some((t) => t.key === tab) ? (tab as Tab) : "pieces";
  } catch {
    return "pieces";
  }
}

function writeTab(tab: Tab): void {
  try {
    sessionStorage.setItem(TAB_KEY, tab);
  } catch {
    /* storage unavailable */
  }
}

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
const api = adminCall as (token: string, method: string, url: string, body?: unknown) => Promise<Rec>;

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

const OTHER_LANGUAGES = ["fr", "es", "de", "nl", "ar"] as const;

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
      <p className="text-base text-mist">Laissez vide pour garder la traduction du site (en gris).</p>
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
                {english && !own && !site ? <span className="mt-1 block text-base text-rose-light">Pas traduit : le texte anglais s'affiche.</span> : null}
              </label>
            );
          })}
        </div>
      ))}
    </fieldset>
  );
}

/**
 * "Every Angle": for each photo of the piece (its opening photo first, then the others, in their order), its small title
 * and its text in English, and below them their translations. Empty, a translation shows (in grey) the one the site
 * already uses; written, it replaces it. A photo whose title and text are emptied shows no text on the site.
 */
function AnglesField({ label, photos, value, onChange }: { label: string; photos: MediaItem[]; value: PieceAngles; onChange: (v: PieceAngles) => void }) {
  const [, setLoaded] = useState(0);
  useEffect(() => {
    Promise.all(ANGLE_LANGUAGES.map((l) => loadLocale(l)))
      .then(() => setLoaded((n) => n + 1))
      .catch(() => undefined);
  }, []);
  const entry = (src: string): Angle => value[src] ?? { title: "", text: "" };
  const put = (src: string, next: Angle) => onChange({ ...value, [src]: next });
  return (
    <fieldset className="border border-white/15 p-4" data-angles-field>
      <legend className="px-2 text-base text-bone">{label}</legend>
      <p className="text-base text-mist">La photo d'ouverture n'apparaît dans « Sous tous les angles » que si l'ouverture montre le bijou détouré, ou si la pièce n'a pas d'autre photo.</p>
      {photos.length === 0 ? <p className="mt-3 text-base text-mist">Ajoutez d'abord des photos.</p> : null}
      <ol className="mt-4 grid gap-5">
        {photos.map((m, i) => {
          const a = entry(m.src);
          return (
            <li key={m.src} data-angle-edit={m.src} className="grid gap-3 border border-white/10 p-3 sm:grid-cols-[6rem_1fr] sm:gap-4">
              <span className="relative block size-24 overflow-hidden bg-ink-soft">
                <Thumb m={m} />
                <span className="absolute start-1 top-1 bg-ink/80 px-1.5 text-sm text-white">{i === 0 ? "Ouverture" : String(i).padStart(2, "0")}</span>
              </span>
              <span className="grid min-w-0 gap-2">
                <label className="block text-base text-bone">
                  Petit titre
                  <input type="text" value={a.title} onChange={(e) => put(m.src, { ...a, title: e.target.value })} className={inputCls} />
                </label>
                <label className="block text-base text-bone">
                  Texte (une ou deux phrases)
                  <textarea rows={2} value={a.text} onChange={(e) => put(m.src, { ...a, text: e.target.value })} className={inputCls + " py-3"} />
                </label>
                <details className="text-base text-bone">
                  <summary className="cursor-pointer py-2 text-rose-light">Traductions</summary>
                  {ANGLE_LANGUAGES.map((l) => {
                    const own = a.translations?.[l] ?? {};
                    const site = bundleOf(l).content;
                    const setOwn = (k: "title" | "text", text: string) => put(m.src, { ...a, translations: { ...a.translations, [l]: { ...own, [k]: text } } });
                    const props = { lang: l, dir: LOCALE_INFO[l].dir };
                    return (
                      <div key={l} className="mt-3 border-t border-white/10 pt-3">
                        <p className="eyebrow">{LOCALE_INFO[l].name}</p>
                        <input type="text" aria-label={"Petit titre · " + LOCALE_INFO[l].name} {...props} value={own.title ?? ""} placeholder={site[a.title] ?? ""} onChange={(e) => setOwn("title", e.target.value)} className={inputCls + " placeholder:text-mist/60"} />
                        <textarea rows={2} aria-label={"Texte · " + LOCALE_INFO[l].name} {...props} value={own.text ?? ""} placeholder={site[a.text] ?? ""} onChange={(e) => setOwn("text", e.target.value)} className={inputCls + " py-3 placeholder:text-mist/60"} />
                        {(a.title && !own.title && !site[a.title]) || (a.text && !own.text && !site[a.text]) ? <span className="mt-1 block text-base text-rose-light">Pas traduit : le texte anglais s'affiche.</span> : null}
                      </div>
                    );
                  })}
                </details>
              </span>
            </li>
          );
        })}
      </ol>
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
    if (field.type === "details") {
      const photos = photosOf(f);
      f[field.key] = Array.isArray(v) ? (v as { title: string; text: string; photo: string | null }[]).map((d) => [d.title, d.text, d.photo && photos.includes(d.photo) ? String(photos.indexOf(d.photo) + 1) : ""].join(" | ").replace(/ \| $/, "")).join("\n") : "";
    }
  }
  return f;
}

/** The photos of a piece, as numbered in "Les détails": its opening photo, then the photos of the details. */
function photosOf(f: Rec): string[] {
  return asList([f.cover, ...asList(f.gallery)]).map((m) => m.src);
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
    else if (field.type === "details")
      body[field.key] = asText(v)
        .split("\n")
        .map((l) => l.split("|").map((x) => x.trim()))
        .filter((p) => p[0])
        .map((p) => ({ title: p[0] ?? "", text: p[1] ?? "", photo: photosOf(f)[Number(p[2]) - 1] ?? null }));
    else if (field.type === "translations") body[field.key] = cleanTranslations(v);
    else if (field.type === "theme") body[field.key] = cleanTheme(v);
    else if (field.type === "showcase") body[field.key] = cleanShowcase(v);
    else if (field.type === "atelier") body[field.key] = cleanAtelier(v);
    else if (field.type === "detailPoints") body[field.key] = cleanDetailPoints(v);
    else if (field.type === "angles") {
      // Only the photos still in the piece.
      const photos = new Set(photosOf(f));
      body[field.key] = Object.fromEntries(Object.entries(cleanAngles(v)).filter(([src]) => photos.has(src)));
    }
    else if (field.type === "model3d") continue;
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

/**
 * The 3D model shown on the page of a piece: none, or one of the models of
 * the tab "Modèles 3D" (one per piece; a model already on another piece moves).
 */
function ModelPicker({ label, models, value, slug, titles, onChange }: { label: string; models: ModelSummary[] | null; value: string; slug: string; titles: Record<string, string>; onChange: (id: string) => void }) {
  const option = "flex min-h-16 items-center gap-3 border px-3 py-2 text-base text-white has-[:checked]:border-rose-light";
  return (
    <fieldset className="border border-white/15 p-4" data-model-picker>
      <legend className="px-2 text-base text-bone">{label}</legend>
      <p className="text-base text-mist">Les visiteurs le tournent et changent le métal, en haut de la page de la pièce.</p>
      {models === null ? (
        <p className="mt-3 flex items-center gap-3 text-bone"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Chargement</p>
      ) : models.length === 0 ? (
        <p className="mt-3 text-base text-mist">Aucun modèle pour l'instant : envoyez-en un dans l'onglet Modèles 3D.</p>
      ) : (
        <ul className="mt-3 grid max-h-[26rem] gap-2 overflow-y-auto sm:grid-cols-2">
          <li>
            <label className={option + " border-white/10"}>
              <input type="radio" name="model3d" className="size-5 shrink-0" checked={value === ""} onChange={() => onChange("")} />
              Pas de modèle 3D
            </label>
          </li>
          {models.map((m) => {
            const elsewhere = m.pieceSlug && m.pieceSlug !== slug ? titles[m.pieceSlug] ?? m.pieceSlug : null;
            return (
              <li key={m.id}>
                <label className={option + " border-white/10"} data-model-option={m.name}>
                  <input type="radio" name="model3d" className="size-5 shrink-0" checked={value === m.id} onChange={() => onChange(m.id)} />
                  <span className="block size-12 shrink-0 overflow-hidden bg-ink-soft">{m.preview?.poster ? <img src={m.preview.poster} alt="" className="h-full w-full object-cover" /> : null}</span>
                  <span className="min-w-0">
                    <span className="block break-words">{m.name}</span>
                    {elsewhere ? <span className="block text-mist">Aujourd'hui sur « {elsewhere} »</span> : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}

function Editor({ kind, token, initial, models, titles, onDone, onExpired }: { kind: Kind; token: string; initial: Rec; models: ModelSummary[] | null; titles: Record<string, string>; onDone: (saved: boolean) => void; onExpired: () => void }) {
  const [f, setF] = useState<Rec>(() => toForm(kind, initial));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // The 3D model of a piece: null while untouched (then the one it has).
  const [model3d, setModel3d] = useState<string | null>(null);
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  const slugBefore = asText(initial.slug);
  const modelBefore = (slugBefore && models?.find((m) => m.pieceSlug === slugBefore)?.id) || "";
  const modelChosen = model3d ?? modelBefore;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const body = toBody(kind, f, initial);
      if (initial.id) await api(token, "PUT", "/api/admin/" + kind + "/" + initial.id, body);
      else await api(token, "POST", "/api/admin/" + kind, body);
      if (kind === "pieces" && modelChosen !== modelBefore) await api(token, "PUT", "/api/admin/pieces/" + encodeURIComponent(asText(body.slug)) + "/model", { modelId: modelChosen || null });
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
    if (d.type === "theme") return <ThemeField key={d.key} token={token} label={d.label} value={cleanTheme(v)} onChange={(t) => set(d.key, t)} />;
    if (d.type === "atelier") return <AtelierField key={d.key} label={d.label} slug={asText(f.slug)} titles={titles} value={cleanAtelier(v)} onChange={(a) => set(d.key, a)} />;
    if (d.type === "showcase") return <ShowcaseField key={d.key} label={d.label} slug={asText(f.slug)} value={cleanShowcase(v)} onChange={(c) => set(d.key, c)} />;
    if (d.type === "angles") return <AnglesField key={d.key} label={d.label} photos={asList([f.cover, ...asList(f.gallery)]).filter((m, i, all) => m.src && all.findIndex((x) => x.src === m.src) === i)} value={cleanAngles(v)} onChange={(a) => set(d.key, a)} />;
        if (d.type === "model3d") return <ModelPicker key={d.key} label={d.label} models={models} value={modelChosen} slug={asText(initial.slug)} titles={titles} onChange={setModel3d} />;
    if (d.type === "detailPoints")
      return (
        <DetailPointsField
          key={d.key}
          label={d.label}
          model={(modelChosen && models?.find((m) => m.id === modelChosen)?.preview) || null}
          titles={asText(f.details)
            .split("\n")
            .map((l) => l.split("|")[0]!.trim())
            .filter(Boolean)}
          value={cleanDetailPoints(v)}
          onChange={(p) => set(d.key, p)}
        />
      );
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
    const area = d.type === "textarea" || d.type === "specs" || d.type === "press" || d.type === "details";
    // Composition (Yoni, 24/11/2026): the lines he will send piece by piece, ready to fill; an empty line never shows on the site.
    const prepare = () => {
      const text = asText(v);
      const have = new Set(text.split("\n").map((l) => l.split(":")[0]!.trim()).filter(Boolean));
      const missing = COMPOSITION_LINES.filter((l) => !have.has(l)).map((l) => l + " : ");
      set(d.key, [text.trim(), ...missing].filter(Boolean).join("\n"));
    };
    return (
      <label key={d.key} className="block text-base text-bone">
        {d.label}
        {area ? <textarea rows={d.type === "specs" ? 8 : 5} value={asText(v)} onChange={(e) => set(d.key, e.target.value)} className={inputCls + " py-3"} /> : <input type={d.type === "number" ? "number" : "text"} value={asText(v)} onChange={(e) => set(d.key, e.target.value)} className={inputCls} />}
        {d.type === "specs" ? (
          <button type="button" onClick={prepare} data-composition-lines className={btn + " mt-3"}>
            Préparer les lignes de composition (poids de l'or, carats…)
          </button>
        ) : null}
      </label>
    );
  };

  return (
    <form onSubmit={submit} className="mt-8 grid gap-6 border border-rose-light/40 p-5 sm:p-8">
      <h2 className="title-caps text-2xl tracking-[0.12em]">{initial.id ? KINDS[kind].edit : KINDS[kind].add}</h2>
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
  // The pieces show which of them has a 3D model, and choose it.
  const [models, setModels] = useState<ModelSummary[] | null>(null);
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

  const loadModels = useCallback(() => {
    if (kind !== "pieces") return;
    readyModels(token)
      .then(setModels)
      .catch(() => setModels([]));
  }, [kind, token]);

  // One Section per tab (key): it loads its list once.
  useEffect(() => {
    let alive = true;
    if (kind === "pieces")
      readyModels(token)
        .then((m) => alive && setModels(m))
        .catch(() => alive && setModels([]));
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

  const titles = Object.fromEntries((items ?? []).map((x) => [asText(x.slug), asText(x[name])]));
  const has3d = new Set((models ?? []).map((m) => m.pieceSlug).filter(Boolean));

  if (editing)
    return (
      <Editor
        kind={kind}
        token={token}
        initial={editing}
        models={models}
        titles={titles}
        onExpired={onExpired}
        onDone={(saved) => {
          setEditing(null);
          if (saved) {
            void load();
            loadModels();
          }
        }}
      />
    );

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
        <Plus className="size-4" aria-hidden="true" /> {KINDS[kind].add}
      </button>
      {err ? <p role="alert" className="mt-4 text-base text-rose-light">{err}</p> : null}
      {items === null ? (
        <p className="mt-8 flex items-center gap-3 text-bone"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Chargement</p>
      ) : items.length === 0 ? (
        <p className="mt-8 border border-white/15 p-8 text-center text-bone">Aucun élément pour l'instant.</p>
      ) : (
        <ul className="mt-8 border-t border-white/15">
          {items.map((item, i) => (
            <li key={String(item.id)} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-b border-white/15 py-4 sm:flex" data-admin-row={asText(item.slug)}>
              <span className="size-14 shrink-0 overflow-hidden bg-ink-soft">{thumbOf(item) ? <img src={thumbOf(item)} alt="" className="h-full w-full object-cover" /> : null}</span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-base text-white">{asText(item[name])}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-base text-mist">
                  {has3d.has(asText(item.slug)) ? <span className="border border-rose-light/60 px-2 text-rose-light" data-row-3d>3D</span> : null}
                  {item.published === false ? <span className="border border-rose-light/60 px-2 text-rose-light" data-row-unpublished>{kind === "boxes" ? "Non publié" : "Non publiée"}</span> : null}
                  {item.draft === true ? <span className="border border-white/25 px-2 text-bone">Brouillon</span> : null}
                  <span className="break-all">/{asText(item.slug)}{Array.isArray(item.media) ? " · " + item.media.length + " fichiers" : ""}</span>
                </span>
              </span>
              <span className="col-span-2 flex gap-2 sm:col-span-1">
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

/**
 * The universe of the page of a piece: a preset of the house, then, if wanted, each of its parts: the backdrop (an AI
 * background of the house, an image sent here, or none: a procedural composition), the typography of the title, the
 * entrance, the effects, a watermark, the colours, the texture and the light. The small window shows it as the page will
 * (its entrance plays again on demand); the effects that move with the scroll live on the page only.
 */
function ThemeField({ token, label, value, onChange }: { token: string; label: string; value: PieceTheme | null; onChange: (v: PieceTheme | null) => void }) {
  const resolved = resolveTheme(value);
  const [replay, setReplay] = useState(0);
  const set = (patch: Partial<PieceTheme>) => onChange({ ...(value ?? { preset: resolved.preset }), ...patch });
  const font = THEME_FONTS[resolved.font] as ThemeFontSpec;
  const uploaded = resolved.backdrop && !BACKDROPS[resolved.backdrop] ? resolved.backdrop : "";
  const colours: [keyof PieceTheme & ("base" | "tint" | "glow"), string][] = [
    ["base", "Fond (presque noir)"],
    ["tint", "Couleur de l'univers"],
    ["glow", "Couleur de la lumière et des effets"],
  ];
  const toggle = (e: (typeof THEME_EFFECTS)[number]) => set({ effects: resolved.effects.includes(e) ? resolved.effects.filter((x) => x !== e) : [...resolved.effects, e] });
  return (
    <fieldset data-theme-field className="grid gap-4 border border-white/15 p-4 sm:p-5">
      <legend className="px-2 text-base text-bone">{label}</legend>
      <div
        key={resolved.preset + resolved.entrance + resolved.backdrop + replay}
        data-entering=""
        data-entrance={resolved.entrance}
        {...universeProps(resolved)}
        className="relative isolate h-56 overflow-hidden border border-white/10 sm:h-64"
        aria-hidden="true"
      >
        <Universe theme={resolved} preview />
        <p
          data-theme-preview-title
          className="absolute inset-x-4 bottom-4 text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.8)]"
          style={{
            fontFamily: font.family ? '"' + font.family + '", var(--font-display)' : "var(--font-display)",
            fontWeight: font.weight,
            fontStyle: font.italic ? "italic" : "normal",
            textTransform: font.caps ? "uppercase" : "none",
            letterSpacing: font.tracking,
            fontSize: "calc(1.75rem * " + font.scale + ")",
            lineHeight: 1.1,
          }}
        >
          Le titre de la pièce
        </p>
      </div>
      <button type="button" onClick={() => setReplay((r) => r + 1)} className={btn + " w-fit"}>Rejouer l&apos;entrée</button>
      <label className="block text-base text-bone">
        Univers
        <select value={resolved.preset} onChange={(e) => onChange({ preset: e.target.value })} className={inputCls}>
          {Object.entries(THEME_PRESETS).map(([key, p]) => (
            <option key={key} value={key}>{p.name}</option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-base text-bone">
          Fond
          <select value={uploaded ? "__image" : resolved.backdrop} onChange={(e) => e.target.value !== "__image" && set({ backdrop: e.target.value })} className={inputCls}>
            <option value="">Composition (lumière, matière, particules)</option>
            {Object.entries(BACKDROPS).map(([key, b]) => (
              <option key={key} value={key}>Fond IA : {b.name}</option>
            ))}
            {uploaded ? <option value="__image">Image envoyée</option> : null}
          </select>
        </label>
        <label className="block text-base text-bone">
          Typographie du titre
          <select value={resolved.font} onChange={(e) => set({ font: e.target.value as PieceTheme["font"] })} className={inputCls}>
            {THEME_FONT_KEYS.map((k) => (
              <option key={k} value={k}>{(THEME_FONTS[k] as ThemeFontSpec).name}</option>
            ))}
          </select>
        </label>
      </div>
      <MediaField
        token={token}
        single
        imagesOnly
        label="Ou une image de fond envoyée (sombre, au moins 2000 px de large)"
        value={uploaded ? [{ type: "image", src: uploaded }] : []}
        onChange={(l) => set({ backdrop: l[0]?.src ?? "" })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-base text-bone">
          Effet d&apos;entrée (la première visite)
          <select value={resolved.entrance} onChange={(e) => set({ entrance: e.target.value as PieceTheme["entrance"] })} className={inputCls}>
            {THEME_ENTRANCES.map((x) => (
              <option key={x} value={x}>{ENTRANCE_NAMES[x]}</option>
            ))}
          </select>
        </label>
        <label className="block text-base text-bone">
          Filigrane (un signe, 4 caractères au plus)
          <input value={resolved.mark} maxLength={4} onChange={(e) => set({ mark: e.target.value })} placeholder="力, 20, OKA…" className={inputCls} />
        </label>
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-base text-bone">Effets (au scroll et en fond)</legend>
        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {THEME_EFFECTS.map((x) => (
            <label key={x} className="flex min-h-12 items-center gap-3 text-base text-bone">
              <input type="checkbox" checked={resolved.effects.includes(x)} onChange={() => toggle(x)} className="size-5 accent-[#b76e79]" />
              {EFFECT_NAMES[x]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        {colours.map(([key, name]) => (
          <label key={key} className="block text-base text-bone">
            {name}
            <input type="color" value={resolved[key]} onChange={(e) => set({ [key]: e.target.value })} className="mt-2 block h-12 w-full cursor-pointer border border-white/20 bg-transparent" />
          </label>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-base text-bone">
          Texture
          <select value={resolved.texture} onChange={(e) => set({ texture: e.target.value as PieceTheme["texture"] })} className={inputCls}>
            {THEME_TEXTURES.map((x) => (
              <option key={x} value={x}>{TEXTURE_NAMES[x]}</option>
            ))}
          </select>
        </label>
        <label className="block text-base text-bone">
          Lumière
          <select value={resolved.light} onChange={(e) => set({ light: e.target.value as PieceTheme["light"] })} className={inputCls}>
            {THEME_LIGHTS.map((x) => (
              <option key={x} value={x}>{LIGHT_NAMES[x]}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-base text-mist">
        Les boutons et les liens restent en or rose ; l&apos;univers vit dans le fond, le titre et les effets, toujours sombre derrière les textes pour qu&apos;ils restent lisibles.
        L&apos;entrée se joue à la première visite de la page, jamais au retour, et rien ne bouge pour les visiteurs qui demandent moins d&apos;animations.
      </p>
      <button type="button" onClick={() => onChange(null)} className={btn + " w-fit"}>Revenir à l&apos;univers de la Maison</button>
    </fieldset>
  );
}

/** A cut-out view on a checkerboard (or on black): what the jewel looks like with nothing behind it. */
function CutoutThumb({ slug, view, black = false, className = "" }: { slug: string; view: CutoutView; black?: boolean; className?: string }) {
  const w = view.widths.find((x) => x >= 480) ?? view.widths[view.widths.length - 1]!;
  const checker = "repeating-conic-gradient(#d4d4d4 0% 25%, #f4f4f4 0% 50%) 50% / 18px 18px";
  return (
    <span className={"block overflow-hidden " + className} style={{ background: black ? "#0a0a0a" : checker }}>
      <img src={cutoutSrc(slug, view, w)} alt="" loading="lazy" className="h-full w-full object-contain" />
    </span>
  );
}

const FILM_NAMES: Record<FilmKind, string> = { making: "Fabrication", reveal: "Pièce finie" };

/**
 * "The Art of Detail" in 3D: the model of the piece, and for each of its details a point of the jewel, placed by a click
 * on it ("Placer", then a click on the model); its label on the page holds its number and its title. Points placed on
 * another model (the piece has a new one) are not shown: they are placed again.
 */
function DetailPointsField({ label, model, titles, value, onChange }: { label: string; model: PublicModel | null; titles: string[]; value: PieceDetailPoints | null; onChange: (v: PieceDetailPoints | null) => void }) {
  const { t } = useI18n();
  const [active, setActive] = useState<number | null>(null);
  const points = model ? pointsFor(value, model.id, titles.length) : [];
  const stale = Boolean(model && value && value.model !== model.id);
  const save = (next: typeof points) => onChange(model ? cleanDetailPoints({ model: model.id, points: next }) : null);
  const place = (at: [number, number, number]) => {
    if (active === null) return;
    const next = [...points.filter((p) => p.detail !== active - 1), { detail: active - 1, at }];
    save(next);
    // On to the next detail without its point, if any.
    const free = titles.findIndex((_, i) => i !== active - 1 && !next.some((p) => p.detail === i));
    setActive(free >= 0 ? free + 1 : null);
  };
  return (
    <fieldset className="border border-white/15 p-4" data-detail-points-field>
      <legend className="px-2 text-base text-bone">{label}</legend>
      {!model ? (
        <p className="text-base text-mist">Choisissez d'abord le modèle 3D de la pièce (« Modèle 3D sur la page », plus haut) et enregistrez : ses détails pourront alors être placés dessus.</p>
      ) : titles.length === 0 ? (
        <p className="text-base text-mist">Écrivez d'abord les détails de la pièce (champ « Les détails », juste au-dessus).</p>
      ) : (
        <>
          <p className="text-base text-mist">
            Cliquez sur « Placer » à côté d'un détail, puis sur l'endroit de la pièce qu'il désigne. Faites tourner la pièce en la faisant glisser, zoomez avec la molette.
            {stale ? " Les points placés sur l'ancien modèle de la pièce sont à replacer." : ""}
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <Detail3D model={model} marks={points.map((p) => ({ n: p.detail + 1, title: titles[p.detail] ?? "", at: p.at }))} words={t.viewer} mode="admin" onPick={place} active={active} className="h-[28rem] border border-white/10" />
            <ol className="grid content-start gap-2">
              {titles.map((title, i) => {
                const placed = points.some((p) => p.detail === i);
                const n = i + 1;
                return (
                  <li key={i} data-detail-point-row={n} data-placed={placed ? "true" : "false"} className={"flex flex-wrap items-center gap-2 border px-3 py-2 " + (active === n ? "border-rose-light" : "border-white/10")}>
                    <span className="w-7 font-display text-lg text-rose-light">{String(n).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1 break-words text-base text-white">
                      {title}
                      <span className="block text-sm text-mist">{active === n ? "Cliquez sur la pièce…" : placed ? "Placé" : "Pas encore placé"}</span>
                    </span>
                    <button type="button" className={btn + " min-h-10 px-3"} data-place={n} aria-pressed={active === n} onClick={() => setActive(active === n ? null : n)}>
                      {active === n ? "Annuler" : placed ? "Déplacer" : "Placer"}
                    </button>
                    {placed ? (
                      <button type="button" className={iconBtn} data-remove-point={n} aria-label={"Retirer le point du détail " + n} onClick={() => save(points.filter((p) => p.detail !== i))}>
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
        </>
      )}
    </fieldset>
  );
}

/**
 * The atelier of a piece ("Entrer dans l'atelier" on its page, and its place on the page The Atelier): its film of
 * fabrication and its film of the finished piece, each one its own (automatic), another prepared film or none, and the
 * image shown before it plays. Without a film of fabrication, the page shows no passage to the atelier.
 */
function AtelierField({ label, slug, titles, value, onChange }: { label: string; slug: string; titles: Record<string, string>; value: PieceAtelier | null; onChange: (v: PieceAtelier | null) => void }) {
  const set = (patch: Partial<PieceAtelier>) => {
    const next: Record<string, unknown> = { ...(value ?? {}), ...patch };
    for (const k of Object.keys(patch)) if (patch[k as keyof PieceAtelier] === undefined) delete next[k];
    onChange(cleanAtelier(next));
  };
  const resolved = resolveAtelier(slug, value);
  const describe = (f: Film) => filmTime(f.duration) + " · " + f.source + (f.audio ? "" : " · sans son");
  const all = Object.entries(FILMS).flatMap(([s, kinds]) => (Object.entries(kinds) as [FilmKind, Film][]).map(([k, f]) => ({ id: filmId(s, k), slug: s, kind: k, film: f })));
  const slugs = [...new Set(all.map((x) => x.slug))];
  const choice = (kind: FilmKind) => {
    const own = FILMS[slug]?.[kind];
    const v = value?.[kind];
    const current = v === null ? null : v ? all.find((x) => x.id === v)?.film ?? null : own ?? null;
    return (
      <div key={kind} data-atelier-choice={kind} className="grid content-start gap-3">
        <label className="grid gap-2 text-base text-bone">
          {kind === "making" ? "Vidéo de fabrication" : "Vidéo de la pièce finie (« La Révélation finale »)"}
          <select
            value={v === null ? "none" : (v ?? "")}
            onChange={(e) => set({ [kind]: e.target.value === "" ? undefined : e.target.value === "none" ? null : e.target.value })}
            className={inputCls}
          >
            <option value="">{"Automatique : " + (own ? "sa vidéo (" + describe(own) + ")" : "aucune vidéo préparée")}</option>
            <option value="none">Aucune</option>
            {slugs.map((s) => (
              <optgroup key={s} label={titles[s] ?? s}>
                {all
                  .filter((x) => x.slug === s)
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {FILM_NAMES[x.kind] + " · " + describe(x.film)}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        {current ? (
          // The film chosen, to check it (it loads only when played).
          <video src={current.mobile} poster={current.posters[current.poster]} controls muted playsInline preload="none" className="aspect-[9/16] w-36 bg-black object-contain" />
        ) : null}
      </div>
    );
  };
  return (
    <fieldset data-atelier-field className="grid gap-5 border border-white/15 p-4 sm:p-5">
      <legend className="px-2 text-base text-bone">{label}</legend>
      <p className="text-base text-mist">
        {resolved
          ? "Sur la page : le passage « Entrer dans l'atelier » après les photos, puis la vidéo de fabrication" + (resolved.reveal ? " et la pièce finie." : " (pas de vidéo de la pièce finie).") + " Elle apparaît aussi sur la page The Atelier."
          : "Pas de vidéo de fabrication : la page ne montre pas de passage vers l'atelier, et la pièce n'est pas sur la page The Atelier."}
      </p>
      <div className="grid gap-6 sm:grid-cols-2">{(["making", "reveal"] as const).map(choice)}</div>
      {resolved ? (
        <div className="grid gap-3">
          <p className="text-base text-bone">Image avant la lecture (une image de la vidéo de fabrication) :</p>
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Image avant la lecture">
            {resolved.making.posters.map((src, i) => {
              const chosen = (value?.poster ?? resolved.making.posters[resolved.making.poster]) === src;
              return (
                <label key={src} data-atelier-poster={i + 1} className={"relative block w-24 cursor-pointer border-2 " + (chosen ? "border-rose-light" : "border-transparent opacity-70 hover:opacity-100")}>
                  <input type="radio" name={"atelier-poster-" + slug} checked={chosen} onChange={() => set({ poster: i === resolved.making.poster && !value?.poster ? undefined : src })} className="sr-only" />
                  <img src={src.replace(/\.webp$/, ".w160.webp")} alt={"Image " + (i + 1)} loading="lazy" className="aspect-[9/16] w-full bg-black object-cover" onError={(e) => (e.currentTarget.src = src)} />
                  {i === resolved.making.poster ? <span className="absolute inset-x-0 bottom-0 bg-black/75 px-1 text-center text-sm text-bone">auto</span> : null}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
      {value ? (
        <button type="button" onClick={() => onChange(null)} className={btn + " w-fit"}>
          Revenir au choix automatique
        </button>
      ) : null}
    </fieldset>
  );
}

const KIND_NAMES: Record<CutoutView["kind"], string> = { face: "Face", profile: "Profil", back: "Dos", detail: "Détail", worn: "Portée" };

/**
 * The opening of a piece: its jewel cut out, in one view or in a showcase of several views; which views, in which order
 * (the first one is the main one). Without a choice: the showcase for the five priority universes and wherever there are
 * at least 3 clean views, else the main view alone. A piece without a cutout keeps its photo.
 */
function ShowcaseField({ label, slug, value, onChange }: { label: string; slug: string; value: PieceShowcase | null; onChange: (v: PieceShowcase | null) => void }) {
  const all = CUTOUTS[slug] ?? [];
  const excluded = new Set(value?.excluded ?? []);
  const resolved = resolveShowcase(slug, value);
  const chosen = value?.views ?? resolved.views.map((v) => v.id);
  const set = (patch: Partial<PieceShowcase>) => onChange(cleanShowcase({ ...(value ?? {}), ...patch }));
  const toggle = (id: string) => set({ views: chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id] });
  const move = (id: string, dir: -1 | 1) => {
    const i = chosen.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= chosen.length) return;
    const next = [...chosen];
    [next[i], next[j]] = [next[j]!, next[i]!];
    set({ views: next });
  };
  const ordered = [...chosen.map((id) => all.find((v) => v.id === id)).filter((v): v is CutoutView => !!v), ...all.filter((v) => !chosen.includes(v.id))];
  const auto = SHOWCASE_BY_DEFAULT.has(slug) || all.filter((v) => v.clean && !excluded.has(v.id)).length >= 3 ? "la vitrine multi-vues" : "une seule vue";
  return (
    <fieldset data-showcase-field className="grid gap-4 border border-white/15 p-4 sm:p-5">
      <legend className="px-2 text-base text-bone">{label}</legend>
      {all.length === 0 ? (
        <p className="text-base text-mist">Pas encore de détourage pour cette pièce : la page montre sa photo d&apos;ouverture.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-2" role="radiogroup" aria-label="Affichage">
            {[
              ["auto", "Automatique (" + auto + ")"],
              ["single", "Une vue"],
              ["multi", "Vitrine multi-vues"],
            ].map(([key, name]) => (
              <label key={key} className="flex min-h-12 items-center gap-3 text-base text-bone">
                <input
                  type="radio"
                  name={"showcase-" + slug}
                  checked={(value?.mode ?? "auto") === key}
                  onChange={() => set({ mode: key === "auto" ? undefined : (key as "single" | "multi") })}
                  className="size-5 accent-[#b76e79]"
                />
                {name}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2" role="radiogroup" aria-label="Taille de la pièce">
            {[
              ["normal", "Taille normale"],
              ["large", "Pièce en grand (vue principale nettement plus grande)"],
              ["xl", "Pièce en très grand (ordinateur : encore +20 %, la chaîne sort en fondu par le haut ; une vue seule)"],
            ].map(([key, name]) => (
              <label key={key} className="flex min-h-12 items-center gap-3 text-base text-bone">
                <input
                  type="radio"
                  name={"showcase-size-" + slug}
                  data-showcase-size={key}
                  checked={(value?.size ?? "normal") === key}
                  onChange={() => set({ size: key === "large" || key === "xl" ? key : undefined })}
                  className="size-5 accent-[#b76e79]"
                />
                {name}
              </label>
            ))}
          </div>
          <p className="text-base text-mist">Vues utilisées, dans leur ordre (la première est la vue principale) :</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {ordered.map((v) => {
              const used = chosen.includes(v.id);
              const out = excluded.has(v.id);
              return (
                <li key={v.id} data-showcase-choice={v.id} className={"flex items-center gap-3 border border-white/10 p-2 " + (used && !out ? "" : "opacity-55")}>
                  <CutoutThumb slug={slug} view={v} className="size-20 shrink-0" />
                  <div className="min-w-0 flex-1 text-base text-bone">
                    <label className="flex min-h-12 items-center gap-3">
                      <input type="checkbox" checked={used} disabled={out} onChange={() => toggle(v.id)} className="size-5 accent-[#b76e79]" />
                      {KIND_NAMES[v.kind]} · {v.id}
                    </label>
                    {out ? <span className="block text-mist">Exclue (page Détourages)</span> : !v.clean ? <span className="block text-mist">À revoir : {v.note}</span> : null}
                  </div>
                  {used && !out ? (
                    <span className="flex flex-col">
                      <button type="button" onClick={() => move(v.id, -1)} aria-label={"Monter la vue " + v.id} className={iconBtn}>
                        <ArrowUp className="size-4" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => move(v.id, 1)} aria-label={"Descendre la vue " + v.id} className={iconBtn}>
                        <ArrowDown className="size-4" aria-hidden="true" />
                      </button>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={() => onChange(excluded.size ? { excluded: [...excluded] } : null)} className={btn + " w-fit"}>
            Revenir au choix automatique
          </button>
        </>
      )}
    </fieldset>
  );
}

/**
 * The page "Détourages": every cut-out view of every piece, on a checkerboard and on black, to check them at a glance;
 * a view excluded here is never shown on the site (and comes back with "Rétablir").
 */
function CutoutsTab({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [pieces, setPieces] = useState<Rec[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  useEffect(() => {
    api(token, "GET", "/api/admin/pieces")
      .then((res) => setPieces((res.items as Rec[]) ?? []))
      .catch((x: unknown) => {
        if (x instanceof Error && x.message === "expired") onExpired();
        else setErr(x instanceof Error ? x.message : "Chargement impossible.");
      });
  }, [token, onExpired]);
  const exclude = async (slug: string, id: string, out: boolean) => {
    const piece = pieces?.find((p) => p.slug === slug);
    const before = cleanShowcase(piece?.showcase)?.excluded ?? [];
    const excluded = out ? [...new Set([...before, id])] : before.filter((x) => x !== id);
    setBusy(slug + "/" + id);
    setErr("");
    try {
      const res = await api(token, "PUT", "/api/admin/cutouts/" + encodeURIComponent(slug), { excluded });
      setPieces((list) => (list ?? []).map((p) => (p.slug === slug ? { ...p, showcase: res.showcase ?? null } : p)));
    } catch (x) {
      if (x instanceof Error && x.message === "expired") return onExpired();
      setErr(x instanceof Error ? x.message : "Enregistrement impossible.");
    } finally {
      setBusy("");
    }
  };
  const slugs = Object.keys(CUTOUTS);
  const total = slugs.reduce((n, s) => n + (CUTOUTS[s]?.length ?? 0), 0);
  return (
    <section aria-label="Détourages" className="grid gap-8">
      <p className="max-w-3xl text-base text-bone">
        Les {total} vues détourées des {slugs.length} pièces, chacune sur damier (le fond doit avoir disparu) et sur noir (aucun liseré). Une vue exclue
        n&apos;apparaît plus nulle part sur le site ; « Rétablir » la remet. Les pièces absentes de cette liste gardent leur photo d&apos;ouverture.
      </p>
      {err ? <p role="alert" className="text-base text-rose-light">{err}</p> : null}
      {pieces === null ? (
        <p className="text-base text-mist">Chargement…</p>
      ) : (
        slugs.map((slug) => {
          const piece = pieces.find((p) => p.slug === slug);
          const excluded = new Set(cleanShowcase(piece?.showcase)?.excluded ?? []);
          const mode = resolveShowcase(slug, cleanShowcase(piece?.showcase)).mode;
          return (
            <article key={slug} data-cutouts-piece={slug} className="border-t border-white/15 pt-6">
              <h3 className="text-xl text-white">
                {asText(piece?.title) || slug}{" "}
                <span className="text-base text-mist">· {mode === "multi" ? "vitrine multi-vues" : mode === "single" ? "une vue" : "photo"}</span>
              </h3>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(CUTOUTS[slug] ?? []).map((v) => {
                  const out = excluded.has(v.id);
                  return (
                    <li key={v.id} data-cutout={slug + "/" + v.id} data-cutout-excluded={out ? "" : undefined} className={"grid gap-2 border border-white/10 p-3 " + (out ? "opacity-50" : "")}>
                      <div className="grid grid-cols-2 gap-2">
                        <CutoutThumb slug={slug} view={v} className="aspect-square" />
                        <CutoutThumb slug={slug} view={v} black className="aspect-square" />
                      </div>
                      <p className="text-base text-bone">
                        {KIND_NAMES[v.kind]} · {v.id}
                        {v.fade ? <span className="text-mist"> · fondu {v.fade.map((f) => ({ top: "en haut", bottom: "en bas", left: "à gauche", right: "à droite" })[f] ?? f).join(", ")}</span> : null}
                      </p>
                      {v.note ? <p className="text-base text-mist">{v.note}</p> : null}
                      <button type="button" disabled={busy === slug + "/" + v.id} onClick={() => exclude(slug, v.id, !out)} className={(out ? btnMain : btn) + " w-full justify-center"}>
                        {out ? "Rétablir" : "Exclure"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })
      )}
    </section>
  );
}

/**
 * The personal photos of Yoni on the page The House: one place per chapter, quote and the portrait. A place without a
 * photo shows nothing on the site. A photo dropped in the folder "Berete - La Maison" is used when none is sent here.
 */
function HouseTab({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [photos, setPhotos] = useState<Record<string, MediaItem> | null>(null);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState("");
  useEffect(() => {
    api(token, "GET", "/api/admin/house")
      .then((res) => setPhotos((res.photos as Record<string, MediaItem>) ?? {}))
      .catch((x: unknown) => {
        if (x instanceof Error && x.message === "expired") onExpired();
        else setErr(x instanceof Error ? x.message : "Chargement impossible.");
      });
  }, [token, onExpired]);
  const save = async (key: string, photo: MediaItem | null) => {
    setErr("");
    setSaved("");
    try {
      await api(token, "PUT", "/api/admin/house/" + key, { photo });
      setPhotos((p) => {
        const next = { ...(p ?? {}) };
        if (photo) next[key] = photo;
        else delete next[key];
        return next;
      });
      setSaved(key);
    } catch (x) {
      if (x instanceof Error && x.message === "expired") return onExpired();
      setErr(x instanceof Error ? x.message : "Enregistrement impossible.");
    }
  };
  if (photos === null) return err ? <p role="alert" className="mt-8 text-base text-rose-light">{err}</p> : <p className="mt-8 flex items-center gap-3 text-bone"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Chargement</p>;
  return (
    <div className="mt-8 grid gap-6" data-house-admin>
      <p className="max-w-3xl text-base text-bone">
        Les photos personnelles de Yoni sur la page « La Maison ». Un emplacement sans photo n'affiche rien sur le site (aucun cadre vide). On peut aussi déposer les photos dans le dossier « Berete - La Maison » du disque externe (voir le fichier LISEZ-MOI qui s'y trouve).
      </p>
      {err ? <p role="alert" className="text-base text-rose-light">{err}</p> : null}
      <ul className="grid gap-6 md:grid-cols-2">
        {HOUSE_PHOTO_PLACES.map((place) => (
          <li key={place.key} data-house-place={place.key} className="border border-white/15 p-4">
            <MediaField token={token} single imagesOnly label={place.name} value={photos[place.key] ? [photos[place.key]!] : []} onChange={(l) => void save(place.key, l[0] ? { ...l[0], type: "image" } : null)} />
            {saved === place.key ? <p className="mt-2 text-base text-rose-light">Enregistré.</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A photo joined to a message: read with the password (never public), shown small, opened full size in a new tab. */
function MessagePhoto({ token, messageId, photo }: { token: string; messageId: string; photo: Rec }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  const [unreadable, setUnreadable] = useState(false);
  useEffect(() => {
    let made = "";
    let live = true;
    fetch("/api/admin/messages/" + messageId + "/photos/" + asText(photo.id), { headers: { Authorization: "Bearer " + token } })
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
      .then((blob) => {
        made = URL.createObjectURL(blob);
        if (live) setUrl(made);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [token, messageId, photo.id]);
  const name = asText(photo.name);
  return (
    <li data-admin-photo className="relative aspect-square overflow-hidden border border-white/15 bg-ink-soft">
      {failed ? (
        <span className="flex h-full items-center justify-center p-2 text-center text-base text-rose-light">Photo illisible</span>
      ) : !url ? (
        <span className="flex h-full items-center justify-center"><LoaderCircle className="size-5 animate-spin text-bone" aria-hidden="true" /></span>
      ) : (
        <a href={url} target="_blank" rel="noreferrer" download={unreadable ? name : undefined} title={name} className="block h-full w-full">
          {unreadable ? (
            // A photo of an iPhone (HEIC) this browser cannot show: it downloads.
            <span className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center text-base text-bone">HEIC · télécharger<span className="line-clamp-2 break-all text-mist">{name}</span></span>
          ) : (
            <img src={url} alt={name} onError={() => setUnreadable(true)} className="h-full w-full object-cover" />
          )}
        </a>
      )}
    </li>
  );
}

function Messages({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [data, setData] = useState<{ messages: Rec[]; callbacks: Rec[] } | null>(null);
  const [err, setErr] = useState("");
  const remove = async (id: string) => {
    if (!window.confirm("Supprimer ce message et ses photos ? C'est définitif.")) return;
    try {
      await api(token, "DELETE", "/api/admin/messages/" + id);
      setData((d) => (d ? { ...d, messages: d.messages.filter((m) => asText(m.id) !== id) } : d));
    } catch (x) {
      if (x instanceof Error && x.message === "expired") onExpired();
      else setErr(x instanceof Error ? x.message : "Suppression impossible.");
    }
  };
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
  const languageName = (v: unknown) => "écrit depuis le site en " + ({ en: "anglais", fr: "français", es: "espagnol", de: "allemand", nl: "néerlandais", ar: "arabe" }[asText(v)] ?? "anglais");
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
          {data.messages.map((m) => {
            const id = asText(m.id);
            const instagram = asText(m.instagram);
            const photos = Array.isArray(m.photos) ? (m.photos as Rec[]) : [];
            return (
              <li key={id} data-admin-message={id} className="border-b border-white/15 py-5 text-base">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <span>
                    <span className="text-white">{asText(m.name)}</span> · <a href={"mailto:" + asText(m.email)} className="text-rose-light">{asText(m.email)}</a>
                    {instagram ? (
                      <>
                        {" · "}
                        {/^[A-Za-z0-9._]{1,30}$/.test(instagram) ? (
                          <a href={"https://www.instagram.com/" + instagram + "/"} target="_blank" rel="noreferrer" className="text-rose-light">@{instagram}</a>
                        ) : (
                          <span className="text-bone">Instagram : {instagram}</span>
                        )}
                      </>
                    ) : null}
                    <span className="block text-mist">{date(m.createdAt)} · {languageName(m.language)}{photos.length > 0 ? " · " + photos.length + (photos.length > 1 ? " photos" : " photo") : ""}</span>
                  </span>
                  <button type="button" onClick={() => void remove(id)} className={btn} data-admin-message-delete>
                    <Trash2 className="size-4" aria-hidden="true" /> Supprimer
                  </button>
                </div>
                <p className="mt-2 whitespace-pre-line text-bone" dir="auto">{asText(m.message)}</p>
                {photos.length > 0 ? (
                  <ul className="mt-4 grid max-w-2xl grid-cols-3 gap-3 sm:grid-cols-6">
                    {photos.map((photo) => (
                      <MessagePhoto key={asText(photo.id)} token={token} messageId={id} photo={photo} />
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default function Admin() {
  const token = useSyncExternalStore(subscribeToken, readToken, () => "");
  const [tab, setTab] = useState<Tab>(readTab);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const logout = useCallback(() => writeToken(""), []);
  const open = (next: Tab) => {
    setTab(next);
    writeTab(next);
  };

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
    <div className="min-h-svh bg-ink text-white" lang="fr" data-admin>
      {/* Its own bar: the logo, the site in a new tab, the tabs. */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <span className="flex min-w-0 items-center gap-4">
            <Logo variant="mark" className="h-10 w-14 shrink-0" />
            <span className="eyebrow truncate">Administration</span>
          </span>
          <span className="flex gap-2">
            <a href="/" target="_blank" rel="noreferrer" className={btn + " px-3 sm:px-5"} aria-label="Voir le site">
              <ArrowUpRight className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">Voir le site</span>
            </a>
            {token ? (
              <button type="button" onClick={logout} className={btn + " px-3 sm:px-5"} aria-label="Se déconnecter">
                <LogOut className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">Se déconnecter</span>
              </button>
            ) : null}
          </span>
        </div>
        {token ? (
          <nav aria-label="Rubriques" className="mx-auto max-w-6xl">
            <div role="tablist" className="no-scrollbar flex gap-1 overflow-x-auto px-3 sm:px-6">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => open(t.key)}
                  className={"min-h-12 shrink-0 border-b-2 px-3 text-base font-medium whitespace-nowrap transition-colors " + (tab === t.key ? "border-rose-light text-rose-light" : "border-transparent text-bone hover:text-white")}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto max-w-6xl px-5 pt-8 pb-24 sm:px-8">
        {!HAS_SERVER ? (
          // The version online without its server: nothing to log into yet.
          <div className="mx-auto mt-16 grid max-w-md gap-4 border border-white/15 p-6 sm:p-8" data-admin-offline>
            <h1 className="title-caps text-3xl tracking-[0.12em]">Pas encore en ligne</h1>
            <p className="text-base text-bone">
              Cette version du site n’a pas de serveur : l’administration, les modèles 3D, l’espace VIP et les formulaires en ont besoin. Ils fonctionneront sur le serveur définitif. En attendant, les formulaires du site ouvrent WhatsApp avec la demande déjà écrite.
            </p>
          </div>
        ) : !token ? (
          <form onSubmit={login} className="mx-auto mt-16 grid max-w-md gap-5 border border-white/15 p-6 sm:p-8">
            <h1 className="title-caps text-3xl tracking-[0.12em]">Se connecter</h1>
            <label className="block text-base text-bone">
              Mot de passe
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            </label>
            {err ? <p role="alert" className="text-base text-rose-light">{err}</p> : null}
            <button type="submit" disabled={busy || !password} className={btnMain}>{busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null} Se connecter</button>
          </form>
        ) : (
          <>
            <h1 className="sr-only">Administration · {TABS.find((t) => t.key === tab)?.label}</h1>
            {tab === "messages" ? <Messages token={token} onExpired={logout} /> : tab === "house" ? <HouseTab token={token} onExpired={logout} /> : tab === "cutouts" ? <CutoutsTab token={token} onExpired={logout} /> : tab === "3d" ? <Models3D token={token} onExpired={logout} /> : tab === "clients" ? <Clients token={token} onExpired={logout} /> : <Section key={tab} kind={tab} token={token} onExpired={logout} />}
          </>
        )}
      </main>
    </div>
  );
}
