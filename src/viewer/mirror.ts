/*
 * Copies seen in a mirror. Some jewellery software places a stone and its
 * mirror image as copies of one mesh (a negative scale): in the ZN1242 chain,
 * 665 of the 3601 small diamonds and 55 of the 199 large stones. three.js
 * draws all the copies of a mesh with the same side of their faces outward,
 * so those copies showed their inside: an empty cup, a dark ring, or nothing,
 * where a diamond should be. They become copies of a mirrored mesh whose
 * faces are turned the right way, and look like the others.
 */
import { InstancedMesh, Matrix4, type BufferAttribute, type BufferGeometry, type Object3D } from "three";

const FLIP = new Matrix4().makeScale(-1, 1, 1);

/** The same shape seen in a mirror (left and right swapped), its faces still turned outward. */
function mirroredGeometry(source: BufferGeometry): BufferGeometry {
  const geometry = source.clone();
  // Positions and normals mirrored together.
  geometry.applyMatrix4(FLIP);
  // A mirror turns each triangle over: the order of its corners is reversed to turn it back.
  const index = geometry.getIndex();
  if (index) {
    const a = index.array;
    for (let i = 0; i + 2 < a.length; i += 3) {
      const b = a[i + 1]!;
      a[i + 1] = a[i + 2]!;
      a[i + 2] = b;
    }
    index.needsUpdate = true;
  } else {
    for (const attribute of Object.values(geometry.attributes) as BufferAttribute[]) {
      const size = attribute.itemSize;
      const a = attribute.array;
      for (let v = 0; v + 2 < attribute.count; v += 3) {
        for (let k = 0; k < size; k++) {
          const b = a[(v + 1) * size + k]!;
          a[(v + 1) * size + k] = a[(v + 2) * size + k]!;
          a[(v + 2) * size + k] = b;
        }
      }
      attribute.needsUpdate = true;
    }
  }
  return geometry;
}

/** Splits every repeated mesh whose copies include mirror images: the mirror images go to a mirrored mesh of their own. Returns how many copies were moved. */
export function splitMirrored(root: Object3D): number {
  const found: InstancedMesh[] = [];
  root.traverse((o) => {
    if ((o as InstancedMesh).isInstancedMesh) found.push(o as InstancedMesh);
  });
  const matrix = new Matrix4();
  let moved = 0;
  for (const mesh of found) {
    const straight: Matrix4[] = [];
    const mirror: Matrix4[] = [];
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      (matrix.determinant() < 0 ? mirror : straight).push(matrix.clone());
    }
    if (mirror.length === 0 || !mesh.parent) continue;
    // Copy × mirror, drawn with the mirrored shape: the same place, the same look, faces outward.
    const copies = new InstancedMesh(mirroredGeometry(mesh.geometry), mesh.material, mirror.length);
    copies.name = mesh.name;
    copies.position.copy(mesh.position);
    copies.quaternion.copy(mesh.quaternion);
    copies.scale.copy(mesh.scale);
    copies.userData = { ...mesh.userData };
    mirror.forEach((m, i) => copies.setMatrixAt(i, m.multiply(FLIP)));
    copies.instanceMatrix.needsUpdate = true;
    copies.computeBoundingSphere();
    mesh.parent.add(copies);
    if (straight.length === 0) {
      mesh.parent.remove(mesh);
    } else {
      straight.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.count = straight.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    moved += mirror.length;
  }
  return moved;
}
