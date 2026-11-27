import { useId, type CSSProperties } from "react";

/*
 * The signature (27/11/2026), the world of Angelo Stiller's AS pendant — « An Architectural Study in Diamonds » — drawn in code,
 * no image: his personal creation (no stadium, no celebration), a dark and quiet room of architecture built from the pendant
 * itself, never a copy of it:
 *   - the wall: the crossed pattern of its invisible-set baguettes (a basket weave turned by 45°), magnified, drawn as hairlines
 *     with the step-cut facets of each baguette, lit softly from above, fading into the black around the piece and far from it;
 *     here and there one baguette catches the light, slowly, one after the other;
 *   - its pointed silhouette (flat at the top, straight sides, the point at the bottom; its proportions measured on the photos)
 *     as nested outlines around the piece, each a fine bevel whose facets take the light from above, the nearest one a touch of
 *     rose gold at its point (the BRT mark on the back of the pendant is in rose gold);
 *   - the lines of the study: the axis of the piece, its datum line, the two lines of its point drawn on into a large X.
 *
 * The units: 100 = the visible height of the jewel (--s-j, measured by src/components/universe/CodeScene.tsx), (0, 0) = its
 * heart. Three planes, far to near, answer the mouse and drift slowly, each its own way (src/components/universe/scenes.css).
 */

type P = [number, number];
const n = (v: number) => String(Math.round(v * 100) / 100);
const poly = (pts: P[]) => "M" + pts.map((p) => n(p[0]) + " " + n(p[1])).join("L") + "Z";
const line = (a: P, b: P) => "M" + n(a[0]) + " " + n(a[1]) + "L" + n(b[0]) + " " + n(b[1]);

/** The box of the drawing (units): wide enough for the widest screens and the tallest phones; beyond it, the base of the universe. */
const VIEW = { x: -340, y: -220, w: 680, h: 480 };

/* ---------- The silhouette of the pendant: half its height = 1, its half width 0.82, its straight sides down to 0.045 ---------- */
const HALF_W = 0.82;
const SHOULDER = 0.045;
/** The outlines: centred a little above the heart (the bail of the pendant goes higher than its shield), each larger. */
const CY = -4;
const FRAMES = [
  { r: 60, plane: "far", light: 1 },
  { r: 86, plane: "mid", light: 0.72 },
  { r: 122, plane: "mid", light: 0.52 },
  { r: 172, plane: "near", light: 0.38 },
  { r: 244, plane: "near", light: 0.28 },
] as const;

function shield(r: number): P[] {
  const hw = HALF_W * r;
  return [
    [-hw, CY - r],
    [hw, CY - r],
    [hw, CY + SHOULDER * r],
    [0, CY + r],
    [-hw, CY + SHOULDER * r],
  ];
}

/** A convex polygon (clockwise on the screen) moved inwards by d on every edge. */
function inset(pts: P[], d: number): P[] {
  const lines = pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length]!;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dx = (b[0] - a[0]) / l;
    const dy = (b[1] - a[1]) / l;
    return { p: [a[0] - dy * d, a[1] + dx * d] as P, d: [dx, dy] as P };
  });
  return lines.map((cur, i) => {
    const prev = lines[(i - 1 + lines.length) % lines.length]!;
    // prev.p + t·prev.d = cur.p + s·cur.d
    const det = prev.d[0] * -cur.d[1] - prev.d[1] * -cur.d[0];
    const t = ((cur.p[0] - prev.p[0]) * -cur.d[1] - (cur.p[1] - prev.p[1]) * -cur.d[0]) / det;
    return [prev.p[0] + t * prev.d[0], prev.p[1] + t * prev.d[1]];
  });
}

/** The light comes from above, a little from the right: how much each face of a bevel takes (0.25 in the shade, 1 facing it). */
const LIGHT: P = [0.29, -0.96];
function shade(a: P, b: P): number {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const out: P = [(b[1] - a[1]) / l, -(b[0] - a[0]) / l];
  return 0.25 + 0.75 * Math.max(0, out[0] * LIGHT[0] + out[1] * LIGHT[1]);
}

type Frame = { r: number; plane: string; light: number; outer: string; inner: string; miters: string; faces: { d: string; a: number }[]; point: P };
const FRAME_DRAWINGS: Frame[] = FRAMES.map(({ r, plane, light }) => {
  const outer = shield(r);
  const inner = inset(outer, Math.max(2.2, r * 0.042));
  return {
    r,
    plane,
    light,
    outer: poly(outer),
    inner: poly(inner),
    miters: outer.map((p, i) => line(p, inner[i]!)).join(""),
    faces: outer.map((p, i) => {
      const q = outer[(i + 1) % outer.length]!;
      return { d: poly([p, q, inner[(i + 1) % inner.length]!, inner[i]!]), a: shade(p, q) };
    }),
    point: outer[3]!,
  };
});

/* ---------- The lines of the study ---------- */
const F0 = shield(FRAMES[0].r);
/** The two lines of the point (through the shoulders and the point of the nearest outline), drawn on across the whole drawing. */
const X_LINES = [F0[2]!, F0[4]!]
  .map((s) => {
    const p = F0[3]!;
    const k = (s[0] - p[0]) / (s[1] - p[1]);
    return line([p[0] + k * (VIEW.y - p[1]), VIEW.y], [p[0] + k * (VIEW.y + VIEW.h - p[1]), VIEW.y + VIEW.h]);
  })
  .join("");
/** Small ticks along the axis, every 10 units, away from the piece. */
const TICKS = Array.from({ length: 45 }, (_, i) => VIEW.y + 10 + i * 10)
  .filter((y) => y < -66 || y > 66)
  .map((y) => line([-(y % 50 === 0 ? 1.6 : 0.8), y], [y % 50 === 0 ? 1.6 : 0.8, y]))
  .join("");

/* ---------- The wall: the baguettes in a basket weave turned by 45° (three in each square, the next square crosswise) ---------- */
const L = 10.5;
const W = L / 3;
/** One step-cut baguette: its girdle, its table, the four lines of its corners, and the two facets turned to the light. */
function baguette(x: number, y: number, w: number, h: number) {
  const t = Math.min(w, h) * 0.27;
  const o: P[] = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
  const i: P[] = [
    [x + t, y + t],
    [x + w - t, y + t],
    [x + w - t, y + h - t],
    [x + t, y + h - t],
  ];
  return {
    girdle: poly(o),
    table: poly(i),
    corners: o.map((p, k) => line(p, i[k]!)).join(""),
    // In the pattern, turned by -45°, the top and the right sides face the light that comes from above on the screen.
    lit: poly([o[0]!, o[1]!, i[1]!, i[0]!]) + poly([o[1]!, o[2]!, i[2]!, i[1]!]),
  };
}
const CELLS = [
  [0, 0, true],
  [1, 0, false],
  [0, 1, false],
  [1, 1, true],
] as const;
const WEAVE = CELLS.flatMap(([cx, cy, across]) => [0, 1, 2].map((k) => (across ? baguette(cx * L, cy * L + k * W, L, W) : baguette(cx * L + k * W, cy * L, W, L))));
const WEAVE_D = {
  girdle: WEAVE.map((b) => b.girdle).join(""),
  table: WEAVE.map((b) => b.table).join(""),
  corners: WEAVE.map((b) => b.corners).join(""),
  lit: WEAVE.map((b) => b.lit).join(""),
};

/**
 * The baguettes that catch the light in turn: places chosen around the piece (units), each snapped onto the nearest baguette
 * of the wall (so that it lights a real stone of the pattern). phone: kept on a phone (the narrow screen around the piece).
 */
const GLINT_SPOTS: [number, number, boolean][] = [
  [62, -46, false],
  [-52, -50, true],
  [98, -14, false],
  [52, 8, true],
  [-88, -24, false],
  [114, -50, false],
  [-54, 2, true],
  [80, 28, false],
  [-76, 30, false],
  [56, -24, true],
];
const S = Math.SQRT1_2;
const GLINTS = GLINT_SPOTS.map(([x, y, phone], i) => {
  // The screen (x, y) in the pattern (turned back by 45°), its square, the stone in it, and that stone's centre on the screen.
  const px = (x - y) * S;
  const py = (x + y) * S;
  const ci = Math.floor(px / L);
  const cj = Math.floor(py / L);
  const across = (((ci + cj) % 2) + 2) % 2 === 0;
  const k = Math.min(2, Math.floor(across ? (py - cj * L) / W : (px - ci * L) / W));
  const cx = across ? ci * L + L / 2 : ci * L + k * W + W / 2;
  const cy = across ? cj * L + k * W + W / 2 : cj * L + L / 2;
  return { i, x: (cx + cy) * S, y: (-cx + cy) * S, turn: across ? -45 : 45, phone, rose: i === 6 };
});
/** The order of the lights kept on a phone (their own turn, so that they never light together). */
const PHONE_TURN = new Map(GLINTS.filter((g) => g.phone).map((g, k) => [g.i, k]));
const GLINT_STONE = baguette(0, 0, L, W);
const STAR = "M" + n(L - 0.9) + " -2.4L" + n(L - 0.7) + " -0.2L" + n(L + 1.5) + " 0L" + n(L - 0.7) + " 0.2L" + n(L - 0.9) + " 2.4L" + n(L - 1.1) + " 0.2L" + n(L - 3.3) + " 0L" + n(L - 1.1) + " -0.2Z";

function Glint({ id, g }: { id: string; g: (typeof GLINTS)[number] }) {
  const light = g.rose ? "rgb(242 200 182)" : "rgb(248 247 244)";
  return (
    <i className="s-glint" data-phone={g.phone ? "" : undefined} style={{ "--gx": n(g.x), "--gy": n(g.y), "--turn": g.turn + "deg", "--i": g.i, "--p": PHONE_TURN.get(g.i) ?? 0 } as CSSProperties}>
      <svg viewBox={"-3 -3 " + n(L + 6) + " " + n(W + 6)} aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id={id + "-g" + g.i} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={light} stopOpacity="0.34" />
            <stop offset="1" stopColor={light} stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={L / 2} cy={W / 2} rx={L / 2 + 3} ry={W / 2 + 3} fill={"url(#" + id + "-g" + g.i + ")"} />
        {/* A stone lying the other way in the wall: mirrored, so that its lit facets still face the light from above. */}
        <g transform={g.turn > 0 ? "translate(" + n(L) + " 0) scale(-1 1)" : undefined}>
          <path d={GLINT_STONE.lit} fill={light} opacity={0.42} />
          <path d={GLINT_STONE.table} fill="rgb(248 247 244)" opacity={0.08} />
          <g fill="none" stroke={g.rose ? "rgb(244 204 188)" : "rgb(250 249 246)"} strokeLinejoin="round">
            <path d={GLINT_STONE.girdle} strokeWidth={0.2} opacity={0.9} />
            <path d={GLINT_STONE.table} strokeWidth={0.12} opacity={0.7} />
            <path d={GLINT_STONE.corners} strokeWidth={0.1} opacity={0.6} />
          </g>
          {/* The star of light at the corner of the stone that faces the light. */}
          <path d={STAR} fill="rgb(252 251 248)" opacity={0.85} />
        </g>
      </svg>
    </i>
  );
}

/** The wall of baguettes: dim everywhere around the piece, brighter where the light from above falls (two drawings). */
function Wall({ id, lit }: { id: string; lit: boolean }) {
  const tone = "rgb(238 236 232)";
  return (
    <>
      <defs>
        <pattern id={id + "-weave"} patternUnits="userSpaceOnUse" width={2 * L} height={2 * L} patternTransform="rotate(-45)">
          <path d={WEAVE_D.lit} fill={tone} opacity={lit ? 0.075 : 0.02} />
          <g fill="none" stroke={tone}>
            <path d={WEAVE_D.girdle} strokeWidth={lit ? 0.15 : 0.13} opacity={lit ? 0.3 : 0.085} />
            <path d={WEAVE_D.table} strokeWidth={0.09} opacity={lit ? 0.17 : 0.04} />
            <path d={WEAVE_D.corners} strokeWidth={0.07} opacity={lit ? 0.15 : 0.03} />
          </g>
        </pattern>
        {/* Where the wall shows: around the piece, a little above it (the light comes from above); dark close to the piece, so
            that its own baguettes stand out on the black, and far from it. */}
        <radialGradient id={id + "-reach"} gradientUnits="userSpaceOnUse" cx={lit ? 28 : 12} cy={lit ? -82 : -40} r={lit ? 132 : 210}>
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.45" stopColor="#fff" stopOpacity={lit ? 0.3 : 0.45} />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id + "-keep"} gradientUnits="userSpaceOnUse" cx="0" cy="-2" r="92" gradientTransform="translate(0 -2) scale(0.78 1) translate(0 2)">
          <stop offset="0" stopColor="#000" stopOpacity="1" />
          <stop offset="0.62" stopColor="#000" stopOpacity="0.88" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <mask id={id + "-wall"} maskUnits="userSpaceOnUse" x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h}>
          <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill={"url(#" + id + "-reach)"} />
          <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill={"url(#" + id + "-keep)"} />
        </mask>
      </defs>
      <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill={"url(#" + id + "-weave)"} mask={"url(#" + id + "-wall)"} />
    </>
  );
}

/** The depth of the room behind the wall: almost black, a breath of light high above the piece. */
function Ground({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={id + "-air"} gradientUnits="userSpaceOnUse" cx="18" cy="-70" r="210">
          <stop offset="0" stopColor="rgb(236 233 228)" stopOpacity="0.075" />
          <stop offset="0.5" stopColor="rgb(236 233 228)" stopOpacity="0.022" />
          <stop offset="1" stopColor="rgb(236 233 228)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill="#050506" />
      <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill={"url(#" + id + "-air)"} />
    </>
  );
}

/** The axis, the datum line, the X of the point and the ticks: faint, fading at their ends. */
function Study({ id }: { id: string }) {
  return (
    <g fill="none" stroke="rgb(236 234 230)">
      <defs>
        <linearGradient id={id + "-v"} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={VIEW.y} y2={VIEW.y + VIEW.h}>
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.62" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id + "-h"} gradientUnits="userSpaceOnUse" x1={-200} x2={200} y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={id + "-fade"} maskUnits="userSpaceOnUse" x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h}>
          <rect x={VIEW.x} y={VIEW.y} width={VIEW.w} height={VIEW.h} fill={"url(#" + id + "-v)"} />
        </mask>
      </defs>
      <g mask={"url(#" + id + "-fade)"}>
        <path d={"M0 " + VIEW.y + "V" + (VIEW.y + VIEW.h)} strokeWidth={0.16} opacity={0.1} />
        <path d={TICKS} strokeWidth={0.12} opacity={0.12} />
        <path d={X_LINES} strokeWidth={0.14} opacity={0.06} />
      </g>
      {/* The datum line, level with the top of the nearest outline. */}
      <path d={"M-200 " + n(F0[0]![1]) + "H200"} stroke={"url(#" + id + "-h)"} strokeWidth={0.14} opacity={0.07} />
    </g>
  );
}

/** The outlines of one plane: a fine bevel each, its facets lit from above, its edges brighter at the top. */
function Frames({ id, plane }: { id: string; plane: string }) {
  const frames = FRAME_DRAWINGS.filter((f) => f.plane === plane);
  return (
    <>
      <defs>
        <linearGradient id={id + "-edge"} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="rgb(246 244 240)" stopOpacity="1" />
          <stop offset="0.5" stopColor="rgb(240 238 234)" stopOpacity="0.5" />
          <stop offset="1" stopColor="rgb(236 232 228)" stopOpacity="0.14" />
        </linearGradient>
        <radialGradient id={id + "-rose"} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgb(236 186 166)" stopOpacity="0.42" />
          <stop offset="0.4" stopColor="rgb(232 180 160)" stopOpacity="0.12" />
          <stop offset="1" stopColor="rgb(232 180 160)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {frames.map((f) => (
        <g key={f.r} data-frame={f.r} className={f.r === FRAMES[FRAMES.length - 1].r ? "s-far-frame" : undefined}>
          {f.faces.map((face, i) => (
            <path key={i} d={face.d} fill="rgb(244 242 238)" opacity={0.085 * face.a * f.light} />
          ))}
          <g fill="none" stroke={"url(#" + id + "-edge)"} strokeLinejoin="miter">
            <path d={f.outer} strokeWidth={0.2} opacity={0.62 * f.light} />
            <path d={f.inner} strokeWidth={0.14} opacity={0.4 * f.light} />
            <path d={f.miters} strokeWidth={0.1} opacity={0.32 * f.light} />
          </g>
          {f.r === FRAMES[0].r ? (
            // A touch of rose gold where the nearest outline comes to its point.
            <ellipse cx={f.point[0]} cy={f.point[1] - 1} rx="4.6" ry="3.4" fill={"url(#" + id + "-rose)"} />
          ) : null}
        </g>
      ))}
    </>
  );
}

/** The discreet light: a soft beam from high above, a little from the right, falling on the piece. */
function Beam({ id }: { id: string }) {
  return (
    <g className="s-as-beam">
      <defs>
        <linearGradient id={id + "-beam"} gradientUnits="userSpaceOnUse" x1="40" y1={VIEW.y} x2="0" y2="40">
          <stop offset="0" stopColor="rgb(242 240 236)" stopOpacity="0" />
          <stop offset="0.45" stopColor="rgb(242 240 236)" stopOpacity="0.06" />
          <stop offset="0.85" stopColor="rgb(242 240 236)" stopOpacity="0.09" />
          <stop offset="1" stopColor="rgb(242 240 236)" stopOpacity="0" />
        </linearGradient>
        <filter id={id + "-soft"} x="-30%" y="-10%" width="160%" height="120%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <path d={"M48 " + VIEW.y + "L72 " + VIEW.y + "L44 46L-40 46Z"} fill={"url(#" + id + "-beam)"} filter={"url(#" + id + "-soft)"} />
    </g>
  );
}

const PLANES: { name: string; par: string; drift: string }[] = [
  { name: "far", par: "-3,-2", drift: "3" },
  { name: "mid", par: "-6,-4", drift: "6" },
  { name: "near", par: "-11,-7", drift: "11" },
];

/** The study, in the stage of the universe (behind the whole page). */
export function SignatureStudyStage() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const box = VIEW.x + " " + VIEW.y + " " + VIEW.w + " " + VIEW.h;
  return (
    <>
      {PLANES.map((plane) => {
        const id = "as" + uid + plane.name;
        return (
          <div key={plane.name} className="s-plane" data-plane={plane.name} data-par={plane.par} style={{ "--drift": plane.drift } as CSSProperties}>
            <svg className="s-art" viewBox={box} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
              {plane.name === "far" ? (
                <>
                  <Ground id={id} />
                  <Wall id={id} lit={false} />
                  <Study id={id} />
                </>
              ) : null}
              {plane.name === "mid" ? <Beam id={id} /> : null}
              <Frames id={id} plane={plane.name} />
            </svg>
            {plane.name === "far" ? (
              <>
                {/* The light from above on the wall: the same wall, brighter, breathing slowly (its own layer: an opacity). */}
                <svg className="s-art s-lit" viewBox={box} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
                  <Wall id={id + "lit"} lit />
                </svg>
                {GLINTS.map((g) => (
                  <Glint key={g.i} id={id} g={g} />
                ))}
              </>
            ) : null}
          </div>
        );
      })}
      {/* The heart of the study: under the piece (read by the checks, never seen). */}
      <i className="s-focus" data-scene-focus="" />
    </>
  );
}
