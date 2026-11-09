/*
 * The lighting the diamonds see. A jeweller lights stones differently from
 * metal: small, very bright sources (strip softboxes, pin lights) on a dark
 * room, so that each facet is either black or white and the stone
 * scintillates. This image (360° around the stone, made here) is used only by
 * the refraction of the stones; the metal keeps the studio photographs.
 */
import { DataTexture, DataUtils, EquirectangularReflectionMapping, HalfFloatType, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat } from "three";
import type { Ambiance } from "@/data/models";

type Light = { lon: number; lat: number; w: number; h: number; power: number; tint: [number, number, number] };

const WIDTH = 1024;
const HEIGHT = 512;

/**
 * Each lighting: a light tent above the stone (brighter towards the top, in
 * bright and less bright sectors so that neighbouring facets differ), a room
 * around it, strip softboxes and small pin lights for the sparkle.
 */
function lightsOf(ambiance: Ambiance): { lights: Light[]; room: number; dome: number; sectors: number; tint: [number, number, number] } {
  const white: [number, number, number] = [1, 1, 1];
  const warm: [number, number, number] = [1, 0.86, 0.7];
  const strips = (count: number, lat: number, power: number, tint: [number, number, number], offset = 0): Light[] =>
    Array.from({ length: count }, (_, i) => ({ lon: offset + (360 / count) * i, lat, w: 10, h: 40, power, tint }));
  const pins = (count: number, power: number, tint: [number, number, number], seed: number): Light[] =>
    Array.from({ length: count }, (_, i) => {
      const a = Math.sin((i + 1) * 12.9898 + seed) * 43758.5453;
      const b = Math.sin((i + 1) * 78.233 + seed) * 12345.6789;
      return { lon: (a - Math.floor(a)) * 360, lat: 10 + (b - Math.floor(b)) * 70, w: 2.5, h: 2.5, power, tint };
    });
  if (ambiance === "warm") return { room: 0.06, dome: 4.5, sectors: 9, tint: warm, lights: [...strips(5, 15, 9, warm, 20), ...pins(14, 40, warm, 3)] };
  if (ambiance === "spotlight") return { room: 0.02, dome: 1.8, sectors: 6, tint: white, lights: [...strips(3, 30, 12, white, 40), ...pins(26, 90, white, 7)] };
  return { room: 0.07, dome: 5.5, sectors: 10, tint: white, lights: [...strips(6, 12, 10, white, 0), ...pins(16, 50, white, 1)] };
}

const cache = new Map<Ambiance, DataTexture>();

export function diamondEnv(ambiance: Ambiance): DataTexture {
  const found = cache.get(ambiance);
  if (found) return found;
  const { lights, room, dome, sectors, tint } = lightsOf(ambiance);
  const data = new Uint16Array(WIDTH * HEIGHT * 4);
  for (let j = 0; j < HEIGHT; j++) {
    // Row 0 is the bottom of the image: latitude -90°.
    const lat = ((j + 0.5) / HEIGHT - 0.5) * 180;
    // The room, darker towards the floor; above 5°, the light tent.
    const base = room * (lat > 0 ? 1 : Math.max(0.2, 1 + lat / 70));
    const tent = lat > 5 ? dome * Math.pow((lat - 5) / 85, 0.6) : 0;
    for (let i = 0; i < WIDTH; i++) {
      const lon = ((i + 0.5) / WIDTH) * 360;
      const sector = 0.15 + 0.85 * Math.pow(0.5 + 0.5 * Math.cos((lon * Math.PI * sectors) / 180), 2);
      const top = tent * sector;
      let r = base + top * tint[0];
      let g = base + top * tint[1];
      let b = base + top * tint[2];
      for (const l of lights) {
        let dLon = Math.abs(lon - l.lon);
        if (dLon > 180) dLon = 360 - dLon;
        // Widths are measured on the sphere: narrower in longitude near the poles.
        dLon *= Math.cos((lat * Math.PI) / 180);
        const dLat = Math.abs(lat - l.lat);
        // Soft edges over 15 % of the size.
        const ex = Math.min(1, Math.max(0, (l.w / 2 - dLon) / (l.w * 0.15)));
        const ey = Math.min(1, Math.max(0, (l.h / 2 - dLat) / (l.h * 0.15)));
        const k = ex * ey * l.power;
        if (k > 0) {
          r += k * l.tint[0];
          g += k * l.tint[1];
          b += k * l.tint[2];
        }
      }
      const o = (j * WIDTH + i) * 4;
      data[o] = DataUtils.toHalfFloat(r);
      data[o + 1] = DataUtils.toHalfFloat(g);
      data[o + 2] = DataUtils.toHalfFloat(b);
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
