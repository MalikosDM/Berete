/*
 * The stands a jewel can be shown on in the 3D editor (26/11/2026), all made by code (no model, no image): an open ring
 * box, a round display, a ring cone, a block of the house's black marble, a bust for a pendant. Each one is sized from
 * the jewel (its box, in metres: the files are in mm, read as m × 0.001) and says where the jewel's root goes: a ring
 * upright in the slit of the box's cushion, a ring around the cone where the cone is as wide as its hole, a pendant
 * hanging on the bust, any jewel lying on the display and on the marble (a ring standing on its band).
 * A stand stands on the ground (y = 0), centred on the vertical axis; the jewel is moved onto it, never the stand.
 * The look of the house: black velvet, black lacquer, a fine line of rose gold, black marble with white and rose-gold
 * veins, a matte black bust. Every mesh casts and receives shadows and is never picked (`userData.noPick`).
 * How a jewel is read from its box (no geometry needed): a ring's hole is along its smallest size, its head on the
 * + side of the longer of the two others; a pendant faces +Z with its top up (+Y), or faces up (+Y) with its top
 * toward −Z when it lies flat in its file (a Rhino file, Z up); a jewel at least 5 cm wide and deep is a necklace
 * modelled as worn, around a neck.
 */
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Euler,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  Quaternion,
  Shape,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type Material,
  type Object3D,
  type Texture,
} from "three";
import type { StandId } from "@/data/scene3d";
import type { JewelFrame } from "./types";
import { leatherNormal, marbleMaps, tiled, velvetNormal } from "./textures";

export const STAND_NAMES: Record<StandId, string> = {
  "ring-box": "Écrin à bague ouvert",
  display: "Présentoir",
  cone: "Cône",
  marble: "Socle en marbre noir Berete",
  bust: "Buste pour pendentif",
};

export type StandOptions = {
  /** Axis of a ring's hole in its file (the try-on's), when the smallest size of its box is not it. */
  axis?: "x" | "y" | "z";
  /** Inner diameter of a ring (m), when known: the cone is as wide as it at the ring. */
  innerDiameter?: number;
  /** The jewel itself (its meshes, root at rest): the bust then lets a necklace fall onto it by its real points, not its box. */
  jewel?: Object3D;
};

export type Stand = { group: Group; jewel: { position: Vector3; rotation: Euler }; dispose(): void };

const X = new Vector3(1, 0, 0);
const Y = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);
const AXES = [X, Y, Z] as const;
const AXIS_INDEX = { x: 0, y: 1, z: 2 } as const;
const DEG = Math.PI / 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* ---------- What a stand owns, freed together ---------- */

class Kit {
  readonly group = new Group();
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: Material[] = [];
  private readonly textures: Texture[] = [];

  mesh(geometry: BufferGeometry, material: Material, parent: Object3D = this.group): Mesh {
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.noPick = true;
    this.geometries.push(geometry);
    parent.add(mesh);
    return mesh;
  }

  material<T extends Material>(material: T): T {
    this.materials.push(material);
    return material;
  }

  texture(texture: Texture): Texture {
    this.textures.push(texture);
    return texture;
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    for (const t of this.textures) t.dispose();
    this.group.removeFromParent();
    this.group.clear();
  }
}

/* ---------- Materials ---------- */

/** Black velvet: a deep matte black whose pile lights up at grazing angles (sheen), with its fine grain. */
function velvet(kit: Kit, tile = 0.03): MeshPhysicalMaterial {
  return kit.material(
    new MeshPhysicalMaterial({
      name: "velours noir",
      color: new Color("#0d0c0c"),
      roughness: 0.94,
      sheen: 1,
      sheenColor: new Color("#5a5251"),
      sheenRoughness: 0.4,
      normalMap: kit.texture(tiled(velvetNormal(), tile)),
      normalScale: new Vector2(0.45, 0.45),
    }),
  );
}

/** Black satin: a soft gloss stretched along the weave. */
function satin(kit: Kit): MeshPhysicalMaterial {
  return kit.material(
    new MeshPhysicalMaterial({
      name: "satin noir",
      color: new Color("#0f0d0d"),
      roughness: 0.36,
      sheen: 1,
      sheenColor: new Color("#857873"),
      sheenRoughness: 0.32,
      anisotropy: 0.55,
    }),
  );
}

/** Piano lacquer: black under a thick clear coat. */
function lacquer(kit: Kit): MeshPhysicalMaterial {
  return kit.material(new MeshPhysicalMaterial({ name: "laque noire", color: new Color("#050505"), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.035 }));
}

/** The fine line of rose gold (the house's accent, #E8B4A0). */
function roseLine(kit: Kit): MeshPhysicalMaterial {
  return kit.material(new MeshPhysicalMaterial({ name: "filet or rose", color: new Color("#e8b4a0"), metalness: 1, roughness: 0.18, envMapIntensity: 1.15 }));
}

/** Polished black marble: the veined stone under a clear polish. */
function marbleStone(kit: Kit, tile = 0.16): MeshPhysicalMaterial {
  const maps = marbleMaps();
  return kit.material(
    new MeshPhysicalMaterial({
      name: "marbre noir",
      map: kit.texture(tiled(maps.color, tile)),
      roughnessMap: kit.texture(tiled(maps.roughness, tile)),
      roughness: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.025,
    }),
  );
}

function matteBlack(kit: Kit): MeshPhysicalMaterial {
  return kit.material(new MeshPhysicalMaterial({ name: "noir mat", color: new Color("#0a0a0a"), roughness: 0.72 }));
}

/** The bust: a soft black leather, matte, a faint sheen and grain. */
function leather(kit: Kit): MeshPhysicalMaterial {
  return kit.material(
    new MeshPhysicalMaterial({
      name: "cuir noir",
      color: new Color("#0d0c0c"),
      roughness: 0.62,
      sheen: 0.35,
      sheenColor: new Color("#3c3634"),
      sheenRoughness: 0.55,
      clearcoat: 0.12,
      clearcoatRoughness: 0.55,
      normalMap: kit.texture(tiled(leatherNormal(), 0.024)),
      normalScale: new Vector2(0.3, 0.3),
    }),
  );
}

/** The silk cord that holds a pendant on the bust. */
function silk(kit: Kit): MeshPhysicalMaterial {
  return kit.material(new MeshPhysicalMaterial({ name: "cordon de soie", color: new Color("#080808"), roughness: 0.38, sheen: 1, sheenColor: new Color("#5e5654"), sheenRoughness: 0.3 }));
}

/* ---------- Geometry ---------- */

/**
 * Smooth normals across edges of less than `creaseDeg` (rounded edges, lathes, their seams), crisp beyond; the faces
 * weighted by their area. Our own (three's toCreasedNormals merges points within 1 cm: our stands are a few cm wide).
 */
function smoothNormals(source: BufferGeometry, creaseDeg: number): BufferGeometry {
  const geometry = source.index ? source.toNonIndexed() : source;
  if (geometry !== source) source.dispose();
  const pos = geometry.getAttribute("position");
  const count = pos.count;
  const faces = Math.floor(count / 3);
  const weighted = new Float32Array(faces * 3);
  const unit = new Float32Array(faces * 3);
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  for (let f = 0; f < faces; f++) {
    a.fromBufferAttribute(pos, f * 3);
    b.fromBufferAttribute(pos, f * 3 + 1).sub(a);
    c.fromBufferAttribute(pos, f * 3 + 2).sub(a);
    b.cross(c);
    weighted.set([b.x, b.y, b.z], f * 3);
    const length = b.length();
    if (length > 0) unit.set([b.x / length, b.y / length, b.z / length], f * 3);
  }
  const buckets = new Map<string, number[]>();
  const q = 1e6;
  for (let v = 0; v < count; v++) {
    const key = Math.round(pos.getX(v) * q) + "," + Math.round(pos.getY(v) * q) + "," + Math.round(pos.getZ(v) * q);
    const list = buckets.get(key);
    if (list) list.push(v);
    else buckets.set(key, [v]);
  }
  const normals = new Float32Array(count * 3);
  const crease = Math.cos(creaseDeg * DEG);
  for (const list of buckets.values()) {
    for (const v of list) {
      const f = Math.floor(v / 3) * 3;
      let x = 0;
      let y = 0;
      let z = 0;
      for (const u of list) {
        const g = Math.floor(u / 3) * 3;
        if (unit[f]! * unit[g]! + unit[f + 1]! * unit[g + 1]! + unit[f + 2]! * unit[g + 2]! >= crease) {
          x += weighted[g]!;
          y += weighted[g + 1]!;
          z += weighted[g + 2]!;
        }
      }
      const length = Math.hypot(x, y, z);
      if (length > 0) normals.set([x / length, y / length, z / length], v * 3);
      else normals.set([unit[f]!, unit[f + 1]!, unit[f + 2]!], v * 3);
    }
  }
  geometry.setAttribute("normal", new BufferAttribute(normals, 3));
  return geometry;
}

function roundedRect(w: number, d: number, r: number): Shape {
  const x = w / 2;
  const y = d / 2;
  const k = Math.max(1e-6, Math.min(r, x - 1e-7, y - 1e-7));
  const s = new Shape();
  s.moveTo(-x + k, -y);
  s.lineTo(x - k, -y);
  s.absarc(x - k, -y + k, k, -Math.PI / 2, 0, false);
  s.lineTo(x, y - k);
  s.absarc(x - k, y - k, k, 0, Math.PI / 2, false);
  s.lineTo(-x + k, y);
  s.absarc(-x + k, y - k, k, Math.PI / 2, Math.PI, false);
  s.lineTo(-x, -y + k);
  s.absarc(-x + k, -y + k, k, Math.PI, Math.PI * 1.5, false);
  return s;
}

/**
 * A rounded slab w × h × d (x, y, z), its corners of radius r in plan and its edges rounded by `bevel`, standing on
 * y = 0; with a hole, a frame (walls). UVs in metres (three's own for an extrusion).
 */
function slab(w: number, h: number, d: number, r: number, bevel: number, hole?: { w: number; d: number; r: number }): BufferGeometry {
  const b = Math.max(0, Math.min(bevel, h / 2 - 1e-6));
  const shape = roundedRect(w - 2 * b, d - 2 * b, r - b);
  // The rounding of the edges grows the outline and shrinks the hole by b: both drawn to come out at their size.
  if (hole) shape.holes.push(roundedRect(hole.w + 2 * b, hole.d + 2 * b, hole.r + b));
  const geometry = new ExtrudeGeometry(shape, { depth: Math.max(1e-6, h - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: b > 0 ? 5 : 1, curveSegments: 12 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, b, 0);
  return smoothNormals(geometry, 40);
}

/** Points of an arc in the (r, y) plane of a lathe (degrees), the first one left out. */
function arc(cx: number, cy: number, radius: number, from: number, to: number, steps = 6): Vector2[] {
  const out: Vector2[] = [];
  for (let k = 1; k <= steps; k++) {
    const t = (from + ((to - from) * k) / steps) * DEG;
    out.push(new Vector2(cx + radius * Math.cos(t), cy + radius * Math.sin(t)));
  }
  return out;
}

/**
 * A solid turned around the vertical axis from a profile in (r, y), drawn counter-clockwise (from the axis at the
 * bottom outward, up, back to the axis at the top). Its seam at the back; UVs in metres (around at the radius `around`,
 * along the profile); `shape` may deform it before its normals are made.
 */
function lathe(points: Vector2[], segments: number, around: number, shape?: (p: Vector3) => void): BufferGeometry {
  const geometry = new LatheGeometry(points, segments, Math.PI, Math.PI * 2);
  if (shape) {
    const pos = geometry.getAttribute("position");
    const p = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      shape(p.fromBufferAttribute(pos, i));
      pos.setXYZ(i, p.x, p.y, p.z);
    }
  }
  const smoothed = smoothNormals(geometry, 50);
  latheUv(smoothed, around);
  return smoothed;
}

/**
 * UVs in metres for a turned solid, triangle by triangle: the flat parts (tops, bottoms) seen from above (x, z), so a
 * texture never gathers into rays at the centre; the sides around the axis (the length around at the radius `around`,
 * and the height).
 */
function latheUv(geometry: BufferGeometry, around: number): void {
  const pos = geometry.getAttribute("position");
  const uv = new Float32Array(pos.count * 2);
  const corners = [new Vector3(), new Vector3(), new Vector3()] as const;
  const e1 = new Vector3();
  const e2 = new Vector3();
  for (let f = 0; f + 2 < pos.count; f += 3) {
    corners.forEach((c, k) => c.fromBufferAttribute(pos, f + k));
    const n = e1.subVectors(corners[1], corners[0]).cross(e2.subVectors(corners[2], corners[0]));
    const flat = Math.abs(n.y) > 0.6 * n.length();
    const angles = corners.map((c) => Math.atan2(c.x, c.z));
    if (Math.max(...angles) - Math.min(...angles) > Math.PI) angles.forEach((a, k) => (angles[k] = a < 0 ? a + Math.PI * 2 : a));
    corners.forEach((c, k) => {
      uv[(f + k) * 2] = flat ? c.x : angles[k]! * around;
      uv[(f + k) * 2 + 1] = flat ? c.z : c.y;
    });
  }
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
}

/** A thin flat ring of rose gold turned around the axis: from radius r1 to r2, from y0 to y1. */
function flatRing(r1: number, r2: number, y0: number, y1: number): BufferGeometry {
  const e = Math.min(r2 - r1, y1 - y0) * 0.3;
  const points = [new Vector2(r1, y0), new Vector2(r2, y0), new Vector2(r2, y1 - e), new Vector2(r2 - e, y1), new Vector2(r1 + e, y1), new Vector2(r1, y1 - e), new Vector2(r1, y0)];
  return lathe(points, 160, r2);
}

/* ---------- Reading the jewel's box ---------- */

type Box = { min: Vector3; max: Vector3; center: Vector3; size: Vector3 };

function boxOf(min: Vector3, max: Vector3): Box {
  return { min, max, center: min.clone().add(max).multiplyScalar(0.5), size: max.clone().sub(min) };
}

/** The jewel's box in its own space (as its file puts it). */
function localBox(frame: JewelFrame): Box {
  const [cx, , cz] = frame.center;
  const [sx, sy, sz] = frame.size;
  return boxOf(new Vector3(cx - sx / 2, frame.minY, cz - sz / 2), new Vector3(cx + sx / 2, frame.minY + sy, cz + sz / 2));
}

/** The box once the jewel is turned (exact for the quarter turns used here). */
function turnedBox(box: Box, q: Quaternion): Box {
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (let k = 0; k < 8; k++) {
    const p = new Vector3(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z).applyQuaternion(q);
    min.min(p);
    max.max(p);
  }
  return boxOf(min, max);
}

/** The turn that brings the jewel's axis `a` onto `A` and its axis `b` onto `B` (a ⟂ b, A ⟂ B). */
function turn(a: Vector3, A: Vector3, b: Vector3, B: Vector3): Quaternion {
  const local = new Matrix4().makeBasis(a, b, a.clone().cross(b));
  const world = new Matrix4().makeBasis(A, B, A.clone().cross(B));
  return new Quaternion().setFromRotationMatrix(world.multiply(local.transpose()));
}

const smallest = (s: readonly number[]): 0 | 1 | 2 => (s[0]! <= s[1]! && s[0]! <= s[2]! ? 0 : s[1]! <= s[2]! ? 1 : 2);

type Ring = {
  /** Axis of the hole and side of the head, in the jewel's space. */
  axis: Vector3;
  head: Vector3;
  outer: number;
  inner: number;
  /** Size along the hole (the band, with the head when it is wider). */
  width: number;
  /** Centre of the hole, in the jewel's space. */
  hole: Vector3;
  /** Round in its plane, flat across: a ring, or a round medallion. */
  ringLike: boolean;
};

function ringOf(frame: JewelFrame, options: StandOptions): Ring {
  const s = frame.size;
  const box = localBox(frame);
  const a = options.axis ? AXIS_INDEX[options.axis] : smallest(s);
  let [p, q] = ([0, 1, 2] as const).filter((k) => k !== a) as [0 | 1 | 2, 0 | 1 | 2];
  if (s[p] > s[q]) [p, q] = [q, p];
  // The head: on the + side of the longer size across the hole (the band's diameter plus the head).
  const hasHead = s[q] > s[p] * 1.04;
  const headAxis = hasHead ? q : p === 1 || q === 1 ? 1 : q;
  const outer = hasHead ? s[p] : (s[p] + s[q]) / 2;
  const inner = options.innerDiameter ?? outer - 2 * Math.max(0.0012, outer * 0.085);
  const hole = box.center.clone();
  if (hasHead) hole.setComponent(headAxis, box.min.getComponent(headAxis) + outer / 2);
  const ringLike = Math.max(...s) <= 0.05 && s[p] / s[q] >= 0.72 && s[a] <= 0.65 * s[q];
  return { axis: AXES[a].clone(), head: AXES[headAxis].clone(), outer, inner, width: s[a], hole, ringLike };
}

/** A ring upright: its hole facing the front (+Z), its head up. */
const upright = (ring: Ring) => turn(ring.axis, Z, ring.head, Y);

/** A pendant facing the front (+Z), its top up. */
function facingFront(frame: JewelFrame): Quaternion {
  const t = smallest(frame.size);
  if (t === 2) return new Quaternion();
  if (t === 1) return turn(Y, Z, Z.clone().negate(), Y);
  return turn(X, Z, Y, Y);
}

/** A jewel lying flat, its face up and its top away from the viewer (it reads upright from the front). */
function lyingFlat(frame: JewelFrame): Quaternion {
  const t = smallest(frame.size);
  if (t === 1) return new Quaternion();
  return turn(AXES[t], Y, Y.clone(), Z.clone().negate());
}

/** How a jewel rests on a flat top: a ring (or a round medallion) standing on its band, anything else lying flat. */
function resting(frame: JewelFrame, options: StandOptions): { q: Quaternion; box: Box; ring: Ring | null } {
  const ring = ringOf(frame, options);
  const q = ring.ringLike ? upright(ring) : lyingFlat(frame);
  return { q, box: turnedBox(localBox(frame), q), ring: ring.ringLike ? ring : null };
}

/** Where the jewel's root goes for it to rest on a top at `top`, centred. */
function onTop(rest: { q: Quaternion; box: Box; ring: Ring | null }, top: number): Vector3 {
  if (rest.ring) {
    const hole = rest.ring.hole.clone().applyQuaternion(rest.q);
    return new Vector3(-hole.x, top + rest.ring.outer / 2 - hole.y, -hole.z);
  }
  return new Vector3(-rest.box.center.x, top - rest.box.min.y, -rest.box.center.z);
}

type Placement = { position: Vector3; quaternion: Quaternion };

/* ---------- The stands ---------- */

/** The open ring box: black lacquer, a rose-gold line on the rims, a cushion of black velvet, the lid lined with satin. */
function ringBox(kit: Kit, frame: JewelFrame, options: StandOptions): Placement {
  const ring = ringOf(frame, options);
  const D = Math.max(ring.outer, 0.012);
  const W = D * 2.7;
  const Dp = D * 2.45;
  const Hb = D * 0.98;
  const Hl = D * 0.56;
  const t = D * 0.1;
  const r = D * 0.24;
  const b = t * 0.3;
  const wi = W - 2 * t;
  const di = Dp - 2 * t;
  const ri = Math.max(r - t, D * 0.04);
  const black = lacquer(kit);
  const pile = velvet(kit);
  const gold = roseLine(kit);

  kit.mesh(slab(W, Hb, Dp, r, b, { w: wi, d: di, r: ri }), black);
  kit.mesh(slab(wi + b, t, di + b, ri, 0), black);
  // The cushion: two rolls of velvet, the ring's band held in the slit between them.
  const gap = clamp(ring.width * 0.55, 0.0012, 0.0045);
  const top = Hb + D * 0.04;
  for (const side of [1, -1] as const) kit.mesh(cushion(wi, di, gap, t, top, side, D), pile);
  kit.mesh(rim(W, Dp, r, t, Hb, 1, 0), gold);

  // The lid, open on its hinge at the back of the top (105°).
  const hinge = new Group();
  hinge.position.set(0, Hb, -Dp / 2);
  hinge.rotation.x = -105 * DEG;
  kit.group.add(hinge);
  kit.mesh(slab(W, Hl, Dp, r, b, { w: wi, d: di, r: ri }).translate(0, 0, Dp / 2), black, hinge);
  kit.mesh(slab(wi + b, t, di + b, ri, 0).translate(0, Hl - t - 0.0002, Dp / 2), black, hinge);
  const pad = Hl * 0.42;
  kit.mesh(slab(wi - D * 0.05, pad, di - D * 0.05, Math.max(ri - D * 0.025, D * 0.03), pad * 0.45).translate(0, Hl - t - pad, Dp / 2), satin(kit), hinge);
  kit.mesh(rim(W, Dp, r, t, 0, -1, Dp / 2), gold, hinge);

  // The ring upright in the slit, its hole to the front, its head up, a little more than a third of it in the cushion.
  const q = upright(ring);
  const hole = ring.hole.clone().applyQuaternion(q);
  return { position: new Vector3(0, top + D * 0.12, 0).sub(hole), quaternion: q };
}

/** The fine rose-gold line on a rim of the box: centred on the wall, standing out by a fraction of a millimetre. */
function rim(W: number, Dp: number, r: number, t: number, y: number, out: 1 | -1, z: number): BufferGeometry {
  const half = t * 0.15;
  const mid = t / 2;
  const h = 0.00025;
  const geometry = slab(W - 2 * mid + 2 * half, h, Dp - 2 * mid + 2 * half, r - mid + half, 0, { w: W - 2 * mid - 2 * half, d: Dp - 2 * mid - 2 * half, r: Math.max(r - mid - half, 1e-4) });
  return geometry.translate(0, out > 0 ? y - h * 0.4 : y - h * 0.6, z);
}

/**
 * One roll of the cushion, across the box (x), on one side of the slit (side +1: the front). Its section: upright on
 * the slit, a large round at the top of the slit, a slightly domed top, a small round at the wall; its ends rounded.
 */
function cushion(wi: number, di: number, gap: number, y0: number, y1: number, side: 1 | -1, D: number): BufferGeometry {
  const bs = D * 0.02;
  const bt = D * 0.1;
  const near = gap / 2 + bs;
  const far = di / 2 - bs;
  const lo = y0 + bs;
  const hi = y1 - bs;
  const w = far - near;
  const rr = Math.min(w * 0.42, (hi - lo) * 0.5);
  const rw = Math.min(w * 0.16, (hi - lo) * 0.3);
  // The section in the shape's (x, y): x = −z of the box for the front roll (the extrusion is turned a quarter below).
  const sx = (z: number) => -z * side;
  const shape = new Shape();
  shape.moveTo(sx(near), lo);
  shape.lineTo(sx(near), hi - rr);
  shape.quadraticCurveTo(sx(near), hi, sx(near + rr), hi);
  shape.quadraticCurveTo(sx(near + rr + (w - rr - rw) * 0.5), hi + D * 0.025, sx(far - rw), hi - rw * 0.15);
  shape.quadraticCurveTo(sx(far), hi - rw * 0.3, sx(far), hi - rw);
  shape.lineTo(sx(far), lo);
  shape.closePath();
  const depth = Math.max(1e-6, wi - 2 * bt);
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 6, curveSegments: 16 });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-depth / 2, 0, 0);
  return smoothNormals(geometry, 50);
}

/** The ring cone: a slender cone of black velvet on a lacquered foot, a rose-gold collar where they meet. */
function cone(kit: Kit, frame: JewelFrame, options: StandOptions): Placement {
  const ring = ringOf(frame, options);
  const hole = Math.max(ring.inner / 2, 0.004);
  const D = Math.max(ring.outer, hole * 2.2);
  // As wide as the ring's hole a little above its middle.
  const tip = hole * 0.24;
  const at = 0.56;
  const base = (hole - at * tip) / (1 - at);
  const H = Math.max(D * 3.2, base * 3.6);
  const R = base * 1.45;
  const foot = base * 0.3;
  const e = foot * 0.3;
  kit.mesh(lathe([new Vector2(0, 0), new Vector2(R - e, 0), ...arc(R - e, e, e, -90, 0), new Vector2(R, foot - e), ...arc(R - e, foot - e, e, 0, 90), new Vector2(0, foot)], 128, R), lacquer(kit));
  const y0 = foot - 0.0004;
  const yc = foot + H - tip;
  kit.mesh(lathe([new Vector2(0, y0), new Vector2(base, y0), new Vector2(tip, yc), ...arc(0, yc, tip, 0, 90, 10)], 128, base), velvet(kit, 0.025));
  const wire = Math.max(0.0003, base * 0.028);
  const collar = new TorusGeometry(base + wire * 0.4, wire, 12, 160);
  collar.rotateX(Math.PI / 2);
  collar.translate(0, foot + wire * 0.9, 0);
  kit.mesh(collar, roseLine(kit));
  // The ring around the cone, its hole on the cone's axis, its head to the front; its band's lower edge where the cone is as wide as its hole.
  const q = turn(ring.axis, Y, ring.head, Z);
  const contact = foot + (H - tip) * ((base - hole) / (base - tip));
  const centre = ring.hole.clone().applyQuaternion(q);
  return { position: new Vector3(0, contact + ring.width / 2, 0).sub(centre), quaternion: q };
}

/** The display: a lacquered drum floating on a recessed foot, an inlaid rose-gold ring, a cushion of velvet on top. */
function display(kit: Kit, frame: JewelFrame, options: StandOptions): Placement {
  const rest = resting(frame, options);
  const R = Math.max(Math.max(rest.box.size.x, rest.box.size.z) * 0.62, 0.026);
  const H = R * 0.34;
  const footH = R * 0.07;
  const footR = R * 0.88;
  const e = R * 0.05;
  const black = lacquer(kit);
  kit.mesh(lathe([new Vector2(0, 0), new Vector2(footR - 0.0005, 0), ...arc(footR - 0.0005, 0.0005, 0.0005, -90, 0, 3), new Vector2(footR, footH + 0.001), new Vector2(0, footH + 0.001)], 128, footR), black);
  kit.mesh(lathe([new Vector2(0, footH), new Vector2(R - e, footH), ...arc(R - e, footH + e, e, -90, 0), new Vector2(R, H - e), ...arc(R - e, H - e, e, 0, 90), new Vector2(0, H)], 160, R), black);
  kit.mesh(flatRing(R * 0.885, R * 0.905, H - 0.0001, H + 0.00022), roseLine(kit));
  const padR = R * 0.84;
  const pad = R * 0.06;
  const pe = pad * 0.6;
  kit.mesh(
    lathe([new Vector2(0, H - 0.0002), new Vector2(padR - 0.0003, H - 0.0002), new Vector2(padR, H + pad * 0.3), ...arc(padR - pe, H + pad - pe, pe, 0, 80, 8), new Vector2(padR * 0.55, H + pad * 0.985), new Vector2(0, H + pad)], 160, padR),
    velvet(kit),
  );
  return { position: onTop(rest, H + pad), quaternion: rest.q };
}

/** The block of black marble of the house, polished, floating on a recessed black plinth, a hairline of rose gold between. */
function marble(kit: Kit, frame: JewelFrame, options: StandOptions): Placement {
  const rest = resting(frame, options);
  const S = Math.max(Math.max(rest.box.size.x, rest.box.size.z) * 1.3, 0.05);
  const Hm = S * 0.42;
  const hp = S * 0.065;
  const inset = S * 0.05;
  const p = S - 2 * inset;
  kit.mesh(slab(p, hp + 0.001, p, S * 0.01, S * 0.004), matteBlack(kit));
  const line = 0.0006;
  kit.mesh(slab(p + 0.0008, line, p + 0.0008, S * 0.01 + 0.0004, 0, { w: p - 0.0004, d: p - 0.0004, r: S * 0.01 - 0.0002 }).translate(0, hp - line, 0), roseLine(kit));
  kit.mesh(slab(S, Hm, S, S * 0.012, S * 0.01).translate(0, hp, 0), marbleStone(kit));
  return { position: onTop(rest, hp + Hm), quaternion: rest.q };
}

/*
 * The bust, in units of the neck's radius. Seen from the front: the waist (a little narrower), up the side to the
 * shoulder's round, along the slope of the shoulder, up the neck. Seen from the side: a chest that rises softly to the
 * neck (its own profile, so the shoulder's round never shows as a shelf across the front). Across: an ellipse, a
 * little squared at the chest, round at the neck.
 */
const BUST_SIDE = [
  [2.72, 0.1],
  [2.8, 0.5],
  [2.9, 1.0],
  [2.92, 1.3],
  [2.76, 1.62],
  [2.3, 1.86],
  [1.75, 2.12],
  [1.3, 2.38],
  [1.1, 2.6],
  [1.02, 2.9],
  [0.97, 3.5],
  [0.95, 4.0],
] as const;
const BUST_FRONT = [
  [0, 1.4],
  [1.0, 1.47],
  [1.6, 1.44],
  [2.0, 1.32],
  [2.3, 1.17],
  [2.6, 1.05],
  [3.0, 0.97],
  [4.2, 0.92],
] as const;
const NECK_TOP = 4.0;

type BustShape = {
  profile: Vector2[];
  /** Half-width at a height (the turned profile). */
  radius(y: number): number;
  /** Half-depth at the front at a height. */
  front(y: number): number;
  /** The point of the surface at a height and an angle around (0: the front), x and z. */
  surface(y: number, deg: number): [number, number];
};

/** y → value along a rising polyline (values beyond its ends: its first or last). */
function along(points: readonly Vector2[], y: number): number {
  if (y <= points[0]!.y) return points[0]!.x;
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1]!;
    const b = points[k]!;
    if (y <= b.y) return a.x + ((b.x - a.x) * (y - a.y)) / Math.max(1e-9, b.y - a.y);
  }
  return points[points.length - 1]!.x;
}

/** A smooth curve through (value, y) points, as a dense rising polyline. */
function rising(points: readonly (readonly [number, number])[], samples: number): Vector2[] {
  const curve = new CatmullRomCurve3(
    points.map(([v, y]) => new Vector3(v, y, 0)),
    false,
    "centripetal",
  );
  const out = curve.getPoints(samples).map((p) => new Vector2(p.x, p.y));
  return out.filter((p, k) => k === 0 || p.y > out[k - 1]!.y);
}

let bustShape: BustShape | null = null;
function bustOf(): BustShape {
  if (bustShape) return bustShape;
  const side = rising(BUST_SIDE, 90);
  const chest = rising(
    BUST_FRONT.map(([y, d]) => [d, y] as const),
    80,
  );
  const radius = (y: number) => along(side, y);
  const front = (y: number) => Math.min(0.96 * radius(y), along(chest, y));
  const squareness = (y: number) => 2 + 0.7 * (1 - smooth(1.7, 2.7, y));
  const surface = (y: number, deg: number): [number, number] => {
    const t = deg * DEG;
    const n = squareness(y);
    const g = Math.pow(Math.pow(Math.abs(Math.sin(t)), n) + Math.pow(Math.abs(Math.cos(t)), n), -1 / n);
    return [Math.sin(t) * radius(y) * g, Math.cos(t) * front(y) * g];
  };
  const profile = [new Vector2(0, 0), new Vector2(2.62, 0), ...arc(2.62, 0.1, 0.1, -90, 0, 4).slice(0, -1), ...side, ...arc(0.8, NECK_TOP, 0.15, 0, 90, 8), new Vector2(0.4, NECK_TOP + 0.165), new Vector2(0, NECK_TOP + 0.17)];
  return (bustShape = { profile, radius, front, surface });
}

/** The bust for a pendant: matte black, a pendant alone hangs on a silk cord, a necklace is worn around its neck. */
function bust(kit: Kit, frame: JewelFrame, options: StandOptions): Placement {
  const shape = bustOf();
  const make = (neck: number) => {
    const points = shape.profile.map((p) => p.clone().multiplyScalar(neck));
    kit.mesh(
      lathe(points, 144, neck * 2, (p) => {
        // From the turned circle to the bust's section at this height: its width, its depth, a little squared.
        const y = p.y / neck;
        const r = Math.hypot(p.x, p.z);
        const k = r / Math.max(1e-9, shape.radius(y) * neck);
        const [x, z] = shape.surface(y, (Math.atan2(p.x, p.z) * 180) / Math.PI);
        p.x = x * neck * k;
        p.z = z * neck * k;
      }),
      leather(kit),
    );
  };
  const [sx, , sz] = frame.size;
  // A necklace modelled as worn: around the neck, its loop resting where the bust is as wide as it.
  if (sx >= 0.05 && sz >= 0.05) {
    const points = options.jewel ? pointsOf(options.jewel) : [];
    const placed = (points.length ? draped(shape, points) : null) ?? necklaceOn(shape, localBox(frame));
    make(placed.neck);
    return { position: placed.position, quaternion: new Quaternion() };
  }
  // A pendant alone: facing the front, on the chest just under the neck, leaning as the chest does; a silk cord.
  const q0 = facingFront(frame);
  const box = turnedBox(localBox(frame), q0);
  const tall = box.size.y;
  const neck = clamp(Math.max(tall, box.size.x) * 1.3, 0.024, 0.042);
  make(neck);
  const front = (y: number) => shape.front(y / neck) * neck;
  const yTop = 2.3 * neck;
  const zTop = front(yTop);
  // Leaning just enough for its back to clear the chest all the way down.
  let lean = 0;
  for (let k = 1; k <= 12; k++) {
    const drop = (tall * k) / 12;
    lean = Math.max(lean, Math.atan2(front(yTop - drop) - zTop, drop));
  }
  const q = new Quaternion().setFromAxisAngle(X, -lean).multiply(q0);
  const back = q0.clone().invert();
  const topBack = new Vector3(box.center.x, box.max.y, box.min.z).applyQuaternion(back);
  const gap = 0.0004;
  const target = new Vector3(0, yTop + Math.sin(lean) * gap, zTop + Math.cos(lean) * gap);
  const position = target.clone().sub(topBack.applyQuaternion(q));
  const bail = new Vector3(box.center.x, box.max.y - tall * 0.08, box.center.z).applyQuaternion(back).applyQuaternion(q).add(position);
  silkCord(kit, shape, bail, neck, yTop, tall);
  return { position, quaternion: q };
}

/**
 * A necklace modelled as worn, read from its box: a loop of chain (as wide as the box) tilted forward (its tilt from
 * the box's depth over its width), the pendant below its front. The bust is sized so that the loop rests on it where
 * it is as wide as the loop (around the neck, or on the slope of the shoulders for a long chain), smaller and smaller
 * until the whole loop and the pendant stay outside it.
 */
function necklaceOn(shape: BustShape, box: Box): { neck: number; position: Vector3 } {
  const tube = 0.0012;
  const R = box.size.x / 2 - tube;
  const tilt = Math.acos(clamp(box.size.z / box.size.x, 0, 1));
  const centre = new Vector3(box.center.x, box.max.y - tube - R * Math.sin(tilt), box.min.z + tube + R * Math.cos(tilt));
  const inside = (x: number, y: number, z: number, neck: number) => {
    const u = y / neck;
    if (u > NECK_TOP || u < 0) return 0;
    const n = 2 + 0.7 * (1 - smooth(1.7, 2.7, u));
    const v = Math.pow(Math.abs(x) / (shape.radius(u) * neck), n) + Math.pow(Math.abs(z) / (shape.front(u) * neck), n);
    return 1 - v;
  };
  const tryNeck = (neck: number) => {
    // The height where the bust is as wide as the loop, searched from the top of the neck down.
    let rest = -1;
    for (let u = NECK_TOP; u >= 0.5; u -= 0.01) {
      if (shape.radius(u) * neck >= R) {
        rest = u * neck;
        break;
      }
    }
    if (rest < 0) return null;
    const position = new Vector3(-centre.x, rest - centre.y, -centre.z);
    let worst = -Infinity;
    for (let k = 0; k < 32; k++) {
      const t = (k / 32) * Math.PI * 2;
      // Its sides rest on the bust (allowed to touch), the rest of it clear.
      const x = R * Math.sin(t);
      const y = rest - R * Math.cos(t) * Math.sin(tilt);
      const z = R * Math.cos(t) * Math.cos(tilt);
      worst = Math.max(worst, inside(x, y, z, neck) - (Math.abs(Math.sin(t)) > 0.92 ? 0.06 : -0.02));
    }
    // The pendant: under the front of the loop, in front of the chest.
    const frontY = rest - R * Math.sin(tilt);
    for (let y = box.min.y + position.y; y < frontY; y += 0.002) worst = Math.max(worst, inside(0, y, box.max.z + position.z - 0.003, neck));
    return { position, clear: worst <= 0 };
  };
  let best: { neck: number; position: Vector3 } | null = null;
  for (let k = 0, neck = Math.max(0.018, R / shape.radius(2.2)); k < 24; k++, neck *= 0.96) {
    const placed = tryNeck(neck);
    if (!placed) continue;
    best = { neck, position: placed.position };
    if (placed.clear) break;
  }
  return best ?? { neck: 0.03, position: new Vector3(-box.center.x, -box.min.y, -box.center.z) };
}

/** Up to about 1500 points of the jewel's meshes, in the space of its root. */
function pointsOf(jewel: Object3D): Vector3[] {
  jewel.updateMatrixWorld(true);
  const toRoot = jewel.matrixWorld.clone().invert();
  const meshes: Mesh[] = [];
  let total = 0;
  jewel.traverse((o) => {
    const mesh = o as Mesh;
    if (mesh.isMesh && mesh.geometry?.getAttribute("position")) {
      meshes.push(mesh);
      total += mesh.geometry.getAttribute("position").count;
    }
  });
  const step = Math.max(1, Math.floor(total / 1500));
  const out: Vector3[] = [];
  const m = new Matrix4();
  for (const mesh of meshes) {
    const pos = mesh.geometry.getAttribute("position");
    m.multiplyMatrices(toRoot, mesh.matrixWorld);
    for (let i = 0; i < pos.count; i += step) out.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(m));
  }
  return out;
}

/**
 * A necklace let fall onto the bust by its own points: centred on the neck by the highest part of its chain, it comes
 * down until it touches. The bust is the largest one it falls around (its top below the top of the neck), so it hangs
 * high, on the neck or the shoulders, its pendant on the chest.
 */
function draped(shape: BustShape, points: Vector3[]): { neck: number; position: Vector3 } | null {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  // Around the neck: the middle of the chain's highest quarter.
  const band = points.filter((p) => p.y >= maxY - (maxY - minY) * 0.25);
  const cx = (Math.min(...band.map((p) => p.x)) + Math.max(...band.map((p) => p.x))) / 2;
  const cz = (Math.min(...band.map((p) => p.z)) + Math.max(...band.map((p) => p.z))) / 2;
  const width = Math.max(...band.map((p) => Math.abs(p.x - cx)));
  const touches = (neck: number, dy: number) => {
    for (const p of points) {
      const u = (p.y + dy) / neck;
      if (u > NECK_TOP + 0.17 || u < 0) continue;
      const n = 2 + 0.7 * (1 - smooth(1.7, 2.7, u));
      const top = u > NECK_TOP ? Math.sqrt(Math.max(0, 1 - ((u - NECK_TOP) / 0.17) ** 2)) : 1;
      const v = Math.pow(Math.abs(p.x - cx) / (shape.radius(Math.min(u, NECK_TOP)) * neck * top + 1e-9), n) + Math.pow(Math.abs(p.z - cz) / (shape.front(Math.min(u, NECK_TOP)) * neck * top + 1e-9), n);
      if (v < 0.995) return true;
    }
    return false;
  };
  for (let k = 0, neck = Math.max(0.018, width / 0.95); k < 30; k++, neck *= 0.95) {
    // From above the neck, down by millimetres until it touches (then back up by one).
    let dy = (NECK_TOP + 0.3) * neck - minY;
    while (dy + minY > 0 && !touches(neck, dy - 0.001)) dy -= 0.001;
    // Fallen around the neck: its top below the top of the neck.
    if (maxY + dy < (NECK_TOP - 0.25) * neck) return { neck, position: new Vector3(-cx, dy, -cz) };
  }
  return null;
}

/** The silk cord: lying on the bust around the neck, higher at the back, down to the pendant's bail in a V. */
function silkCord(kit: Kit, shape: BustShape, bail: Vector3, neck: number, yTop: number, tall: number): void {
  const thick = clamp(tall * 0.018, 0.00035, 0.0007);
  const on = (deg: number, lift: number) => {
    const y = yTop + neck * lift;
    const [x, z] = shape.surface(y / neck, deg);
    const out = new Vector3(x, 0, z).normalize().multiplyScalar(thick);
    return new Vector3(x * neck + out.x, y, z * neck + out.z);
  };
  const points: Vector3[] = [bail.clone()];
  for (const deg of [16, 34, 60, 95, 130, 160, 180, 200, 230, 265, 300, 326, 344]) {
    const k = (1 - Math.cos(deg * DEG)) / 2;
    points.push(on(deg, 0.1 + 0.6 * k));
  }
  // Two points close to the bail, so that the cord comes down to it in a V.
  points.splice(1, 0, bail.clone().add(new Vector3(neck * 0.04, neck * 0.06, 0.0002)));
  points.push(bail.clone().add(new Vector3(-neck * 0.04, neck * 0.06, 0.0002)));
  const curve = new CatmullRomCurve3(points, true, "centripetal");
  kit.mesh(new TubeGeometry(curve, 320, thick, 10, true), silk(kit));
}

/**
 * A stand for the jewel, sized from it (`frame`: the jewel's box in its own space, as its file puts it, in metres), and
 * where to put the jewel's root for it to sit right. Options: the axis of a ring's hole, its inner diameter.
 */
export function makeStand(id: StandId, frame: JewelFrame, options: StandOptions = {}): Stand {
  const kit = new Kit();
  kit.group.name = "stand:" + id;
  kit.group.userData.noPick = true;
  const placed = id === "ring-box" ? ringBox(kit, frame, options) : id === "cone" ? cone(kit, frame, options) : id === "display" ? display(kit, frame, options) : id === "marble" ? marble(kit, frame, options) : bust(kit, frame, options);
  return {
    group: kit.group,
    jewel: { position: placed.position, rotation: new Euler().setFromQuaternion(placed.quaternion) },
    dispose: () => kit.dispose(),
  };
}
