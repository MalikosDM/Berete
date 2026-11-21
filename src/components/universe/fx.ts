/*
 * The effects of a universe (src/data/themes.ts), drawn in one canvas behind the content: dust, embers, diamond glints,
 * lightning, speed lines, butterflies of light (in the colour of the universe), confetti, golden confetti, petals, stars,
 * the light rising to the sphere of the Genkidama; and since 21/11/2026 the camera flashes of a crowd, a serpent of golden
 * light, fireflies, the sparks of a forge, lines of light running from facet to facet, prismatic glints, sparkling dew, the
 * dust of a light beam, drops shining under a street lamp (their places: the regions of the backdrop, read on the page).
 * Loaded after the content of the page
 * (src/components/Universe.tsx); every effect answers the speed of the scroll, lightly.
 *
 * Light on purpose: one canvas, a few dozen particles (fewer than half on a phone, at the pixel density of the screen up
 * to 1.5, 1 on a phone), drawing only while the page is on screen and visible, never when the visitor asks for reduced
 * motion (the module is not even loaded).
 */

/**
 * core: the sphere of light of the backdrop (Genkidama), where its particles go (its centre and its size, read on the
 * page). fixed: the world behind a layer that covers the screen (a story): drawn whatever the scroll of the page.
 */
export type FxOptions = { effects: string[]; glow: string; tint: string; preset: string; impact: boolean; core?: HTMLElement | null; regions?: Record<string, HTMLElement>; fixed?: boolean };

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; spin: number; angle: number; hue: number; color: string; kind: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = ([r, g, b]: [number, number, number], a: number) => "rgba(" + r + "," + g + "," + b + "," + a.toFixed(3) + ")";
const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

/** A soft round sprite, drawn once, for the glows. */
function sprite(color: [number, number, number]): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, rgba(color, 1));
  grad.addColorStop(0.35, rgba(color, 0.45));
  grad.addColorStop(1, rgba(color, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

/** Golden confetti (VfB Stuttgart): metal leaves, from deep gold to pale gold. */
const GOLD = ["rgba(243,210,122,1)", "rgba(232,182,90,1)", "rgba(255,236,186,1)", "rgba(190,140,52,1)"];

/** The hue (0 to 360) of a colour. */
function hueOf([r, g, b]: [number, number, number]): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return h * 60;
}

/** The red petals of the tulips (Tulips on Tour) and of the roses (the rose garden). */
const TULIPS: [number, number, number][] = [
  [226, 72, 92],
  [242, 140, 160],
  [204, 40, 72],
  [236, 104, 132],
];
const ROSES: [number, number, number][] = [
  [176, 22, 46],
  [208, 40, 68],
  [148, 16, 38],
  [228, 92, 116],
];
/** The white confetti of the black and white stadium (Kenan Yildiz). */
const WHITE = ["rgba(255,255,255,1)", "rgba(236,236,238,1)", "rgba(212,212,216,1)", "rgba(250,250,250,0.9)"];

export function startFx(canvas: HTMLCanvasElement, opts: FxOptions): { stop: () => void; impact: (x: number, y: number) => void } {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { stop: () => undefined, impact: () => undefined };
  const phone = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  const density = phone ? 0.4 : 1;
  const dprMax = phone ? 1 : 1.5;
  const has = (e: string) => opts.effects.includes(e);
  const glow = hexToRgb(opts.glow);
  const white: [number, number, number] = [255, 255, 255];
  const light = mix(glow, white, 0.55);
  const glowSprite = sprite(glow);
  // The butterflies of light take the colour of the universe, with a few in warm gold (the lanterns, the ribbons).
  const glowHue = hueOf(glow);
  const lightSprite = sprite(light);
  const rtl = document.documentElement.dir === "rtl";

  let w = 0;
  let h = 0;
  let dpr = 1;
  // The heart of the scene: where the piece is (the right of a computer screen, the top of a phone).
  let cx = 0;
  let cy = 0;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, dprMax);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wide = w >= 1024;
    cx = wide ? (rtl ? 0.28 : 0.72) * w : 0.5 * w;
    cy = wide ? 0.48 * h : 0.3 * h;
  };
  resize();

  // The sphere of the Genkidama, in the coordinates of the canvas (read again now and then: it moves with the scroll).
  const sphere = { x: 0.5 * w, y: 0.15 * h, r: Math.min(w, h) * 0.12 };
  const readSphere = () => {
    if (!opts.core) return;
    const c = canvas.getBoundingClientRect();
    const r = opts.core.getBoundingClientRect();
    if (r.width <= 0) return;
    sphere.x = r.left + r.width / 2 - c.left;
    sphere.y = r.top + r.height / 2 - c.top;
    sphere.r = r.width / 2;
  };
  readSphere();

  // The places of some effects (the crowd of the flashes, the fire of the sparks, the beam of the dust...), in the
  // coordinates of the canvas (read again now and then: they move with the scroll); else a share of the screen.
  type Box = { x0: number; y0: number; x1: number; y1: number };
  const boxes: Record<string, Box> = {};
  const readRegions = () => {
    const c = canvas.getBoundingClientRect();
    for (const [name, el] of Object.entries(opts.regions ?? {})) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) boxes[name] = { x0: r.left - c.left, y0: r.top - c.top, x1: r.right - c.left, y1: r.bottom - c.top };
      else delete boxes[name];
    }
  };
  readRegions();
  const box = (name: string, f: [number, number, number, number]): Box => boxes[name] ?? { x0: f[0] * w, y0: f[1] * h, x1: f[2] * w, y1: f[3] * h };
  const goldSprite = sprite([255, 212, 120]);
  const whiteSprite = sprite([255, 255, 255]);

  const area = () => (w * h) / (1440 * 900);
  const count = (n: number) => Math.max(3, Math.round(n * density * clamp(area(), 0.35, 1.6)));

  const dust: P[] = [];
  const embers: P[] = [];
  const glints: P[] = [];
  const flyers: P[] = []; // butterflies
  const falling: P[] = []; // confetti and petals
  const stars: P[] = [];
  const rings: P[] = [];
  const sparks: P[] = [];
  const genki: P[] = [];
  const flashes: P[] = [];
  const trail: { x: number; y: number }[] = []; // the serpent of light
  let serpentT = rand(0, Math.PI * 2);
  const flies: P[] = [];
  const forge: P[] = [];
  const lightLines: P[] = [];
  const prisms: P[] = [];
  const dews: P[] = [];
  const motes: P[] = []; // the dust of the beam
  const drops: P[] = [];
  let bolt: { pts: [number, number][][]; life: number } | null = null;
  let nextBolt = performance.now() + rand(1500, 3500);
  let shooting: P | null = null;
  let nextShooting = performance.now() + rand(3000, 7000);
  let lines: { a: number; r: number; l: number; wd: number }[] = [];

  const newDust = (anywhere: boolean): P => ({ x: rand(0, w), y: anywhere ? rand(0, h) : h + 10, vx: rand(-0.08, 0.08), vy: rand(-0.25, -0.06), life: 0, max: rand(500, 1100), size: rand(0.6, 1.8), spin: 0, angle: 0, hue: 0, color: "", kind: 0 });
  const newEmber = (anywhere: boolean): P => {
    const near = Math.random() < 0.55;
    return {
      x: near ? cx + rand(-0.22, 0.22) * w : rand(0, w),
      y: anywhere ? rand(0.1, 1) * h : h + rand(0, 40),
      vx: rand(-0.3, 0.3),
      vy: rand(-1.1, -0.35),
      life: 0,
      max: rand(160, 420),
      size: rand(0.8, 2.4),
      spin: rand(0, Math.PI * 2),
      angle: rand(0.01, 0.04),
      hue: 0,
      color: "",
      kind: 0,
    };
  };
  const newGlint = (): P => {
    const near = Math.random() < 0.7;
    return { x: near ? cx + rand(-0.16, 0.16) * Math.max(w, 600) : rand(0, w), y: near ? cy + rand(-0.26, 0.26) * h : rand(0, h), vx: 0, vy: 0, life: 0, max: rand(50, 90), size: rand(5, 13), spin: rand(0, Math.PI), angle: 0, hue: 0, color: "", kind: 0 };
  };
  const newFlyer = (burst: boolean): P => {
    const dir = Math.random() < 0.5 ? -1 : 1;
    return {
      x: burst ? cx + rand(-60, 60) : rand(0.1, 0.9) * w,
      y: burst ? cy + rand(-40, 60) : h + 20,
      vx: dir * rand(0.3, 1.2),
      vy: rand(-1.6, -0.6),
      life: 0,
      max: rand(260, 520),
      size: rand(7, 15) * (phone ? 0.8 : 1),
      spin: rand(0, Math.PI * 2),
      angle: 0,
      hue: Math.random() < 0.72 ? glowHue + rand(-18, 18) : rand(36, 48),
      color: "",
      kind: 0,
    };
  };
  const confettiColors = opts.preset === "bianconero" ? WHITE : [rgba(glow, 1), rgba(mix(glow, white, 0.4), 1), "rgba(12,12,14,1)", rgba(mix(glow, [0, 0, 0], 0.35), 1)];
  const petalColors =
    opts.preset === "tulipes" ? TULIPS.map((c) => rgba(c, 0.9)) : opts.preset === "roses" ? ROSES.map((c) => rgba(c, 0.9)) : [rgba(glow, 0.85), rgba(mix(glow, hexToRgb(opts.tint), 0.35), 0.85), rgba(mix(glow, white, 0.3), 0.8)];
  /** kind 0: confetti, 1: a petal, 2: golden confetti (falling slower, turning in the light). */
  const newFalling = (anywhere: boolean, kind: number): P => {
    const petal = kind === 1;
    const colors = petal ? petalColors : kind === 2 ? GOLD : confettiColors;
    return {
      x: rand(-0.05, 1.05) * w,
      y: anywhere ? rand(-0.1, 1) * h : rand(-60, -10),
      vx: rand(-0.4, 0.4),
      vy: petal ? rand(0.35, 0.9) : kind === 2 ? rand(0.35, 0.85) : rand(0.5, 1.3),
      life: 0,
      max: 99999,
      size: petal ? rand(6, 12) : rand(4, 8),
      spin: rand(0, Math.PI * 2),
      angle: rand(-0.04, 0.04),
      hue: rand(0, Math.PI * 2),
      color: colors[Math.floor(Math.random() * colors.length)]!,
      kind,
    };
  };

  /** A grain of light of the Genkidama: born low on the screen, it rises to the sphere and melts into it. */
  const newGenki = (anywhere: boolean): P => {
    const spread = Math.max(w * 0.5, sphere.r * 3);
    const below = sphere.y + sphere.r * 1.3;
    return {
      x: sphere.x + rand(-1, 1) * spread * (0.35 + Math.random() * 0.65),
      y: anywhere ? rand(below, h) : h + rand(0, 40),
      vx: 0,
      vy: 0,
      life: 0,
      max: rand(700, 1500),
      size: rand(0.6, 1.9),
      spin: rand(0, Math.PI * 2),
      angle: rand(0.25, 0.6),
      hue: 0,
      color: "",
      kind: 0,
    };
  };

  const fill = () => {
    if (has("genkidama")) while (genki.length < count(84)) genki.push(newGenki(true));
    if (has("dust")) while (dust.length < count(46)) dust.push(newDust(true));
    if (has("embers")) while (embers.length < count(64)) embers.push(newEmber(true));
    if (has("confetti")) while (falling.filter((p) => p.kind === 0).length < count(26)) falling.push(newFalling(true, 0));
    if (has("petals")) while (falling.filter((p) => p.kind === 1).length < count(22)) falling.push(newFalling(true, 1));
    if (has("gold-confetti")) while (falling.filter((p) => p.kind === 2).length < count(24)) falling.push(newFalling(true, 2));
    if (has("stars")) while (stars.length < count(110)) stars.push({ ...newDust(true), size: rand(0.5, 1.6), spin: rand(0, Math.PI * 2), angle: rand(0.01, 0.04) });
  };
  const newFly = (): P => ({ x: rand(0.35, 1) * w, y: rand(0.15, 0.9) * h, vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), life: 0, max: 0, size: rand(1.6, 3.2) * (phone ? 0.85 : 1), spin: rand(0, Math.PI * 2), angle: rand(0.012, 0.03), hue: 0, color: "", kind: 0 });
  const newMote = (anywhere: boolean): P => {
    const b = box("beam", [0.55, 0.1, 0.85, 0.7]);
    return { x: rand(b.x0, b.x1), y: anywhere ? rand(b.y0, b.y1) : b.y0 + rand(0, 20), vx: rand(-0.12, 0.12), vy: rand(0.03, 0.2), life: 0, max: rand(300, 700), size: rand(0.6, 1.7), spin: rand(0, Math.PI * 2), angle: rand(0.02, 0.05), hue: 0, color: "", kind: 0 };
  };
  const newDrop = (anywhere: boolean): P => {
    const b = box("lamp", [0.3, 0.05, 0.5, 0.35]);
    return { x: rand(b.x0, b.x1), y: anywhere ? rand(b.y0, b.y1) : b.y0 - rand(0, 40), vx: rand(-0.5, -0.1), vy: rand(5, 8), life: 0, max: 0, size: rand(5, 11), spin: 0, angle: 0, hue: 0, color: "", kind: 0 };
  };
  fill();
  if (has("fireflies")) for (let i = 0; i < count(14); i++) flies.push(newFly());
  if (has("beam-dust")) for (let i = 0; i < count(40); i++) motes.push(newMote(true));
  if (has("drops")) for (let i = 0; i < count(26); i++) drops.push(newDrop(true));
  if (has("butterflies")) for (let i = 0; i < count(6); i++) flyers.push({ ...newFlyer(false), y: rand(0.3, 1) * h });

  /* ---------- Lightning: a branching bolt from the heart of the scene ---------- */

  function makeBolt() {
    const pts: [number, number][][] = [];
    const branch = (x: number, y: number, a: number, len: number, depth: number) => {
      const seg: [number, number][] = [[x, y]];
      const n = 10;
      for (let i = 1; i <= n; i++) {
        a += rand(-0.45, 0.45);
        x += Math.cos(a) * (len / n);
        y += Math.sin(a) * (len / n);
        seg.push([x, y]);
        if (depth < 2 && Math.random() < 0.18) branch(x, y, a + rand(-0.9, 0.9), len * rand(0.25, 0.45), depth + 1);
      }
      pts.push(seg);
    };
    const a = rand(0, Math.PI * 2);
    const r = Math.min(w, h) * rand(0.08, 0.16);
    branch(cx + Math.cos(a) * r, cy + Math.sin(a) * r, a, Math.max(w, h) * rand(0.3, 0.5), 0);
    bolt = { pts, life: 0 };
  }

  /* ---------- Speed lines: around the piece, as strong as the scroll is fast ---------- */

  const makeLines = () => {
    lines = Array.from({ length: phone ? 26 : 54 }, () => ({ a: rand(0, Math.PI * 2), r: rand(0.16, 0.3), l: rand(0.25, 0.9), wd: rand(0.6, 2.2) }));
  };
  makeLines();
  const restLines = opts.preset === "tunnel" ? 0.09 : 0;

  /* ---------- The loop ---------- */

  let raf = 0;
  let running = false;
  let lastY = window.scrollY;
  let speed = 0; // px per frame, smoothed
  let frame = 0;
  let visible = true;
  let onScreen = true;

  const draw = (now: number) => {
    raf = 0;
    if (!running) return;
    // Deep in the page the world rests (its backdrop is dim behind the texts): nothing is drawn, a look now and then.
    if (!opts.fixed && window.scrollY > window.innerHeight * 1.1) {
      ctx.clearRect(0, 0, w, h);
      lastY = window.scrollY;
      speed = 0;
      raf = window.setTimeout(() => {
        raf = window.requestAnimationFrame(draw);
      }, 300) as unknown as number;
      return;
    }
    frame++;
    const dy = window.scrollY - lastY;
    lastY = window.scrollY;
    speed += (Math.abs(dy) - speed) * 0.18;
    const boost = clamp(speed / 26, 0, 1);
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";

    if (has("stars")) {
      for (const s of stars) {
        s.spin += s.angle;
        const a = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(s.spin));
        ctx.fillStyle = rgba(light, a * 0.8);
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }
      if (!shooting && now > nextShooting) {
        shooting = { x: rand(0.1, 0.7) * w, y: rand(0.02, 0.3) * h, vx: rand(9, 14), vy: rand(2.5, 4.5), life: 0, max: 46, size: 1, spin: 0, angle: 0, hue: 0, color: "", kind: 0 };
        nextShooting = now + rand(5000, 10000);
      }
      if (shooting) {
        shooting.life++;
        shooting.x += shooting.vx;
        shooting.y += shooting.vy;
        const t = shooting.life / shooting.max;
        const grad = ctx.createLinearGradient(shooting.x, shooting.y, shooting.x - shooting.vx * 9, shooting.y - shooting.vy * 9);
        grad.addColorStop(0, rgba(white, 0.9 * (1 - t)));
        grad.addColorStop(1, rgba(white, 0));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(shooting.x, shooting.y);
        ctx.lineTo(shooting.x - shooting.vx * 9, shooting.y - shooting.vy * 9);
        ctx.stroke();
        if (shooting.life >= shooting.max) shooting = null;
      }
    }

    if (has("speedlines")) {
      const strength = Math.max(restLines, boost * 0.55);
      if (strength > 0.01) {
        if (frame % 3 === 0) for (const l of lines) l.a += rand(-0.01, 0.01);
        if (frame % 9 === 0 && boost > 0.2) makeLines();
        const R = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
        ctx.lineCap = "round";
        for (const l of lines) {
          const r0 = R * l.r;
          const r1 = r0 + R * l.l;
          const x0 = cx + Math.cos(l.a) * r0;
          const y0 = cy + Math.sin(l.a) * r0;
          const grad = ctx.createLinearGradient(x0, y0, cx + Math.cos(l.a) * r1, cy + Math.sin(l.a) * r1);
          grad.addColorStop(0, rgba(light, 0));
          grad.addColorStop(0.4, rgba(light, strength * 0.55));
          grad.addColorStop(1, rgba(light, 0));
          ctx.strokeStyle = grad;
          ctx.lineWidth = l.wd;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(cx + Math.cos(l.a) * r1, cy + Math.sin(l.a) * r1);
          ctx.stroke();
        }
      }
    }

    if (has("genkidama")) {
      if (frame % 12 === 1) readSphere();
      const far = Math.hypot(w, h);
      for (let i = genki.length - 1; i >= 0; i--) {
        const p = genki[i]!;
        p.life++;
        p.spin += 0.02;
        const dx = sphere.x - p.x;
        const dy = sphere.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        // Slow far away, a little faster near the sphere; a gentle sway across the way.
        const v = p.angle * (1 + (1 - Math.min(1, d / far)) * 1.4) * (1 + boost);
        p.x += (dx / d) * v + (-dy / d) * Math.sin(p.spin + p.life * 0.01) * 0.18;
        p.y += (dy / d) * v + (dx / d) * Math.sin(p.spin + p.life * 0.01) * 0.18;
        const inside = d < sphere.r * 1.15 ? Math.max(0, (d - sphere.r * 0.7) / (sphere.r * 0.45)) : 1;
        const a = Math.min(1, p.life / 60, (p.max - p.life) / 60) * inside * 0.85;
        ctx.globalAlpha = Math.max(0, a);
        ctx.drawImage(lightSprite, p.x - p.size * 3.2, p.y - p.size * 3.2, p.size * 6.4, p.size * 6.4);
        ctx.fillStyle = rgba(white, Math.max(0, a));
        ctx.fillRect(p.x - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.7, p.size * 0.7);
        if (d < sphere.r * 0.7 || p.life > p.max) genki[i] = newGenki(false);
      }
      ctx.globalAlpha = 1;
    }


    if (frame % 30 === 2) readRegions();

    if (has("flashes")) {
      // The camera flashes of the crowd: a crackle of white stars, one here, three there.
      const b = box("crowd", [0.4, 0.45, 1, 0.75]);
      if (Math.random() < (phone ? 0.05 : 0.09) + boost * 0.1) {
        const n = Math.random() < 0.3 ? 3 : 1;
        for (let k = 0; k < n; k++) flashes.push({ x: rand(b.x0, b.x1), y: rand(b.y0, b.y1), vx: 0, vy: 0, life: 0, max: rand(5, 10), size: rand(4, 9) * (phone ? 0.8 : 1), spin: 0, angle: 0, hue: 0, color: "", kind: 0 });
      }
      for (let i = flashes.length - 1; i >= 0; i--) {
        const p = flashes[i]!;
        p.life++;
        const t = p.life / p.max;
        const a = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;
        const sz = p.size * (0.7 + 0.6 * a);
        ctx.globalAlpha = Math.max(0, a);
        ctx.drawImage(whiteSprite, p.x - sz * 2.2, p.y - sz * 2.2, sz * 4.4, sz * 4.4);
        ctx.fillStyle = "rgba(255,255,255," + Math.max(0, 0.9 * a).toFixed(3) + ")";
        ctx.fillRect(p.x - sz * 2.4, p.y - 0.5, sz * 4.8, 1);
        ctx.fillRect(p.x - 0.5, p.y - sz * 2.4, 1, sz * 4.8);
        if (p.life >= p.max) flashes.splice(i, 1);
      }
      ctx.globalAlpha = 1;
    }

    if (has("serpent")) {
      // A serpent of golden light glides slowly in the depth: its head follows a long loop and waves, its body is its trail.
      const b = box("path", [0.45, 0.12, 0.98, 0.86]);
      serpentT += 0.0042 * (1 + boost * 2);
      const hx = (b.x0 + b.x1) / 2 + ((b.x1 - b.x0) / 2) * 0.9 * Math.sin(serpentT) + 10 * Math.sin(serpentT * 11);
      const hy = (b.y0 + b.y1) / 2 + ((b.y1 - b.y0) / 2) * 0.8 * Math.sin(serpentT * 2 + 0.6) + 10 * Math.cos(serpentT * 11);
      trail.push({ x: hx, y: hy });
      while (trail.length > (phone ? 70 : 120)) trail.shift();
      ctx.lineCap = "round";
      for (let i = 1; i < trail.length; i++) {
        const t = i / trail.length;
        ctx.strokeStyle = "rgba(240,200,120," + (0.34 * t * t).toFixed(3) + ")";
        ctx.lineWidth = (phone ? 1.4 : 2) + t * (phone ? 4 : 7);
        ctx.beginPath();
        ctx.moveTo(trail[i - 1]!.x, trail[i - 1]!.y);
        ctx.lineTo(trail[i]!.x, trail[i]!.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.55;
      ctx.drawImage(goldSprite, hx - 20, hy - 20, 40, 40);
      ctx.globalAlpha = 1;
    }

    if (has("fireflies")) {
      // Golden fireflies wander and blink.
      for (const p of flies) {
        p.vx = clamp(p.vx + rand(-0.03, 0.03) + (p.x < 0.32 * w ? 0.02 : p.x > w ? -0.03 : 0), -0.45, 0.45);
        p.vy = clamp(p.vy + rand(-0.03, 0.03) + (p.y < 0.1 * h ? 0.02 : p.y > 0.95 * h ? -0.03 : 0), -0.4, 0.4);
        p.x += p.vx;
        p.y += p.vy - boost * 0.6;
        p.spin += p.angle;
        const a = Math.max(0, Math.sin(p.spin)) ** 2;
        if (a < 0.02) continue;
        const sz = p.size * 4;
        ctx.globalAlpha = a * 0.9;
        ctx.drawImage(goldSprite, p.x - sz, p.y - sz, sz * 2, sz * 2);
      }
      ctx.globalAlpha = 1;
    }

    if (has("sparks")) {
      // The sparks of the forge: a trickle, and now and then a burst from the molten gold.
      const b = box("fire", [0.6, 0.5, 0.7, 0.57]);
      const burst = Math.random() < (phone ? 0.012 : 0.02) + boost * 0.05;
      const n = burst ? Math.round(rand(10, 22) * (phone ? 0.6 : 1)) : Math.random() < 0.35 ? 1 : 0;
      for (let k = 0; k < n && forge.length < 160; k++) forge.push({ x: rand(b.x0, b.x1), y: rand(b.y0, (b.y0 + b.y1) / 2), vx: rand(-2.4, 2.4), vy: rand(-6.5, -2.2), life: 0, max: rand(35, 75), size: rand(0.8, 1.8), spin: 0, angle: 0, hue: 0, color: "", kind: 0 });
      ctx.lineCap = "round";
      for (let i = forge.length - 1; i >= 0; i--) {
        const p = forge[i]!;
        p.life++;
        const px = p.x;
        const py = p.y;
        p.vy += 0.11;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        const t = p.life / p.max;
        ctx.strokeStyle = "rgba(255," + Math.round(205 - 90 * t) + "," + Math.round(115 - 80 * t) + "," + Math.max(0, 1 - t).toFixed(3) + ")";
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        if (p.life >= p.max || p.y > h + 10) forge.splice(i, 1);
      }
    }

    if (has("light-lines")) {
      // Lines of light run from facet to facet: straight, turning a corner now and then.
      if (lightLines.length < (phone ? 2 : 4) && Math.random() < 0.025 + boost * 0.05) {
        const dirs = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4, Math.PI, -Math.PI / 2, (3 * Math.PI) / 4];
        const a = dirs[Math.floor(Math.random() * dirs.length)]!;
        const v = rand(7, 12);
        lightLines.push({ x: rand(0.3, 1) * w, y: rand(0, 1) * h, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: Math.round(rand(40, 80)), size: rand(60, 180), spin: 0, angle: 0, hue: 0, color: "", kind: 0 });
      }
      for (let i = lightLines.length - 1; i >= 0; i--) {
        const p = lightLines[i]!;
        p.life++;
        const v = Math.hypot(p.vx, p.vy);
        if (p.life === Math.round(p.max / 2) && Math.random() < 0.6) {
          const a = Math.atan2(p.vy, p.vx) + (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2);
          p.vx = Math.cos(a) * v;
          p.vy = Math.sin(a) * v;
        }
        p.x += p.vx;
        p.y += p.vy;
        const a = Math.sin(Math.PI * Math.min(1, p.life / p.max)) * 0.8;
        const tx = p.x - (p.vx / v) * p.size;
        const ty = p.y - (p.vy / v) * p.size;
        const g = ctx.createLinearGradient(tx, ty, p.x, p.y);
        g.addColorStop(0, rgba(light, 0));
        g.addColorStop(1, rgba(white, a));
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.globalAlpha = a;
        ctx.drawImage(lightSprite, p.x - 7, p.y - 7, 14, 14);
        ctx.globalAlpha = 1;
        if (p.life >= p.max) lightLines.splice(i, 1);
      }
    }

    if (has("prism")) {
      // Prismatic glints: the stars of a diamond, in the colours of a rainbow.
      if (prisms.length < (phone ? 3 : 6) && Math.random() < 0.05 + boost * 0.1) prisms.push({ ...newGlint(), hue: rand(0, 360) });
      for (let i = prisms.length - 1; i >= 0; i--) {
        const p = prisms[i]!;
        p.life++;
        const t = p.life / p.max;
        const sz = p.size * Math.sin(Math.PI * t);
        const a = Math.sin(Math.PI * t) * 0.85;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin + t * 0.6);
        ctx.globalAlpha = a;
        ctx.fillStyle = "hsla(" + p.hue.toFixed(0) + ",95%,78%,0.9)";
        ctx.beginPath();
        ctx.moveTo(0, -sz * 2);
        ctx.quadraticCurveTo(0, 0, sz * 2, 0);
        ctx.quadraticCurveTo(0, 0, 0, sz * 2);
        ctx.quadraticCurveTo(0, 0, -sz * 2, 0);
        ctx.quadraticCurveTo(0, 0, 0, -sz * 2);
        ctx.fill();
        ctx.drawImage(lightSprite, -sz * 0.8, -sz * 0.8, sz * 1.6, sz * 1.6);
        ctx.restore();
        if (p.life >= p.max) prisms.splice(i, 1);
      }
      ctx.globalAlpha = 1;
    }

    if (has("dew")) {
      // Dew on the leaves: tiny points that catch the light and go out.
      const b = box("dew", [0.45, 0.55, 1, 0.95]);
      if (dews.length < (phone ? 6 : 12) && Math.random() < 0.12) dews.push({ x: rand(b.x0, b.x1), y: rand(b.y0, b.y1), vx: 0, vy: 0, life: 0, max: rand(40, 80), size: rand(1.5, 3.5), spin: rand(0, Math.PI), angle: 0, hue: 0, color: "", kind: 0 });
      for (let i = dews.length - 1; i >= 0; i--) {
        const p = dews[i]!;
        p.life++;
        const a = Math.sin(Math.PI * (p.life / p.max));
        const sz = p.size * (0.6 + 0.4 * a);
        ctx.globalAlpha = a * 0.9;
        ctx.drawImage(whiteSprite, p.x - sz * 2, p.y - sz * 2, sz * 4, sz * 4);
        ctx.fillStyle = "rgba(255,255,255," + (0.8 * a).toFixed(3) + ")";
        ctx.fillRect(p.x - sz * 1.8, p.y - 0.4, sz * 3.6, 0.8);
        ctx.fillRect(p.x - 0.4, p.y - sz * 1.8, 0.8, sz * 3.6);
        if (p.life >= p.max) dews.splice(i, 1);
      }
      ctx.globalAlpha = 1;
    }

    if (has("beam-dust")) {
      // Golden dust floating in the beam of light, slowly, turning to the light and away.
      const b = box("beam", [0.55, 0.1, 0.85, 0.7]);
      for (let i = 0; i < motes.length; i++) {
        const p = motes[i]!;
        p.life++;
        p.spin += p.angle;
        p.x += p.vx + Math.sin(p.life * 0.01 + p.spin) * 0.12;
        p.y += p.vy * (1 + boost * 2);
        const a = Math.min(1, p.life / 60, (p.max - p.life) / 60) * (0.45 + 0.4 * Math.sin(p.spin * 3));
        if (a > 0.02) {
          const sz = p.size * 4;
          ctx.globalAlpha = a;
          ctx.drawImage(goldSprite, p.x - sz, p.y - sz, sz * 2, sz * 2);
        }
        if (p.life > p.max || p.y > b.y1 + 10 || p.x < b.x0 - 20 || p.x > b.x1 + 20) motes[i] = newMote(false);
      }
      ctx.globalAlpha = 1;
    }

    if (has("drops")) {
      // The rain shines in the light of the street lamp: short bright streaks, brighter near it.
      const b = box("lamp", [0.3, 0.05, 0.5, 0.35]);
      const lx = (b.x0 + b.x1) / 2;
      const ly = (b.y0 + b.y1) / 2;
      const rr = Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2;
      ctx.lineCap = "round";
      ctx.lineWidth = 1;
      for (let i = 0; i < drops.length; i++) {
        const p = drops[i]!;
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > b.y1 + 20) {
          drops[i] = newDrop(false);
          continue;
        }
        const a = clamp(1 - Math.hypot(p.x - lx, p.y - ly) / rr, 0, 1) * 0.85;
        if (a < 0.03) continue;
        ctx.strokeStyle = rgba(light, a);
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 1.5, p.y - p.size);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    }

    if (has("dust")) {
      for (let i = dust.length - 1; i >= 0; i--) {
        const p = dust[i]!;
        p.life++;
        p.x += p.vx;
        p.y += p.vy * (1 + boost * 3);
        const a = Math.min(1, p.life / 80, (p.max - p.life) / 80) * 0.5;
        ctx.globalAlpha = Math.max(0, a);
        ctx.drawImage(lightSprite, p.x - p.size * 3, p.y - p.size * 3, p.size * 6, p.size * 6);
        if (p.life > p.max || p.y < -20) dust[i] = newDust(false);
      }
      ctx.globalAlpha = 1;
    }

    if (has("embers")) {
      for (let i = embers.length - 1; i >= 0; i--) {
        const p = embers[i]!;
        p.life++;
        p.spin += p.angle;
        p.x += p.vx + Math.sin(p.spin) * 0.35;
        p.y += p.vy * (1 + boost * 2.5);
        const flicker = 0.65 + 0.35 * Math.sin(p.life * 0.3 + p.spin * 7);
        const a = Math.min(1, p.life / 30, (p.max - p.life) / 60) * flicker;
        ctx.globalAlpha = Math.max(0, a);
        const s = p.size * (1 + boost * 0.6);
        ctx.drawImage(glowSprite, p.x - s * 4, p.y - s * 4, s * 8, s * 8);
        ctx.fillStyle = rgba(light, Math.max(0, a));
        ctx.fillRect(p.x - s * 0.4, p.y - s * 0.4, s * 0.8, s * 0.8);
        if (p.life > p.max || p.y < -30) embers[i] = newEmber(false);
      }
      ctx.globalAlpha = 1;
    }

    if (has("lightning")) {
      if (!bolt && now > nextBolt) {
        makeBolt();
        nextBolt = now + (phone ? rand(5000, 9000) : rand(2600, 6000));
      }
      if (bolt) {
        bolt.life++;
        const a = bolt.life < 3 ? 1 : bolt.life < 6 ? 0.35 : bolt.life < 9 ? 0.85 : Math.max(0, 1 - (bolt.life - 9) / 10);
        for (const pass of [
          { width: 7, alpha: 0.12 * a, color: glow },
          { width: 2.6, alpha: 0.35 * a, color: light },
          { width: 1, alpha: 0.9 * a, color: white },
        ]) {
          ctx.strokeStyle = rgba(pass.color, pass.alpha);
          ctx.lineWidth = pass.width;
          ctx.lineJoin = "round";
          for (const seg of bolt.pts) {
            ctx.beginPath();
            ctx.moveTo(seg[0]![0], seg[0]![1]);
            for (let k = 1; k < seg.length; k++) ctx.lineTo(seg[k]![0], seg[k]![1]);
            ctx.stroke();
          }
        }
        if (bolt.life > 20) bolt = null;
      }
    }

    if (has("butterflies")) {
      // The scroll lets them fly away: a few at rest, more when the visitor moves.
      if (flyers.length < count(18) && (Math.random() < 0.004 + boost * 0.12)) flyers.push(newFlyer(boost > 0.15 && Math.random() < 0.5));
      for (let i = flyers.length - 1; i >= 0; i--) {
        const p = flyers[i]!;
        p.life++;
        p.spin += 0.32 + boost * 0.2;
        p.x += p.vx + Math.sin(p.life * 0.04) * 0.6;
        p.y += p.vy * (1 + boost * 1.4);
        const a = Math.min(1, p.life / 40, (p.max - p.life) / 70) * 0.85;
        if (a > 0) {
          const flap = 0.25 + 0.75 * Math.abs(Math.sin(p.spin));
          const hue = (p.hue + Math.sin(p.life * 0.02) * 10 + 360) % 360;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
          ctx.globalAlpha = a;
          ctx.drawImage(lightSprite, -p.size * 1.6, -p.size * 1.6, p.size * 3.2, p.size * 3.2);
          for (const side of [-1, 1]) {
            ctx.fillStyle = "hsla(" + hue + ",80%,82%," + (0.55 * a).toFixed(3) + ")";
            ctx.beginPath();
            ctx.ellipse(side * p.size * 0.55 * flap, -p.size * 0.2, p.size * 0.6 * flap, p.size * 0.75, side * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "hsla(" + ((hue + 40) % 360) + ",80%,86%," + (0.45 * a).toFixed(3) + ")";
            ctx.beginPath();
            ctx.ellipse(side * p.size * 0.42 * flap, p.size * 0.45, p.size * 0.42 * flap, p.size * 0.5, -side * 0.4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
        if (p.life > p.max || p.y < -40 || p.x < -40 || p.x > w + 40) flyers.splice(i, 1);
      }
      ctx.globalAlpha = 1;
    }

    if (has("glints")) {
      if (glints.length < (phone ? 3 : 6) && Math.random() < 0.05 + boost * 0.1) glints.push(newGlint());
      for (let i = glints.length - 1; i >= 0; i--) {
        const p = glints[i]!;
        p.life++;
        const t = p.life / p.max;
        const s = p.size * Math.sin(Math.PI * t);
        const a = Math.sin(Math.PI * t) * 0.9;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin + t * 0.6);
        ctx.globalAlpha = a;
        ctx.drawImage(lightSprite, -s * 1.2, -s * 1.2, s * 2.4, s * 2.4);
        ctx.fillStyle = rgba(white, 0.95);
        ctx.beginPath();
        ctx.moveTo(0, -s * 2);
        ctx.quadraticCurveTo(0, 0, s * 2, 0);
        ctx.quadraticCurveTo(0, 0, 0, s * 2);
        ctx.quadraticCurveTo(0, 0, -s * 2, 0);
        ctx.quadraticCurveTo(0, 0, 0, -s * 2);
        ctx.fill();
        ctx.restore();
        if (p.life >= p.max) glints.splice(i, 1);
      }
      ctx.globalAlpha = 1;
    }

    // Confetti and petals fall in their own colours, not in light.
    ctx.globalCompositeOperation = "source-over";
    if (has("confetti") || has("petals") || has("gold-confetti")) {
      for (let i = falling.length - 1; i >= 0; i--) {
        const p = falling[i]!;
        p.hue += 0.05;
        p.spin += p.angle * (1 + boost * 3);
        p.x += p.vx + Math.sin(p.hue) * 0.5;
        p.y += p.vy * (1 + boost * 2.2);
        const turn = Math.cos(p.spin * 2.2);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = p.color;
        if (p.kind === 1) {
          ctx.scale(1, Math.abs(turn) * 0.7 + 0.3);
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.bezierCurveTo(p.size * 0.9, -p.size * 0.5, p.size * 0.7, p.size * 0.7, 0, p.size);
          ctx.bezierCurveTo(-p.size * 0.7, p.size * 0.7, -p.size * 0.9, -p.size * 0.5, 0, -p.size);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, (-p.size / 4) * Math.abs(turn), p.size, (p.size / 2) * Math.abs(turn) + 0.6);
          // A leaf of gold catches the light as it turns flat to the screen.
          if (p.kind === 2 && Math.abs(turn) > 0.86) {
            ctx.globalAlpha = 0.55 * (Math.abs(turn) - 0.86) / 0.14;
            ctx.fillStyle = "rgba(255,248,226,1)";
            ctx.fillRect(-p.size / 2, (-p.size / 4) * Math.abs(turn), p.size, (p.size / 2) * Math.abs(turn) + 0.6);
          }
        }
        ctx.restore();
        if (p.y > h + 30) falling[i] = newFalling(false, p.kind);
      }
      ctx.globalAlpha = 1;
    }

    // The impact of an opened photo: a ring of light and sparks.
    if (rings.length || sparks.length) {
      ctx.globalCompositeOperation = "lighter";
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i]!;
        r.life++;
        const t = r.life / r.max;
        ctx.strokeStyle = rgba(light, (1 - t) * 0.8);
        ctx.lineWidth = 3 * (1 - t) + 0.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.size + t * Math.max(w, h) * 0.45, 0, Math.PI * 2);
        ctx.stroke();
        if (r.life >= r.max) rings.splice(i, 1);
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i]!;
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
        const a = 1 - p.life / p.max;
        ctx.globalAlpha = Math.max(0, a);
        ctx.drawImage(glowSprite, p.x - 6, p.y - 6, 12, 12);
        if (p.life >= p.max) sparks.splice(i, 1);
      }
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = "source-over";
    raf = window.requestAnimationFrame(draw);
  };

  const start = () => {
    if (running || !visible || !onScreen) return;
    running = true;
    lastY = window.scrollY;
    raf = window.requestAnimationFrame(draw);
  };
  const pause = () => {
    running = false;
    if (raf) {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(raf);
    }
    raf = 0;
  };

  const onVisibility = () => {
    visible = document.visibilityState === "visible";
    if (visible) start();
    else pause();
  };
  const io = new IntersectionObserver(([entry]) => {
    onScreen = !!entry?.isIntersecting;
    if (onScreen) start();
    else pause();
  });
  io.observe(canvas);
  const ro = new ResizeObserver(() => {
    resize();
    readSphere();
    readRegions();
    makeLines();
  });
  ro.observe(canvas);
  document.addEventListener("visibilitychange", onVisibility);
  canvas.dataset.running = "";
  start();

  return {
    stop: () => {
      pause();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      delete canvas.dataset.running;
      ctx.clearRect(0, 0, w, h);
    },
    impact: (x: number, y: number) => {
      if (!opts.impact) return;
      const r = canvas.getBoundingClientRect();
      const px = x - r.left;
      const py = y - r.top;
      rings.push({ x: px, y: py, vx: 0, vy: 0, life: 0, max: 34, size: 10, spin: 0, angle: 0, hue: 0, color: "", kind: 0 });
      for (let i = 0; i < (phone ? 14 : 30); i++) {
        const a = rand(0, Math.PI * 2);
        const v = rand(3, 11);
        sparks.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: rand(26, 50), size: 1, spin: 0, angle: 0, hue: 0, color: "", kind: 0 });
      }
      start();
    },
  };
}
