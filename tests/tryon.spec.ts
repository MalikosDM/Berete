import { test, expect } from "./fixtures";
import { BoxGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, TorusGeometry, Vector3 } from "three";
import { contactShadow, fingerFrame, fingerOccluder, handInScene, measureRing, ringMatrix, ringPoints, type FingerFrame, type Point3, type Side } from "../src/viewer/tryon/place";
import { FrameSmoother } from "../src/viewer/tryon/smooth";

/*
 * The ring try-on (26/11/2026, after the client's screenshots: a small flat square on the knuckle, and the shirt's name
 * backwards in the saved photo). The reckoning of where the ring goes, on the 21 points MediaPipe found on two real photos
 * of the site (a VfB player's left hand seen from its back, fingers spread; another's right hand, fingers curled, the
 * base segment of the ring finger tilted towards the camera), in a 1280 × 720 video. No browser: numbers only.
 * The pictures themselves: .local/scripts/tryon-v3.mjs (a fake camera on the same photos).
 */

type Photo = { side: Side; image: number[][]; world: number[][] };
const W = 1280;
const H = 720;

const SPREAD: Photo = {
  side: "left",
  image: [[0.8546,0.7401,0],[0.8879,0.6098,-0.0095],[0.9043,0.4525,-0.0291],[0.9271,0.3225,-0.0463],[0.9683,0.2473,-0.0672],[0.8607,0.4397,-0.0763],[0.8296,0.2498,-0.1038],[0.803,0.1456,-0.1132],[0.7793,0.0676,-0.1187],[0.8191,0.486,-0.0861],[0.7621,0.2853,-0.1146],[0.7236,0.1687,-0.1254],[0.6933,0.0852,-0.1332],[0.7805,0.5418,-0.0923],[0.7119,0.3885,-0.1161],[0.67,0.2883,-0.1278],[0.6414,0.2173,-0.1359],[0.7466,0.5967,-0.0972],[0.692,0.4744,-0.118],[0.6611,0.4018,-0.1274],[0.6375,0.3398,-0.1335]],
  world: [[0.0189,0.0601,0.0733],[0.0267,0.0256,0.0606],[0.0333,-0.0024,0.0441],[0.0384,-0.0294,0.0157],[0.0487,-0.0487,-0.0067],[0.0152,-0.0125,-0.0012],[0.0065,-0.0424,-0.0075],[-0.001,-0.0609,0.0072],[-0.0116,-0.0766,0.0254],[0.0016,-0.0021,-0.0034],[-0.0176,-0.0395,-0.0074],[-0.0327,-0.058,0.0058],[-0.0427,-0.0784,0.0308],[-0.0113,0.0075,-0.0011],[-0.032,-0.0168,-0.0028],[-0.0497,-0.0342,0.0096],[-0.058,-0.0518,0.0305],[-0.0231,0.0212,0.0141],[-0.0371,0.0014,0.0133],[-0.0503,-0.0159,0.0202],[-0.0564,-0.028,0.0305]],
};

const CURLED: Photo = {
  side: "right",
  image: [[0.3231,0.7372,0],[0.3381,0.5242,0.0326],[0.3896,0.3533,0.028],[0.4608,0.255,0.0189],[0.528,0.2329,0.0129],[0.4141,0.2708,-0.046],[0.5213,0.1262,-0.0587],[0.547,0.1487,-0.0438],[0.5289,0.1956,-0.0268],[0.4559,0.3751,-0.0733],[0.5832,0.2543,-0.0827],[0.571,0.3102,-0.0585],[0.5293,0.3614,-0.039],[0.4976,0.4926,-0.0931],[0.6026,0.3803,-0.0909],[0.5794,0.4264,-0.0519],[0.5427,0.4674,-0.0274],[0.5296,0.6139,-0.1094],[0.6164,0.4901,-0.0937],[0.5881,0.5244,-0.0525],[0.5551,0.5663,-0.0235]],
  world: [[-0.0522,0.0583,0.0526],[-0.046,0.0212,0.0484],[-0.0263,-0.0063,0.0494],[-0.0038,-0.0209,0.0422],[0.0131,-0.0268,0.0277],[-0.014,-0.0223,0.006],[0.0118,-0.0353,0.0087],[0.0222,-0.039,0.0285],[0.0163,-0.0338,0.0502],[-0.0021,-0.0047,-0.0027],[0.0297,-0.0205,0.0023],[0.0273,-0.0171,0.0282],[0.0163,-0.0114,0.0554],[0.0091,0.0132,-0.0044],[0.0344,0.002,0.0051],[0.0318,0.0022,0.026],[0.0229,0.0081,0.0446],[0.0127,0.0338,0.0036],[0.0353,0.0206,0.0093],[0.0351,0.0153,0.0302],[0.0244,0.0233,0.0418]],
};

const points = (rows: number[][]): Point3[] => rows.map(([x, y, z]) => ({ x, y, z }));
const sceneOf = (photo: Photo) => handInScene(points(photo.image), points(photo.world), photo.side, W, H);
const SETTINGS = { scale: 1, rotation: [0, 0, 0] as [number, number, number], offset: [0, 0, 0] as [number, number, number] };

/** A ring like the jewels of the site: a band whose hole is along z (inner Ø 16.4 mm) and a head on +y. */
function makeRing(hole: "z" | "y" = "z") {
  const g = new Group();
  const metal = new MeshStandardMaterial();
  const band = new Mesh(new TorusGeometry(0.0095, 0.0013, 24, 96), metal);
  const head = new Mesh(new BoxGeometry(0.008, 0.003, 0.008), metal);
  head.position.y = 0.0095 + 0.0013 + 0.0012;
  g.add(band, head);
  // The same ring saved with its hole along y (the head then on −z): the setting would still say z.
  if (hole === "y") g.rotation.x = Math.PI / 2;
  const root = new Group();
  root.add(g);
  return root;
}

/** Where a direction of the ring's own space points once the ring is on the finger. */
const turned = (m: Matrix4, v: Vector3) => v.clone().transformDirection(m);

for (const [name, photo] of [["spread fingers, left hand", SPREAD], ["curled fingers, right hand", CURLED]] as const) {
  test(`the ring goes around the finger: ${name}`, () => {
    const scene = sceneOf(photo);
    const frame = fingerFrame(scene, "ring", 0.5);
    expect(frame).not.toBeNull();
    const f = frame!;
    const mcp = scene.points[13];
    const pip = scene.points[14];

    // On the base segment of the ring finger, half way, and along it (the depth of the points says the tilt).
    expect(f.origin.distanceTo(mcp.clone().lerp(pip, 0.5))).toBeLessThan(0.5);
    expect(f.y.dot(pip.clone().sub(mcp).normalize())).toBeGreaterThan(0.999);
    // The back of the hand faces the camera on both photos (the nails are seen).
    expect(f.z.z).toBeGreaterThan(0.8);
    expect(Math.abs(f.x.dot(f.y)) + Math.abs(f.y.dot(f.z)) + Math.abs(f.z.dot(f.x))).toBeLessThan(1e-6);
    // The width of a finger: about a fifth of the length of the palm (wrist to the middle knuckle, about 18 mm for 95 mm).
    const palm = scene.points[0].distanceTo(scene.points[9]);
    expect(f.diameter / palm).toBeGreaterThan(0.14);
    expect(f.diameter / palm).toBeLessThan(0.26);

    const ring = makeRing();
    const fit = measureRing(ringPoints(ring), "z");
    expect(fit.axisName).toBe("z");
    const m = ringMatrix(f, fit, SETTINGS);
    // The hole of the ring on the finger's axis, its inner diameter the finger's, its head out of the back of the hand.
    expect(fit.center.clone().applyMatrix4(m).distanceTo(f.origin)).toBeLessThan(0.01);
    expect(Math.abs(turned(m, fit.axis).dot(f.y))).toBeGreaterThan(0.999);
    const pxPerUnit = new Vector3().setFromMatrixColumn(m, 0).length();
    expect((fit.innerRadius * 2 * pxPerUnit) / f.diameter).toBeCloseTo(1, 3);
    expect(turned(m, fit.up).dot(f.z)).toBeGreaterThan(0.999);
    expect(turned(m, fit.up).z).toBeGreaterThan(0.8);

    // The finger's cylinder that hides the back of the band: along the finger, through the ring, a little thinner than it.
    const occ = fingerOccluder(f, 0.94);
    const radius = new Vector3().setFromMatrixColumn(occ, 0).length();
    const axis = new Vector3().setFromMatrixColumn(occ, 1);
    expect(radius).toBeLessThan(fit.innerRadius * pxPerUnit);
    expect(radius).toBeGreaterThan(fit.innerRadius * pxPerUnit * 0.85);
    expect(axis.clone().normalize().dot(f.y)).toBeGreaterThan(0.999);
    const middle = new Vector3().setFromMatrixPosition(occ);
    expect(Math.abs(middle.clone().sub(f.origin).dot(f.y)) < axis.length() / 2).toBe(true);

    // The soft shadow on the skin: a tube on the finger, centred on the ring.
    const shadow = contactShadow(f, fit, f.origin, 1);
    expect(new Vector3().setFromMatrixPosition(shadow.matrix).distanceTo(f.origin)).toBeLessThan(0.01);
    expect(shadow.half).toBeGreaterThan(0);
    expect(shadow.half + shadow.fall).toBeLessThan(0.5);
  });
}

test("the curled finger is tilted: the ring turns with it", () => {
  const f = fingerFrame(sceneOf(CURLED), "ring", 0.5)!;
  // Its base segment comes towards the camera (the knuckle farther than the middle joint): not flat in the picture.
  expect(Math.abs(f.y.z)).toBeGreaterThan(0.15);
  const flat = fingerFrame(sceneOf(SPREAD), "ring", 0.5)!;
  expect(Math.abs(flat.y.z)).toBeLessThan(0.15);
});

test("the axis of the ring's hole is found when the setting names another", () => {
  const sideways = measureRing(ringPoints(makeRing("y")), "z");
  expect(sideways.axisName).toBe("y");
  expect(sideways.clearness).toBeGreaterThan(0.5);
  expect(sideways.innerRadius).toBeGreaterThan(0.007);
  expect(sideways.innerRadius).toBeLessThan(0.0095);
  // The head is found too (the side the box stands on: +z once the ring is turned).
  expect(sideways.up.z).toBeGreaterThan(0.9);
  // The right setting is kept as it is.
  expect(measureRing(ringPoints(makeRing("z")), "z").axisName).toBe("z");
  // Something without a hole keeps the setting (a plate of a pendant, its faces finely meshed as the jewels' files are).
  const pendant = new Group();
  pendant.add(new Mesh(new BoxGeometry(0.02, 0.03, 0.004, 40, 60, 8), new MeshStandardMaterial()));
  const fit = measureRing(ringPoints(pendant), "x");
  expect(fit.axisName).toBe("x");
  expect(fit.clearness).toBeLessThan(0.1);
});

test("the finger's frame is smoothed: no trembling, no lag, no flip for one wrong image", () => {
  const base = fingerFrame(sceneOf(SPREAD), "ring", 0.5)!;
  const smoother = new FrameSmoother();
  // A random walk that stays put: the noise of the points (1 px, 2 px on the size, 2° on the turn), 30 images a second.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const noisy = (f: FingerFrame, angle: number): FingerFrame => {
    const q = new Matrix4().makeRotationAxis(new Vector3(rand(), rand(), rand()).normalize(), angle);
    return {
      ...f,
      origin: f.origin.clone().add(new Vector3(rand(), rand(), rand())),
      x: f.x.clone().applyMatrix4(q),
      y: f.y.clone().applyMatrix4(q),
      z: f.z.clone().applyMatrix4(q),
      diameter: f.diameter + rand() * 2,
    };
  };
  const out: FingerFrame[] = [];
  let t = 0;
  for (let i = 0; i < 90; i++, t += 33) out.push(smoother.smooth(noisy(base, (2 * Math.PI) / 180), t));
  const late = out.slice(30);
  const spread = (values: number[]) => Math.max(...values) - Math.min(...values);
  expect(spread(late.map((f) => f.diameter))).toBeLessThan(1.2);
  expect(spread(late.map((f) => f.origin.x))).toBeLessThan(1.5);
  expect(Math.min(...late.map((f) => f.z.dot(base.z)))).toBeGreaterThan(Math.cos((1.5 * Math.PI) / 180));

  // The hand moves: the ring follows within a few images (no lag that shows).
  const moved = { ...base, origin: base.origin.clone().add(new Vector3(60, 0, 0)), base: base.base.clone().add(new Vector3(60, 0, 0)), joint: base.joint.clone().add(new Vector3(60, 0, 0)) };
  let last = out[out.length - 1];
  for (let i = 0; i < 4; i++, t += 33) last = smoother.smooth(moved, t);
  expect(last.origin.x).toBeGreaterThan(moved.origin.x - 6);

  // One image where the back of the hand is misread (the ring turned half a turn around the finger): ignored.
  const flipped = { ...moved, x: moved.x.clone().negate(), z: moved.z.clone().negate() };
  last = smoother.smooth(flipped, (t += 33));
  expect(last.z.dot(base.z)).toBeGreaterThan(0.95);
  // It lasts: taken.
  for (let i = 0; i < 8; i++) last = smoother.smooth(flipped, (t += 33));
  expect(last.z.dot(base.z)).toBeLessThan(-0.95);
  // The base knuckle and the middle joint follow the smoothed frame (the ring and the finger's cylinder agree).
  expect(last.base.clone().lerp(last.joint, last.along).distanceTo(last.origin)).toBeLessThan(1e-6);
});
