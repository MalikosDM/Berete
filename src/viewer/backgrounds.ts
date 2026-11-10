/*
 * What stands behind and under the jewel. Plain colours and studio gradients
 * (lighter in the middle), or a setting: the jewel lies on a surface (walnut,
 * velvet, satin, leather) in front of a room seen out of focus, as in a
 * jeweller's photograph. The scene paints them itself, so the saved images keep
 * them. Textures and rooms: Poly Haven, CC0 (public/decor, public/hdri).
 */
import { CanvasTexture, Color, SRGBColorSpace, type Texture } from "three";
import type { Background } from "@/data/models";

export type Surface = {
  /** Files public/decor/<name>_diff.jpg, _nor.jpg, _rough.jpg. */
  name: string;
  /** Size of one repetition of the texture (m). */
  tile: number;
  /** Multiplies the colour (black velvet from a red one). */
  tint?: string;
  /** Soft sheen of a fabric. */
  sheen?: string;
  /** Multiplies the roughness of the texture (lower: shinier). */
  roughness?: number;
};

export type Room = { file: string; blur: number; intensity: number; rotation: number };

export type BackgroundLook = {
  inner: string;
  outer: string;
  /** Light background: dark buttons, lighter shadow. */
  light: boolean;
  surface?: Surface;
  room?: Room;
};

export const BACKGROUND_LOOKS: Record<Background, BackgroundLook> = {
  black: { inner: "#0a0a0a", outer: "#0a0a0a", light: false },
  "studio-dark": { inner: "#3a3532", outer: "#0a0a0a", light: false },
  "studio-light": { inner: "#ffffff", outer: "#d6d0c8", light: true },
  white: { inner: "#ffffff", outer: "#ffffff", light: true },
  rose: { inner: "#faeee8", outer: "#dfbcad", light: true },
  wood: {
    inner: "#5a3a26",
    outer: "#1c120c",
    light: false,
    surface: { name: "dark_wood", tile: 0.35 },
    room: { file: "/hdri/fireplace.hdr", blur: 0.45, intensity: 0.55, rotation: 2.4 },
  },
  velvet: {
    inner: "#2a2626",
    outer: "#080808",
    light: false,
    surface: { name: "velour_velvet", tile: 0.25, tint: "#262222", sheen: "#5a5050" },
    room: { file: "/hdri/photo_studio_loft_hall.hdr", blur: 0.55, intensity: 0.22, rotation: 0.6 },
  },
  satin: {
    inner: "#f3e6cf",
    outer: "#cdb48c",
    light: true,
    surface: { name: "crepe_satin", tile: 0.3, sheen: "#fff3dc", roughness: 0.55 },
    room: { file: "/hdri/cayley_interior.hdr", blur: 0.5, intensity: 0.75, rotation: 1.2 },
  },
  leather: {
    inner: "#f2efe9",
    outer: "#c9c2b6",
    light: true,
    surface: { name: "leather_white", tile: 0.3, tint: "#fff3e4" },
    room: { file: "/hdri/brown_photostudio_01.hdr", blur: 0.5, intensity: 0.8, rotation: 0 },
  },
};

/** CSS of the swatch and of the box behind the canvas while it loads. */
export function backgroundCss(background: Background): string {
  const { inner, outer, surface } = BACKGROUND_LOOKS[background];
  if (surface) return "radial-gradient(ellipse at 50% 70%, " + inner + " 0%, " + outer + " 100%), url(/decor/" + surface.name + "_diff.jpg) center / cover";
  return inner === outer ? inner : "radial-gradient(ellipse at 50% 45%, " + inner + " 0%, " + outer + " 100%)";
}

/** The image of a swatch: the surface itself when there is one. */
export function swatchCss(background: Background): string {
  const { surface } = BACKGROUND_LOOKS[background];
  if (!surface) return backgroundCss(background);
  const tint = surface.tint ? "linear-gradient(" + surface.tint + "cc, " + surface.tint + "cc), " : "";
  return tint + "url(/decor/" + surface.name + "_diff.jpg) center / 300%";
}

const cache = new Map<Background, Color | Texture>();

/** The plain colour or gradient drawn behind the jewel (the rooms are loaded by the stage). */
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

let fade: Texture | null = null;

/** Opaque in the middle, transparent at the rim: the surface melts into the room behind. */
export function fadeTexture(): Texture {
  if (fade) return fade;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.55, "#ffffff");
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  fade = new CanvasTexture(canvas);
  return fade;
}
