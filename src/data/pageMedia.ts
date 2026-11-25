/*
 * One photo, one film, once on a page (24/11/2026: "sur une page, chaque photo et chaque vidéo n'apparaît qu'une fois"). The
 * opening of a piece shows its jewel cut out of one or several photos: those photos are then not shown again in Every Angle;
 * the film of the finished piece (or of its mechanism) is not shown again among its films either.
 */
import views from "./angle-views.generated.json" with { type: "json" };
import { anglePhotos, wornSet } from "./angles.js";
import { resolveReveal } from "./atelier.js";
import { featureFilmOf } from "./featureFilms.js";
import type { CutoutView } from "./showcase.js";
import type { MediaItem, Piece } from "./types.js";

/** The name of a file without its folder, its version, its width and its type: "/media/hd/sirius/p29-960.ab12cd34ef.webp" -> "p29". */
export function fileBase(src: string): string {
  const name = (src.split("?")[0] ?? "").split("/").pop() ?? "";
  return name
    .replace(/\.(webp|avif|jpe?g|png|mp4|webm|mov)$/i, "")
    .replace(/\.m$/, "")
    .replace(/\.[0-9a-f]{10}$/i, "")
    .replace(/-(\d{3,4})$/, "")
    .replace(/-m$/, "");
}

/** A file of the site and the folder that holds it, without version nor width: "/media/hd/sirius/p29". */
export function mediaKey(src: string): string {
  const path = src.split("?")[0] ?? "";
  return path.slice(0, path.lastIndexOf("/") + 1) + fileBase(path);
}

/**
 * Photos prepared apart from the photo they come from (a photo redressed, its blacks evened out): the same picture as the
 * photo of the folder ("p28" of Sirius is its plate, redressed by 1.1°).
 */
const SAME_PHOTO: Record<string, string> = {
  "/media/extra/sirius/plate-front": "p28",
};

/** The number of the photo of the folder a cut-out view was made from ("…/37 Chaine Sirius - 29.jpg" -> "p29"). */
function photoOfView(view: Pick<CutoutView, "id" | "source">): string | null {
  const n = /(\d+)\.(?:jpe?g|png|heic|webp|tiff?)$/i.exec(view.source ?? "")?.[1] ?? /^[a-z](\d+)$/.exec(view.id)?.[1];
  return n ? "p" + n.padStart(2, "0") : null;
}

/** The photos of the piece its opening already shows (its photo, or the photos its cut-out views were made from). */
export function openingSources(piece: Pick<Piece, "cover" | "gallery">, opening: { mode: string; views: Pick<CutoutView, "id" | "source">[] }): Set<string> {
  const all = [piece.cover, ...piece.gallery].filter((m) => m.src && m.type !== "video");
  if (opening.mode === "photo") return new Set(piece.cover.src ? [piece.cover.src] : []);
  const out = new Set<string>();
  for (const view of opening.views) {
    const photo = photoOfView(view);
    if (!photo) continue;
    for (const m of all) if (fileBase(m.src) === photo || SAME_PHOTO[mediaKey(m.src)] === photo) out.add(m.src);
  }
  return out;
}

/**
 * The films of the gallery that are the film shown in its own section ("13/v01": the film 1 of folder 13; a story file),
 * so that the same film is never shown twice.
 */
export function sameFilm(item: MediaItem, source: string | undefined, files: string[] = []): boolean {
  if (item.type !== "video") return false;
  if (files.some((f) => mediaKey(f) === mediaKey(item.src))) return true;
  const n = /\/v(\d+)\b/.exec(source ?? "")?.[1];
  return Boolean(n && item.src.startsWith("/media/hd/") && fileBase(item.src) === "v" + n.padStart(2, "0"));
}

/** Keeps the first of each file (by its file, whatever its width or its version). */
export function uniqueMedia<T extends { src: string }>(items: T[], already: Set<string> = new Set()): T[] {
  const seen = new Set([...already].map(mediaKey));
  return items.filter((m) => {
    if (!m.src) return false;
    const k = mediaKey(m.src);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Every photo and film of the page of a piece, each once (24/11/2026): the film of its section (its mechanism or the finished
 * piece), the photos of the part worn apart, the photos of Every Angle (never one its opening shows, nor its trunk's, nor that
 * film), the photos where it is worn. The page and its tests read the same lists.
 */
/**
 * The first four photos of Every Angle show four different views (audit of 24/11/2026): two photos of one view
 * (scripts/angle-views.ts, by their fingerprints) never both among the first four; the others keep their order after them.
 */
export function diverseFirst(items: MediaItem[], sameViews: string[][], count = 4): MediaItem[] {
  if (sameViews.length === 0) return items;
  const viewOf = new Map<string, number>();
  sameViews.forEach((names, i) => names.forEach((n) => viewOf.set(n, i)));
  const first: MediaItem[] = [];
  const used = new Set<number>();
  for (const m of items) {
    if (first.length >= count) break;
    const v = viewOf.get(fileBase(m.src));
    if (v !== undefined && used.has(v)) continue;
    if (v !== undefined) used.add(v);
    first.push(m);
  }
  return [...first, ...items.filter((m) => !first.includes(m))];
}

export function pieceMediaOf(
  piece: Piece,
  { raw, box, part, opening }: { raw?: Piece; box?: { images: MediaItem[] }; part?: { piece: Piece; photos: string[] | "all" } | null; opening: { mode: string; views: Pick<CutoutView, "id" | "source">[] } },
): { film: { source?: string; files: string[] } | null; partPhotos: MediaItem[]; angles: MediaItem[]; worn: MediaItem[] } {
  const feature = featureFilmOf(piece.slug);
  const reveal = resolveReveal(piece.slug, piece.atelier);
  const film = feature ? { files: feature.same } : reveal ? { source: reveal.film.source, files: [reveal.film.src] } : null;
  const partAll = part ? [part.piece.cover, ...part.piece.gallery].filter((m) => m.src) : [];
  const partPhotos: MediaItem[] = !part ? [] : uniqueMedia(part.photos === "all" ? partAll : part.photos.map((n) => partAll.find((m) => fileBase(m.src) === n)).filter((m): m is MediaItem => Boolean(m)));
  const taken = new Set([...openingSources(piece, opening), ...(box?.images.map((m) => m.src) ?? []), ...partPhotos.map((m) => m.src)]);
  const wornSrcs = wornSet(raw ?? piece);
  const angles = diverseFirst(uniqueMedia(anglePhotos(piece, false, wornSrcs).filter((m) => !sameFilm(m, film?.source, film?.files)), taken), (views as Record<string, string[][]>)[piece.slug] ?? []);
  const worn = uniqueMedia(
    [...piece.handover, ...[piece.cover, ...piece.gallery].filter((m) => wornSrcs.has(m.src))].filter((m) => !sameFilm(m, film?.source, film?.files)),
    new Set([...taken, ...angles.map((m) => m.src)]),
  );
  return { film, partPhotos, angles, worn };
}
