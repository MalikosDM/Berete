import { useId, type CSSProperties } from "react";

/*
 * The octagon gallery (27/11/2026), the world of Noah Okafor's octagon pendant (an O in white gold, an N in rose gold), drawn in
 * code — no image: an enfilade of octagonal arches in polished black stone going into the depth, the left side lit in cold
 * white (the white gold of the O), the right side in warm rose (the rose gold of the N), the two lights meeting on the piece,
 * a black mirror floor reflecting the arches.
 *
 * The geometry is a true one-point perspective, computed once (the same on the server and in the browser): each arch is an
 * octagon (flat at the top and the bottom, like the pendant) standing on the floor, its front face, the eight faces of its
 * thickness, its two edges; the floor cuts it below its centre; the mirror shows each arch upside down under its own line.
 * The units: 100 = the height of the box of the jewel, (0, 0) = the heart of the jewel, where the gallery vanishes. The page
 * places it there at every size (src/components/universe/CodeScene.tsx); three planes, far to near, answer the mouse and drift
 * slowly, each its own way (src/components/universe/scenes.css).
 */

type P = [number, number];
const n = (v: number) => String(Math.round(v * 10) / 10);
const poly = (pts: P[]) => (pts.length > 2 ? "M" + pts.map((p) => n(p[0]) + " " + n(p[1])).join("L") + "Z" : "");
const open = (pts: P[]) => (pts.length > 1 ? "M" + pts.map((p) => n(p[0]) + " " + n(p[1])).join("L") : "");

/** The screen units of one world unit at depth 1 (the inner apothem of an arch is 1). */
const K = 300;
/** The floor, below the axis of the gallery (the arches stand on it, cut below their centre). */
const FLOOR = 0.42;
/** The outer apothem of an arch, its thickness, the distance from one arch to the next, and how many. */
const OUTER = 1.17;
const DEPTH = 0.24;
const STEP = 0.7;
const RINGS = 11;
const COS = Math.cos(Math.PI / 8);
/** A regular octagon of apothem 1, flat at the top and the bottom (y grows downwards). */
const OCT: P[] = Array.from({ length: 8 }, (_, k) => {
  const a = Math.PI / 8 + (k * Math.PI) / 4;
  return [Math.cos(a) / COS, Math.sin(a) / COS];
});

/** The part of a polygon above the floor (Sutherland–Hodgman on y <= FLOOR). */
function aboveFloor(pts: P[]): P[] {
  const out: P[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const ain = a[1] <= FLOOR;
    const bin = b[1] <= FLOOR;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (FLOOR - a[1]) / (b[1] - a[1]);
      out.push([a[0] + (b[0] - a[0]) * t, FLOOR]);
    }
  }
  return out;
}

/** The part of an edge above the floor, or null. */
function edgeAbove(a: P, b: P): [P, P] | null {
  if (a[1] > FLOOR && b[1] > FLOOR) return null;
  const cut = (p: P, q: P): P => [p[0] + ((q[0] - p[0]) * (FLOOR - p[1])) / (q[1] - p[1]), FLOOR];
  if (a[1] > FLOOR) return [cut(b, a), b];
  if (b[1] > FLOOR) return [a, cut(a, b)];
  return [a, b];
}

/** A point of the world (x, y at depth z) on the screen; mirrored: its image in the floor. */
const at = (p: P, z: number, mirror: boolean): P => [(p[0] * K) / z, ((mirror ? 2 * FLOOR - p[1] : p[1]) * K) / z];

type Ring = { i: number; face: string; sides: string; rim: string; edge: string; light: number; width: number };

/**
 * One arch: its front face (the outer octagon minus the opening, above the floor), the faces of its thickness seen inside the
 * opening, its inner edge (the polished rim that catches the light) and its outer edge. light: how much it is lit — the arches
 * around the piece most (the lights meet there), the nearest ones and the farthest ones fading into the black.
 */
function ring(i: number, mirror: boolean): Ring {
  const z = 1 + STEP * i;
  const zb = z + DEPTH;
  const outer = aboveFloor(OCT.map(([x, y]): P => [x * OUTER, y * OUTER]));
  const inner = aboveFloor(OCT);
  const sides: string[] = [];
  const rims: string[] = [];
  const edges: string[] = [];
  for (let k = 0; k < 8; k++) {
    const e = edgeAbove(OCT[k]!, OCT[(k + 1) % 8]!);
    if (e) {
      sides.push(poly([at(e[0], z, mirror), at(e[1], z, mirror), at(e[1], zb, mirror), at(e[0], zb, mirror)]));
      rims.push(open([at(e[0], z, mirror), at(e[1], z, mirror)]));
    }
    const o = edgeAbove([OCT[k]![0] * OUTER, OCT[k]![1] * OUTER], [OCT[(k + 1) % 8]![0] * OUTER, OCT[(k + 1) % 8]![1] * OUTER]);
    if (o) edges.push(open([at(o[0], z, mirror), at(o[1], z, mirror)]));
  }
  const apothem = K / z;
  const light = Math.exp(-((Math.log(apothem / 62) / 0.55) ** 2));
  return {
    i,
    face: poly(outer.map((p) => at(p, z, mirror))) + poly(inner.map((p) => at(p, z, mirror))),
    sides: sides.join(""),
    rim: rims.join(""),
    edge: edges.join(""),
    light,
    width: Math.min(1.2, Math.max(0.2, 0.5 * (apothem / 62) ** 0.7)),
  };
}

const UPRIGHT = Array.from({ length: RINGS }, (_, i) => ring(i, false));
const MIRRORED = Array.from({ length: RINGS }, (_, i) => ring(i, true));
/** The three planes: the arches of each, far to near (the farthest first, drawn under). */
const PLANES: { name: string; par: string; drift: string; rings: number[] }[] = [
  { name: "far", par: "-3,-2", drift: "3", rings: [10, 9, 8, 7, 6] },
  { name: "mid", par: "-6,-4", drift: "6", rings: [5, 4, 3] },
  { name: "near", par: "-11,-7", drift: "11", rings: [2, 1, 0] },
];
/** The box of the drawing (units): wide enough for the widest screens; beyond it, the base of the universe. */
const VIEW = { x: -330, y: -210, w: 660, h: 450 };

function Arches({ id, rings }: { id: string; rings: number[] }) {
  return (
    <>
      {/* The mirror: each arch upside down under its own line, fading as it comes nearer (a glossy floor reflects most at a
          grazing angle). */}
      <g mask={"url(#" + id + "-fade)"} opacity={0.55}>
        {rings.map((i) => {
          const r = MIRRORED[i]!;
          return (
            <g key={i}>
              <path d={r.face} fillRule="evenodd" fill="#070708" />
              <path d={r.face} fillRule="evenodd" fill={"url(#" + id + "-sheen)"} opacity={r.light} />
              <path d={r.sides} fill={"url(#" + id + "-side)"} opacity={0.25 + r.light * 0.75} />
              <path d={r.rim} fill="none" stroke={"url(#" + id + "-rim)"} strokeWidth={r.width} opacity={0.15 + r.light * 0.85} />
            </g>
          );
        })}
      </g>
      {rings.map((i) => {
        const r = UPRIGHT[i]!;
        return (
          <g key={i} data-arch={i}>
            <path d={r.face} fillRule="evenodd" fill="#060607" />
            <path d={r.face} fillRule="evenodd" fill={"url(#" + id + "-sheen)"} opacity={0.12 + r.light * 0.88} />
            <path d={r.sides} fill={"url(#" + id + "-side)"} opacity={0.1 + r.light * 0.9} />
            <path d={r.edge} fill="none" stroke={"url(#" + id + "-rim)"} strokeWidth={r.width * 0.55} opacity={0.08 + r.light * 0.32} />
            <path d={r.rim} fill="none" stroke={"url(#" + id + "-rim)"} strokeWidth={r.width} opacity={0.12 + r.light * 0.88} />
          </g>
        );
      })}
    </>
  );
}

/** The shared paints of a plane (each SVG has its own: an id is unique in the page). */
function Paints({ id }: { id: string }) {
  return (
    <defs>
      {/* Left cold white, right warm rose, the middle (the top of an arch) in the dark. */}
      {/* (27/11/2026: the white of the O and the rose of the N read more clearly, never as a flat colour.) */}
      <linearGradient id={id + "-sheen"} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="rgb(232 240 252)" stopOpacity="0.22" />
        <stop offset="0.24" stopColor="rgb(232 240 252)" stopOpacity="0.06" />
        <stop offset="0.5" stopColor="rgb(228 233 240)" stopOpacity="0" />
        <stop offset="0.76" stopColor="rgb(240 172 150)" stopOpacity="0.07" />
        <stop offset="1" stopColor="rgb(240 172 150)" stopOpacity="0.25" />
      </linearGradient>
      <linearGradient id={id + "-side"} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="rgb(232 240 252)" stopOpacity="0.5" />
        <stop offset="0.22" stopColor="rgb(232 240 252)" stopOpacity="0.16" />
        <stop offset="0.5" stopColor="rgb(214 200 196)" stopOpacity="0.015" />
        <stop offset="0.78" stopColor="rgb(240 172 150)" stopOpacity="0.18" />
        <stop offset="1" stopColor="rgb(240 172 150)" stopOpacity="0.55" />
      </linearGradient>
      <linearGradient id={id + "-rim"} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="rgb(238 244 252)" stopOpacity="1" />
        <stop offset="0.28" stopColor="rgb(238 244 252)" stopOpacity="0.6" />
        <stop offset="0.5" stopColor="rgb(226 210 204)" stopOpacity="0.12" />
        <stop offset="0.72" stopColor="rgb(244 178 154)" stopOpacity="0.65" />
        <stop offset="1" stopColor="rgb(244 178 154)" stopOpacity="1" />
      </linearGradient>
      <linearGradient id={id + "-fade-g"} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="10" y2="130">
        <stop offset="0" stopColor="#fff" />
        <stop offset="0.4" stopColor="#8a8a8a" />
        <stop offset="1" stopColor="#1a1a1a" />
      </linearGradient>
      <mask id={id + "-fade"} maskUnits="userSpaceOnUse" x={VIEW.x} y="0" width={VIEW.w} height={VIEW.h}>
        <rect x={VIEW.x} y="0" width={VIEW.w} height={VIEW.h} fill={"url(#" + id + "-fade-g)"} />
      </mask>
    </defs>
  );
}

/** The floor and the depth of the gallery: drawn once, under the farthest arches. */
function Ground({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={id + "-depth"} cx="0" cy="0" r="120" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="rgb(236 222 216)" stopOpacity="0.1" />
          <stop offset="0.5" stopColor="rgb(236 222 216)" stopOpacity="0.03" />
          <stop offset="1" stopColor="rgb(236 222 216)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id + "-floor"} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="160">
          <stop offset="0" stopColor="#09090b" />
          <stop offset="0.12" stopColor="#121014" />
          <stop offset="0.36" stopColor="#09080a" />
          <stop offset="1" stopColor="#040405" />
        </linearGradient>
        <radialGradient id={id + "-pool-c"} cx="-46" cy="30" r="80" gradientTransform="translate(-46 30) scale(1 0.28) translate(46 -30)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="rgb(232 240 252)" stopOpacity="0.24" />
          <stop offset="1" stopColor="rgb(228 233 240)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id + "-pool-r"} cx="46" cy="30" r="80" gradientTransform="translate(46 30) scale(1 0.28) translate(-46 -30)" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="rgb(240 172 150)" stopOpacity="0.26" />
          <stop offset="1" stopColor="rgb(242 188 166)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill="#060607" />
      <rect x={VIEW.x} y="0" width={VIEW.w} height={VIEW.h} fill={"url(#" + id + "-floor)"} />
      <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill={"url(#" + id + "-depth)"} />
      {/* The two lights, mirrored on the floor under the piece: cold on the left, rose on the right. */}
      <rect x={VIEW.x} y="0" width={VIEW.w} height="120" fill={"url(#" + id + "-pool-c)"} />
      <rect x={VIEW.x} y="0" width={VIEW.w} height="120" fill={"url(#" + id + "-pool-r)"} />
    </>
  );
}

/** The two lights, from the far left (cold) and the far right (rose), crossing in the haze on the piece. */
function Beams({ id }: { id: string }) {
  return (
    <g className="s-oct-beams">
      <defs>
        <linearGradient id={id + "-beam-c"} gradientUnits="userSpaceOnUse" x1="-330" y1="-96" x2="70" y2="20">
          <stop offset="0" stopColor="rgb(236 240 246)" stopOpacity="0" />
          <stop offset="0.55" stopColor="rgb(232 240 252)" stopOpacity="0.11" />
          <stop offset="0.8" stopColor="rgb(232 240 252)" stopOpacity="0.16" />
          <stop offset="1" stopColor="rgb(236 240 246)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id + "-beam-r"} gradientUnits="userSpaceOnUse" x1="330" y1="-96" x2="-70" y2="20">
          <stop offset="0" stopColor="rgb(246 194 172)" stopOpacity="0" />
          <stop offset="0.55" stopColor="rgb(240 172 150)" stopOpacity="0.13" />
          <stop offset="0.8" stopColor="rgb(240 172 150)" stopOpacity="0.18" />
          <stop offset="1" stopColor="rgb(246 194 172)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id + "-meet"} cx="0" cy="0" r="78" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="rgb(246 230 224)" stopOpacity="0.16" />
          <stop offset="0.6" stopColor="rgb(246 230 224)" stopOpacity="0.05" />
          <stop offset="1" stopColor="rgb(246 230 224)" stopOpacity="0" />
        </radialGradient>
        <filter id={id + "-soft"} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <path d="M-330 -100L-330 -92L70 34L70 -6Z" fill={"url(#" + id + "-beam-c)"} filter={"url(#" + id + "-soft)"} />
      <path d="M330 -100L330 -92L-70 34L-70 -6Z" fill={"url(#" + id + "-beam-r)"} filter={"url(#" + id + "-soft)"} />
      {/* Where they meet: the piece, in a light of both. */}
      <ellipse cx="0" cy="0" rx="78" ry="70" fill={"url(#" + id + "-meet)"} />
    </g>
  );
}

/** The gallery, in the stage of the universe (behind the whole page). */
export function OctagonGalleryStage() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <>
      {PLANES.map((plane) => {
        const id = "oct" + uid + plane.name;
        return (
          <div key={plane.name} className="s-plane" data-plane={plane.name} data-par={plane.par} style={{ "--drift": plane.drift } as CSSProperties}>
            <svg className="s-art" viewBox={VIEW.x + " " + VIEW.y + " " + VIEW.w + " " + VIEW.h} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
              <Paints id={id} />
              {plane.name === "far" ? <Ground id={id} /> : null}
              <Arches id={id} rings={plane.rings} />
              {plane.name === "near" ? <Beams id={id} /> : null}
            </svg>
          </div>
        );
      })}
      {/* The heart of the gallery: where it vanishes, under the piece (read by the checks, never seen). */}
      <i className="s-focus" data-scene-focus="" />
    </>
  );
}
