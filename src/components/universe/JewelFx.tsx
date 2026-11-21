import type { JewelEffect } from "@/data/themes";

/*
 * The effect on the piece itself (21/11/2026), that ties it to its universe (src/data/themes.ts, effects "jewel-…"): a
 * reflection that crosses it, points of light that twinkle on it, a halo pulsing around it, a warm light, a beam touching
 * it, white reflections and discreet rainbows. Drawn by the style sheet (src/index.css, ".u-jewel"), in the colour of the
 * universe. On a cut-out jewel the effect takes its own shape (the image as a mask, set once it is loaded: jewelSource);
 * on a photo, a soft circle over it (photo). Nothing moves when the visitor asks for reduced motion.
 */

/** The places of the points of light, inside the frame of the jewel (the same on the server and in the browser). */
const SPARKS = [
  [34, 30],
  [62, 24],
  [48, 52],
  [70, 58],
  [28, 66],
  [56, 78],
  [42, 40],
];

export default function JewelFx({ kind, photo = false }: { kind: JewelEffect; photo?: boolean }) {
  return (
    <>
      {kind === "jewel-halo" && !photo ? <span aria-hidden="true" className="u-jewel-halo" /> : null}
      <span aria-hidden="true" className="u-jewel" data-jewel={kind} data-photo={photo ? "" : undefined}>
        {kind === "jewel-sparkle"
          ? SPARKS.map(([x, y], i) => <i key={i} style={{ left: x + "%", top: y + "%", animationDelay: (i * 0.53).toFixed(2) + "s" }} />)
          : null}
      </span>
    </>
  );
}

/** The loaded image of a cut-out jewel becomes the shape of its effect (its parent holds the effect). */
export function jewelSource(img: HTMLImageElement | null) {
  if (!img) return;
  const set = () => img.parentElement?.style.setProperty("--jewel-src", 'url("' + (img.currentSrc || img.src) + '")');
  if (img.complete && img.naturalWidth > 0) set();
  else img.addEventListener("load", set, { once: true });
}
