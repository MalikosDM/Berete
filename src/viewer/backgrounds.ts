/*
 * The backgrounds of the viewer: a flat colour, or a studio gradient (lighter
 * in the middle, darker at the edges) that gives depth and lets the shadow of
 * the jewel show. The scene paints them itself, so the saved images keep them.
 */
import { CanvasTexture, Color, SRGBColorSpace, type Texture } from "three";
import type { Background } from "@/data/models";

export const BACKGROUND_LOOKS: Record<Background, { inner: string; outer: string; light: boolean }> = {
  black: { inner: "#0a0a0a", outer: "#0a0a0a", light: false },
  "studio-dark": { inner: "#3a3532", outer: "#0a0a0a", light: false },
  grey: { inner: "#7a7570", outer: "#45413d", light: false },
  white: { inner: "#ffffff", outer: "#ffffff", light: true },
  "studio-light": { inner: "#ffffff", outer: "#d6d0c8", light: true },
  cream: { inner: "#fbf7f0", outer: "#e9dfcf", light: true },
  rose: { inner: "#faeee8", outer: "#dfbcad", light: true },
};

/** CSS of the swatch and of the box behind the canvas. */
export function backgroundCss(background: Background): string {
  const { inner, outer } = BACKGROUND_LOOKS[background];
  return inner === outer ? inner : "radial-gradient(ellipse at 50% 45%, " + inner + " 0%, " + outer + " 100%)";
}

const cache = new Map<Background, Color | Texture>();

/** What the scene draws behind the jewel. */
export function backgroundOfScene(background: Background): Color | Texture {
  const found = cache.get(background);
  if (found) return found;
  const { inner, outer } = BACKGROUND_LOOKS[background];
  let made: Color | Texture;
  if (inner === outer || typeof document === "undefined") made = new Color(inner);
  else {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(512, 460, 0, 512, 512, 760);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(1, outer);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    made = texture;
  }
  cache.set(background, made);
  return made;
}
