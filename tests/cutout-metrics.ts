/*
 * The measures of a cut-out (tests/cutouts2711.spec.ts, 27/11/2026): the cut-out laid on light grey, on mid grey and on the
 * backdrop of its universe (or the black of the page), and measured as a retoucher would look at it.
 *   - fringe: among the pixels of its edge (half transparent: alpha 0.05–0.95, and its outermost opaque pixels), the share that
 *     are dark (their own colour under
 *     0.25 of luminance: a grey metal on light grey is no fringe) and come out darker than the background they are laid on AND
 *     darker than the jewel just inside them: a dark rim or a halo of the photo's black. On each background; the worst counts.
 *   - ghost: the share of the jewel that is half transparent away from its edge (alpha 0.08–0.85, more than 3 px of the 1600 px
 *     file from any transparent pixel): a chain that fades into transparency, a part of the jewel left as a veil.
 *   - background: the share of the outline of the jewel (its opaque pixels next to its soft edge) that belongs to a thick patch
 *     of flat neutral black: the photo's background left stuck to it (a stain under it, a wedge of black beside a ring).
 */
import sharp from "sharp";

export type CutoutMeasure = { fringe: number; fringeOn: string; ghost: number; background: number; width: number; height: number };

/** Sums of v over the square of radius r around each pixel (separable running sums). */
function boxSum(v: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const o = y * w;
    let s = 0;
    for (let x = -r; x <= r; x++) s += x >= 0 && x < w ? v[o + x]! : 0;
    for (let x = 0; x < w; x++) {
      tmp[o + x] = s;
      const add = x + r + 1;
      const sub = x - r;
      if (add < w) s += v[o + add]!;
      if (sub >= 0) s -= v[o + sub]!;
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += y >= 0 && y < h ? tmp[y * w + x]! : 0;
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s;
      const add = y + r + 1;
      const sub = y - r;
      if (add < h) s += tmp[add * w + x]!;
      if (sub >= 0) s -= tmp[sub * w + x]!;
    }
  }
  return out;
}

/** The backgrounds a cut-out is laid on: their luminance at each pixel. */
export type Ground = { name: string; lum: (i: number) => number };

export async function groundOf(name: string, file: string | null, color: number, w: number, h: number): Promise<Ground> {
  if (!file) return { name, lum: () => color };
  const { data } = await sharp(file).resize(w, h, { fit: "cover" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = (0.2126 * data[i * 3]! + 0.7152 * data[i * 3 + 1]! + 0.0722 * data[i * 3 + 2]!) / 255;
  return { name, lum: (i) => lum[i]! };
}

export async function measureCutout(file: string, backdrop: string | null): Promise<CutoutMeasure> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const n = w * h;
  const scale = w / 1600;
  const a = new Float32Array(n);
  const Y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    a[i] = data[i * 4 + 3]! / 255;
    Y[i] = (0.2126 * data[i * 4]! + 0.7152 * data[i * 4 + 1]! + 0.0722 * data[i * 4 + 2]!) / 255;
  }
  // The edge: the half-transparent pixels and the outermost opaque ones (2 px of the 1600 px file from the soft edge, alpha
  // under 0.3): a dark rim drawn opaque is a fringe too. The jewel just inside: the mean light of the opaque pixels deeper in.
  const e = Math.max(2, Math.round(2 * scale));
  const lowE = new Float32Array(n);
  for (let i = 0; i < n; i++) if (a[i]! < 0.3) lowE[i] = 1;
  const nearE = boxSum(lowE, w, h, e);
  const rl = Math.max(4, Math.round(5 * scale));
  const op = new Float32Array(n);
  const opY = new Float32Array(n);
  for (let i = 0; i < n; i++) if (a[i]! > 0.95 && nearE[i]! === 0) {
    op[i] = 1;
    opY[i] = Y[i]!;
  }
  const den = boxSum(op, w, h, rl);
  const num = boxSum(opY, w, h, rl);
  const grounds = [
    await groundOf("gris clair", null, 0.85, w, h),
    await groundOf("gris moyen", null, 0.5, w, h),
    await groundOf(backdrop ? "univers" : "noir", backdrop, 10 / 255, w, h),
  ];
  let edge = 0;
  const dark = grounds.map(() => 0);
  for (let i = 0; i < n; i++) {
    const ai = a[i]!;
    if (ai <= 0.05 || (ai >= 0.95 && nearE[i]! === 0)) continue;
    edge += 1;
    const d = den[i]!;
    if (d < 1) continue;
    const inside = num[i]! / d;
    for (let g = 0; g < grounds.length; g++) {
      const yb = grounds[g]!.lum(i);
      const c = ai * Y[i]! + (1 - ai) * yb;
      if (Y[i]! < 0.25 && c < yb - 0.08 && c < inside - 0.08) dark[g]! += 1;
    }
  }
  let worst = 0;
  for (let g = 1; g < grounds.length; g++) if (dark[g]! > dark[worst]!) worst = g;
  const fringe = edge ? dark[worst]! / edge : 0;

  // Ghost: half transparent, more than rg pixels from any transparent pixel.
  const rg = Math.max(2, Math.round(3 * scale));
  const trans = new Float32Array(n);
  let jewel = 0;
  for (let i = 0; i < n; i++) {
    if (a[i]! < 0.02) trans[i] = 1;
    if (a[i]! > 0.05) jewel += 1;
  }
  const near = boxSum(trans, w, h, rg);
  let veil = 0;
  for (let i = 0; i < n; i++) if (a[i]! > 0.08 && a[i]! < 0.85 && near[i]! === 0) veil += 1;
  const ghost = jewel ? veil / jewel : 0;

  // Background left: opaque, neutral near-black, flat pixels on the outline of the jewel.
  const rs = 2;
  const s1 = boxSum(Y, w, h, rs);
  const sq = new Float32Array(n);
  for (let i = 0; i < n; i++) sq[i] = Y[i]! * Y[i]!;
  const s2 = boxSum(sq, w, h, rs);
  const cnt = (2 * rs + 1) ** 2;
  const cand = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (a[i]! <= 0.9) continue;
    // Neutral near-black (the black of a studio background; never a dark red stone or a deep blue enamel), and flat.
    const r = data[i * 4]!, g = data[i * 4 + 1]!, b = data[i * 4 + 2]!;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx >= 0.08 * 255 || mx - mn >= 0.03 * 255) continue;
    const m = s1[i]! / cnt;
    const v = s2[i]! / cnt - m * m;
    if (v < 0.015 * 0.015) cand[i] = 1;
  }
  // Only thick patches of it (the black a few pixels deep: a stain, a wedge of background), never the thin dark rim of a metal
  // edge in the shadow: a patch survives an opening by a square of 6 px (of the 1600 px file).
  const k = Math.max(3, Math.round(6 * scale));
  const cf = new Float32Array(n);
  for (let i = 0; i < n; i++) cf[i] = cand[i]!;
  const full = (2 * k + 1) ** 2;
  const eroded = boxSum(cf, w, h, k);
  const core = new Float32Array(n);
  for (let i = 0; i < n; i++) if (eroded[i]! >= full - 0.5) core[i] = 1;
  const opened = boxSum(core, w, h, k);
  for (let i = 0; i < n; i++) if (cand[i] && opened[i]! === 0) cand[i] = 0;
  // The outline of the jewel: its opaque pixels within 3 px (of the 1600 px file) of its soft edge (alpha under 0.5). The share of
  // that outline which is a thick flat neutral black: background left stuck to it.
  const low = new Float32Array(n);
  for (let i = 0; i < n; i++) if (a[i]! < 0.5) low[i] = 1;
  const near2 = boxSum(low, w, h, Math.max(2, Math.round(3 * scale)));
  let outline = 0;
  let stuck = 0;
  for (let i = 0; i < n; i++) {
    if (a[i]! <= 0.9 || near2[i]! === 0) continue;
    outline += 1;
    if (cand[i]) stuck += 1;
  }
  const background = outline ? stuck / outline : 0;
  return { fringe, fringeOn: grounds[worst]!.name, ghost, background, width: w, height: h };
}
