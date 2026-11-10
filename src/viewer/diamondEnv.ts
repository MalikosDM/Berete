/*
 * The lighting the diamonds see. A jeweller lights stones differently from
 * metal: bright panels separated by dark gaps, all around and above the
 * stone, plus a few pin lights. Seen through the facets, they make the
 * black-and-white pattern of a real diamond and its sparkle. This image (360°
 * around the stone, made here) is attached to each stone, its top above the
 * table (see TRACE in ./materials.ts); the metal keeps the studio photographs.
 */
import { DataTexture, DataUtils, EquirectangularReflectionMapping, HalfFloatType, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat } from "three";
import type { Ambiance } from "@/data/models";

type Panel = { lon: number; lat: number; w: number; h: number; power: number };
type Lighting = { panels: Panel[]; room: number; floor: number; tint: [number, number, number] };

const WIDTH = 1024;
const HEIGHT = 512;

/** A ring of `count` panels at a latitude, each `w` degrees wide (the rest of the ring stays dark). */
function ring(count: number, lat: number, w: number, h: number, power: number, offset = 0): Panel[] {
  return Array.from({ length: count }, (_, i) => ({ lon: offset + (360 / count) * i, lat, w, h, power }));
}

/** Small very bright lights scattered above, always at the same places. */
function pins(count: number, power: number, seed: number): Panel[] {
  return Array.from({ length: count }, (_, i) => {
    const a = Math.sin((i + 1) * 12.9898 + seed) * 43758.5453;
    const b = Math.sin((i + 1) * 78.233 + seed) * 12345.6789;
    return { lon: (a - Math.floor(a)) * 360, lat: 12 + (b - Math.floor(b)) * 70, w: 2.4, h: 2.4, power };
  });
}

function lightingOf(ambiance: Ambiance): Lighting {
  if (ambiance === "spotlight") {
    return { room: 0.015, floor: 0.02, tint: [1, 1, 1], panels: [{ lon: 0, lat: 90, w: 360, h: 26, power: 2.2 }, ...ring(4, 62, 22, 12, 5, 30), ...ring(5, 30, 12, 10, 3, 10), ...ring(6, -34, 24, 18, 1.2, 15), ...pins(28, 110, 7)] };
  }
  // Seen face up, a well-cut stone sends the light from above back to the eye: a wide bright top,
  // then rings of panels with dark gaps for the pattern of the facets.
  const panels = [
    { lon: 0, lat: 90, w: 360, h: 34, power: 4.2 },
    ...ring(6, 64, 34, 12, 6),
    ...ring(8, 44, 24, 15, 5, 22),
    ...ring(10, 20, 15, 13, 4, 9),
    ...ring(6, -8, 14, 10, 2, 30),
    // Below, white cards: light leaving through the bottom of the stone comes back grey or white, not black.
    ...ring(8, -34, 30, 22, 2.4, 12),
    ...pins(16, 60, 1),
  ];
  return { room: 0.04, floor: 0.06, tint: ambiance === "warm" ? [1, 0.84, 0.66] : [1, 1, 1], panels };
}

const cache = new Map<Ambiance, DataTexture>();

export function diamondEnv(ambiance: Ambiance): DataTexture {
  const found = cache.get(ambiance);
  if (found) return found;
  const { panels, room, floor, tint } = lightingOf(ambiance);
  const data = new Uint16Array(WIDTH * HEIGHT * 4);
  for (let j = 0; j < HEIGHT; j++) {
    // Row 0 is the bottom of the image: latitude -90°.
    const lat = ((j + 0.5) / HEIGHT - 0.5) * 180;
    const base = lat >= 0 ? room : floor + (room - floor) * Math.max(0, 1 + lat / 45);
    const shrink = Math.cos((lat * Math.PI) / 180);
    for (let i = 0; i < WIDTH; i++) {
      const lon = ((i + 0.5) / WIDTH) * 360;
      let light = 0;
      for (const p of panels) {
        let dLon = Math.abs(lon - p.lon);
        if (dLon > 180) dLon = 360 - dLon;
        // Widths are measured on the sphere: narrower in longitude near the poles.
        dLon *= shrink;
        const dLat = Math.abs(lat - p.lat);
        // Soft edges over 12 % of the size, like a softbox.
        const ex = p.w >= 360 ? 1 : Math.min(1, Math.max(0, (p.w / 2 - dLon) / (p.w * 0.12)));
        const ey = Math.min(1, Math.max(0, (p.h / 2 - dLat) / (p.h * 0.12)));
        light += ex * ey * p.power;
      }
      const o = (j * WIDTH + i) * 4;
      data[o] = DataUtils.toHalfFloat(base + light * tint[0]);
      data[o + 1] = DataUtils.toHalfFloat(base + light * tint[1]);
      data[o + 2] = DataUtils.toHalfFloat(base + light * tint[2]);
      data[o + 3] = DataUtils.toHalfFloat(1);
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
