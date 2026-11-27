import { useId, type CSSProperties } from "react";

/*
 * The trophy room (27/11/2026), the world of Noah Okafor's jersey pendant (arms crossed: his own trophy), drawn in code — no
 * image: a very dark room; the piece presented like a trophy on a black marble plinth, under one single warm light from above;
 * thin stadium rays in the haze; on the floor the white lines of a night pitch in perspective, fading into the black; the red of
 * Switzerland and the green of Nigeria only as a very faint edge light (the edges of the plinth, the far borders of the room),
 * never a flat area of colour.
 *
 * Two parts: the room, in the stage of the universe (it stays while the page scrolls, like every world), and what belongs to
 * the piece — the plinth and its light — which scrolls with the piece, so that the piece never leaves its plinth. The units:
 * 100 = the height of the box of the jewel, (0, 0) = the heart of the jewel. The page places it at every size
 * (src/components/universe/CodeScene.tsx): the plinth right under the jewel, as wide as the jewel.
 */

type P = [number, number];
const n = (v: number) => String(Math.round(v * 10) / 10);
const poly = (pts: P[]) => "M" + pts.map((p) => n(p[0]) + " " + n(p[1])).join("L") + "Z";

/* ---------- The pitch: a true perspective of the floor, seen at an angle (x = X·F/Z, y = H + EH·F/Z) ---------- */

/** The horizon (above the heart of the jewel: the eye looks down a little), a wide lens, the height of the eye. */
const H = -18;
const F = 170;
const EH = 70;
/** A metre of the pitch, the width of a painted line, the pitch turned by a third of a right angle, its centre spot. */
const M = 6;
const LW = 0.16 * M;
const TURN = (-35 * Math.PI) / 180;
const SPOT: P = [0, 200];
/** Nearer than this, a point of the floor is far below the screen (and behind the eye soon after): left out. */
const NEAR = 48;
const HALF_W = 34 * M;
const HALF_L = 52.5 * M;
/** A point of the pitch (metres × M from the centre spot, across and along) in the world, then on the screen; null too near. */
function at(px: number, pz: number): P | null {
  const x = SPOT[0] + px * Math.cos(TURN) - pz * Math.sin(TURN);
  const z = SPOT[1] + px * Math.sin(TURN) + pz * Math.cos(TURN);
  return z > NEAR ? [(x * F) / z, H + (EH * F) / z] : null;
}
/** A painted line from one point of the pitch to another: small quads in perspective (its width shrinks with the distance). */
function strip(a: P, b: P, steps = 24): string {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ox = (-(b[1] - a[1]) / l) * (LW / 2);
  const oz = ((b[0] - a[0]) / l) * (LW / 2);
  let d = "";
  for (let s = 0; s < steps; s++) {
    const p0: P = [a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps];
    const p1: P = [a[0] + ((b[0] - a[0]) * (s + 1)) / steps, a[1] + ((b[1] - a[1]) * (s + 1)) / steps];
    const q = [at(p0[0] + ox, p0[1] + oz), at(p1[0] + ox, p1[1] + oz), at(p1[0] - ox, p1[1] - oz), at(p0[0] - ox, p0[1] - oz)];
    if (q.every(Boolean)) d += poly(q as P[]);
  }
  return d;
}
/** An arc of a circle painted on the pitch (centre, radius, from one angle to the other). */
function arc(c: P, r: number, a0: number, a1: number, steps: number): string {
  let d = "";
  for (let s = 0; s < steps; s++) {
    const t0 = a0 + ((a1 - a0) * s) / steps;
    const t1 = a0 + ((a1 - a0) * (s + 1)) / steps;
    const q = [
      at(c[0] + Math.cos(t0) * (r + LW / 2), c[1] + Math.sin(t0) * (r + LW / 2)),
      at(c[0] + Math.cos(t1) * (r + LW / 2), c[1] + Math.sin(t1) * (r + LW / 2)),
      at(c[0] + Math.cos(t1) * (r - LW / 2), c[1] + Math.sin(t1) * (r - LW / 2)),
      at(c[0] + Math.cos(t0) * (r - LW / 2), c[1] + Math.sin(t0) * (r - LW / 2)),
    ];
    if (q.every(Boolean)) d += poly(q as P[]);
  }
  return d;
}

const PITCH = [
  // The halfway line and the centre circle, around the plinth.
  strip([-HALF_W, 0], [HALF_W, 0], 48),
  arc([0, 0], 9.15 * M, 0, Math.PI * 2, 120),
  // The touchlines and the goal lines.
  strip([-HALF_W, -HALF_L], [-HALF_W, HALF_L], 60),
  strip([HALF_W, -HALF_L], [HALF_W, HALF_L], 60),
  strip([-HALF_W, HALF_L], [HALF_W, HALF_L], 40),
  // The far end: the penalty area, the goal area, the arc, fading into the black.
  ...[1, -1].flatMap((e) => [
    strip([-20.15 * M, e * (HALF_L - 16.5 * M)], [20.15 * M, e * (HALF_L - 16.5 * M)], 24),
    strip([-20.15 * M, e * (HALF_L - 16.5 * M)], [-20.15 * M, e * HALF_L], 12),
    strip([20.15 * M, e * (HALF_L - 16.5 * M)], [20.15 * M, e * HALF_L], 12),
    strip([-9.16 * M, e * (HALF_L - 5.5 * M)], [9.16 * M, e * (HALF_L - 5.5 * M)], 12),
    strip([-9.16 * M, e * (HALF_L - 5.5 * M)], [-9.16 * M, e * HALF_L], 6),
    strip([9.16 * M, e * (HALF_L - 5.5 * M)], [9.16 * M, e * HALF_L], 6),
  ]),
  arc([0, HALF_L - 11 * M], 9.15 * M, -Math.PI + 0.6435, -0.6435, 24),
].join("");
/** The bands of the mown grass along the pitch, barely there, running to the horizon (every 5.5 m). */
const STRIPES = Array.from({ length: 6 }, (_, i) => -HALF_W + (2 * i + 0.5) * 5.5 * M)
  .map((x) => {
    let d = "";
    for (let s = 0; s < 20; s++) {
      const z0 = -HALF_L + (2 * HALF_L * s) / 20;
      const z1 = -HALF_L + (2 * HALF_L * (s + 1)) / 20;
      const q = [at(x, z0), at(x + 5.5 * M, z0), at(x + 5.5 * M, z1), at(x, z1)];
      if (q.every(Boolean)) d += poly(q as P[]);
    }
    return d;
  })
  .join("");

/** The box of the drawing of the room (units); beyond it, the base of the universe. */
const VIEW = { x: -330, y: -210, w: 660, h: 450 };
const VB = VIEW.x + " " + VIEW.y + " " + VIEW.w + " " + VIEW.h;

/** The thin rays of the stadium lights: where each comes from and where it goes (units), its width at the end, its time. */
const RAYS = [
  { from: [-175, -178], to: [70, 78], w: 9, t: 27, phone: true },
  { from: [-92, -196], to: [158, 66], w: 7, t: 33, phone: false },
  { from: [112, -196], to: [-128, 72], w: 7, t: 31, phone: false },
  { from: [188, -176], to: [-46, 84], w: 9, t: 29, phone: true },
].map((r) => {
  const dx = r.to[0]! - r.from[0]!;
  const dy = r.to[1]! - r.from[1]!;
  return { ...r, length: Math.hypot(dx, dy), angle: (-Math.atan2(dx, dy) * 180) / Math.PI };
});

/** The haze: soft veils of light in the dark air, drifting slowly. [x, y, width, height] (units), its light, its time. */
const HAZE = [
  { box: [-210, -150, 290, 150], a: 0.05, t: 46 },
  { box: [-20, -110, 210, 130], a: 0.04, t: 38 },
  { box: [-260, -10, 300, 110], a: 0.03, t: 52 },
];

const unit = (v: number) => "calc(var(--s-u) * " + v + ")";
const fromX = (v: number) => "calc(var(--s-x) + var(--s-u) * " + v + ")";
const fromY = (v: number) => "calc(var(--s-y) + var(--s-u) * " + v + ")";

/** The room, in the stage of the universe. */
export function TrophyRoomStage() {
  const id = "tr" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <>
      {/* The far plane: the dark room, the back wall where the warm light falls, the floor going into the dark. */}
      <div className="s-plane" data-plane="far" data-par="-3,-2" style={{ "--drift": "3" } as CSSProperties}>
        <svg className="s-art" viewBox={VB} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={id + "-room"} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={VIEW.y} y2={VIEW.y + VIEW.h}>
              <stop offset="0" stopColor="#040303" />
              <stop offset="0.42" stopColor="#090706" />
              <stop offset="0.47" stopColor="#0b0908" />
              <stop offset="0.62" stopColor="#070605" />
              <stop offset="1" stopColor="#030303" />
            </linearGradient>
            <radialGradient id={id + "-wall"} cx="0" cy="-36" r="150" gradientTransform="translate(0 -36) scale(0.78 1) translate(0 36)" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="rgb(255 212 160)" stopOpacity="0.1" />
              <stop offset="0.45" stopColor="rgb(255 212 160)" stopOpacity="0.035" />
              <stop offset="1" stopColor="rgb(255 212 160)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={id + "-floorlight"} cx="0" cy="44" r="160" gradientTransform="translate(0 44) scale(1 0.26) translate(0 -44)" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="rgb(255 208 156)" stopOpacity="0.07" />
              <stop offset="1" stopColor="rgb(255 208 156)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill={"url(#" + id + "-room)"} />
          <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill={"url(#" + id + "-wall)"} />
          <rect x={VIEW.x} y={H} width={VIEW.w} height={VIEW.h} fill={"url(#" + id + "-floorlight)"} />
        </svg>
      </div>
      {/* The air: veils of haze, and the thin rays of the stadium lights crossing it, sweeping very slowly. */}
      <div className="s-plane" data-plane="air" data-par="-5,-3" style={{ "--drift": "5" } as CSSProperties}>
        {HAZE.map((h, i) => (
          <i
            key={i}
            className="s-haze"
            style={{ left: fromX(h.box[0]!), top: fromY(h.box[1]!), width: unit(h.box[2]!), height: unit(h.box[3]!), "--a": h.a, "--t": h.t + "s", "--i": i } as CSSProperties}
          />
        ))}
        {RAYS.map((r, i) => (
          <i
            key={i}
            className="s-ray"
            data-phone={r.phone ? "" : undefined}
            style={{ left: fromX(r.from[0]!), top: fromY(r.from[1]!), width: unit(r.w), height: unit(r.length), "--r": r.angle.toFixed(2) + "deg", "--t": r.t + "s", "--i": i } as CSSProperties}
          >
            <svg viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <defs>
                <linearGradient id={id + "-ray" + i} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="rgb(238 241 244)" stopOpacity="0" />
                  <stop offset="0.3" stopColor="rgb(238 241 244)" stopOpacity="0.11" />
                  <stop offset="0.7" stopColor="rgb(238 241 244)" stopOpacity="0.05" />
                  <stop offset="1" stopColor="rgb(238 241 244)" stopOpacity="0" />
                </linearGradient>
                <filter id={id + "-rayblur" + i} x="-40%" y="0" width="180%" height="100%">
                  <feGaussianBlur stdDeviation="0.9 0" />
                </filter>
              </defs>
              <path d="M4.6 0L5.4 0L9 100L1 100Z" fill={"url(#" + id + "-ray" + i + ")"} filter={"url(#" + id + "-rayblur" + i + ")"} />
            </svg>
          </i>
        ))}
      </div>
      {/* The floor: the lines of a night pitch in perspective, fading into the black far away and around the piece. */}
      <div className="s-plane" data-plane="floor" data-par="-8,-5" style={{ "--drift": "8" } as CSSProperties}>
        <svg className="s-art" viewBox={VB} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={id + "-far"} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={H} y2={H + 44}>
              <stop offset="0" stopColor="#000" />
              <stop offset="0.1" stopColor="#000" />
              <stop offset="0.6" stopColor="#9a9a9a" />
              <stop offset="1" stopColor="#fff" />
            </linearGradient>
            <radialGradient id={id + "-hole"} cx="0" cy="10" r="38" gradientTransform="translate(0 10) scale(1 0.8) translate(0 -10)" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#000" stopOpacity="0.85" />
              <stop offset="0.55" stopColor="#000" stopOpacity="0.5" />
              <stop offset="1" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={id + "-sides"} gradientUnits="userSpaceOnUse" x1={VIEW.x} x2={VIEW.x + VIEW.w} y1="0" y2="0">
              <stop offset="0" stopColor="#000" stopOpacity="1" />
              <stop offset="0.2" stopColor="#000" stopOpacity="0" />
              <stop offset="0.8" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="1" />
            </linearGradient>
            <mask id={id + "-fade"} maskUnits="userSpaceOnUse" x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h}>
              <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill={"url(#" + id + "-far)"} />
              <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill={"url(#" + id + "-hole)"} />
              <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill={"url(#" + id + "-sides)"} />
            </mask>
          </defs>
          <g mask={"url(#" + id + "-fade)"}>
            <path d={STRIPES} fill="rgb(236 238 232)" opacity={0.022} />
            <path d={PITCH} fill="rgb(240 242 238)" opacity={0.34} />
          </g>
        </svg>
      </div>
      {/* Where the warm light falls (its dust floats there: src/components/universe/fx.ts, "beam-dust"), set by the page. */}
      <i className="u-region s-beam" data-region="beam" />
      <i className="s-focus" data-scene-focus="" />
    </>
  );
}

/** What belongs to the piece: the warm light from above and the black marble plinth, scrolling with it. */
export function TrophyRoomNear() {
  const id = "tp" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <div className="s-near" data-par="9,6">
      <i className="s-cone">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={id + "-cone"} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="rgb(255 214 166)" stopOpacity="0" />
              <stop offset="0.3" stopColor="rgb(255 214 166)" stopOpacity="0.035" />
              <stop offset="0.8" stopColor="rgb(255 214 166)" stopOpacity="0.1" />
              <stop offset="1" stopColor="rgb(255 214 166)" stopOpacity="0.15" />
            </linearGradient>
            <filter id={id + "-soft"} x="-20%" y="-5%" width="140%" height="110%">
              <feGaussianBlur stdDeviation="3.2 0.6" />
            </filter>
          </defs>
          <path d="M41 0L59 0L100 100L0 100Z" fill={"url(#" + id + "-cone)"} filter={"url(#" + id + "-soft)"} />
          <path d="M47 0L53 0L76 100L24 100Z" fill={"url(#" + id + "-cone)"} filter={"url(#" + id + "-soft)"} opacity={0.6} />
        </svg>
      </i>
      <i className="s-plinth" data-scene-plinth="">
        <svg viewBox="0 0 100 300" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={id + "-top"} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#141210" />
              <stop offset="1" stopColor="#1b1814" />
            </linearGradient>
            <radialGradient id={id + "-pool"} cx="50" cy="4.6" r="44" gradientTransform="translate(50 4.6) scale(1 0.16) translate(-50 -4.6)" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="rgb(255 218 172)" stopOpacity="0.62" />
              <stop offset="0.45" stopColor="rgb(255 212 160)" stopOpacity="0.2" />
              <stop offset="1" stopColor="rgb(255 212 160)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={id + "-shade"} cx="50" cy="5.4" r="22" gradientTransform="translate(50 5.4) scale(1 0.13) translate(-50 -5.4)" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#000" stopOpacity="0.55" />
              <stop offset="1" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={id + "-slab"} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#221d18" />
              <stop offset="0.35" stopColor="#100e0c" />
              <stop offset="1" stopColor="#090808" />
            </linearGradient>
            <linearGradient id={id + "-column"} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="20" y2="300">
              <stop offset="0" stopColor="#100e0c" />
              <stop offset="0.25" stopColor="#090807" />
              <stop offset="1" stopColor="#050505" />
            </linearGradient>
            <linearGradient id={id + "-gloss"} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.28" stopColor="#fff" stopOpacity="0.035" />
              <stop offset="0.36" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.7" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.78" stopColor="#fff" stopOpacity="0.02" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={id + "-lip"} gradientUnits="userSpaceOnUse" x1="0" x2="100" y1="0" y2="0">
              <stop offset="0" stopColor="rgb(255 214 166)" stopOpacity="0.08" />
              <stop offset="0.5" stopColor="rgb(255 222 180)" stopOpacity="0.6" />
              <stop offset="1" stopColor="rgb(255 214 166)" stopOpacity="0.08" />
            </linearGradient>
            {/* The red of Switzerland on the left edge, the green of Nigeria on the right one: a faint light on the edges. */}
            <linearGradient id={id + "-red"} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="120">
              <stop offset="0" stopColor="rgb(226 52 40)" stopOpacity="0.7" />
              <stop offset="0.3" stopColor="rgb(226 52 40)" stopOpacity="0.32" />
              <stop offset="1" stopColor="rgb(226 52 40)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={id + "-green"} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="120">
              <stop offset="0" stopColor="rgb(28 170 104)" stopOpacity="0.7" />
              <stop offset="0.3" stopColor="rgb(28 170 104)" stopOpacity="0.32" />
              <stop offset="1" stopColor="rgb(28 170 104)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={id + "-bottom"} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="300">
              <stop offset="0" stopColor="#fff" />
              <stop offset="0.14" stopColor="#fff" />
              <stop offset="0.42" stopColor="#000" />
            </linearGradient>
            <mask id={id + "-end"} maskUnits="userSpaceOnUse" x="-2" y="-2" width="104" height="304">
              <rect x="-2" y="-2" width="104" height="304" fill={"url(#" + id + "-bottom)"} />
            </mask>
            <filter id={id + "-blur"} x="-20%" y="-200%" width="140%" height="500%">
              <feGaussianBlur stdDeviation="1.2" />
            </filter>
            <clipPath id={id + "-faces"}>
              <rect x="0" y="9" width="100" height="11" />
              <rect x="6" y="20" width="88" height="280" />
            </clipPath>
          </defs>
          <g mask={"url(#" + id + "-end)"}>
            {/* The column, then the slab above it, then its top where the light falls and the piece stands. */}
            <rect x="6" y="20" width="88" height="280" fill={"url(#" + id + "-column)"} />
            <rect x="6" y="20" width="88" height="280" fill={"url(#" + id + "-gloss)"} />
            <rect x="6" y="20" width="88" height="4" fill="#000" opacity={0.55} filter={"url(#" + id + "-blur)"} />
            <rect x="0" y="9" width="100" height="11" fill={"url(#" + id + "-slab)"} />
            {/* The white veins of a Nero Marquina marble, faint. */}
            <g clipPath={"url(#" + id + "-faces)"} fill="none" stroke="rgb(232 226 218)" strokeLinecap="round">
              <path d="M-2 13 C 14 15, 26 11, 40 18 S 62 16, 78 10 S 96 14, 104 12" strokeWidth={0.35} opacity={0.12} />
              <path d="M14 20 C 20 44, 12 70, 26 96 S 40 140, 30 178" strokeWidth={0.55} opacity={0.05} />
              <path d="M26 96 C 38 104, 52 101, 60 118" strokeWidth={0.3} opacity={0.04} />
              <path d="M70 20 C 66 38, 78 58, 72 84 S 84 120, 88 150" strokeWidth={0.4} opacity={0.045} />
            </g>
            <path d="M5 0L95 0L100 9L0 9Z" fill={"url(#" + id + "-top)"} />
            <path d="M5 0L95 0L100 9L0 9Z" fill={"url(#" + id + "-pool)"} />
            <path d="M5 0L95 0L100 9L0 9Z" fill={"url(#" + id + "-shade)"} />
            <path d="M0 9L100 9" stroke={"url(#" + id + "-lip)"} strokeWidth={0.45} />
            <path d="M0.3 9L5.3 0M0.3 9L0.3 20M6.3 20L6.3 120" stroke={"url(#" + id + "-red)"} strokeWidth={0.4} fill="none" opacity={0.6} />
            <path d="M99.7 9L94.7 0M99.7 9L99.7 20M93.7 20L93.7 120" stroke={"url(#" + id + "-green)"} strokeWidth={0.4} fill="none" opacity={0.6} />
            <rect x="6" y="20" width="5" height="100" fill={"url(#" + id + "-red)"} opacity={0.06} />
            <rect x="89" y="20" width="5" height="100" fill={"url(#" + id + "-green)"} opacity={0.06} />
          </g>
        </svg>
      </i>
    </div>
  );
}
