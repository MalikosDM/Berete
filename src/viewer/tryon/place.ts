/*
 * Where the ring goes on the finger (26/11/2026): the same reckoning for the try-on of the client (./TryOn.tsx: a finger
 * found in the camera image) and for the setting of the admin (./TryOnEditor.tsx: a cylinder of 17 mm that stands for
 * the finger). No drawing here, only numbers: the functions take points and give matrices (three.js math only).
 *
 * The space of the finger: origin on the axis of the finger, `along` of the way from its base knuckle to its middle
 * joint; y along the finger (towards the nail), z out of the back of the hand, x across (x = y × z). Its unit is the
 * scene's; one millimetre is the finger's diameter / 17 (FINGER_MM), so the offsets of the admin mean the same on any hand.
 *
 * The ring, in its own space (the file): the axis of its hole (`axis` of the settings, or the axis where a hole shows
 * when the setting's has none), the centre of the hole and its inner radius, measured once on its points (measureRing),
 * and the side of its head (the farthest part from the hole), turned towards the back of the hand.
 */
import { Euler, MathUtils, Matrix4, Vector3, type BufferGeometry, type InstancedMesh, type Mesh, type Object3D } from "three";
import type { Finger, TryOnSettings } from "@/data/scene3d";

/** The diameter of the finger of the admin's cylinder, and the measure of a millimetre on any finger. */
export const FINGER_MM = 17;
/** The length of the base segment of the finger in the admin's cylinder (base knuckle to middle joint), in mm. */
export const SEGMENT_MM = 42;

export type Axis = TryOnSettings["axis"];

/* ---------- The ring, measured in its own space ---------- */

export type RingFit = {
  /** Centre of the hole, in the ring's own space. */
  center: Vector3;
  /** Inner radius of the hole (the size of the finger it fits), in the ring's own units. */
  innerRadius: number;
  /** Unit vector of the hole's axis. */
  axis: Vector3;
  /** Unit vector from the hole to the head of the ring, across the axis. */
  up: Vector3;
  /** The axis of the hole actually used (the admin's, or the one where the hole shows when the admin's has none). */
  axisName: Axis;
  /** How clear the hole is: its radius over half the ring's largest size across the axis (0: no hole; 0.5 to 0.8 for a ring). */
  clearness: number;
  /** The width of the shank where it touches the finger (the band opposite the head), along the axis. */
  bandWidth: number;
};

const AXES: Record<Axis, number> = { x: 0, y: 1, z: 2 };

/**
 * The points of a jewel in its own space (without the transform of `root` itself), every mesh and every copy of an
 * instanced mesh, at most `max` of them taken evenly: enough to measure, cheap to go through.
 */
export function ringPoints(root: Object3D, max = 20000): Float32Array {
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert();
  const parts: { geometry: BufferGeometry; matrices: Matrix4[] }[] = [];
  let total = 0;
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh || !mesh.geometry?.attributes?.position) return;
    const base = toRoot.clone().multiply(mesh.matrixWorld);
    const inst = mesh as unknown as InstancedMesh;
    const matrices: Matrix4[] = [];
    if (inst.isInstancedMesh) {
      const m = new Matrix4();
      for (let i = 0; i < inst.count; i++) {
        inst.getMatrixAt(i, m);
        matrices.push(base.clone().multiply(m));
      }
    } else matrices.push(base);
    parts.push({ geometry: mesh.geometry, matrices });
    total += mesh.geometry.attributes.position.count * matrices.length;
  });
  const step = Math.max(1, Math.ceil(total / max));
  const out: number[] = [];
  const v = new Vector3();
  let n = 0;
  for (const { geometry, matrices } of parts) {
    const pos = geometry.attributes.position;
    for (const m of matrices) {
      for (let i = 0; i < pos.count; i++, n++) {
        if (n % step) continue;
        v.fromBufferAttribute(pos, i).applyMatrix4(m);
        out.push(v.x, v.y, v.z);
      }
    }
  }
  return new Float32Array(out);
}

/** Below this, the hole along an axis is not clear (the shank seen from the side, a pendant): the other axes are tried. */
const CLEAR_HOLE = 0.3;

/**
 * The hole of a ring: along the admin's axis when a hole shows there, else along the axis where it shows best (a file
 * whose hole is along y while the setting still says z: the ring would be seen from its side, standing on the finger).
 * Something that is not a ring (no hole on any axis) keeps the admin's axis and a hole of 30 % of its size.
 */
export function measureRing(points: Float32Array, axisName: Axis): RingFit {
  const wanted = measureAlong(points, axisName);
  if (wanted.clearness >= CLEAR_HOLE) return wanted;
  let best = wanted;
  for (const other of ["x", "y", "z"] as Axis[]) {
    if (other === axisName) continue;
    const fit = measureAlong(points, other);
    if (fit.clearness > best.clearness) best = fit;
  }
  return best.clearness >= CLEAR_HOLE ? best : wanted;
}

/**
 * The hole of a ring seen along `axis`: the largest empty circle around the middle of the ring (searched on a grid,
 * refined three times), its centre and radius; the head is the side where the points go farthest from the hole.
 * No hole: a hole of 30 % of its size, in its middle, and a clearness of 0.
 */
function measureAlong(points: Float32Array, axisName: Axis): RingFit {
  const a = AXES[axisName];
  const u = (a + 1) % 3;
  const w = (a + 2) % 3;
  const count = Math.floor(points.length / 3);
  const axis = new Vector3().setComponent(a, 1);
  const fallbackUp = new Vector3().setComponent(axisName === "y" ? 2 : 1, 1);
  if (count < 3) return { center: new Vector3(), innerRadius: 0.0085, axis, up: fallbackUp, axisName, clearness: 0, bandWidth: 0.004 };

  // At most 12000 points for the search (the hole is found as well, much faster).
  const step = Math.max(1, Math.ceil(count / 12000));
  const pu: number[] = [];
  const pw: number[] = [];
  let minU = Infinity, maxU = -Infinity, minW = Infinity, maxW = -Infinity, minA = Infinity, maxA = -Infinity;
  for (let i = 0; i < count; i++) {
    const x = points[i * 3 + u], y = points[i * 3 + w], z = points[i * 3 + a];
    minU = Math.min(minU, x); maxU = Math.max(maxU, x);
    minW = Math.min(minW, y); maxW = Math.max(maxW, y);
    minA = Math.min(minA, z); maxA = Math.max(maxA, z);
    if (i % step === 0) {
      pu.push(x);
      pw.push(y);
    }
  }
  const spanU = maxU - minU, spanW = maxW - minW;
  const size = Math.max(spanU, spanW, maxA - minA, 1e-9);
  const clearance = (cu: number, cw: number) => {
    let best = Infinity;
    for (let i = 0; i < pu.length; i++) {
      const du = pu[i] - cu, dw = pw[i] - cw;
      const d = du * du + dw * dw;
      if (d < best) best = d;
    }
    return best;
  };
  let cu = (minU + maxU) / 2, cw = (minW + maxW) / 2;
  let halfU = spanU * 0.3, halfW = spanW * 0.3;
  let best = clearance(cu, cw);
  for (let level = 0; level < 4; level++) {
    const cells = level === 0 ? 20 : 10;
    const startU = cu - halfU, startW = cw - halfW;
    for (let i = 0; i <= cells; i++) {
      for (let j = 0; j <= cells; j++) {
        const tu = startU + (2 * halfU * i) / cells, tw = startW + (2 * halfW * j) / cells;
        const d = clearance(tu, tw);
        if (d > best) {
          best = d;
          cu = tu;
          cw = tw;
        }
      }
    }
    halfU = (2 * halfU) / cells;
    halfW = (2 * halfW) / cells;
  }
  let innerRadius = Math.sqrt(best);
  let clearness = innerRadius / Math.max(Math.max(spanU, spanW) / 2, 1e-9);
  if (!(innerRadius > Math.min(spanU, spanW) * 0.08)) {
    clearness = 0;
    // No hole: a pendant, a closed shape. Its middle, and a hole of 30 % of its size.
    cu = (minU + maxU) / 2;
    cw = (minW + maxW) / 2;
    innerRadius = Math.max(Math.min(spanU, spanW), size * 0.2) * 0.3;
  }

  // The band (points near the hole) gives the middle along the axis; the far points give the side of the head.
  const radial: number[] = [];
  let bandMin = Infinity, bandMax = -Infinity;
  for (let i = 0; i < count; i += step) {
    const du = points[i * 3 + u] - cu, dw = points[i * 3 + w] - cw;
    const d = Math.hypot(du, dw);
    radial.push(d);
    if (d < innerRadius * 1.6) {
      const z = points[i * 3 + a];
      bandMin = Math.min(bandMin, z);
      bandMax = Math.max(bandMax, z);
    }
  }
  const middleA = Number.isFinite(bandMin) ? (bandMin + bandMax) / 2 : (minA + maxA) / 2;
  const sorted = [...radial].sort((x, y) => x - y);
  const median = sorted[Math.floor(sorted.length / 2)] ?? innerRadius;
  const threshold = Math.max(median * 1.2, innerRadius * 1.45);
  let sumU = 0, sumW = 0, weight = 0;
  for (let k = 0, i = 0; i < count; i += step, k++) {
    const d = radial[k];
    if (d <= threshold) continue;
    const du = points[i * 3 + u] - cu, dw = points[i * 3 + w] - cw;
    const wgt = d - threshold;
    sumU += (du / d) * wgt;
    sumW += (dw / d) * wgt;
    weight += wgt;
  }
  const up = new Vector3();
  const lean = weight > 0 ? Math.hypot(sumU, sumW) / weight : 0;
  if (lean > 0.2) up.setComponent(u, sumU).setComponent(w, sumW).normalize();
  else up.copy(fallbackUp);

  // The shank where it touches the finger, within 60° of the side opposite the head: the width of its soft shadow (the
  // head and its prongs are often much wider than the band; their shadow would make a grey patch beside a thin band).
  const upU = up.getComponent(u), upW = up.getComponent(w);
  let shankMin = Infinity, shankMax = -Infinity;
  for (let k = 0, i = 0; i < count; i += step, k++) {
    const d = radial[k];
    if (d > innerRadius * 1.15 || d < 1e-12) continue;
    const du = points[i * 3 + u] - cu, dw = points[i * 3 + w] - cw;
    if ((du * upU + dw * upW) / d > -0.5) continue;
    const z = points[i * 3 + a];
    shankMin = Math.min(shankMin, z);
    shankMax = Math.max(shankMax, z);
  }
  const bandWidth = Number.isFinite(shankMin) ? shankMax - shankMin : Number.isFinite(bandMin) ? bandMax - bandMin : maxA - minA;

  const center = new Vector3().setComponent(u, cu).setComponent(w, cw).setComponent(a, middleA);
  return { center, innerRadius, axis, up, axisName, clearness, bandWidth };
}

/* ---------- The finger ---------- */

export type FingerFrame = {
  origin: Vector3;
  /** Across the finger. */
  x: Vector3;
  /** Along the finger, towards the nail. */
  y: Vector3;
  /** Out of the back of the hand. */
  z: Vector3;
  /** Diameter of the finger, in the units of the scene. */
  diameter: number;
  /** The base knuckle and the middle joint, in the units of the scene. */
  base: Vector3;
  joint: Vector3;
  /** Where the origin stands from the base knuckle (0) to the middle joint (1). */
  along: number;
  /** Units of the scene per metre of the hand (video pixels per metre on a hand of the camera; 1 for the admin's cylinder). */
  scale: number;
};

/** The admin's finger: a cylinder of 17 mm along y, its base at y = 0, the back of the hand towards +z (units: metres). */
export function cylinderFrame(along: number): FingerFrame {
  const mm = 0.001;
  return {
    origin: new Vector3(0, along * SEGMENT_MM * mm, 0),
    x: new Vector3(1, 0, 0),
    y: new Vector3(0, 1, 0),
    z: new Vector3(0, 0, 1),
    diameter: FINGER_MM * mm,
    base: new Vector3(0, 0, 0),
    joint: new Vector3(0, SEGMENT_MM * mm, 0),
    along,
    scale: 1,
  };
}

/** A point of MediaPipe: image ones from 0 to 1 (x right, y down), world ones in metres (x right, y down, z away). */
export type Point3 = { x: number; y: number; z: number };
export type Side = "left" | "right";

/** The joints of each finger (MediaPipe's numbers): base knuckle, middle joint, tip, and the knuckles beside it. */
export const FINGER_JOINTS: Record<Finger, { mcp: number; pip: number; tip: number; beside: number[]; width: number }> = {
  index: { mcp: 5, pip: 6, tip: 8, beside: [9], width: 0.9 },
  middle: { mcp: 9, pip: 10, tip: 12, beside: [5, 13], width: 0.9 },
  ring: { mcp: 13, pip: 14, tip: 16, beside: [9, 17], width: 0.88 },
  little: { mcp: 17, pip: 18, tip: 20, beside: [13], width: 0.85 },
};

/** Pairs of joints of the palm (they keep their length whatever the fingers do): the scale of the image to the world. */
const PALM_PAIRS: [number, number][] = [[0, 5], [0, 9], [0, 13], [0, 17], [5, 9], [9, 13], [13, 17], [5, 17]];

/**
 * A hand of the camera in the space of the try-on's scene: video pixels, centre of the frame at 0, x right, y up, z towards
 * the camera (an orthographic camera looks at it: what is on the image stays exactly on the image). The depth comes from
 * the world points of the hand, brought to pixels by the scale of the palm (image length / world length, across the image).
 */
export type HandInScene = { points: Vector3[]; /** pixels per metre */ scale: number; world: Vector3[]; side: Side };

export function handInScene(image: Point3[], world: Point3[], side: Side, width: number, height: number): HandInScene {
  const w = world.map((p) => new Vector3(p.x, -p.y, -p.z));
  let imageLength = 0, worldLength = 0;
  for (const [i, j] of PALM_PAIRS) {
    imageLength += Math.hypot((image[i].x - image[j].x) * width, (image[i].y - image[j].y) * height);
    worldLength += Math.hypot(w[i].x - w[j].x, w[i].y - w[j].y);
  }
  const scale = worldLength > 1e-6 ? imageLength / worldLength : 0;
  const points = image.map((p, i) => new Vector3((p.x - 0.5) * width, (0.5 - p.y) * height, w[i].z * scale));
  return { points, scale, world: w, side };
}

/**
 * The frame of a finger on a hand of the camera. The back of the hand: the normal of the palm (wrist, index and little
 * knuckles), on the side the hand is (a right hand seen from its back turns its knuckles one way, a left hand the
 * other); when the fingers bend clearly, they say it better (they bend towards the palm), whatever the side.
 */
export function fingerFrame(hand: HandInScene, finger: Finger, along: number): FingerFrame | null {
  const j = FINGER_JOINTS[finger];
  const { points: q, world: w, scale } = hand;
  if (!(scale > 0)) return null;
  const base = q[j.mcp].clone();
  const joint = q[j.pip].clone();
  const y = joint.clone().sub(base);
  if (y.lengthSq() < 1e-6) return null;
  y.normalize();

  const normal = new Vector3().subVectors(w[5], w[0]).cross(new Vector3().subVectors(w[17], w[0]));
  if (normal.lengthSq() < 1e-12) return null;
  normal.normalize();
  // A right hand seen from its back: (index − wrist) × (little − wrist) points away from its back.
  let back = hand.side === "right" ? normal.clone().negate() : normal.clone();
  let bend = 0;
  for (const f of ["index", "middle", "ring", "little"] as Finger[]) {
    const t = new Vector3().subVectors(w[FINGER_JOINTS[f].tip], w[FINGER_JOINTS[f].mcp]);
    const len = t.length();
    if (len > 1e-6) bend += t.dot(normal) / len;
  }
  // The fingers bend towards the palm: clearly bent (about 17° each on average), they tell the back of the hand.
  if (Math.abs(bend) > 1.2) back = normal.clone().multiplyScalar(-Math.sign(bend));

  const z = back.sub(y.clone().multiplyScalar(back.dot(y)));
  if (z.lengthSq() < 1e-9) return null;
  z.normalize();
  const x = new Vector3().crossVectors(y, z);

  let spacing = 0;
  for (const b of j.beside) spacing += w[j.mcp].distanceTo(w[b]);
  spacing /= j.beside.length;
  const diameter = spacing * scale * j.width;
  const at = MathUtils.clamp(along, -0.5, 1.5);
  const origin = base.clone().lerp(joint, at);
  return { origin, x, y, z, diameter, base, joint, along: at, scale };
}

/* ---------- The matrices ---------- */

/**
 * The matrix that puts the ring (its own space) on the finger: the hole on the finger's axis at `along`, the head towards
 * the back of the hand, the inner diameter on the finger's diameter × `scale`, then the admin's rotation (degrees) and
 * offset (mm) in the space of the finger, around the centre of the hole.
 */
export function ringMatrix(frame: FingerFrame, fit: RingFit, settings: Pick<TryOnSettings, "scale" | "rotation" | "offset">): Matrix4 {
  const mm = frame.diameter / FINGER_MM;
  const size = ((frame.diameter / 2) * settings.scale) / Math.max(fit.innerRadius, 1e-9);
  const placed = new Matrix4().makeBasis(frame.x, frame.y, frame.z).setPosition(frame.origin);
  const offset = new Matrix4().makeTranslation(settings.offset[0] * mm, settings.offset[1] * mm, settings.offset[2] * mm);
  const turn = new Matrix4().makeRotationFromEuler(
    new Euler(MathUtils.degToRad(settings.rotation[0]), MathUtils.degToRad(settings.rotation[1]), MathUtils.degToRad(settings.rotation[2]), "XYZ"),
  );
  const scale = new Matrix4().makeScale(size, size, size);
  // The ring's own axes to the finger's: its hole's axis on y, its head on z, the third across (right-handed).
  const across = new Vector3().crossVectors(fit.axis, fit.up);
  const align = new Matrix4().makeBasis(across, fit.axis, fit.up).transpose();
  const centre = new Matrix4().makeTranslation(-fit.center.x, -fit.center.y, -fit.center.z);
  return placed.multiply(offset).multiply(turn).multiply(scale).multiply(align).multiply(centre);
}

/** The matrix of a cylinder of radius 1 and height 1 along y (centred) stretched from `a` to `b` with `radius`. */
export function cylinderMatrix(a: Vector3, b: Vector3, radius: number): Matrix4 {
  const dir = new Vector3().subVectors(b, a);
  const length = dir.length();
  const y = length > 1e-9 ? dir.clone().divideScalar(length) : new Vector3(0, 1, 0);
  const helper = Math.abs(y.z) < 0.9 ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
  const x = new Vector3().crossVectors(y, helper).normalize();
  const z = new Vector3().crossVectors(x, y);
  const mid = new Vector3().addVectors(a, b).multiplyScalar(0.5);
  return new Matrix4().makeBasis(x.multiplyScalar(radius), y.multiplyScalar(length), z.multiplyScalar(radius)).setPosition(mid);
}

/**
 * The soft shadow of the ring on the skin, on both sides of what touches the finger: an open tube on the finger's skin
 * (its back hidden by the finger's cylinder, like the band), centred on the ring along the finger. Its shader darkens it
 * fully under the ring, then less and less over `fall` (2.4 mm of the finger) beyond each side. Returns the tube's
 * matrix (a cylinder of radius 1 and height 1 along y) and the half-width and fall in the tube's own height (0 to 1).
 */
export function contactShadow(frame: FingerFrame, fit: RingFit, ringCentre: Vector3, scale: number): { matrix: Matrix4; half: number; fall: number } {
  const mm = frame.diameter / FINGER_MM;
  const size = ((frame.diameter / 2) * scale) / Math.max(fit.innerRadius, 1e-9);
  const half = Math.max((fit.bandWidth * size) / 2, mm);
  const fall = 2.4 * mm;
  const length = 2 * (half + 3 * fall);
  // The ring's centre brought onto the finger's axis.
  const along = new Vector3().subVectors(ringCentre, frame.origin).dot(frame.y);
  const mid = frame.origin.clone().addScaledVector(frame.y, along);
  const a = mid.clone().addScaledVector(frame.y, -length / 2);
  const b = mid.clone().addScaledVector(frame.y, length / 2);
  return { matrix: cylinderMatrix(a, b, (frame.diameter / 2) * 0.99), half: half / length, fall: fall / length };
}

/**
 * The cylinders that hide what stands behind a finger (drawn into the depth only): its base segment, a little longer
 * at both ends, slightly thinner than the finger so the front of the band is never cut.
 */
export function fingerOccluder(frame: FingerFrame, thinner = 0.94): Matrix4 {
  const seg = new Vector3().subVectors(frame.joint, frame.base);
  const a = frame.base.clone().addScaledVector(seg, -0.35);
  const b = frame.joint.clone().addScaledVector(seg, 0.25);
  return cylinderMatrix(a, b, (frame.diameter / 2) * thinner);
}
