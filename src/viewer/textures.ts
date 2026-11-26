/*
 * The textures of the 3D editor (26/11/2026), all made by code: no image is downloaded, copied or shipped. Each one is
 * drawn once, on its first use, from a seeded noise (the same pixels every time), and kept. A material or a stand takes
 * its own copy (`tiled`): it shares the pixels and the GPU memory of the master, with its own scale and angle, and can
 * be disposed alone.
 * Units: the jewel and its stands are in metres, and so are their UVs (1 UV unit = 1 m: the UVs ExtrudeGeometry makes,
 * the lathes of ./stands.ts, `projectUv` for the meshes of a file that have none), so a scale is a real size: a hammer
 * dent of 1.6 mm, a velvet pile of a few hundredths of a millimetre.
 */
import {
  BufferAttribute,
  CanvasTexture,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  type BufferGeometry,
  type ColorSpace,
  type Texture,
} from "three";

/* ---------- Noise (seeded, deterministic, tiling) ---------- */

/** A seeded random generator (mulberry32): the same numbers for the same seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A number in [0, 1) for a cell of a grid (integer x, y), the same for the same seed. */
export function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const lattices = new Map<string, Float32Array>();

/** Random values at the corners of a grid of px × py cells (kept: the noise reads them millions of times). */
function lattice(seed: number, px: number, py: number): Float32Array {
  const key = seed + ":" + px + ":" + py;
  let values = lattices.get(key);
  if (!values) {
    values = new Float32Array(px * py);
    const next = rng(Math.imul(seed, 7919) + px * 131 + py);
    for (let i = 0; i < values.length; i++) values[i] = next();
    lattices.set(key, values);
  }
  return values;
}

/** Smooth value noise in [0, 1] that repeats every `px` units along x and `py` along y (integers). */
export function valueNoise(x: number, y: number, px: number, py: number, seed: number): number {
  const l = lattice(seed, px, py);
  let ix = Math.floor(x);
  let iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  ix = ((ix % px) + px) % px;
  iy = ((iy % py) + py) % py;
  const ix1 = ix + 1 === px ? 0 : ix + 1;
  const iy1 = iy + 1 === py ? 0 : iy + 1;
  const a = l[iy * px + ix]!;
  const b = l[iy * px + ix1]!;
  const c = l[iy1 * px + ix]!;
  const d = l[iy1 * px + ix1]!;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** A fractal sum of value noise, about [0, 1] (most values near 0.5), repeating every `period` units (an integer). */
export function fbm(x: number, y: number, period: number, seed: number, octaves = 4, gain = 0.5): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(x * f, y * f, period * f, period * f, seed + o * 1013);
    norm += amp;
    amp *= gain;
    f *= 2;
  }
  return sum / norm;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ---------- From numbers to textures ---------- */

const cache = new Map<string, Texture>();

function cached<T extends Texture>(key: string, make: () => T): T {
  let found = cache.get(key) as T | undefined;
  if (!found) {
    found = make();
    found.name = "berete:" + key;
    cache.set(key, found);
  }
  return found;
}

/** A repeating texture of RGBA bytes, with its mipmaps (the detail fades smoothly with the distance). */
function dataTexture(data: Uint8Array, size: number, colorSpace: ColorSpace = NoColorSpace): DataTexture {
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  texture.colorSpace = colorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** A grey value per pixel in every channel (roughness maps read G, thickness maps read G). */
function greyTexture(values: Float32Array, size: number): DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = Math.round(Math.min(1, Math.max(0, values[i]!)) * 255);
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  return dataTexture(data, size);
}

/**
 * A tangent-space normal map (OpenGL convention, as three.js reads it: +Y along increasing v) from a repeating height
 * field. `strength`: how steep a difference of 1 between two neighbouring pixels is.
 */
function normalTexture(height: Float32Array, size: number, strength: number): DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    const down = ((j - 1 + size) % size) * size;
    const up = ((j + 1) % size) * size;
    const row = j * size;
    for (let i = 0; i < size; i++) {
      const left = height[row + ((i - 1 + size) % size)]!;
      const right = height[row + ((i + 1) % size)]!;
      const nx = (left - right) * 0.5 * strength;
      const ny = (height[down + i]! - height[up + i]!) * 0.5 * strength;
      const k = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const o = (row + i) * 4;
      data[o] = Math.round((nx * k * 0.5 + 0.5) * 255);
      data[o + 1] = Math.round((ny * k * 0.5 + 0.5) * 255);
      data[o + 2] = Math.round((k * 0.5 + 0.5) * 255);
      data[o + 3] = 255;
    }
  }
  return dataTexture(data, size);
}

/** A box blur of a repeating field, `radius` pixels, in two passes. */
function blur(field: Float32Array, size: number, radius: number): Float32Array {
  const tmp = new Float32Array(field.length);
  const out = new Float32Array(field.length);
  const n = radius * 2 + 1;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += field[j * size + ((i + k + size) % size)]!;
      tmp[j * size + i] = sum / n;
    }
  }
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += tmp[((j + k + size) % size) * size + i]!;
      out[j * size + i] = sum / n;
    }
  }
  return out;
}

/**
 * A copy of a master texture for one material or one stand: same pixels and GPU memory, its own scale (the size of one
 * repetition, in metres) and angle (degrees). Dispose it with its material; the master stays.
 */
export function tiled(master: Texture, tileMetres: number, angleDeg = 0): Texture {
  const texture = master.clone();
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(1 / tileMetres, 1 / tileMetres);
  texture.rotation = (angleDeg * Math.PI) / 180;
  return texture;
}

/* ---------- Metals ---------- */

/**
 * Hammered (« martelé »): round dents of a hammer's face, of several sizes, overlapping. The surface is the lowest of
 * the blows at each point (each blow a shallow bowl), so the dents meet in sharp ridges, as on hand-hammered gold.
 * 1024 px; about ten large dents and sixteen small ones across.
 */
export function hammeredNormal(): DataTexture {
  return cached("hammered", () => {
    const size = 1024;
    const height = new Float32Array(size * size).fill(Infinity);
    const layers = [
      { cells: 8, seed: 11, depth: 0.08, curve: 0.3 },
      { cells: 13, seed: 23, depth: 0.025, curve: 0.34 },
    ];
    for (const { cells, seed, depth, curve } of layers) {
      const jx = lattice(seed, cells, cells);
      const jy = lattice(seed + 1, cells, cells);
      const dz = lattice(seed + 2, cells, cells);
      const kc = lattice(seed + 3, cells, cells);
      // Heights in units of one tile: comparable between the two layers.
      const unit = 1 / cells;
      for (let j = 0; j < size; j++) {
        const y = (j / size) * cells;
        const cy = Math.floor(y);
        for (let i = 0; i < size; i++) {
          const x = (i / size) * cells;
          const cx = Math.floor(x);
          let h = height[j * size + i]!;
          for (let oy = -1; oy <= 1; oy++) {
            const gy = cy + oy;
            const wy = ((gy % cells) + cells) % cells;
            for (let ox = -1; ox <= 1; ox++) {
              const gx = cx + ox;
              const k = wy * cells + (((gx % cells) + cells) % cells);
              const px = gx + 0.1 + jx[k]! * 0.8;
              const py = gy + 0.1 + jy[k]! * 0.8;
              // A bowl: its floor (depth) and its curve vary from blow to blow; heights in units of one tile.
              const d2 = (x - px) * (x - px) + (y - py) * (y - py);
              const v = unit * (-depth * (0.6 + 0.8 * dz[k]!) + curve * (0.7 + 0.6 * kc[k]!) * d2);
              if (v < h) h = v;
            }
          }
          height[j * size + i] = h;
        }
      }
    }
    // The ridges between dents a little softened (a planished surface, polished after the hammer).
    const soft = blur(height, size, 3);
    // Slopes as they are (a rim of about 20 degrees); the material's normalScale softens or deepens them.
    return normalTexture(soft, size, size);
  });
}

/**
 * Brushed (« brossé »): fine parallel lines along u (the direction of the brushing), of uneven depth, a few deeper
 * scratches among them. The look of brushed metal at a jeweller's distance is made by the material's anisotropy (the
 * light stretched across the lines, see ./library/materials.ts); this map only adds the lines seen up close.
 */
export function brushedNormal(): DataTexture {
  return cached("brushed", () => {
    const size = 1024;
    const height = new Float32Array(size * size);
    for (let j = 0; j < size; j++) {
      const v = j / size;
      for (let i = 0; i < size; i++) {
        const u = i / size;
        // Lines: very stretched noise (long along u, thin across), three widths.
        const a = valueNoise(u * 3, v * 512, 3, 512, 41);
        const b = valueNoise(u * 6, v * 256, 6, 256, 42);
        const c = valueNoise(u * 2, v * 128, 2, 128, 43);
        const fade = 0.75 + 0.25 * valueNoise(u * 4, v * 8, 4, 8, 44);
        height[j * size + i] = (0.5 * a + 0.32 * b + 0.18 * c) * fade;
      }
    }
    // A few deeper scratches, of random length.
    const next = rng(45);
    for (let s = 0; s < 70; s++) {
      const row = Math.floor(next() * size);
      const start = Math.floor(next() * size);
      const length = Math.floor(size * (0.15 + next() * 0.7));
      const depth = 0.25 + next() * 0.5;
      for (let k = 0; k < length; k++) {
        const t = k / length;
        const taper = Math.sin(Math.PI * t);
        const i = (start + k) % size;
        height[row * size + i]! -= depth * taper;
        height[((row + 1) % size) * size + i]! -= depth * taper * 0.35;
      }
    }
    return normalTexture(height, size, 2.2);
  });
}

/** The field of the aged finish: 1 in the hollows (the patina), 0 on the polished high points; scratches. */
function agedField(): { patina: Float32Array; scratch: Float32Array; size: number } {
  const size = 512;
  const patina = new Float32Array(size * size);
  const scratch = new Float32Array(size * size);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i / size) * 6;
      const y = (j / size) * 6;
      const cloud = fbm(x, y, 6, 71, 5);
      const fine = fbm(x * 4, y * 4, 24, 72, 3);
      patina[j * size + i] = smooth(0.36, 0.72, cloud * 0.7 + fine * 0.3);
    }
  }
  const next = rng(73);
  for (let s = 0; s < 130; s++) {
    let x = next() * size;
    let y = next() * size;
    const angle = next() * Math.PI * 2;
    const length = 10 + next() * 80;
    const strength = 0.3 + next() * 0.7;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    for (let k = 0; k < length; k++) {
      const i = ((Math.round(x) % size) + size) % size;
      const j = ((Math.round(y) % size) + size) % size;
      scratch[j * size + i] = Math.max(scratch[j * size + i]!, strength * Math.sin((Math.PI * k) / length));
      x += dx;
      y += dy;
    }
  }
  return { patina, scratch, size };
}

let aged: ReturnType<typeof agedField> | null = null;
const agedOf = () => (aged ??= agedField());

/** Aged (« vieilli »), roughness: rougher in the patina of the hollows and along the scratches (G channel). */
export function agedRoughness(): DataTexture {
  return cached("aged-roughness", () => {
    const { patina, scratch, size } = agedOf();
    const values = new Float32Array(size * size);
    for (let i = 0; i < values.length; i++) values[i] = 0.16 + 0.34 * patina[i]! + 0.18 * scratch[i]!;
    return greyTexture(values, size);
  });
}

/** Aged, colour: a linear multiplier of the metal's colour, darker in the patina (map of the material, no colour space). */
export function agedColor(): DataTexture {
  return cached("aged-color", () => {
    const { patina, scratch, size } = agedOf();
    const values = new Float32Array(size * size);
    for (let i = 0; i < values.length; i++) values[i] = 1 - 0.36 * patina[i]! - 0.1 * scratch[i]!;
    return greyTexture(values, size);
  });
}

/* ---------- Fabrics, leather, pearls ---------- */

/** Velvet: the fine grain of the pile, and its larger waves where the pile leans one way or the other. 512 px. */
export function velvetNormal(): DataTexture {
  return cached("velvet", () => {
    const size = 512;
    const grain = new Float32Array(size * size);
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) grain[j * size + i] = hash2(i, j, 91);
    const height = new Float32Array(size * size);
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        let blur = 0;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) blur += grain[((j + oy + size) % size) * size + ((i + ox + size) % size)]!;
        const wave = fbm((i / size) * 6, (j / size) * 6, 6, 92, 3);
        height[j * size + i] = (blur / 9) * 0.55 + wave * 6;
      }
    }
    return normalTexture(height, size, 3);
  });
}

/** A soft leather grain (the bust): small rounded pebbles parted by fine creases. 512 px. */
export function leatherNormal(): DataTexture {
  return cached("leather", () => {
    const size = 512;
    const cells = 40;
    const jx = lattice(101, cells, cells);
    const jy = lattice(102, cells, cells);
    const height = new Float32Array(size * size);
    for (let j = 0; j < size; j++) {
      const y = (j / size) * cells;
      const cy = Math.floor(y);
      for (let i = 0; i < size; i++) {
        const x = (i / size) * cells;
        const cx = Math.floor(x);
        let f1 = 9;
        let f2 = 9;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const gx = cx + ox;
            const gy = cy + oy;
            const k = (((gy % cells) + cells) % cells) * cells + (((gx % cells) + cells) % cells);
            const d = Math.hypot(x - (gx + jx[k]!), y - (gy + jy[k]!));
            if (d < f1) {
              f2 = f1;
              f1 = d;
            } else if (d < f2) f2 = d;
          }
        }
        height[j * size + i] = smooth(0, 0.3, f2 - f1) + 0.25 * fbm(x / 4, y / 4, cells / 4, 103, 3);
      }
    }
    return normalTexture(height, size, 2.5);
  });
}

/**
 * The orient of a pearl: where the thin layers of nacre are thicker or thinner (G channel, read as the thickness of
 * the iridescence), in soft clouds: the overtone moves over the pearl. 256 px.
 */
export function pearlOrient(): DataTexture {
  return cached("pearl-orient", () => {
    const size = 256;
    const values = new Float32Array(size * size);
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) values[j * size + i] = smooth(0.3, 0.7, fbm((i / size) * 4, (j / size) * 4, 4, 111, 4));
    return greyTexture(values, size);
  });
}

/** Mother-of-pearl: wavy bands of the layers of nacre, and their speckle (G channel, the thickness of the iridescence). 512 px. */
export function nacreOrient(): DataTexture {
  return cached("nacre-orient", () => {
    const size = 512;
    const values = new Float32Array(size * size);
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const x = (i / size) * 4;
        const y = (j / size) * 4;
        const warp = fbm(x, y, 4, 121, 4);
        const bands = 0.5 + 0.5 * Math.sin(Math.PI * 2 * (y * 1.5 + warp * 1.8));
        const speckle = fbm(x * 8, y * 8, 32, 122, 2);
        values[j * size + i] = Math.min(1, Math.max(0, bands * 0.8 + speckle * 0.3 - 0.05));
      }
    }
    return greyTexture(values, size);
  });
}

/* ---------- Black marble ---------- */

/**
 * The black marble of the house (Nero Marquina-like): a warm black with soft clouds; a few white veins crossing the
 * stone in one direction, wandering and a little jagged as cracks are; finer grey branches across them; a faint
 * crackle; and, here and there, a faint rose-gold vein along a white one. Each family of veins is a set of lines of a
 * warped phase (a·u + b·v + noise, a and b whole numbers), so the image repeats seamlessly. `period`: noise cells
 * across the image (an integer); `veins`: their strength (a backdrop seen out of focus takes them fainter).
 */
function marbleField(size: number, period: number, seed: number, veins = 1): { color: Uint8Array; rough: Float32Array } {
  const color = new Uint8Array(size * size * 4);
  const rough = new Float32Array(size * size);
  const half = Math.max(1, period >> 1);
  const line = (phase: number) => Math.abs(phase - Math.floor(phase) - 0.5);
  // The smooth fields (the wander of the veins, where they fade, the clouds) on a grid 4 times coarser, read smoothly
  // between its points: the same image, a quarter of the time.
  const step = 4;
  const n = size / step;
  const fields = 7;
  const grid = new Float32Array(n * n * fields);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = (i / n) * period;
      const y = (j / n) * period;
      const o = (j * n + i) * fields;
      grid[o] = fbm(x, y, period, seed, 4) - 0.5;
      grid[o + 1] = fbm(x + 7.7, y + 3.1, period, seed + 2, 4) - 0.5;
      grid[o + 2] = smooth(0.3, 0.52, fbm(x * 0.5 + 3, y * 0.5 + 7, half, seed + 3, 2));
      grid[o + 3] = smooth(0.4, 0.62, fbm(x + 11, y + 4, period, seed + 4, 2));
      grid[o + 4] = smooth(0.4, 0.6, fbm(x + 17, y + 9, period, seed + 6, 2));
      grid[o + 5] = smooth(0.5, 0.7, fbm(x + 23, y + 31, period, seed + 7, 2));
      grid[o + 6] = fbm(x * 0.8 + 40, y * 0.8 + 40, Math.max(1, Math.round(period * 0.8)), seed + 8, 4);
    }
  }
  const at = new Float32Array(fields);
  const read = (i: number, j: number) => {
    const gx = i / step;
    const gy = j / step;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx = gx - x0;
    const fy = gy - y0;
    const a = (y0 % n) * n;
    const b = ((y0 + 1) % n) * n;
    const c0 = x0 % n;
    const c1 = (x0 + 1) % n;
    for (let f = 0; f < fields; f++) {
      const v00 = grid[(a + c0) * fields + f]!;
      const v10 = grid[(a + c1) * fields + f]!;
      const v01 = grid[(b + c0) * fields + f]!;
      const v11 = grid[(b + c1) * fields + f]!;
      at[f] = v00 + (v10 - v00) * fx + (v01 - v00) * fy + (v00 - v10 - v01 + v11) * fx * fy;
    }
  };
  for (let j = 0; j < size; j++) {
    const v = j / size;
    for (let i = 0; i < size; i++) {
      const u = i / size;
      const x = u * period;
      const y = v * period;
      read(i, j);
      const w1 = at[0]!;
      const w3 = at[1]!;
      const m1 = at[2]!;
      const m2 = at[3]!;
      const m3 = at[4]!;
      const m4 = at[5]!;
      const cloud = at[6]!;
      // The small jaggedness of the veins, at full size.
      const w2 = fbm(x * 4, y * 4, period * 4, seed + 1, 3) - 0.5;
      // White veins, fading in and out along their way.
      const d1 = line(u + 2 * v + 1.5 * w1 + 0.1 * w2);
      const core1 = smooth(0.008, 0.001, d1) * m1 * veins;
      const halo1 = smooth(0.06, 0, d1) * m1 * 0.1 * veins;
      // Grey branches across them.
      const d2 = line(3 * u - v + 1.3 * w3 + 0.14 * w2);
      const core2 = smooth(0.0042, 0.0005, d2) * m2 * 0.7 * veins;
      // A faint crackle.
      const d3 = Math.abs(fbm(x * 2 + 3 * w1, y * 2 + 3 * w3, period * 2, seed + 5, 3) - 0.5);
      const core3 = smooth(0.0035, 0, d3) * m3 * 0.3 * veins;
      // Rose gold: along a white vein, a little apart from it.
      const d4 = line(u + 2 * v + 1.5 * w1 + 0.03 + 0.2 * w3);
      const core4 = smooth(0.0035, 0.0004, d4) * m4 * 0.65 * veins;
      // The ground: a warm black, a little lighter in soft clouds.
      const base = 9 + 10 * smooth(0.3, 0.75, cloud);
      let r = base + 2;
      let g = base;
      let b = base - 1;
      const mixIn = (k: number, cr: number, cg: number, cb: number) => {
        r += (cr - r) * k;
        g += (cg - g) * k;
        b += (cb - b) * k;
      };
      mixIn(core3, 92, 89, 87);
      mixIn(core2, 150, 146, 142);
      mixIn(Math.min(1, core1 + halo1), 206, 202, 197);
      mixIn(core4, 182, 124, 104);
      const o = (j * size + i) * 4;
      color[o] = Math.round(r);
      color[o + 1] = Math.round(g);
      color[o + 2] = Math.round(b);
      color[o + 3] = 255;
      // Polished stone; the calcite of the veins a little less.
      rough[j * size + i] = 0.1 + 0.14 * Math.min(1, core1 + core2 + core4) + 0.04 * cloud;
    }
  }
  return { color, rough };
}

/** The black marble of the stands: colour (sRGB) and roughness (G channel), 1024 px, seamless. */
export function marbleMaps(): { color: Texture; roughness: Texture } {
  const color = cached("marble-color", () => {
    const field = marbleField(1024, 4, 131);
    const roughness = greyTexture(field.rough, 1024);
    roughness.name = "berete:marble-roughness";
    cache.set("marble-roughness", roughness);
    return dataTexture(field.color, 1024, SRGBColorSpace);
  });
  return { color, roughness: cache.get("marble-roughness")! };
}

/**
 * A backdrop of black marble (the « marbre noir Berete » background): 2048 × 2048, the stone seen a little out of focus,
 * a soft warm light in the middle, darker toward the edges. Use it as the scene's background with `coverBackground`.
 */
export function marbleBackground(): Texture {
  return cached("marble-background", () => {
    const small = 1024;
    const field = marbleField(small, 4, 151, 0.6);
    const source = document.createElement("canvas");
    source.width = source.height = small;
    const sctx = source.getContext("2d")!;
    sctx.putImageData(new ImageData(new Uint8ClampedArray(field.color.buffer as ArrayBuffer), small, small), 0, 0);
    const size = 2048;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, size, size);
    // A pool of warm light, as from a spot above the jewel.
    const light = ctx.createRadialGradient(size * 0.5, size * 0.42, 0, size * 0.5, size * 0.42, size * 0.55);
    light.addColorStop(0, "rgba(232, 180, 160, 0.07)");
    light.addColorStop(1, "rgba(232, 180, 160, 0)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, size, size);
    // The vignette.
    const shade = ctx.createRadialGradient(size * 0.5, size * 0.45, size * 0.18, size * 0.5, size * 0.5, size * 0.75);
    shade.addColorStop(0, "rgba(10, 10, 10, 0)");
    shade.addColorStop(0.65, "rgba(10, 10, 10, 0.55)");
    shade.addColorStop(1, "rgba(6, 6, 6, 0.92)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, size, size);
    // A fine grain, so that the dark gradients never show bands.
    const image = ctx.getImageData(0, 0, size, size);
    const px = image.data;
    for (let k = 0, n = size * size; k < n; k++) {
      const noise = (hash2(k % size, Math.floor(k / size), 157) - 0.5) * 3;
      px[k * 4] = px[k * 4]! + noise;
      px[k * 4 + 1] = px[k * 4 + 1]! + noise;
      px[k * 4 + 2] = px[k * 4 + 2]! + noise;
    }
    ctx.putImageData(image, 0, 0);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = LinearFilter;
    return texture;
  });
}

/** Fits a square background image to a screen of `aspect` (width / height) without stretching it, as CSS "cover" does. */
export function coverBackground(texture: Texture, aspect: number): void {
  if (aspect >= 1) {
    texture.repeat.set(1, 1 / aspect);
    texture.offset.set(0, (1 - 1 / aspect) / 2);
  } else {
    texture.repeat.set(aspect, 1);
    texture.offset.set((1 - aspect) / 2, 0);
  }
  texture.updateMatrix();
}

/* ---------- UVs for the meshes of a file ---------- */

/**
 * UVs in metres for a mesh that has none (an STL, a .3dm), so that the textured finishes (brushed, hammered, aged) and
 * the orient of a pearl can show. "box": each vertex takes the two coordinates across its normal's main axis (good for
 * hammered and aged); "cylinder": around an axis through `center` (u = the length around, v = along the axis): the
 * brushing of a ring's band follows it round (angle 0). The seam of "cylinder" is put under the axis' first
 * perpendicular (−y around x or z, −z around y), where a ring's shank is.
 */
export function projectUv(geometry: BufferGeometry, options: { mode?: "box" | "cylinder"; axis?: "x" | "y" | "z"; center?: [number, number, number] } = {}): void {
  const position = geometry.getAttribute("position");
  if (!position) return;
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
  const normal = geometry.getAttribute("normal");
  const uv = new Float32Array(position.count * 2);
  const axis = options.axis ?? "y";
  const [cx, cy, cz] = options.center ?? [0, 0, 0];
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    let u: number;
    let v: number;
    if (options.mode === "cylinder") {
      // (a, b): the plane across the axis; along: the axis.
      const [a, b, along] = axis === "x" ? [y - cy, z - cz, x] : axis === "y" ? [z - cz, x - cx, y] : [x - cx, y - cy, z];
      const radius = Math.hypot(a, b);
      const angle = Math.atan2(b, -a);
      u = angle * radius;
      v = along;
    } else {
      const nx = Math.abs(normal.getX(i));
      const ny = Math.abs(normal.getY(i));
      const nz = Math.abs(normal.getZ(i));
      if (nx >= ny && nx >= nz) [u, v] = [z, y];
      else if (ny >= nz) [u, v] = [x, z];
      else [u, v] = [x, y];
    }
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
}
