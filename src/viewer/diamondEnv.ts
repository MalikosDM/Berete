/*
 * The lighting the diamonds see. A jeweller lights stones differently from
 * metal: many narrow bright panels separated by dark gaps, all around and
 * above the stone, plus pin lights. Seen through the facets, they make the
 * crisp black-and-white pattern of a real diamond: a fine pattern, so that
 * even a flat facet changes as the stone turns (scintillation) and the colours
 * of the fire land in small flashes, not on whole facets. This image (360°
 * around the stone, made here) is attached to each stone, its top above the
 * table (see TRACE in ./materials.ts); the metal keeps the studio photographs.
 */
import { DataTexture, DataUtils, EquirectangularReflectionMapping, HalfFloatType, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat } from "three";
import type { Ambiance } from "@/data/models";

/** lon, lat: centre (degrees); w, h: size (degrees, w measured on the sphere); power: brightness. */
type Panel = { lon: number; lat: number; w: number; h: number; power: number };
type Lighting = { panels: Panel[]; room: number; floor: number; tint: [number, number, number] };

const WIDTH = 2048;
const HEIGHT = 1024;
/** Soft edge of a panel, as a share of its size: almost sharp, like the edge of a softbox seen in a facet. */
const EDGE = 0.06;

/** A number between 0 and 1, always the same for the same i and seed. */
function hash(i: number, seed: number): number {
  const a = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
  return a - Math.floor(a);
}

/** A ring of `count` panels at a latitude, each `w` degrees wide; their power varies a little from one to the next. */
function ring(count: number, lat: number, w: number, h: number, power: number, offset = 0, seed = 0): Panel[] {
  return Array.from({ length: count }, (_, i) => ({ lon: offset + (360 / count) * i, lat, w, h, power: power * (0.7 + 0.6 * hash(i, seed)) }));
}

/** Small very bright lights scattered above, always at the same places. */
function pins(count: number, power: number, seed: number, low = 8, high = 80): Panel[] {
  return Array.from({ length: count }, (_, i) => ({ lon: hash(i, seed) * 360, lat: low + hash(i, seed + 1) * (high - low), w: 1.6, h: 1.6, power: power * (0.6 + 0.8 * hash(i, seed + 2)) }));
}

function lightingOf(ambiance: Ambiance): Lighting {
  if (ambiance === "spotlight") {
    return {
      room: 0.004,
      floor: 0.006,
      tint: [1, 1, 1],
      panels: [...ring(5, 70, 16, 14, 7, 20, 1), ...ring(9, 42, 8, 12, 5, 5, 2), ...ring(14, 18, 4, 9, 3.5, 11, 3), ...ring(8, -22, 10, 12, 1.4, 7, 4), ...pins(60, 140, 7)],
    };
  }
  // Face up, a well-cut stone sends back the light from above: bright strips around the top, a small dark spot right
  // above (the viewer's own reflection, which draws the dark arrows of a real diamond), then rings of narrower and
  // narrower panels down to the horizon, and white cards below so that no facet stays a flat grey.
  const panels = [
    ...ring(12, 74, 19, 18, 6, 0, 11),
    ...ring(16, 52, 14, 16, 6.5, 8, 12),
    ...ring(22, 33, 10, 14, 5.5, 3, 13),
    ...ring(30, 16, 7, 11, 4.5, 6, 14),
    ...ring(36, 3, 5, 7, 3.5, 1, 15),
    ...ring(14, -16, 16, 14, 2.6, 9, 16),
    ...ring(12, -38, 20, 18, 2, 4, 17),
    ...pins(90, 90, 1),
  ];
  return { room: 0.018, floor: 0.03, tint: ambiance === "warm" ? [1, 0.84, 0.66] : [1, 1, 1], panels };
}

/** How much of a panel covers a pixel at a distance d from its centre, for a half size `half`. */
function cover(d: number, half: number, size: number): number {
  return Math.min(1, Math.max(0, (half - d) / Math.max(size * EDGE, 0.15)));
}

const cache = new Map<Ambiance, DataTexture>();

export function diamondEnv(ambiance: Ambiance): DataTexture {
  const found = cache.get(ambiance);
  if (found) return found;
  const { panels, room, floor, tint } = lightingOf(ambiance);
  const light = new Float32Array(WIDTH * HEIGHT);
  const degX = 360 / WIDTH;
  const degY = 180 / HEIGHT;
  // Each panel only touches the pixels of its own box: thousands of panels cost little.
  for (const p of panels) {
    const top = Math.min(90, p.lat + p.h / 2 + 1);
    const bottom = Math.max(-90, p.lat - p.h / 2 - 1);
    const j0 = Math.max(0, Math.floor((bottom + 90) / degY));
    const j1 = Math.min(HEIGHT - 1, Math.ceil((top + 90) / degY));
    for (let j = j0; j <= j1; j++) {
      // Row 0 is the bottom of the image: latitude -90°.
      const lat = (j + 0.5) * degY - 90;
      const ey = cover(Math.abs(lat - p.lat), p.h / 2, p.h);
      if (ey <= 0) continue;
      // Widths are measured on the sphere: wider in longitude near the poles.
      const shrink = Math.max(0.02, Math.cos((lat * Math.PI) / 180));
      const spanLon = p.w >= 360 ? 360 : Math.min(360, (p.w / 2 + 1) / shrink);
      const i0 = spanLon >= 180 ? 0 : Math.floor((p.lon - spanLon) / degX);
      const i1 = spanLon >= 180 ? WIDTH - 1 : Math.ceil((p.lon + spanLon) / degX);
      for (let ii = i0; ii <= i1; ii++) {
        const i = ((ii % WIDTH) + WIDTH) % WIDTH;
        const lon = (i + 0.5) * degX;
        let dLon = Math.abs(lon - p.lon);
        if (dLon > 180) dLon = 360 - dLon;
        const ex = p.w >= 360 ? 1 : cover(dLon * shrink, p.w / 2, p.w);
        if (ex > 0) light[j * WIDTH + i]! += ex * ey * p.power;
      }
    }
  }
  const data = new Uint16Array(WIDTH * HEIGHT * 4);
  const one = DataUtils.toHalfFloat(1);
  for (let j = 0; j < HEIGHT; j++) {
    const lat = (j + 0.5) * degY - 90;
    const base = lat >= 0 ? room : floor + (room - floor) * Math.max(0, 1 + lat / 45);
    for (let i = 0; i < WIDTH; i++) {
      const v = light[j * WIDTH + i]!;
      const o = (j * WIDTH + i) * 4;
      data[o] = DataUtils.toHalfFloat(base + v * tint[0]);
      data[o + 1] = DataUtils.toHalfFloat(base + v * tint[1]);
      data[o + 2] = DataUtils.toHalfFloat(base + v * tint[2]);
      data[o + 3] = one;
    }
  }
  const texture = new DataTexture(data, WIDTH, HEIGHT, RGBAFormat, HalfFloatType);
  texture.mapping = EquirectangularReflectionMapping;
  texture.wrapS = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  cache.set(ambiance, texture);
  return texture;
}
