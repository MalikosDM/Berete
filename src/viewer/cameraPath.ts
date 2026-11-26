/*
 * The saved camera views and the paths between them (26/11/2026): from one view to the next in `duration` seconds with
 * an easing (easeInOutSine by default, as jewellers advise), around the jewel (spherical: the camera keeps its distance
 * while it turns) or in a straight line, a pause at each view, in a loop or not. Also one full turn around the jewel,
 * for the films. Pure functions: the stage applies the place they give.
 */
import type { CameraView, Ease, Vec3, ViewsSettings } from "@/data/scene3d";

export type Pose = { position: Vec3; target: Vec3; fov?: number };

export const EASE: Record<Ease, (t: number) => number> = {
  linear: (t) => t,
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  easeOutCubic: (t) => 1 - (1 - t) ** 3,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Spherical coordinates of the camera around its target: distance, angle around the vertical, angle from the top. */
function spherical(position: Vec3, target: Vec3): [number, number, number] {
  const x = position[0] - target[0];
  const y = position[1] - target[1];
  const z = position[2] - target[2];
  const r = Math.hypot(x, y, z) || 1e-6;
  return [r, Math.atan2(x, z), Math.acos(Math.min(1, Math.max(-1, y / r)))];
}

function fromSpherical(target: Vec3, r: number, azimuth: number, polar: number): Vec3 {
  return [target[0] + r * Math.sin(polar) * Math.sin(azimuth), target[1] + r * Math.cos(polar), target[2] + r * Math.sin(polar) * Math.cos(azimuth)];
}

/** Between two places at t ∈ [0, 1] (already eased). */
export function between(a: Pose, b: Pose, t: number, interpolation: "spherical" | "linear"): Pose {
  const target = lerp3(a.target, b.target, t);
  const fov = a.fov !== undefined && b.fov !== undefined ? lerp(a.fov, b.fov, t) : (b.fov ?? a.fov);
  if (interpolation === "linear") return { position: lerp3(a.position, b.position, t), target, fov };
  const [ra, aa, pa] = spherical(a.position, a.target);
  const [rb, ab, pb] = spherical(b.position, b.target);
  // The short way around.
  let da = ab - aa;
  if (da > Math.PI) da -= 2 * Math.PI;
  if (da < -Math.PI) da += 2 * Math.PI;
  // Distance changed geometrically: a zoom feels even.
  const r = ra * (rb / ra) ** t;
  return { position: fromSpherical(target, r, aa + da * t, lerp(pa, pb, t)), target, fov };
}

/** Seconds of the whole path through the views (pauses included); 0 without views. */
export function pathDuration(s: ViewsSettings): number {
  const n = s.list.length;
  if (n === 0) return 0;
  const legs = s.loop ? n : n - 1;
  return legs * Math.max(0.1, s.duration) + n * Math.max(0, s.pause);
}

/** The place at `seconds` along the path through the views (the first view at 0). */
export function poseAt(s: ViewsSettings, seconds: number): Pose | null {
  const views = s.list;
  if (views.length === 0) return null;
  if (views.length === 1) return views[0]!;
  const total = pathDuration(s);
  let t = s.loop ? ((seconds % total) + total) % total : Math.min(Math.max(seconds, 0), total);
  const leg = Math.max(0.1, s.duration);
  const pause = Math.max(0, s.pause);
  for (let i = 0; i < views.length; i++) {
    const from = views[i]!;
    if (t <= pause) return from;
    t -= pause;
    const last = i === views.length - 1;
    if (last && !s.loop) return from;
    const to = views[(i + 1) % views.length]!;
    if (t <= leg) return between(from, to, EASE[s.ease](t / leg), s.interpolation);
    t -= leg;
  }
  return views[s.loop ? 0 : views.length - 1]!;
}

/** One full turn around the target, from a place, at t ∈ [0, 1] (eased at both ends so that a film loops calmly). */
export function turnAt(start: Pose, t: number): Pose {
  const [r, azimuth, polar] = spherical(start.position, start.target);
  return { position: fromSpherical(start.target, r, azimuth + 2 * Math.PI * t, polar), target: start.target, fov: start.fov };
}

/** A view of the list, by its place in it (wrapping around). */
export function viewAt(views: CameraView[], index: number): CameraView | null {
  if (views.length === 0) return null;
  return views[((index % views.length) + views.length) % views.length]!;
}
