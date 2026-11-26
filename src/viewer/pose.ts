/*
 * How the jewel stands (26/11/2026), as iJewel's "Compute Stable Pose": lying flat, standing, or at an angle. The
 * jewel's own axes are found from its points (principal axes: the longest, the middle, the thinnest); lying flat puts
 * the thinnest axis up, standing puts it toward the eye with the heavier side (a ring's head) up, at an angle leans
 * that by 35°. The result is a rotation in degrees, kept in the scene's settings.
 */
import { Euler, Matrix4, Quaternion, Vector3, type Mesh, type Object3D, type InstancedMesh } from "three";
import type { PoseKind, Vec3 } from "@/data/scene3d";

/** Points of the jewel in its own space (at most ~20 000, spread over its meshes and copies). */
function pointsOf(root: Object3D): Vector3[] {
  const out: Vector3[] = [];
  const m = new Matrix4();
  const inv = new Matrix4().copy(root.matrixWorld).invert();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const pos = mesh.geometry.getAttribute("position");
    const step = Math.max(1, Math.floor(pos.count / 2000));
    const copies = (mesh as InstancedMesh).isInstancedMesh ? (mesh as InstancedMesh).count : 1;
    const copyStep = Math.max(1, Math.floor(copies / 40));
    for (let c = 0; c < copies; c += copyStep) {
      const world = new Matrix4().copy(mesh.matrixWorld);
      if ((mesh as InstancedMesh).isInstancedMesh) {
        (mesh as InstancedMesh).getMatrixAt(c, m);
        world.multiply(m);
      }
      world.premultiply(inv);
      for (let i = 0; i < pos.count; i += step) out.push(new Vector3().fromBufferAttribute(pos, i).applyMatrix4(world));
    }
  });
  return out;
}

/** The principal axes of a cloud of points, longest first (Jacobi on the 3 × 3 covariance). */
function axesOf(points: Vector3[]): { center: Vector3; axes: Vector3[] } {
  const center = new Vector3();
  for (const p of points) center.add(p);
  center.divideScalar(Math.max(1, points.length));
  const c = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const p of points) {
    const d = [p.x - center.x, p.y - center.y, p.z - center.z];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) c[i * 3 + j]! += d[i]! * d[j]!;
  }
  const a = [
    [c[0]!, c[1]!, c[2]!],
    [c[3]!, c[4]!, c[5]!],
    [c[6]!, c[7]!, c[8]!],
  ];
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let sweep = 0; sweep < 24; sweep++) {
    for (let p = 0; p < 2; p++) {
      for (let q = p + 1; q < 3; q++) {
        if (Math.abs(a[p]![q]!) < 1e-18) continue;
        const theta = (a[q]![q]! - a[p]![p]!) / (2 * a[p]![q]!);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const cs = 1 / Math.sqrt(t * t + 1);
        const sn = t * cs;
        for (let k = 0; k < 3; k++) {
          const akp = a[k]![p]!;
          const akq = a[k]![q]!;
          a[k]![p] = cs * akp - sn * akq;
          a[k]![q] = sn * akp + cs * akq;
        }
        for (let k = 0; k < 3; k++) {
          const apk = a[p]![k]!;
          const aqk = a[q]![k]!;
          a[p]![k] = cs * apk - sn * aqk;
          a[q]![k] = sn * apk + cs * aqk;
        }
        for (let k = 0; k < 3; k++) {
          const vkp = v[k]![p]!;
          const vkq = v[k]![q]!;
          v[k]![p] = cs * vkp - sn * vkq;
          v[k]![q] = sn * vkp + cs * vkq;
        }
      }
    }
  }
  const order = [0, 1, 2].sort((i, j) => a[j]![j]! - a[i]![i]!);
  return { center, axes: order.map((i) => new Vector3(v[0]![i]!, v[1]![i]!, v[2]![i]!).normalize()) };
}

/** The rotation (degrees, XYZ) that makes the jewel lie flat, stand, or lean. */
export function stablePose(root: Object3D, kind: PoseKind): Vec3 {
  if (kind === "auto") return [0, 0, 0];
  const saved = root.quaternion.clone();
  root.quaternion.identity();
  root.updateMatrixWorld(true);
  const points = pointsOf(root);
  root.quaternion.copy(saved);
  root.updateMatrixWorld(true);
  if (points.length < 4) return [0, 0, 0];
  const { center, axes } = axesOf(points);
  const [long, middle, thin] = axes as [Vector3, Vector3, Vector3];
  // The heavier side along the middle axis (a ring's head, a pendant's bail side): where the points reach farther.
  let reach = 0;
  for (const p of points) reach += Math.sign(p.clone().sub(center).dot(middle)) * p.clone().sub(center).dot(middle) ** 2;
  const up = reach >= 0 ? middle.clone() : middle.clone().negate();
  const q = new Quaternion();
  if (kind === "flat") {
    // Thin axis up; the long axis across the screen.
    const basis = new Matrix4().makeBasis(long, thin.clone().cross(long).normalize().negate(), thin);
    q.setFromRotationMatrix(basis.invert());
    const toUp = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(0, 1, 0));
    q.premultiply(toUp);
  } else {
    // Standing: the thin axis toward the eye (+Z), the heavier side up (+Y).
    const z = thin.clone().normalize();
    const y = up.clone().sub(z.clone().multiplyScalar(up.dot(z))).normalize();
    const x = y.clone().cross(z).normalize();
    const basis = new Matrix4().makeBasis(x, y, z);
    q.setFromRotationMatrix(basis.invert());
    if (kind === "angle") q.premultiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), (-35 * Math.PI) / 180));
  }
  const e = new Euler().setFromQuaternion(q, "XYZ");
  const deg = (r: number) => Math.round(((r * 180) / Math.PI) * 10) / 10;
  return [deg(e.x), deg(e.y), deg(e.z)];
}
