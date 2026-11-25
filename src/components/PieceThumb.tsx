import type { CSSProperties } from "react";
import thumbs from "@/data/thumbs.generated.json" with { type: "json" };
import type { Piece } from "@/data/types";
import { MediaView, Img } from "@/components/Media";
import { scaleSizes, srcSetOf } from "@/lib/responsive";

type Thumb = { kind: "cutout" | "photo"; src: string; srcSet?: string; width: number; height: number; box: number[] };
const THUMBS = thumbs as Record<string, Thumb>;

/**
 * The share of the height of its frame a jewel takes (the audit of 24/11/2026: between 55 and 75 %), and of its width at most:
 * a jewel wider than high (a chain laid in a round, a nameplate) fills the width of its frame instead, never cut.
 */
const HEIGHT = 0.65;
const WIDTH = 0.94;

/**
 * The jewel of a card, on the same black as every other (25/11/2026): its cut-out (transparent, a soft shadow) or its photo
 * whose edges fade into the page, never a rectangle; the jewel itself (scripts/thumbs.ts: where it is in its image) always at
 * the same share of the frame, centred. Fills the frame it is put in (`frame`: its width / its height).
 */
export default function PieceThumb({ piece, sizes, frame = 4 / 5, eager = false, priority = false }: { piece: Piece; sizes: string; frame?: number; eager?: boolean; priority?: boolean }) {
  const th = THUMBS[piece.slug];
  const alt = piece.cover.alt ?? piece.title;
  // A piece the list does not know yet (added in the admin): its cover, contained.
  if (!th || piece.cover.src !== (th.kind === "photo" ? th.src : piece.cover.src)) {
    return (
      <span className="absolute inset-0 p-4">
        <MediaView item={piece.cover} alt={alt} fit="contain" eager={eager} priority={priority} sizes={sizes} />
      </span>
    );
  }
  const [bx = 0, by = 0, bw = 1, bh = 1] = th.box;
  const ratio = th.width / th.height;
  const H = 1 / frame;
  // The width of the image, in widths of the frame, so that the jewel takes HEIGHT of its height (WIDTH of its width at most).
  const iw = Math.min((HEIGHT * H * ratio) / bh, WIDTH / bw);
  const left = 0.5 - (bx + bw / 2) * iw;
  const top = H / 2 - ((by + bh / 2) * iw) / ratio;
  const img = (style: CSSProperties) => (
    <Img
      src={th.src}
      srcSet={th.kind === "cutout" ? th.srcSet : srcSetOf(th.src, th.width)}
      sizes={scaleSizes(sizes, iw)}
      alt={alt}
      width={th.width}
      height={th.height}
      loading={eager || priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      draggable={false}
      className={"absolute h-auto max-w-none select-none " + (th.kind === "cutout" ? "thumb-cutout" : "")}
      style={style}
    />
  );
  if (th.kind === "cutout") {
    return <span data-thumb="cutout" className="absolute inset-0">{img({ width: iw * 100 + "%", left: left * 100 + "%", top: (top / H) * 100 + "%" })}</span>;
  }
  // A photo: only the jewel and a little air around it (never its reflection, its stand, its floor), its edges fading into
  // the page; the frame fades too.
  const jx = left + bx * iw;
  const jy = top + (by * iw) / ratio;
  const jw = bw * iw;
  const jh = (bh * iw) / ratio;
  const pad = 0.12 * Math.max(jw, jh);
  const wx = jx - pad;
  const wy = jy - pad;
  const ww = jw + 2 * pad;
  const wh = jh + 2 * pad;
  return (
    <span data-thumb="photo" className="thumb-fade absolute inset-0">
      <span className="thumb-photo absolute overflow-hidden" style={{ left: wx * 100 + "%", top: (wy / H) * 100 + "%", width: ww * 100 + "%", height: (wh / H) * 100 + "%" }}>
        {img({ width: (iw / ww) * 100 + "%", left: ((left - wx) / ww) * 100 + "%", top: ((top - wy) / wh) * 100 + "%" })}
      </span>
    </span>
  );
}
