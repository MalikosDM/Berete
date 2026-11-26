/*
 * Test jewels made by code (26/11/2026), to draw the thumbnails of the lightings and the materials without a client's
 * file: a round brilliant, a solitaire ring with a pavé on its shoulders, a sphere. Meshes and materials are named by
 * role ("metal", "diamond", "pave", "sample"), as the viewer reads the layers of a file (by material name); the plain
 * materials here are placeholders the viewer replaces.
 */
import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Group, InstancedMesh, LatheGeometry, Matrix4, Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, TorusGeometry, TubeGeometry, Vector2, Vector3 } from "three";

const DEG = Math.PI / 180;

/* ---------- The round brilliant ---------- */

/** Proportions of a well-cut round brilliant, as shares of its diameter (and its angles). */
const CUT = {
  /** Table: the octagon's average width (between its corners and its flats). */
  table: 0.57,
  crownAngle: 34.5,
  pavilionAngle: 40.75,
  /** Girdle thickness at the "hills" (under a bezel and above a pavilion main); thinner at the valleys between. */
  girdle: 0.034,
  /** How much lower (crown side) and higher (pavilion side) the girdle edge is at a valley than at a hill. */
  valley: 0.006,
  /** Star facets: from the table edge, this share of the way to the girdle. */
  star: 0.5,
  /** Lower girdle facets: from the girdle, this share of the way to the culet. */
  lowerHalf: 0.77,
};

/** Points of the girdle edge drawn between a hill and a valley. */
const ARC_STEPS = 4;

/**
 * A round brilliant cut of `diameter` (any unit): 57 facets — table, 8 stars, 8 bezels (kites), 16 upper girdle, 16
 * lower girdle, 8 pavilion mains, pointed culet — and its girdle (64 narrow vertical faces). Each facet is a flat plane
 * (the upper and lower girdle facets cut the round girdle along a curve, so its edge waves as on a real stone).
 * Flat-shaded: not indexed, each facet with its own normal. Table up (+Y), centred on the axis, the middle of the girdle
 * at y = 0.
 */
export function brilliantGeometry(diameter: number): BufferGeometry {
  const R = 0.5;
  const tableR = CUT.table / (1 + Math.cos(22.5 * DEG));
  const tanC = Math.tan(CUT.crownAngle * DEG);
  const tanP = Math.tan(CUT.pavilionAngle * DEG);
  const hillTop = CUT.girdle / 2;
  const hillBottom = -CUT.girdle / 2;
  const tableY = hillTop + (R - tableR) * tanC;
  const culetY = hillBottom - R * tanP;
  const starR = tableR * Math.cos(22.5 * DEG) + CUT.star * (R - tableR * Math.cos(22.5 * DEG));
  const starY = hillTop + (R - starR * Math.cos(22.5 * DEG)) * tanC;
  const lowR = R * (1 - CUT.lowerHalf);
  const lowY = culetY + lowR * Math.cos(22.5 * DEG) * tanP;

  // Points as (radius, angle in degrees, height); y is up.
  const at = (r: number, a: number, y: number) => new Vector3(r * Math.cos(a * DEG), y, -r * Math.sin(a * DEG));
  const positions: number[] = [];
  const normals: number[] = [];
  // A flat facet as a fan from its first point, wound so that its normal points out of the stone; all its triangles get
  // the one normal of the facet (Newell's, from all its points, in double precision).
  const facet = (pts: Vector3[]) => {
    const centre = pts.reduce((s, p) => s.add(p), new Vector3()).divideScalar(pts.length);
    const normal = new Vector3();
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k]!;
      const q = pts[(k + 1) % pts.length]!;
      normal.x += (p.y - q.y) * (p.z + q.z);
      normal.y += (p.z - q.z) * (p.x + q.x);
      normal.z += (p.x - q.x) * (p.y + q.y);
    }
    normal.normalize();
    // A point inside the stone, on its axis: the normal must point away from it.
    const out = normal.dot(centre.clone().sub(new Vector3(0, (tableY + culetY) / 2, 0))) >= 0;
    const list = out ? pts : [...pts].reverse();
    if (!out) normal.negate();
    for (let k = 1; k + 1 < list.length; k++) {
      for (const p of [list[0]!, list[k]!, list[k + 1]!]) {
        positions.push(p.x * diameter, p.y * diameter, p.z * diameter);
        normals.push(normal.x, normal.y, normal.z);
      }
    }
  };
  // Height on the plane through three points, above (x, z).
  const planeY = (a: Vector3, b: Vector3, c: Vector3) => {
    const n = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    return (x: number, z: number) => a.y - (n.x * (x - a.x) + n.z * (z - a.z)) / n.y;
  };

  const upper: Vector3[] = [];
  const lower: Vector3[] = [];
  // The table.
  facet(Array.from({ length: 8 }, (_, k) => at(tableR, k * 45, tableY)));
  for (let k = 0; k < 8; k++) {
    const a = k * 45;
    const tableA = at(tableR, a, tableY);
    const tableB = at(tableR, a + 45, tableY);
    const starPrev = at(starR, a - 22.5, starY);
    const starNext = at(starR, a + 22.5, starY);
    const hill = at(R, a, hillTop);
    // Star facet, bezel (kite).
    facet([tableA, tableB, starNext]);
    facet([tableA, starPrev, hill, starNext]);
    // The two upper girdle facets on each side of this bezel: from the star point down to the girdle, cut along the
    // round girdle between the hill and the valley.
    for (const side of [-1, 1]) {
      const star = side > 0 ? starNext : starPrev;
      const valley = at(R, a + side * 22.5, hillTop - CUT.valley);
      const y = planeY(star, hill, valley);
      const arc: Vector3[] = [];
      for (let s = 0; s <= ARC_STEPS; s++) {
        const p = at(R, a + (side * 22.5 * s) / ARC_STEPS, 0);
        p.y = y(p.x, p.z);
        arc.push(p);
      }
      facet([star, ...arc]);
      upper.push(...(side > 0 ? arc : [...arc].reverse()).slice(0, ARC_STEPS));
    }
    // Pavilion main (a kite down to the culet), and the two lower girdle facets beside it.
    const lowPrev = at(lowR, a - 22.5, lowY);
    const lowNext = at(lowR, a + 22.5, lowY);
    const hillLow = at(R, a, hillBottom);
    facet([new Vector3(0, culetY, 0), lowNext, hillLow, lowPrev]);
    for (const side of [-1, 1]) {
      const low = side > 0 ? lowNext : lowPrev;
      const valley = at(R, a + side * 22.5, hillBottom + CUT.valley);
      const y = planeY(low, hillLow, valley);
      const arc: Vector3[] = [];
      for (let s = 0; s <= ARC_STEPS; s++) {
        const p = at(R, a + (side * 22.5 * s) / ARC_STEPS, 0);
        p.y = y(p.x, p.z);
        arc.push(p);
      }
      facet([low, ...arc]);
      lower.push(...(side > 0 ? arc : [...arc].reverse()).slice(0, ARC_STEPS));
    }
  }
  // The girdle: narrow vertical faces between the two wavy edges, in order around the stone.
  const order = (pts: Vector3[]) => [...pts].sort((p, q) => Math.atan2(-p.z, p.x) - Math.atan2(-q.z, q.x));
  const top = order(upper);
  const bottom = order(lower);
  for (let i = 0; i < top.length; i++) {
    const j = (i + 1) % top.length;
    facet([bottom[i]!, bottom[j]!, top[j]!, top[i]!]);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  return geometry;
}

/* ---------- The solitaire ---------- */

/** Millimetres to the viewer's metres. */
const MM = 0.001;

const RING = {
  innerRadius: 8.5,
  width: 2,
  thickness: 1.8,
  stone: 6.5,
  pave: 1.3,
  /** Angles (degrees from the top) of the pavé stones on each shoulder. */
  paveFrom: 18,
  paveStep: 7.8,
  paveCount: 6,
};

/**
 * The band's cross-section (radius, height along the hole), in mm: a rectangle with rounded corners, its inside slightly
 * domed towards the finger (comfort fit), 8.5 mm from the axis at the middle of the inside. Counter-clockwise (up the
 * outside, in along the top, down the inside, out along the bottom), so that the lathe's faces look out.
 */
function bandProfile(): Vector2[] {
  const dome = 0.12;
  const r0 = RING.innerRadius + dome;
  const r1 = RING.innerRadius + RING.thickness;
  const half = RING.width / 2;
  const round = 0.45;
  const pts: Vector2[] = [];
  const corner = (cx: number, cy: number, from: number) => {
    for (let s = 0; s <= 6; s++) {
      const a = (from + (s / 6) * 90) * DEG;
      pts.push(new Vector2(cx + round * Math.cos(a), cy + round * Math.sin(a)));
    }
  };
  corner(r1 - round, -half + round, -90);
  corner(r1 - round, half - round, 0);
  corner(r0 + round, half - round, 90);
  for (let s = 1; s < 8; s++) {
    const t = s / 8;
    pts.push(new Vector2(r0 - dome * Math.sin(Math.PI * t), half - round - t * 2 * (half - round)));
  }
  corner(r0 + round, -half + round, 180);
  pts.push(pts[0]!.clone());
  return pts;
}

/**
 * A solitaire ring in metres: inner diameter 17 mm, band 2 mm wide and 1.8 mm thick, its hole along Z (seen from the
 * default camera as an O), a four-prong head on top holding a 6.5 mm brilliant (table up), and six 1.3 mm brilliants on
 * each shoulder, their tables facing out. Meshes and materials: "metal" (band, prongs and the rail of the head, one
 * shared material), "diamond" (the centre stone), "pave" (one InstancedMesh for the twelve small stones).
 */
export function testRing(): Group {
  const group = new Group();
  group.name = "test-ring";
  const metal = new MeshStandardMaterial({ name: "metal", color: 0xd9b48a, metalness: 1, roughness: 0.12 });
  const diamond = new MeshStandardMaterial({ name: "diamond", color: 0xffffff, metalness: 0, roughness: 0 });
  const pave = new MeshStandardMaterial({ name: "pave", color: 0xffffff, metalness: 0, roughness: 0 });

  // The band: the profile turned around Y, then laid so that its hole runs along Z.
  const bandGeometry = new LatheGeometry(bandProfile().map((p) => p.multiplyScalar(MM)), 160);
  bandGeometry.rotateX(Math.PI / 2);
  const band = new Mesh(bandGeometry, metal);
  band.name = "metal";
  group.add(band);

  // The centre stone, its culet just at the top of the band.
  const outer = RING.innerRadius + RING.thickness;
  const stoneGeometry = brilliantGeometry(RING.stone * MM);
  stoneGeometry.computeBoundingBox();
  const culet = -stoneGeometry.boundingBox!.min.y;
  const girdleY = outer * MM + culet - 0.02 * MM;
  const stone = new Mesh(stoneGeometry, diamond);
  stone.name = "diamond";
  stone.position.set(0, girdleY, 0);
  group.add(stone);

  // Four prongs between the axes, rising from the band past the girdle and bending over the crown; a rail around
  // under the girdle ties them together.
  const stoneR = (RING.stone / 2) * MM;
  const prongR = 0.42 * MM;
  for (let k = 0; k < 4; k++) {
    const a = (45 + k * 90) * DEG;
    const p = (r: number, y: number) => new Vector3(r * Math.cos(a), y, r * Math.sin(a));
    const curve = new CatmullRomCurve3([
      p(1.2 * MM, outer * MM - 0.6 * MM),
      p(stoneR * 0.75, girdleY - 1.6 * MM),
      p(stoneR + 0.12 * MM, girdleY - 0.2 * MM),
      p(stoneR + 0.08 * MM, girdleY + 0.25 * MM),
      p(stoneR - 0.32 * MM, girdleY + 0.55 * MM),
    ]);
    const prong = new Mesh(new TubeGeometry(curve, 40, prongR, 14, false), metal);
    prong.name = "metal";
    group.add(prong);
    const tip = new Mesh(new SphereGeometry(prongR, 18, 12), metal);
    tip.name = "metal";
    tip.position.copy(curve.getPoint(1));
    group.add(tip);
  }
  const rail = new Mesh(new TorusGeometry(stoneR * 0.86, 0.3 * MM, 12, 64), metal);
  rail.name = "metal";
  rail.rotation.x = Math.PI / 2;
  rail.position.y = girdleY - 1.05 * MM;
  group.add(rail);

  // The pavé: one stone repeated, each on the top of the band, its table facing out from the centre of the ring.
  const small = new InstancedMesh(brilliantGeometry(RING.pave * MM), pave, RING.paveCount * 2);
  small.name = "pave";
  const up = new Vector3(0, 1, 0);
  const matrix = new Matrix4();
  let n = 0;
  for (const side of [-1, 1]) {
    for (let i = 0; i < RING.paveCount; i++) {
      const a = side * (RING.paveFrom + i * RING.paveStep) * DEG;
      const out = new Vector3(Math.sin(a), Math.cos(a), 0);
      const q = new Quaternion().setFromUnitVectors(up, out);
      matrix.compose(out.clone().multiplyScalar((outer - 0.03) * MM), q, new Vector3(1, 1, 1));
      small.setMatrixAt(n++, matrix);
    }
  }
  small.instanceMatrix.needsUpdate = true;
  small.computeBoundingSphere();
  group.add(small);
  return group;
}

/** A sphere of 1 cm in metres, for the thumbnails of the materials (material "sample"). */
export function testSphere(): Mesh {
  const mesh = new Mesh(new SphereGeometry(0.005, 96, 64), new MeshStandardMaterial({ name: "sample", color: 0xffffff, metalness: 1, roughness: 0.2 }));
  mesh.name = "sample";
  return mesh;
}
