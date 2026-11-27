import { useEffect, useLayoutEffect, useRef } from "react";
import type { CodeSceneKind } from "@/data/themes";
import { OctagonGalleryStage } from "./OctagonGallery";
import { TrophyRoomNear, TrophyRoomStage } from "./TrophyRoom";

/*
 * The worlds drawn in code (27/11/2026, src/data/themes.ts CODE_SCENES): no image, layers of SVG and CSS light placed under the
 * piece. The page measures where the jewel really is — the box of its main view, the image drawn inside it, and the visible
 * part of that image (its opaque pixels) — and gives the world its heart (--s-x, --s-y: the centre of the jewel, in the
 * coordinates of the stage), its scale (--s-u: a hundredth of the box of the jewel), the foot of the jewel (--s-top, where the
 * plinth begins) and its width (--s-pw, the plinth), at every size, again when the window or the jewel changes.
 *   - The depth: on a computer the planes answer the mouse, the far ones less and the other way, the jewel and its plinth
 *     a little with it ([data-depth] of src/index.css); on a phone they drift slowly by themselves (CSS, scenes.css).
 *   - Nothing runs while the opening is off screen (data-scene-idle) or the tab hidden, nothing moves with "reduce motion".
 * The admin (still) shows the world at its default place, in its small frame, still.
 */

type Bounds = { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number };
/** The visible part of each image of a jewel (shares of the image): its opaque pixels, their box and their centre. */
const VISIBLE = new Map<string, Bounds | null>();

function visibleOf(img: HTMLImageElement | null): Bounds | null {
  if (!img || !img.complete || !img.naturalWidth) return null;
  const src = img.currentSrc || img.src;
  if (VISIBLE.has(src)) return VISIBLE.get(src)!;
  let bounds: Bounds | null = null;
  try {
    const w = 96;
    const h = Math.max(1, Math.round((w * img.naturalHeight) / img.naturalWidth));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let x0 = w;
      let y0 = h;
      let x1 = -1;
      let y1 = -1;
      let sum = 0;
      let sx = 0;
      let sy = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const a = data[(y * w + x) * 4 + 3]!;
          if (a < 40) continue;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
          sum += a;
          sx += a * x;
          sy += a * y;
        }
      }
      // A photo without transparency (no cut-out): the whole image is the jewel.
      if (x1 >= 0 && sum > 0) bounds = { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h, cx: (sx / sum + 0.5) / w, cy: (sy / sum + 0.5) / h };
    }
  } catch {
    /* an image of another origin: its whole box */
  }
  VISIBLE.set(src, bounds);
  return bounds;
}

/** The main view of the jewel shown now: its frame (the image fills it, drawn whole inside) and its image. */
function mainView(cover: HTMLElement): { frame: DOMRect; img: HTMLImageElement | null } | null {
  for (const el of cover.querySelectorAll<HTMLElement>('[data-place="0"] .sv-float, [data-showcase-slide="0"] .sv-float')) {
    const frame = el.getBoundingClientRect();
    if (frame.width > 0 && frame.height > 0) return { frame, img: el.querySelector("img") };
  }
  const img = cover.querySelector("img");
  if (img) {
    const frame = img.getBoundingClientRect();
    if (frame.width > 0 && frame.height > 0) return { frame, img };
  }
  return null;
}

/** Places the world under the jewel; returns its cleanup. */
function placeUnder(universe: HTMLElement, cover: HTMLElement): () => void {
  const stage = universe.querySelector<HTMLElement>(".universe-stage");
  const beam = universe.querySelector<HTMLElement>(".s-beam");
  const place = () => {
    const u = universe.getBoundingClientRect();
    const c = cover.getBoundingClientRect();
    const cs = getComputedStyle(cover);
    const pl = parseFloat(cs.paddingLeft) || 0;
    const pr = parseFloat(cs.paddingRight) || 0;
    const pt = parseFloat(cs.paddingTop) || 0;
    const pb = parseFloat(cs.paddingBottom) || 0;
    const box = { x0: c.left - u.left + pl, y0: c.top - u.top + pt, x1: c.right - u.left - pr, y1: c.bottom - u.top - pb };
    const bh = Math.max(40, box.y1 - box.y0);
    // Without its image yet: the middle of its box.
    let jx = (box.x0 + box.x1) / 2;
    let jy = (box.y0 + box.y1) / 2;
    let foot = box.y1 - bh * 0.06;
    let jw = (box.x1 - box.x0) * 0.6;
    const view = mainView(cover);
    if (view) {
      const { frame, img } = view;
      const nw = img?.naturalWidth || Number(img?.getAttribute("width")) || frame.width;
      const nh = img?.naturalHeight || Number(img?.getAttribute("height")) || frame.height;
      const k = Math.min(frame.width / nw, frame.height / nh);
      const cw = nw * k;
      const ch = nh * k;
      const left = frame.left - u.left + (frame.width - cw) / 2;
      const top = frame.top - u.top + (frame.height - ch) / 2;
      const v = visibleOf(img) ?? { x0: 0.04, y0: 0.04, x1: 0.96, y1: 0.96, cx: 0.5, cy: 0.5 };
      jx = left + cw * v.cx;
      jy = top + ch * v.cy;
      foot = top + ch * v.y1;
      jw = cw * (v.x1 - v.x0);
    }
    const pw = Math.min(bh * 0.95, Math.max(bh * 0.38, jw * 1.1));
    universe.style.setProperty("--s-x", jx.toFixed(1) + "px");
    universe.style.setProperty("--s-y", jy.toFixed(1) + "px");
    universe.style.setProperty("--s-u", (bh / 100).toFixed(3) + "px");
    // The plinth: its top face (9 % of its width) under the foot of the jewel, the jewel standing on its middle.
    universe.style.setProperty("--s-top", (foot - pw * 0.05).toFixed(1) + "px");
    universe.style.setProperty("--s-pw", pw.toFixed(1) + "px");
    // The light of the universe (its halo, its spotlight) on the jewel too.
    universe.style.setProperty("--u-at-x", jx.toFixed(1) + "px");
    universe.style.setProperty("--u-at-y", jy.toFixed(1) + "px");
    // Where the warm light falls, for its dust (src/components/universe/fx.ts reads the region "beam").
    if (beam && stage) {
      const sw = stage.clientWidth || 1;
      const sh = stage.clientHeight || 1;
      const r = [(jx - pw * 0.62) / sw, Math.max(0, jy - bh * 0.62) / sh, (jx + pw * 0.62) / sw, Math.min(sh, foot) / sh];
      ["x0", "y0", "x1", "y1"].forEach((name, i) => {
        beam.style.setProperty("--d" + name, r[i]!.toFixed(4));
        beam.style.setProperty("--m" + name, r[i]!.toFixed(4));
      });
    }
    universe.setAttribute("data-scene-placed", "");
  };
  place();
  const ro = new ResizeObserver(place);
  if (stage) ro.observe(stage);
  ro.observe(cover);
  // Its image arriving, or another view taking the middle (a click on a view of the showcase).
  cover.addEventListener("load", place, true);
  const mo = new MutationObserver(place);
  mo.observe(cover, { subtree: true, attributes: true, attributeFilter: ["data-place"] });
  return () => {
    ro.disconnect();
    mo.disconnect();
    cover.removeEventListener("load", place, true);
    universe.removeAttribute("data-scene-placed");
    for (const name of ["--s-x", "--s-y", "--s-u", "--s-top", "--s-pw", "--u-at-x", "--u-at-y"]) universe.style.removeProperty(name);
  };
}

/** The depth on a computer: each plane follows the mouse by its own amount (data-par: x, y in pixels), the jewel with the nearest. */
function followMouse(universe: HTMLElement, article: HTMLElement, cover: HTMLElement, opening: Element): () => void {
  const planes = [...universe.querySelectorAll<HTMLElement>("[data-par]")].map((el) => {
    const [x, y] = (el.dataset.par ?? "0,0").split(",").map(Number);
    return { el, x: x ?? 0, y: y ?? 0 };
  });
  const had = article.getAttribute("data-depth");
  if (!had) article.setAttribute("data-depth", "scene");
  const target = { x: 0, y: 0 };
  const now = { x: 0, y: 0 };
  let frame = 0;
  let visible = true;
  const draw = () => {
    for (const p of planes) p.el.style.translate = (p.x * now.x).toFixed(2) + "px " + (p.y * now.y).toFixed(2) + "px";
    cover.style.setProperty("--u-mx", now.x.toFixed(4));
    cover.style.setProperty("--u-my", now.y.toFixed(4));
  };
  const tick = () => {
    frame = 0;
    if (!visible || document.hidden) return;
    now.x += (target.x - now.x) * 0.08;
    now.y += (target.y - now.y) * 0.08;
    draw();
    if (Math.abs(target.x - now.x) + Math.abs(target.y - now.y) > 0.001) frame = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!frame) frame = requestAnimationFrame(tick);
  };
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    target.x = (e.clientX / window.innerWidth) * 2 - 1;
    target.y = (e.clientY / window.innerHeight) * 2 - 1;
    wake();
  };
  const io = new IntersectionObserver(([e]) => {
    visible = Boolean(e?.isIntersecting);
    if (visible) wake();
  });
  io.observe(opening);
  window.addEventListener("pointermove", onPointer, { passive: true });
  return () => {
    cancelAnimationFrame(frame);
    io.disconnect();
    window.removeEventListener("pointermove", onPointer);
    for (const p of planes) p.el.style.translate = "";
    cover.style.removeProperty("--u-mx");
    cover.style.removeProperty("--u-my");
    if (!had) article.removeAttribute("data-depth");
  };
}

/** The world in the stage of the universe: placed under the jewel, its planes in depth. */
export function SceneStage({ kind, still }: { kind: CodeSceneKind; still: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const universe = ref.current?.closest<HTMLElement>(".universe");
    const cover = universe?.closest("article")?.querySelector<HTMLElement>("[data-piece-cover]");
    if (still || !universe || !cover) return undefined;
    return placeUnder(universe, cover);
  }, [still, kind]);

  useEffect(() => {
    const universe = ref.current?.closest<HTMLElement>(".universe");
    const article = universe?.closest("article");
    const cover = article?.querySelector<HTMLElement>("[data-piece-cover]");
    const opening = article?.querySelector("[data-piece-opening]");
    if (still || !universe || !article || !cover || !opening) return undefined;
    // Off screen, the world rests: its slow motions pause (scenes.css).
    const io = new IntersectionObserver(([e]) => universe.toggleAttribute("data-scene-idle", !e?.isIntersecting));
    io.observe(opening);
    const stopMouse =
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches && window.matchMedia("(hover: hover) and (pointer: fine)").matches ? followMouse(universe, article, cover, opening) : null;
    return () => {
      io.disconnect();
      universe.removeAttribute("data-scene-idle");
      stopMouse?.();
    };
  }, [still, kind]);

  return (
    <div ref={ref} className="u-scene" data-scene={kind}>
      {kind === "trophy-room" ? <TrophyRoomStage /> : <OctagonGalleryStage />}
    </div>
  );
}

/** What belongs to the piece in its world (the plinth and its light): out of the stage, it scrolls with the piece. */
export function SceneNear({ kind }: { kind: CodeSceneKind }) {
  if (kind !== "trophy-room") return null;
  return (
    <div className="u-scene-near" data-scene={kind}>
      <TrophyRoomNear />
    </div>
  );
}
