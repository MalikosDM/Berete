/*
 * Our own lighting library (26/11/2026): twenty 360° HDR images made by code, never photographed nor copied. Ten light
 * the metal (studios, soft boxes, a horizon, a blurred lounge...), ten light the stones (almost black, a few small very
 * bright sources with sharp edges, so that a facet stays dark unless it sends one of them back to the eye).
 * scripts/hdri-library.ts writes them as Radiance .hdr files in public/hdri/berete; ./index.ts loads them in the viewer.
 * Pure TypeScript (no DOM): the same code runs in Node and in the browser.
 *
 * Convention (it matches three.js's `equirectUv`, so a file needs no rotation in three):
 *   - the image is equirectangular, `width` × `height` (2:1), row 0 at the top;
 *   - latitude φ (degrees): +90 at row 0 (straight up, +Y), 0 at the middle row (horizon), −90 at the last row;
 *   - longitude λ (degrees), around +Y: λ = 0 is −Z (where the default camera, at +Z, looks: the background behind the
 *     jewel), λ = 90 is +X (the camera's right), λ = 180 is +Z (the camera's side, in front of the jewel), λ = 270 is −X;
 *   - direction of a (λ, φ): (sin λ · cos φ, sin φ, −cos λ · cos φ);
 *   - column c has its centre at u = (c + 0.5) / width = 0.25 + λ / 360 (mod 1), row r at φ = 90 − (r + 0.5) · 180 / height.
 *   So three's centre column (u = 0.5) is +X, not −Z: that is three's own layout.
 * The key lights of the new lightings face the camera's side (λ near 180, from the left: λ 200–250). gem-studio and
 * gem-classic keep the exact layout of the texture they replace (the former src/viewer/diamondEnv.ts, whose own longitude L is our
 * λ = L − 90): the large soft box of gem-studio is at λ = 270 (−X), as before.
 */

export type HdriKind = "metal" | "gem";
export type HdriInfo = { kind: HdriKind; /** French, short (the admin) */ name: string; /** French, one simple sentence */ description: string };

export const HDRI: Record<string, HdriInfo> = {
  "studio-warm": { kind: "metal", name: "Studio chaud", description: "Un studio photo sombre aux grandes boîtes à lumière chaudes : la lumière classique d'une photo de bijou." },
  "softbox-wide": { kind: "metal", name: "Grandes boîtes", description: "Deux très grandes boîtes à lumière à gauche et à droite, une au-dessus : des reflets larges et doux." },
  "horizon-soft": { kind: "metal", name: "Horizon doux", description: "Une bande de lumière douce tout autour, à l'horizon, sous un ciel et au-dessus d'un sol plus sombres." },
  "lounge-blur": { kind: "metal", name: "Salon flou", description: "Un intérieur chaleureux vu flou : des taches de lumière ambrée et des tons de bois." },
  daylight: { kind: "metal", name: "Lumière du jour", description: "Un ciel doux et un petit soleil : la lumière neutre du plein air." },
  backlight: { kind: "metal", name: "Contre-jour", description: "La lumière vient de derrière le bijou : des contours brillants, un devant sombre." },
  "studio-dark": { kind: "metal", name: "Studio sombre", description: "Presque tout noir, une seule bande de lumière et un léger rappel : un contraste profond." },
  "ring-light": { kind: "metal", name: "Anneau lumineux", description: "Un anneau de lumière devant le bijou, autour de l'objectif : un cercle brillant dans le métal poli." },
  "three-point": { kind: "metal", name: "Trois lumières", description: "L'éclairage de studio classique : une lumière principale, un rappel doux et une lumière de contour derrière." },
  window: { kind: "metal", name: "Fenêtre", description: "Une grande fenêtre à croisillons sur le côté : la lumière douce d'une pièce en plein jour." },
  "gem-bands": { kind: "gem", name: "Bandes", description: "Des bandes de lumière fines au-dessus et autour de la pierre : un dessin net, noir et blanc." },
  "gem-points": { kind: "gem", name: "Points", description: "Quelques dizaines de petites lumières très fortes : des éclats nets qui scintillent." },
  "gem-ring": { kind: "gem", name: "Anneau", description: "Un anneau de lumière au-dessus de la pierre : des éclats réguliers tout autour de la table." },
  "gem-spot": { kind: "gem", name: "Spot", description: "Un seul spot puissant au-dessus et devant, un léger rappel : des éclats rares et francs." },
  "gem-vitrine": { kind: "gem", name: "Vitrine", description: "Comme dans la vitrine d'un joaillier : une rangée de petits spots au plafond et des bandes basses." },
  "gem-backlight": { kind: "gem", name: "Contre-jour", description: "Les lumières sont derrière et au-dessus de la pierre : ses bords s'allument." },
  "gem-cross": { kind: "gem", name: "Croix", description: "Deux bandes de lumière qui se croisent au-dessus de la pierre." },
  "gem-stars": { kind: "gem", name: "Ciel étoilé", description: "Des centaines de petits points de lumière plus ou moins forts : un scintillement très fin." },
  "gem-studio": { kind: "gem", name: "Studio", description: "Le studio chaud du rendu réaliste : une grande boîte devant et au-dessus, deux bandes et quelques points." },
  "gem-classic": { kind: "gem", name: "Ancien rendu", description: "L'éclairage des pierres d'avant le 26/11 : des anneaux de panneaux étroits et 90 points, gardé pour comparer." },
};

/** The direction (unit vector, three's world axes) of a longitude and a latitude in degrees (see the convention above). */
export function hdriDirection(lon: number, lat: number): [number, number, number] {
  const l = (lon * Math.PI) / 180;
  const p = (lat * Math.PI) / 180;
  return [Math.sin(l) * Math.cos(p), Math.sin(p), -Math.cos(l) * Math.cos(p)];
}

/** The longitude (0–360) and latitude of a direction (any length). */
export function hdriLonLat(x: number, y: number, z: number): [number, number] {
  const n = Math.hypot(x, y, z) || 1;
  const lon = (Math.atan2(x, -z) * 180) / Math.PI;
  return [(lon + 360) % 360, (Math.asin(Math.max(-1, Math.min(1, y / n))) * 180) / Math.PI];
}

/* ---------- The drawing ---------- */

type Rgb = [number, number, number];

const DEG = Math.PI / 180;

/** The image being drawn, with the sines and cosines of its rows and columns ready. */
type Canvas = {
  w: number;
  h: number;
  px: Float32Array;
  /** Size of a pixel, in degrees (vertically). */
  pix: number;
  lat: Float64Array;
  sinLat: Float64Array;
  cosLat: Float64Array;
  lon: Float64Array;
  sinLon: Float64Array;
  cosLon: Float64Array;
};

function canvas(w: number, h: number): Canvas {
  const lat = new Float64Array(h);
  const lon = new Float64Array(w);
  for (let r = 0; r < h; r++) lat[r] = 90 - ((r + 0.5) * 180) / h;
  for (let c = 0; c < w; c++) lon[c] = ((c + 0.5) * 360) / w - 90;
  return {
    w,
    h,
    px: new Float32Array(w * h * 3),
    pix: 180 / h,
    lat,
    sinLat: lat.map((v) => Math.sin(v * DEG)),
    cosLat: lat.map((v) => Math.cos(v * DEG)),
    lon,
    sinLon: lon.map((v) => Math.sin(v * DEG)),
    cosLon: lon.map((v) => Math.cos(v * DEG)),
  };
}

/** A number between 0 and 1, always the same for the same i and seed (an integer hash: same result everywhere). */
function rand(i: number, seed: number): number {
  let x = Math.imul(i + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(seed + 0x632be5ab, 0xc2b2ae35);
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

function smooth(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

/** The background, row by row: `fn(lat)` gives its colour, the same all along the row (one run per row in the file). */
function rows(cv: Canvas, fn: (lat: number) => Rgb): void {
  for (let r = 0; r < cv.h; r++) {
    const [a, b, c] = fn(cv.lat[r]!);
    let o = r * cv.w * 3;
    for (let i = 0; i < cv.w; i++, o += 3) {
      cv.px[o] = cv.px[o]! + a;
      cv.px[o + 1] = cv.px[o + 1]! + b;
      cv.px[o + 2] = cv.px[o + 2]! + c;
    }
  }
}

/** The background, pixel by pixel: `fn(lon, lat)` (for a room whose light changes around). */
function field(cv: Canvas, fn: (lon: number, lat: number) => Rgb): void {
  for (let r = 0; r < cv.h; r++) {
    let o = r * cv.w * 3;
    for (let i = 0; i < cv.w; i++, o += 3) {
      const [a, b, c] = fn((cv.lon[i]! + 360) % 360, cv.lat[r]!);
      cv.px[o] = cv.px[o]! + a;
      cv.px[o + 1] = cv.px[o + 1]! + b;
      cv.px[o + 2] = cv.px[o + 2]! + c;
    }
  }
}

/**
 * Calls `fn(o, dx, dy, dz)` for each pixel within `radius` degrees of (lon, lat), and a little more: only the pixels of
 * that cap are touched, so thousands of small sources cost little.
 */
function around(cv: Canvas, lon: number, lat: number, radius: number, fn: (o: number, x: number, y: number, z: number) => void): void {
  const reach = radius + 1.5 * cv.pix;
  const top = Math.min(90, lat + reach);
  const bottom = Math.max(-90, lat - reach);
  const r0 = Math.max(0, Math.floor(((90 - top) / 180) * cv.h));
  const r1 = Math.min(cv.h - 1, Math.ceil(((90 - bottom) / 180) * cv.h));
  const full = Math.abs(lat) + reach >= 89;
  const span = full ? 180 : Math.asin(Math.min(1, Math.sin(Math.min(90, reach) * DEG) / Math.cos(lat * DEG))) / DEG + cv.pix;
  const degX = 360 / cv.w;
  // Column of a longitude: u = 0.25 + λ / 360.
  const c0 = span >= 180 ? 0 : Math.floor((lon - span + 90) / degX);
  const c1 = span >= 180 ? cv.w - 1 : Math.ceil((lon + span + 90) / degX);
  for (let r = r0; r <= r1; r++) {
    const sp = cv.sinLat[r]!;
    const cp = cv.cosLat[r]!;
    for (let cc = c0; cc <= c1; cc++) {
      const c = ((cc % cv.w) + cv.w) % cv.w;
      fn((r * cv.w + c) * 3, cv.sinLon[c]! * cp, sp, -cv.cosLon[c]! * cp);
    }
  }
}

function add(cv: Canvas, o: number, k: number, color: Rgb): void {
  cv.px[o] = cv.px[o]! + k * color[0];
  cv.px[o + 1] = cv.px[o + 1]! + k * color[1];
  cv.px[o + 2] = cv.px[o + 2]! + k * color[2];
}

/** Angle in degrees between two unit vectors (precise for small angles too). */
function angle(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
  const chord = Math.hypot(ax - bx, ay - by, az - bz);
  return (2 * Math.asin(Math.min(1, chord / 2))) / DEG;
}

type Box = {
  lon: number;
  lat: number;
  /** Full sizes in degrees, seen from the jewel: w along the horizontal of the box, h along its vertical. */
  w: number;
  h: number;
  power: number;
  color?: Rgb;
  /** Degrees: the box turned around its own centre. */
  roll?: number;
  /** Width of the soft edge, as a share of the smaller size (0.04: nearly sharp, a softbox seen in a facet; 0.3: a diffuser). */
  soft?: number;
  /** How much darker the edges are than the centre (a softbox's hot centre), 0–1. */
  falloff?: number;
};

/** A flat rectangular light (a softbox, a strip, a pane) facing the jewel; it keeps its shape anywhere, even overhead. */
function box(cv: Canvas, b: Box): void {
  const color = b.color ?? [1, 1, 1];
  const [cx, cy, cz] = hdriDirection(b.lon, b.lat);
  // The horizontal and vertical of the box, turned by its roll.
  const l = b.lon * DEG;
  let ux = Math.cos(l);
  let uy = 0;
  let uz = Math.sin(l);
  let vx = cy * uz - cz * uy;
  let vy = cz * ux - cx * uz;
  let vz = cx * uy - cy * ux;
  if (b.roll) {
    const cr = Math.cos(b.roll * DEG);
    const sr = Math.sin(b.roll * DEG);
    [ux, uy, uz, vx, vy, vz] = [ux * cr + vx * sr, uy * cr + vy * sr, uz * cr + vz * sr, vx * cr - ux * sr, vy * cr - uy * sr, vz * cr - uz * sr];
  }
  const hw = b.w / 2;
  const hh = b.h / 2;
  const edge = Math.max(Math.min(b.w, b.h) * (b.soft ?? 0.04), cv.pix);
  const falloff = b.falloff ?? 0;
  around(cv, b.lon, b.lat, Math.min(179, Math.hypot(hw, hh) + edge), (o, x, y, z) => {
    const dc = x * cx + y * cy + z * cz;
    if (dc <= 0.01) return;
    const a = Math.atan2(x * ux + y * uy + z * uz, dc) / DEG;
    const v = Math.atan2(x * vx + y * vy + z * vz, dc) / DEG;
    const k = smooth((hw - Math.abs(a)) / edge + 0.5) * smooth((hh - Math.abs(v)) / edge + 0.5);
    if (k <= 0) return;
    const fall = falloff ? 1 - falloff * 0.5 * ((a / hw) ** 2 + (v / hh) ** 2) : 1;
    add(cv, o, k * fall * b.power, color);
  });
}

type Disc = { lon: number; lat: number; /** degrees */ r: number; power: number; color?: Rgb; soft?: number };

/** A round light (a spot, a pin light, a star, the sun). Smaller than a pixel, it is drawn on one pixel with the same energy. */
function disc(cv: Canvas, d: Disc): void {
  const color = d.color ?? [1, 1, 1];
  const least = 0.6 * cv.pix;
  const r = Math.max(d.r, least);
  const power = d.power * (d.r < least ? (d.r / least) ** 2 : 1);
  const edge = Math.max(r * (d.soft ?? 0.08), cv.pix);
  const [cx, cy, cz] = hdriDirection(d.lon, d.lat);
  around(cv, d.lon, d.lat, r + edge, (o, x, y, z) => {
    const k = smooth((r - angle(x, y, z, cx, cy, cz)) / edge + 0.5);
    if (k > 0) add(cv, o, k * power, color);
  });
}

type Ring = { lon: number; lat: number; /** degrees from the centre to the middle of the ring */ r: number; width: number; power: number; color?: Rgb; soft?: number };

/** A ring of light around a direction (a ring light). */
function ring(cv: Canvas, g: Ring): void {
  const color = g.color ?? [1, 1, 1];
  const half = g.width / 2;
  const edge = Math.max(g.width * (g.soft ?? 0.08), cv.pix);
  const [cx, cy, cz] = hdriDirection(g.lon, g.lat);
  around(cv, g.lon, g.lat, g.r + half + edge, (o, x, y, z) => {
    const k = smooth((half - Math.abs(angle(x, y, z, cx, cy, cz) - g.r)) / edge + 0.5);
    if (k > 0) add(cv, o, k * g.power, color);
  });
}

type Blob = { lon: number; lat: number; /** degrees */ sigma: number; power: number; color?: Rgb };

/** A blurred patch of light (out of focus), brightest at its centre. */
function blob(cv: Canvas, g: Blob): void {
  const color = g.color ?? [1, 1, 1];
  const [cx, cy, cz] = hdriDirection(g.lon, g.lat);
  const s2 = 2 * g.sigma * g.sigma;
  around(cv, g.lon, g.lat, Math.min(179, 3 * g.sigma), (o, x, y, z) => {
    const d = angle(x, y, z, cx, cy, cz);
    add(cv, o, g.power * Math.exp((-d * d) / s2), color);
  });
}

/** The longitude and latitude of a point seen from the jewel at the origin (x right, y up, z towards the camera). */
function toward(x: number, y: number, z: number): { lon: number; lat: number } {
  const [lon, lat] = hdriLonLat(x, y, z);
  return { lon, lat };
}

/* ---------- The lightings of the former src/viewer/diamondEnv.ts, kept to the pixel ---------- */

/** lon, lat: centre (degrees, diamondEnv's longitude: our λ + 90); w, h: size (degrees, w measured on the sphere). */
type Panel = { lon: number; lat: number; w: number; h: number; power: number };

/** diamondEnv's own hash (kept, so that its pins stay at the same places). */
function sinHash(i: number, seed: number): number {
  const a = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
  return a - Math.floor(a);
}

function panelRing(count: number, lat: number, w: number, h: number, power: number, offset = 0, seed = 0): Panel[] {
  return Array.from({ length: count }, (_, i) => ({ lon: offset + (360 / count) * i, lat, w, h, power: power * (0.7 + 0.6 * sinHash(i, seed)) }));
}

function panelPins(count: number, power: number, seed: number, low = 8, high = 80): Panel[] {
  return Array.from({ length: count }, (_, i) => ({ lon: sinHash(i, seed) * 360, lat: low + sinHash(i, seed + 1) * (high - low), w: 1.6, h: 1.6, power: power * (0.6 + 0.8 * sinHash(i, seed + 2)) }));
}

/** Panels, room and floor exactly as diamondEnv draws them (its soft edge of 6 % of a panel's size). */
function legacy(cv: Canvas, panels: Panel[], room: number, floor: number, tint: Rgb): void {
  const W = cv.w;
  const H = cv.h;
  const light = new Float32Array(W * H);
  const degX = 360 / W;
  const degY = 180 / H;
  const cover = (d: number, half: number, size: number) => Math.min(1, Math.max(0, (half - d) / Math.max(size * 0.06, 0.15)));
  for (const p of panels) {
    const top = Math.min(90, p.lat + p.h / 2 + 1);
    const bottom = Math.max(-90, p.lat - p.h / 2 - 1);
    const r0 = Math.max(0, Math.floor((90 - top) / degY));
    const r1 = Math.min(H - 1, Math.ceil((90 - bottom) / degY));
    for (let r = r0; r <= r1; r++) {
      const lat = cv.lat[r]!;
      const ey = cover(Math.abs(lat - p.lat), p.h / 2, p.h);
      if (ey <= 0) continue;
      const shrink = Math.max(0.02, Math.cos(lat * DEG));
      const spanLon = p.w >= 360 ? 360 : Math.min(360, (p.w / 2 + 1) / shrink);
      const i0 = spanLon >= 180 ? 0 : Math.floor((p.lon - spanLon) / degX);
      const i1 = spanLon >= 180 ? W - 1 : Math.ceil((p.lon + spanLon) / degX);
      for (let ii = i0; ii <= i1; ii++) {
        const i = ((ii % W) + W) % W;
        // diamondEnv's longitude of column i: (i + 0.5) · 360 / W, our λ + 90.
        let dLon = Math.abs((i + 0.5) * degX - p.lon);
        if (dLon > 180) dLon = 360 - dLon;
        const ex = p.w >= 360 ? 1 : cover(dLon * shrink, p.w / 2, p.w);
        if (ex > 0) light[r * W + i]! += ex * ey * p.power;
      }
    }
  }
  for (let r = 0; r < H; r++) {
    const lat = cv.lat[r]!;
    const base = lat >= 0 ? room : floor + (room - floor) * Math.max(0, 1 + lat / 45);
    for (let i = 0; i < W; i++) {
      const v = light[r * W + i]!;
      const o = (r * W + i) * 3;
      cv.px[o] = cv.px[o]! + base + v * tint[0];
      cv.px[o + 1] = cv.px[o + 1]! + base + v * tint[1];
      cv.px[o + 2] = cv.px[o + 2]! + base + v * tint[2];
    }
  }
}

/* ---------- Colours (never blue: neutral to warm) ---------- */

const WHITE: Rgb = [1, 1, 1];
const WARM_WHITE: Rgb = [1, 0.96, 0.9];
const WARM: Rgb = [1, 0.93, 0.84];
const AMBER: Rgb = [1, 0.72, 0.42];
const CREAM: Rgb = [1, 0.92, 0.78];
const DAY: Rgb = [1, 0.985, 0.965];

/** A dark room: walls, a slightly darker floor, a ceiling between the two. */
function room(cv: Canvas, wall: number, floor: number, ceiling: number, color: Rgb = WARM): void {
  rows(cv, (lat) => {
    const v = lat >= 0 ? wall + (ceiling - wall) * smooth(lat / 90) : floor + (wall - floor) * smooth(1 + lat / 25);
    return [v * color[0], v * color[1], v * color[2]];
  });
}

/* ---------- The lightings of the stones ---------- */

const GEMS: Record<string, (cv: Canvas) => void> = {
  "gem-bands": (cv) => {
    room(cv, 0.004, 0.003, 0.004, WHITE);
    // Long strips across the top, left to right, in front and behind (the zenith stays dark: the viewer's own reflection).
    for (const [lon, lat, power] of [
      [180, 48, 34],
      [180, 70, 28],
      [0, 70, 28],
      [0, 48, 34],
    ] as const) {
      box(cv, { lon, lat, w: 76, h: 4.5, power, color: WARM_WHITE });
    }
    // Upright strips all around.
    for (let i = 0; i < 8; i++) box(cv, { lon: 22.5 + i * 45, lat: 18, w: 3.6, h: 30, power: 24 * (0.8 + 0.4 * rand(i, 3)), color: i % 2 ? WHITE : WARM_WHITE });
    // Two low strips on the sides, dimmer.
    for (const lon of [90, 270]) box(cv, { lon, lat: -10, w: 60, h: 3, power: 9 });
  },
  "gem-points": (cv) => {
    room(cv, 0.003, 0.002, 0.003, WHITE);
    // Pins spread evenly over the sky a stone sees (equal areas, 20° to 82° up), a few near the horizon.
    for (let i = 0; i < 64; i++) {
      const lat = Math.asin(Math.sin(20 * DEG) + rand(i, 11) * (Math.sin(82 * DEG) - Math.sin(20 * DEG))) / DEG;
      disc(cv, { lon: rand(i, 12) * 360, lat, r: 1.3 + 1.1 * rand(i, 13), power: 80 + 120 * rand(i, 14), color: rand(i, 15) < 0.3 ? WARM : WHITE, soft: 0.08 });
    }
    for (let i = 0; i < 10; i++) disc(cv, { lon: i * 36 + 18 * rand(i, 16), lat: 2 + 12 * rand(i, 17), r: 1.2, power: 60 + 60 * rand(i, 18), soft: 0.08 });
  },
  "gem-ring": (cv) => {
    room(cv, 0.004, 0.003, 0.004, WHITE);
    // A ring light right above the stone (its centre left dark: the viewer's place), a thinner one lower around.
    ring(cv, { lon: 0, lat: 90, r: 20, width: 6, power: 45, color: WARM_WHITE, soft: 0.05 });
    ring(cv, { lon: 0, lat: 90, r: 44, width: 3, power: 28, soft: 0.08 });
    ring(cv, { lon: 0, lat: 90, r: 66, width: 1.6, power: 16, soft: 0.1 });
  },
  "gem-spot": (cv) => {
    room(cv, 0.0025, 0.002, 0.0025, WHITE);
    disc(cv, { lon: 180, lat: 55, r: 4.5, power: 160, color: WARM_WHITE, soft: 0.05 });
    // The faint fill: a large dim card high behind (out of the table's mirror for a camera 20–40° above the stone).
    box(cv, { lon: 0, lat: 62, w: 80, h: 28, power: 0.6, soft: 0.25 });
  },
  "gem-vitrine": (cv) => {
    room(cv, 0.005, 0.003, 0.005, WARM);
    // Three rows of small spots in the ceiling of the window: in front, overhead, behind; the middle row stops short of
    // the point right above the stone (the viewer's place), or the whole table would light up.
    for (let i = 0; i < 11; i++) {
      const x = -2.5 + i * 0.5;
      disc(cv, { ...toward(x, 1.6, 0.55), r: 1.8, power: 140, color: WARM_WHITE, soft: 0.06 });
      if (Math.abs(x) > 0.4) disc(cv, { ...toward(x, 1.6, 0), r: 1.6, power: 110, color: WARM_WHITE, soft: 0.06 });
      disc(cv, { ...toward(x, 1.6, -0.6), r: 1.6, power: 90, color: WARM_WHITE, soft: 0.06 });
    }
    // The low strips along the edges of the window, and the glow of its back wall.
    box(cv, { lon: 180, lat: 7, w: 110, h: 3.5, power: 24, color: WARM_WHITE });
    for (const lon of [90, 270]) box(cv, { lon, lat: 7, w: 70, h: 3, power: 16, color: WARM_WHITE });
    box(cv, { lon: 0, lat: 12, w: 90, h: 6, power: 6, color: WARM, soft: 0.2 });
  },
  "gem-backlight": (cv) => {
    room(cv, 0.002, 0.0015, 0.002, WHITE);
    box(cv, { lon: 0, lat: 18, w: 56, h: 18, power: 50, soft: 0.05 });
    for (const lon of [325, 35]) box(cv, { lon, lat: 42, w: 6, h: 50, power: 70, color: WARM_WHITE });
    box(cv, { lon: 0, lat: 66, w: 50, h: 10, power: 40, color: WARM_WHITE });
    // In front, only a faint card.
    box(cv, { lon: 180, lat: 10, w: 40, h: 14, power: 0.5, soft: 0.2 });
  },
  "gem-cross": (cv) => {
    room(cv, 0.004, 0.003, 0.004, WHITE);
    // Two long strips crossing above the stone, turned 45° from the camera (an X seen from the front); where they
    // cross, right above (the viewer's place), a dark gap, or the whole table would light up.
    for (const lon of [45, 135, 225, 315]) box(cv, { lon, lat: 49, w: 5, h: 66, power: 35, color: WARM_WHITE });
  },
  "gem-stars": (cv) => {
    room(cv, 0.003, 0.002, 0.003, WHITE);
    // Many small points, spread evenly on the sphere above −15°: most faint, a few very bright.
    for (let i = 0; i < 1500; i++) {
      const lat = Math.asin(Math.sin(-15 * DEG) + rand(i, 31) * (1 - Math.sin(-15 * DEG))) / DEG;
      const bright = rand(i, 33) ** 3;
      disc(cv, { lon: rand(i, 32) * 360, lat, r: 0.3 + 0.5 * bright, power: 20 + 180 * bright, color: rand(i, 34) < 0.35 ? WARM : WHITE, soft: 0.12 });
    }
  },
  // realisticOf("studio") of diamondEnv.ts (25/11/2026), with a low ring of strips and cards added (26/11/2026).
  "gem-studio": (cv) => {
    const strength = 1;
    legacy(
      cv,
      [
        { lon: 0, lat: 62, w: 70, h: 34, power: 5.2 * strength },
        { lon: 90, lat: 22, w: 12, h: 46, power: 3.2 * strength },
        { lon: 270, lat: 22, w: 12, h: 46, power: 2.6 * strength },
        { lon: 180, lat: 38, w: 40, h: 18, power: 1.6 * strength },
        { lon: 0, lat: -30, w: 120, h: 24, power: 0.9 },
        ...panelPins(14, 60 * strength, 21, 20, 75),
        // 26/11/2026: what the bench and the walls of a real studio send back low around the stone — a ring of narrow
        // strips at the horizon and soft cards below. Without them, the light that leaves through the pavilion of a stone
        // set in metal found only black, and a pavé went dark.
        ...Array.from({ length: 12 }, (_, i) => ({ lon: 15 + i * 30, lat: 8, w: 6, h: 12, power: 1.6 })),
        ...Array.from({ length: 6 }, (_, i) => ({ lon: 30 + i * 60, lat: -22, w: 28, h: 14, power: 0.9 })),
      ],
      0.01,
      0.016,
      WARM,
    );
  },
  // lightingOf("studio") of diamondEnv.ts (the « old rendering »), to the pixel.
  "gem-classic": (cv) => {
    legacy(
      cv,
      [
        ...panelRing(12, 74, 19, 18, 6, 0, 11),
        ...panelRing(16, 52, 14, 16, 6.5, 8, 12),
        ...panelRing(22, 33, 10, 14, 5.5, 3, 13),
        ...panelRing(30, 16, 7, 11, 4.5, 6, 14),
        ...panelRing(36, 3, 5, 7, 3.5, 1, 15),
        ...panelRing(14, -16, 16, 14, 2.6, 9, 16),
        ...panelRing(12, -38, 20, 18, 2, 4, 17),
        ...panelPins(90, 90, 1),
      ],
      0.018,
      0.03,
      WHITE,
    );
  },
};

/* ---------- The lightings of the metal ---------- */

const METALS: Record<string, (cv: Canvas) => void> = {
  "studio-warm": (cv) => {
    room(cv, 0.035, 0.022, 0.03, WARM);
    box(cv, { lon: 215, lat: 35, w: 55, h: 40, power: 14, color: WARM, soft: 0.25, falloff: 0.3 });
    box(cv, { lon: 180, lat: 78, w: 70, h: 32, power: 9, color: WARM, soft: 0.25, falloff: 0.25 });
    box(cv, { lon: 120, lat: 20, w: 30, h: 50, power: 4.5, color: WARM, soft: 0.3, falloff: 0.3 });
    box(cv, { lon: 20, lat: 25, w: 14, h: 55, power: 7, color: WARM, soft: 0.25, falloff: 0.2 });
    box(cv, { lon: 320, lat: 25, w: 14, h: 55, power: 5, color: WARM, soft: 0.25, falloff: 0.2 });
    // A white card on the table in front, bouncing a little light up.
    box(cv, { lon: 180, lat: -35, w: 80, h: 24, power: 0.5, color: WARM, soft: 0.5 });
  },
  "softbox-wide": (cv) => {
    room(cv, 0.04, 0.03, 0.04, WARM_WHITE);
    box(cv, { lon: 270, lat: 10, w: 70, h: 80, power: 9, color: WARM_WHITE, soft: 0.25, falloff: 0.35 });
    box(cv, { lon: 90, lat: 10, w: 70, h: 80, power: 7.5, color: WARM_WHITE, soft: 0.25, falloff: 0.35 });
    // The top one, apart from the two others: a dark gap between them draws a line on the metal.
    box(cv, { lon: 180, lat: 90, w: 64, h: 40, power: 6, color: WARM_WHITE, soft: 0.25, falloff: 0.3 });
  },
  "horizon-soft": (cv) => {
    field(cv, (lon, lat) => {
      // The band: brightest just above the horizon, a little brighter in front and behind than on the sides.
      const band = 6 * Math.exp(-(((lat - 4) / 8) ** 2)) * (0.85 + 0.15 * Math.cos(2 * lon * DEG));
      const sky = lat >= 0 ? 0.12 - 0.06 * smooth(lat / 90) : 0;
      const floor = lat < 0 ? 0.05 - 0.015 * smooth(-lat / 90) : 0;
      const v = band + sky + floor;
      return [v * WARM_WHITE[0], v * WARM_WHITE[1], v * WARM_WHITE[2]];
    });
    box(cv, { lon: 180, lat: 88, w: 60, h: 60, power: 1.4, color: WARM_WHITE, soft: 0.5 });
  },
  "lounge-blur": (cv) => {
    field(cv, (lon, lat) => {
      // A warm room, darker below; a band of wood around at table height, darker on the left.
      const wall = lat >= 0 ? 0.11 - 0.05 * smooth(lat / 90) : 0.07 - 0.03 * smooth(-lat / 90);
      const wood = Math.exp(-(((lat + 6) / 14) ** 2)) * (0.55 + 0.45 * Math.cos((lon - 250) * DEG));
      return [wall + 0.16 * wood, wall * 0.82 + 0.09 * wood, wall * 0.62 + 0.045 * wood];
    });
    // Lamps far behind the jewel, out of focus: flat round patches with soft edges, as a lens draws them; a faint glow
    // around the main one.
    disc(cv, { lon: 230, lat: 18, r: 7, power: 9, color: AMBER, soft: 0.45 });
    disc(cv, { lon: 230, lat: 18, r: 20, power: 0.3, color: AMBER, soft: 0.9 });
    disc(cv, { lon: 135, lat: 28, r: 9, power: 5, color: CREAM, soft: 0.4 });
    disc(cv, { lon: 30, lat: 14, r: 11, power: 3.5, color: AMBER, soft: 0.4 });
    disc(cv, { lon: 330, lat: 44, r: 13, power: 2.2, color: CREAM, soft: 0.5 });
    // A warm ceiling light and a bright window far away, blurred.
    box(cv, { lon: 180, lat: 72, w: 60, h: 30, power: 1.8, color: CREAM, soft: 0.6 });
    box(cv, { lon: 80, lat: 12, w: 28, h: 36, power: 4, color: [1, 0.95, 0.86], soft: 0.9 });
    // Small round bokeh here and there.
    for (let i = 0; i < 16; i++) disc(cv, { lon: rand(i, 41) * 360, lat: -6 + 42 * rand(i, 42), r: 1.6 + 2 * rand(i, 43), power: 1 + 3 * rand(i, 44), color: rand(i, 45) < 0.5 ? AMBER : CREAM, soft: 0.3 });
  },
  daylight: (cv) => {
    rows(cv, (lat) => {
      if (lat >= 0) {
        // The sky: brightest at the horizon (the haze), softer towards the top.
        const v = 0.55 + 0.45 * Math.exp(-lat / 14);
        return [v * DAY[0], v * DAY[1], v * DAY[2]];
      }
      // The ground: a pale warm stone, darker straight down.
      const v = 0.16 - 0.04 * smooth(-lat / 90);
      return [v, v * 0.95, v * 0.88];
    });
    disc(cv, { lon: 225, lat: 40, r: 1.2, power: 30, color: [1, 0.97, 0.92], soft: 0.15 });
    blob(cv, { lon: 225, lat: 40, sigma: 6, power: 1.4, color: [1, 0.97, 0.92] });
  },
  backlight: (cv) => {
    field(cv, (lon, lat) => {
      // Dark in front, a glow behind along the horizon.
      const behind = Math.max(0, Math.cos(lon * DEG)) ** 2;
      const v = 0.02 + 0.6 * behind * Math.exp(-(((lat - 5) / 18) ** 2));
      return [v * WARM_WHITE[0], v * WARM_WHITE[1], v * WARM_WHITE[2]];
    });
    box(cv, { lon: 0, lat: 20, w: 90, h: 60, power: 14, color: WARM_WHITE, soft: 0.35, falloff: 0.3 });
    box(cv, { lon: 0, lat: 66, w: 70, h: 24, power: 6, color: WARM_WHITE, soft: 0.35, falloff: 0.2 });
  },
  "studio-dark": (cv) => {
    room(cv, 0.006, 0.004, 0.006, WARM);
    box(cv, { lon: 235, lat: 30, w: 9, h: 60, power: 22, color: WARM, soft: 0.2, falloff: 0.2 });
    box(cv, { lon: 110, lat: 15, w: 25, h: 35, power: 1.2, color: WARM, soft: 0.4 });
  },
  "ring-light": (cv) => {
    room(cv, 0.04, 0.03, 0.035, WARM_WHITE);
    ring(cv, { lon: 180, lat: 8, r: 17, width: 4.5, power: 16, color: WARM_WHITE, soft: 0.25 });
    box(cv, { lon: 180, lat: 85, w: 60, h: 40, power: 1, color: WARM_WHITE, soft: 0.5 });
  },
  "three-point": (cv) => {
    room(cv, 0.03, 0.02, 0.028, WARM);
    box(cv, { lon: 225, lat: 35, w: 40, h: 45, power: 14, color: WARM, soft: 0.3, falloff: 0.3 });
    box(cv, { lon: 130, lat: 15, w: 45, h: 40, power: 3.5, color: WARM_WHITE, soft: 0.35, falloff: 0.3 });
    box(cv, { lon: 40, lat: 30, w: 10, h: 50, power: 18, color: WARM_WHITE, soft: 0.25, falloff: 0.2 });
  },
  window: (cv) => {
    field(cv, (lon, lat) => {
      // A room lit by the window: the wall facing it a little brighter.
      const facing = 0.5 + 0.5 * Math.cos((lon - 60) * DEG);
      const v = lat >= 0 ? 0.09 + 0.05 * facing - 0.03 * smooth(lat / 90) : 0.07 + 0.02 * facing;
      return [v * WARM[0], v * WARM[1], v * WARM[2]];
    });
    // The window: 3 × 2 panes split by mullions, brighter at the top (the sky).
    const lon0 = 240;
    const lat0 = 18;
    const paneW = 22;
    const paneH = 28;
    const gap = 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        box(cv, { lon: lon0 + (i - 1) * (paneW + gap), lat: lat0 + (j - 0.5) * (paneH + gap), w: paneW, h: paneH, power: j ? 8 : 5.5, color: DAY, soft: 0.08, falloff: 0.15 });
      }
    }
    // The light of the window on the floor.
    blob(cv, { lon: 240, lat: -35, sigma: 15, power: 0.6, color: DAY });
  },
};

/**
 * The lighting `id`, `width` × `height` pixels, linear RGB (3 floats per pixel), row 0 at the top (see the convention
 * at the start of this file). An unknown id gives the default lighting of its kind (gem-studio for an id that starts
 * with "gem-", else studio-warm).
 */
export function hdriPixels(id: string, width: number, height: number): Float32Array {
  const draw = GEMS[id] ?? METALS[id] ?? (id.startsWith("gem-") ? GEMS["gem-studio"]! : METALS["studio-warm"]!);
  const cv = canvas(Math.round(width), Math.round(height));
  draw(cv);
  const gain = GEM_GAIN[id] ?? 1;
  if (gain !== 1) for (let i = 0; i < cv.px.length; i++) cv.px[i]! *= gain;
  return cv.px;
}

/**
 * The stones' lightings brought to the level of "gem-studio" (panels about 5, pins about 50, seen in the viewer on
 * 26/11/2026): drawn first with sources of 20 to 200, they burnt the stones white and the glow spread over the jewel.
 */
const GEM_GAIN: Record<string, number> = {
  "gem-bands": 0.15,
  "gem-points": 0.32,
  "gem-ring": 0.12,
  "gem-spot": 0.35,
  "gem-vitrine": 0.38,
  "gem-backlight": 0.11,
  "gem-cross": 0.15,
  "gem-stars": 0.3,
};
