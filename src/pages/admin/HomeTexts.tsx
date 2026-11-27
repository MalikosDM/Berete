import { useEffect, useMemo, useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { defaultCatalogue } from "@/data/catalogue";
import { HOME_LANGS, HOME_TEXT_MAX, type HomeBlock, type HomeLang, type HomeTexts as Texts } from "@/data/homeTexts";
import type { Catalogue } from "@/data/types";
import { bundleOf, loadLocale } from "@/i18n";
import { localizeCatalogue } from "@/i18n/content";
import { adminCall, btn, btnMain } from "./ui";

/*
 * Admin « Textes de l'accueil » (Yoni, 26/11/2026: "I will work on all the texts and send them"): on the home page, each piece
 * stands on one side with a short text beside it (src/data/homeTexts.ts). By default that text is the « Phrase d'accroche » of
 * the piece (its own page), translated with the site; here a text of the house can take its place, language by language. An
 * empty field: the sentence of the piece again (shown in grey in the field).
 */

const LANG_NAMES: Record<HomeLang, string> = { en: "Anglais", fr: "Français", es: "Espagnol", de: "Allemand", nl: "Néerlandais", ar: "Arabe" };

type Form = Record<string, Record<HomeLang, string>>;

const formOf = (blocks: HomeBlock[], texts: Texts): Form => Object.fromEntries(blocks.map((b) => [b.id, Object.fromEntries(HOME_LANGS.map((l) => [l, texts[b.id]?.[l] ?? ""])) as Record<HomeLang, string>]));

export default function HomeTexts({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [blocks, setBlocks] = useState<HomeBlock[] | null>(null);
  const [form, setForm] = useState<Form>({});
  const [saved, setSaved] = useState<Form>({});
  const [catalogue, setCatalogue] = useState<Catalogue>(defaultCatalogue);
  const [langsReady, setLangsReady] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    let alive = true;
    adminCall(token, "GET", "/api/admin/home-texts").then(
      (json) => {
        if (!alive) return;
        const list = (json.blocks as HomeBlock[]) ?? [];
        const next = formOf(list, (json.texts as Texts) ?? {});
        setBlocks(list);
        setForm(next);
        setSaved(next);
      },
      (x: unknown) => {
        if (!alive) return;
        if (x instanceof Error && x.message === "expired") onExpired();
        else setErr(x instanceof Error ? x.message : "Chargement impossible.");
      },
    );
    // The sentences of the pieces as the site shows them (with the edits of the admin), in every language, for the grey text.
    fetch("/api/catalogue", { headers: { Accept: "application/json" } })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: unknown) => {
        if (alive && json && typeof json === "object" && Array.isArray((json as Catalogue).pieces)) setCatalogue(json as Catalogue);
      })
      .catch(() => undefined);
    Promise.all(HOME_LANGS.map((l) => loadLocale(l)))
      .then(() => alive && setLangsReady((n) => n + 1))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [token, onExpired]);

  /** The sentence of a piece in a language (what the page shows when the field is empty). */
  const lines = useMemo(() => {
    const out: Record<string, Partial<Record<HomeLang, string>>> = {};
    for (const block of blocks ?? []) {
      const piece = catalogue.pieces.find((p) => p.slug === block.piece) ?? defaultCatalogue.pieces.find((p) => p.slug === block.piece);
      if (!piece) continue;
      out[block.id] = {};
      for (const lang of HOME_LANGS) {
        const b = bundleOf(lang);
        const local = localizeCatalogue({ ...catalogue, pieces: [piece], stories: [], boxes: [] }, lang, b.content, b.ui.stories.alt, b.ui.piece.sketchAlt).pieces[0];
        out[block.id]![lang] = local?.line ?? piece.line;
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- langsReady: the languages have just been loaded
  }, [blocks, catalogue, langsReady]);

  const titleOf = (slug: string) => (catalogue.pieces.find((p) => p.slug === slug) ?? defaultCatalogue.pieces.find((p) => p.slug === slug))?.title ?? slug;
  const changed = JSON.stringify(form) !== JSON.stringify(saved);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setDone("");
    setBusy(true);
    try {
      const json = await adminCall(token, "PUT", "/api/admin/home-texts", { texts: form });
      const next = formOf(blocks ?? [], (json.texts as Texts) ?? {});
      setForm(next);
      setSaved(next);
      setDone("Enregistré : l'accueil montre ces textes (rechargez la page du site pour les voir).");
    } catch (x) {
      if (x instanceof Error && x.message === "expired") onExpired();
      else setErr(x instanceof Error ? x.message : "Une erreur est survenue, réessayez.");
    } finally {
      setBusy(false);
    }
  };

  if (!blocks) {
    return (
      <div className="flex justify-center py-16" aria-busy="true">
        {err ? <p role="alert" className="text-base text-rose-light">{err}</p> : <LoaderCircle className="size-6 animate-spin text-bone" aria-label="Chargement" />}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="mx-auto grid max-w-3xl gap-8" data-admin-home-texts>
      <div>
        <h2 className="title-caps text-2xl tracking-[0.12em]">Textes de l'accueil</h2>
        <p className="mt-3 text-base text-bone">
          Sur l'accueil, chaque pièce est d'un côté et un court texte de l'autre. Sans texte ici, c'est la « Phrase d'accroche » de la pièce (sa page), traduite par le site : elle est écrite en gris dans chaque case. Un texte écrit ici la remplace, dans sa langue seulement. Une ou deux phrases ; jamais un chiffre à faire valider.
        </p>
      </div>
      {blocks.map((block) => (
        <fieldset key={block.id} className="grid gap-4 border border-white/15 p-5 sm:p-6" data-home-text-block={block.id}>
          <legend className="px-2 text-base text-white">
            {block.label} <span className="text-bone">— {titleOf(block.piece)}</span>
          </legend>
          {HOME_LANGS.map((lang) => (
            <label key={lang} className="block text-base text-bone">
              {LANG_NAMES[lang]} ({lang.toUpperCase()})
              <textarea
                rows={2}
                maxLength={HOME_TEXT_MAX}
                dir={lang === "ar" ? "rtl" : "ltr"}
                lang={lang}
                value={form[block.id]?.[lang] ?? ""}
                placeholder={lines[block.id]?.[lang] ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setDone("");
                  setForm((f) => ({ ...f, [block.id]: { ...(f[block.id] as Record<HomeLang, string>), [lang]: value } }));
                }}
                data-home-text-field={block.id + ":" + lang}
                className="mt-2 block w-full border border-white/30 bg-ink px-4 py-3 text-base leading-relaxed text-white placeholder:text-mist/70 focus:border-rose-light focus:outline-none"
              />
            </label>
          ))}
          {HOME_LANGS.some((l) => form[block.id]?.[l]) ? (
            <button
              type="button"
              className={btn + " justify-self-start"}
              onClick={() => setForm((f) => ({ ...f, [block.id]: Object.fromEntries(HOME_LANGS.map((l) => [l, ""])) as Record<HomeLang, string> }))}
            >
              Revenir à la phrase de la pièce
            </button>
          ) : null}
        </fieldset>
      ))}
      {err ? <p role="alert" className="text-base text-rose-light">{err}</p> : null}
      {done ? <p role="status" className="text-base text-white">{done}</p> : null}
      <button type="submit" disabled={busy || !changed} className={btnMain + " justify-self-start"} data-home-texts-save>
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null} Enregistrer
      </button>
    </form>
  );
}
