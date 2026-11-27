/*
 * Colour looks (27/11/2026), our own « LUT »: a colour grade made by code, for the whole image (the scene's LUT, a 3D
 * lookup texture of 32³ drawn by postprocessing's LUT3DEffect) or for one material (the same grade as a colour matrix,
 * a lift and a saturation applied in the stones' shader and to the metal's colour). No file of anyone else: each look is
 * a few numbers.
 */
import { Data3DTexture, FloatType, LinearFilter, RGBAFormat, ClampToEdgeWrapping, Matrix3 } from "three";

export const LOOKS = ["chaud", "froid", "vif", "doux", "argentique", "noir-et-blanc"] as const;
export type LookId = (typeof LOOKS)[number];

export const LOOK_NAMES: Record<LookId, string> = {
  chaud: "Chaud (or plus doré)",
  froid: "Froid (blanc plus net)",
  vif: "Vif (plus de couleur et de contraste)",
  doux: "Doux (contraste léger)",
  argentique: "Argentique (courbe de film)",
  "noir-et-blanc": "Noir et blanc",
};

type Grade = { gain: [number, number, number]; lift: number; saturation: number; contrast: number };

const GRADES: Record<LookId, Grade> = {
  chaud: { gain: [1.06, 1.0, 0.9], lift: 0, saturation: 1.05, contrast: 1 },
  froid: { gain: [0.95, 1.0, 1.06], lift: 0, saturation: 0.95, contrast: 1.02 },
  vif: { gain: [1, 1, 1], lift: 0, saturation: 1.25, contrast: 1.12 },
  doux: { gain: [1, 1, 1], lift: 0.025, saturation: 0.95, contrast: 0.9 },
  argentique: { gain: [1.03, 1.0, 0.96], lift: 0.015, saturation: 0.9, contrast: 1.08 },
  "noir-et-blanc": { gain: [1, 1, 1], lift: 0, saturation: 0, contrast: 1.06 },
};

const LUMA: [number, number, number] = [0.2126, 0.7152, 0.0722];

/** One colour through a look (0–1 in, 0–1 out). */
export function gradeColor(id: LookId, rgb: [number, number, number]): [number, number, number] {
  const g = GRADES[id];
  let [r, gr, b] = rgb.map((v, i) => v * g.gain[i]!) as [number, number, number];
  const l = r * LUMA[0] + gr * LUMA[1] + b * LUMA[2];
  r = l + (r - l) * g.saturation;
  gr = l + (gr - l) * g.saturation;
  b = l + (b - l) * g.saturation;
  const curve = (v: number) => Math.min(1, Math.max(0, (v - 0.5) * g.contrast + 0.5 + g.lift * (1 - v)));
  return [curve(r), curve(gr), curve(b)];
}

const cache = new Map<LookId, Data3DTexture>();

/** The look as a 3D lookup texture (32 per side) for the scene's LUT. */
export function lookTexture(id: LookId): Data3DTexture {
  const found = cache.get(id);
  if (found) return found;
  const n = 32;
  const data = new Float32Array(n * n * n * 4);
  for (let z = 0; z < n; z++)
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const o = (x + y * n + z * n * n) * 4;
        const [r, g, b] = gradeColor(id, [x / (n - 1), y / (n - 1), z / (n - 1)]);
        data[o] = r;
        data[o + 1] = g;
        data[o + 2] = b;
        data[o + 3] = 1;
      }
  const t = new Data3DTexture(data, n, n, n);
  t.format = RGBAFormat;
  t.type = FloatType;
  t.minFilter = LinearFilter;
  t.magFilter = LinearFilter;
  t.wrapS = t.wrapT = t.wrapR = ClampToEdgeWrapping;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  cache.set(id, t);
  return t;
}

/**
 * The look as a colour matrix and a lift, for one material (the stones' shader): out = M · in + lift. Its contrast is
 * folded into the matrix around mid grey (a matrix cannot bend a curve: close enough for one material).
 */
export function lookMatrix(id: LookId | null | undefined): { matrix: Matrix3; lift: number } {
  const m = new Matrix3();
  if (!id || !GRADES[id]) return { matrix: m, lift: 0 };
  const g = GRADES[id];
  const s = g.saturation;
  const [lr, lg, lb] = LUMA;
  // Saturation around the luminance, then the gain per channel, then the contrast.
  const sat = [
    [lr * (1 - s) + s, lg * (1 - s), lb * (1 - s)],
    [lr * (1 - s), lg * (1 - s) + s, lb * (1 - s)],
    [lr * (1 - s), lg * (1 - s), lb * (1 - s) + s],
  ];
  const rows = sat.map((row, i) => row.map((v) => v * g.gain[i]! * g.contrast));
  m.set(rows[0]![0]!, rows[0]![1]!, rows[0]![2]!, rows[1]![0]!, rows[1]![1]!, rows[1]![2]!, rows[2]![0]!, rows[2]![1]!, rows[2]![2]!);
  return { matrix: m, lift: 0.5 * (1 - g.contrast) * 0.2 + g.lift };
}
