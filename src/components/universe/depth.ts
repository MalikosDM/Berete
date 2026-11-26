/*
 * The depth of a universe (25/11/2026, the idea of Neil validated by Yoni): when the mouse moves, the jewel moves a little and
 * the background moves too, less and the other way, plane by plane: the players behind the ring apart from the stadium. The
 * background is drawn by a small WebGL shader that shifts each point of the image by its depth (a grey map made once on the
 * Mac by Depth Anything V2: scripts/universe-depth.py; white is near, black is far). Without WebGL the page keeps a plain CSS
 * parallax (src/components/Universe.tsx). On a phone, a slow drift by itself (no gyroscope: it would ask for a permission).
 * Nothing moves with "reduce motion", nothing is drawn while the opening is off screen or the tab hidden.
 */

const VERTEX = `
attribute vec2 a;
varying vec2 v;
void main() {
  v = a * 0.5 + 0.5;
  v.y = 1.0 - v.y;
  gl_Position = vec4(a, 0.0, 1.0);
}`;

// Each point takes the colour of the point the depth sends it to: a few steps along the shift (steep parallax), so that a near
// plane slides over a far one without tearing; the image is drawn slightly larger than its box, so its edges never show.
const FRAGMENT = `
precision mediump float;
varying vec2 v;
uniform sampler2D img;
uniform sampler2D depth;
uniform vec2 shift;
uniform float zoom;
void main() {
  vec2 uv = (v - 0.5) / zoom + 0.5;
  vec2 p = uv;
  for (int i = 0; i < 6; i++) {
    float d = texture2D(depth, p).r;
    p = uv - shift * (d - 0.35);
  }
  gl_FragColor = vec4(texture2D(img, clamp(p, 0.0, 1.0)).rgb, 1.0);
}`;

export type DepthHandle = { stop: () => void };

/** The pointer, smoothed: -1 to 1 on each axis (the middle of the window at 0). */
type Pointer = { x: number; y: number };

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image " + src));
    img.src = src;
  });
}

function shader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, source);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
}

function texture(gl: WebGLRenderingContext, img: HTMLImageElement, unit: number): void {
  const t = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
}

/** Whether this browser can draw the depth (WebGL). */
export function canDepth(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Draws the background `image` with its `depth` map in `canvas` (placed over the image, the same box), and moves it with the
 * pointer; `onMove` gives the smoothed pointer to the page (the jewel moves with it). `watch`: the element whose presence on
 * screen lets it run. Resolves to null when WebGL is missing (the page keeps its CSS parallax).
 */
export async function startDepth(canvas: HTMLCanvasElement, image: string, depth: string, { watch, onMove, onReady }: { watch: Element; onMove: (p: Pointer) => void; onReady: () => void }): Promise<DepthHandle | null> {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
  if (!gl) return null;
  const [img, map] = await Promise.all([load(image), load(depth)]).catch(() => [null, null] as const);
  if (!img || !map) return null;
  const vs = shader(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = shader(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  texture(gl, img, 0);
  texture(gl, map, 1);
  gl.uniform1i(gl.getUniformLocation(program, "img"), 0);
  gl.uniform1i(gl.getUniformLocation(program, "depth"), 1);
  const uShift = gl.getUniformLocation(program, "shift");
  gl.uniform1f(gl.getUniformLocation(program, "zoom"), 1.03);

  const hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const target: Pointer = { x: 0, y: 0 };
  const now: Pointer = { x: 0, y: 0 };
  let visible = true;
  let frame = 0;
  let first = true;
  let stopped = false;

  const size = () => {
    // Sharp enough, never heavier than needed: at most 1.5 pixels of the canvas for one point of the screen.
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };
  const draw = () => {
    size();
    // The background moves less than the jewel and the other way: at most about 1.4 % of its width for the nearest plane.
    gl.uniform2f(uShift, now.x * 0.014, now.y * 0.009);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (first) {
      first = false;
      onReady();
    }
  };
  const tick = (t: number) => {
    frame = 0;
    if (stopped || !visible || document.hidden) return;
    if (!hover) {
      // A slow drift by itself on a phone: a figure of eight in about fourteen seconds.
      target.x = Math.sin(t / 2200) * 0.55;
      target.y = Math.sin(t / 3100) * 0.35;
    }
    now.x += (target.x - now.x) * 0.08;
    now.y += (target.y - now.y) * 0.08;
    draw();
    onMove(now);
    const moving = Math.abs(target.x - now.x) > 0.0005 || Math.abs(target.y - now.y) > 0.0005;
    if (moving || !hover) frame = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!frame && !stopped) frame = requestAnimationFrame(tick);
  };
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    target.x = (e.clientX / window.innerWidth) * 2 - 1;
    target.y = (e.clientY / window.innerHeight) * 2 - 1;
    wake();
  };
  const io = new IntersectionObserver(([e]) => {
    visible = Boolean(e?.isIntersecting);
    if (visible) wake();
  });
  io.observe(watch);
  const ro = new ResizeObserver(() => {
    size();
    draw();
  });
  ro.observe(canvas);
  const onVisibility = () => (document.hidden ? undefined : wake());
  window.addEventListener("pointermove", onPointer, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  draw();
  wake();
  return {
    stop: () => {
      stopped = true;
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
