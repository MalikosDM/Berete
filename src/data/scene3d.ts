/*
 * The scene of a 3D model, as the jewellers' tools arrange it (26/11/2026): two lightings (the metal's and the
 * stones'), the diamond's own settings, the effects (reflections, bevel, glow, tone), the ground, the stand, the
 * saved camera views, the viewer of the client, the configurator and the try-on. Everything is optional in the
 * saved settings of a model: the functions at the end give the whole of it, with the defaults, so that a model
 * saved before keeps its look (`ambiance` and `diamonds` of ./models.ts are read when `scene` is missing).
 * Names follow the tools jewellers know (Environment, Gem Environment, Ray Bounces...); the admin says them in French.
 */

export type Vec3 = [number, number, number];

/* ---------- Lightings (our own HDR library: src/viewer/hdri) ---------- */

/** Lightings of the metal (and of whatever is not a stone): studios, soft boxes, horizon... */
export const METAL_ENVS = ["studio-warm", "softbox-wide", "horizon-soft", "lounge-blur", "daylight", "backlight", "studio-dark", "ring-light", "three-point", "window"] as const;
export type MetalEnvId = (typeof METAL_ENVS)[number];
/** Lightings of the stones: almost black, a few small very bright sources, so that a facet lights up only when it sends one back. */
export const GEM_ENVS = ["gem-bands", "gem-points", "gem-ring", "gem-spot", "gem-vitrine", "gem-backlight", "gem-cross", "gem-stars", "gem-studio", "gem-classic"] as const;
export type GemEnvId = (typeof GEM_ENVS)[number];

export type EnvSettings = { id: string; /** degrees around the vertical */ rotation: number; intensity: number };

/* ---------- Diamond material (the settings of a stone, per layer) ---------- */

export type DiamondParams = {
  /** Lighting of this stone; null: the scene's Gem Environment. */
  env: string | null;
  /** Tint (white: a colourless diamond). */
  color: string;
  envIntensity: number;
  /** Degrees around the vertical, then around X, Y, Z: where the fire and the sparkles land, or a burnt zone moved away. */
  envRotation: number;
  envRotationXYZ: Vec3;
  /** Fire: how far the colours split (very low: small remarkable flashes). */
  dispersion: number;
  /** Density of the colour of a tinted stone, along the path of the light inside it. */
  absorption: number;
  refractiveIndex: number;
  /** Contrast of the colours inside the stone (1: none). */
  gamma: number;
  /** Gain per channel (an alternative to the colour). */
  boost: Vec3;
  /** How much of what stands behind (prongs, metal) is seen through the stone. */
  transmission: number;
  /** Mirror reflection of the surface. */
  reflectivity: number;
  rayBounces: number;
  /** 1: the lighting follows the top of the stone wherever it is set on the jewel; 0: the world's. */
  orientedLighting: number;
  /** How the light inside is computed: auto (fast for small repeated stones, traced for the others), traced, fast. */
  mode: "auto" | "trace" | "fast";
  /** Glow on this stone's sparkles. */
  bloom: boolean;
  /** Inclusions (a cloud inside the stone), off by default. */
  inclusions: { amount: number; scale: number; roughness: number } | null;
};

/** iJewel-like defaults (index above the real 2.42 for more brilliance, as jewellers advise). */
export const DEFAULT_DIAMOND: DiamondParams = {
  env: null,
  color: "#ffffff",
  envIntensity: 1.3,
  envRotation: 0,
  envRotationXYZ: [0, 0, 0],
  dispersion: 0.008,
  absorption: 0,
  refractiveIndex: 2.6,
  gamma: 1,
  boost: [1, 1, 1],
  transmission: 0,
  reflectivity: 0.5,
  rayBounces: 5,
  orientedLighting: 1,
  mode: "auto",
  bloom: true,
  inclusions: null,
};

/** The rendering before 26/11 ("Ancien rendu"), kept to compare. */
export const CLASSIC_DIAMOND: Partial<DiamondParams> = { env: "gem-classic", refractiveIndex: 2.418, envIntensity: 1.2, dispersion: 0.012, gamma: 1.25, rayBounces: 5 };

/* ---------- Effects ---------- */

export const TONEMAPS = ["aces", "agx", "linear", "reinhard", "cineon", "uncharted2"] as const;
export type ToneMap = (typeof TONEMAPS)[number];

export type PostSettings = {
  tonemap: { mode: ToneMap; exposure: number; saturation: number; contrast: number; /** tone-map the background too */ background: boolean; /** transparent background (PNG) */ clipBackground: boolean };
  ssr: { enabled: boolean; intensity: number; boost: Vec3; radius: number; autoRadius: boolean; power: number; tolerance: number; steps: number; lowQualityFrames: number; ignoreFront: boolean; frontFactor: number };
  bloom: { enabled: boolean; threshold: number; softThreshold: number; intensity: number; radius: number; power: number; iterations: number; debug: boolean };
  /** Edges rounded on the screen (SSBevel): radius 0–8 for the scene, each material 0–16. */
  bevel: { enabled: boolean; radius: number; intensity: number };
  ao: { enabled: boolean; intensity: number; radius: number };
  dof: { enabled: boolean; aperture: number; maxBlur: number };
  vignette: { enabled: boolean; offset: number; darkness: number };
  chromatic: { enabled: boolean; offset: number };
  grain: { enabled: boolean; intensity: number };
};

export const DEFAULT_POST: PostSettings = {
  tonemap: { mode: "aces", exposure: 1, saturation: 1, contrast: 1.03, background: false, clipBackground: false },
  ssr: { enabled: true, intensity: 1, boost: [1, 1, 1], radius: 1, autoRadius: true, power: 1.1, tolerance: 0.5, steps: 16, lowQualityFrames: 0, ignoreFront: true, frontFactor: -0.2 },
  bloom: { enabled: true, threshold: 2.4, softThreshold: 0.4, intensity: 0.22, radius: 0.35, power: 1.2, iterations: 5, debug: false },
  bevel: { enabled: true, radius: 2, intensity: 1 },
  ao: { enabled: true, intensity: 2, radius: 28 },
  dof: { enabled: false, aperture: 0.4, maxBlur: 0.6 },
  vignette: { enabled: false, offset: 0.35, darkness: 0.45 },
  chromatic: { enabled: false, offset: 0.0006 },
  grain: { enabled: false, intensity: 0.04 },
};

export type RenderSettings = {
  /** Images averaged once the camera stops (progressive rendering). */
  progressive: number;
  /** Smoothing while moving (TAA). */
  taa: boolean;
  /** Quality: auto (lighter on a phone), high, ultra (more bounces, more images averaged). */
  quality: "auto" | "high" | "ultra";
};

export const DEFAULT_RENDER: RenderSettings = { progressive: 48, taa: true, quality: "auto" };

/* ---------- Ground, stand, pose, lights, background ---------- */

export const GROUNDS = ["none", "soft", "contact", "reflective"] as const;
export type GroundPreset = (typeof GROUNDS)[number];

export type GroundSettings = {
  preset: GroundPreset;
  /** Times the size of the jewel. */
  size: number;
  /** The ground melts into the background. */
  renderToDepth: boolean;
  /** The camera never goes under the ground. */
  limitCamera: boolean;
  tonemap: boolean;
  /** More images: a softer shadow. */
  shadowFrames: number;
  /** Height under the jewel, in mm. */
  height: number;
  /** The random light that draws the shadow. */
  light: { color: string; intensity: number; direction: Vec3; radius: number; bias: number; focus: number; spread: number };
  material: { color: string; roughness: number; metalness: number };
  opacity: number;
};

export const DEFAULT_GROUND: GroundSettings = {
  preset: "contact",
  size: 1.6,
  renderToDepth: true,
  limitCamera: false,
  tonemap: true,
  shadowFrames: 40,
  height: 0,
  light: { color: "#ffffff", intensity: 1, direction: [0.3, 1, 0.4], radius: 1, bias: 0.001, focus: 0.5, spread: 8 },
  material: { color: "#1a1817", roughness: 0.6, metalness: 0 },
  opacity: 0.8,
};

export const STANDS = ["ring-box", "display", "cone", "marble", "bust"] as const;
export type StandId = (typeof STANDS)[number];

export const POSES = ["auto", "flat", "standing", "angle"] as const;
export type PoseKind = (typeof POSES)[number];

export type ExtraLight = { id: string; kind: "directional" | "ambient" | "point" | "spot"; color: string; intensity: number; /** times the size of the jewel, from its centre */ position: Vec3; angle: number; penumbra: number };

/** Behind the jewel, when not one of the named backgrounds (./models.ts BACKGROUNDS). */
export type Backdrop = { kind: "color"; color: string } | { kind: "gradient"; inner: string; outer: string } | { kind: "env" };

export type SceneSettings = {
  /** Environment: the lighting of the metal. */
  envMetal: EnvSettings;
  /** Gem Environment: the lighting of the stones. */
  envGem: EnvSettings;
  /** The lighting stays in place when the jewel turns: the sparkles travel over the facets. */
  fixedEnv: boolean;
  /** The metal's lighting drawn behind the jewel. */
  envBackground: boolean;
  backdrop: Backdrop | null;
  lights: ExtraLight[];
  ground: GroundSettings;
  stand: StandId | null;
  pose: { kind: PoseKind; /** degrees, applied to the jewel */ rotation: Vec3 };
  post: PostSettings;
  render: RenderSettings;
  camera: { fov: number; autoScale: boolean; autoCenter: boolean };
};

/* ---------- Camera views ---------- */

export const EASES = ["easeInOutSine", "linear", "easeInOutQuad", "easeInOutCubic", "easeOutCubic", "easeInOutQuart", "easeOutExpo"] as const;
export type Ease = (typeof EASES)[number];

export type CameraView = { id: string; name: string; position: Vec3; target: Vec3; fov?: number };

export type ViewsSettings = {
  list: CameraView[];
  /** Seconds from one view to the next. */
  duration: number;
  ease: Ease;
  interpolation: "spherical" | "linear";
  /** Seconds at each view. */
  pause: number;
  loop: boolean;
  /** On the page of the piece, the camera follows the scrolling through the views. */
  seekOnScroll: boolean;
};

export const DEFAULT_VIEWS: ViewsSettings = { list: [], duration: 2, ease: "easeInOutSine", interpolation: "spherical", pause: 1, loop: true, seekOnScroll: false };

/* ---------- The viewer of the client ---------- */

export type ViewerOptions = {
  zoom: boolean;
  zoomButtons: boolean;
  /** Closest and farthest distances, in times the size of the jewel ([] = free), on a tall screen and on a wide one. */
  distance: { portrait: [number, number] | null; landscape: [number, number] | null };
  autoRotate: boolean;
  /** "Drag to turn" at the first sight of the jewel. */
  prompt: boolean;
  views: boolean;
  configurator: boolean;
  share: boolean;
  fullscreen: boolean;
  tryOn: boolean;
  ar: boolean;
  quality: "auto" | "high" | "ultra";
};

export const DEFAULT_VIEWER: ViewerOptions = {
  zoom: true,
  zoomButtons: true,
  distance: { portrait: null, landscape: null },
  autoRotate: false,
  prompt: true,
  views: true,
  configurator: true,
  share: true,
  fullscreen: true,
  tryOn: true,
  ar: true,
  quality: "auto",
};

/* ---------- Configurator ---------- */

/** A material of the library (src/viewer/library) offered for some layers, with the name the client reads. */
export type ConfigOption = { material: string; label: string };
export type Configurator = { id: string; label: string; layers: string[]; options: ConfigOption[] };

/* ---------- Try-on (rings) ---------- */

export const FINGERS = ["ring", "middle", "index", "little"] as const;
export type Finger = (typeof FINGERS)[number];

export type TryOnSettings = {
  enabled: boolean;
  finger: Finger;
  /** Where on the finger, from its base (0) to its middle joint (1). */
  along: number;
  /** Times the size measured on the hand. */
  scale: number;
  /** Degrees, applied to the ring before it is put on the finger cylinder. */
  rotation: Vec3;
  /** mm, in the space of the finger (x across, y along, z out of the back of the hand). */
  offset: Vec3;
  /** Axis of the ring's hole in the file. */
  axis: "x" | "y" | "z";
};

export const DEFAULT_TRY_ON: TryOnSettings = { enabled: false, finger: "ring", along: 0.5, scale: 1, rotation: [0, 0, 0], offset: [0, 0, 0], axis: "z" };

/* ---------- Defaults of a whole scene, and the reading of saved settings ---------- */

export const DEFAULT_SCENE: SceneSettings = {
  envMetal: { id: "studio-warm", rotation: 0, intensity: 1 },
  envGem: { id: "gem-studio", rotation: 0, intensity: 1 },
  fixedEnv: false,
  envBackground: false,
  backdrop: null,
  lights: [],
  ground: DEFAULT_GROUND,
  stand: null,
  pose: { kind: "auto", rotation: [0, 0, 0] },
  post: DEFAULT_POST,
  render: DEFAULT_RENDER,
  camera: { fov: 30, autoScale: true, autoCenter: true },
};

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => typeof v === "object" && v !== null && !Array.isArray(v);

/** `base` with what `over` gives of the same shape (objects merged deeply, arrays and values replaced when of the same kind). */
export function merged<T>(base: T, over: unknown): T {
  if (!isPlain(base) || !isPlain(over)) {
    if (over === undefined || over === null) return base;
    if (Array.isArray(base)) return (Array.isArray(over) ? over : base) as T;
    if (base === null) return over as T;
    return (typeof over === typeof base ? over : base) as T;
  }
  const out: Plain = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (!(k in base)) out[k] = v;
    else out[k] = merged((base as Plain)[k], v);
  }
  return out as T;
}

/** Lightings that stand for the three ambiances of the first versions (studio, warm, spotlight). */
export const AMBIANCE_SCENES: Record<string, { envMetal: string; envGem: string; metalIntensity: number }> = {
  studio: { envMetal: "studio-warm", envGem: "gem-studio", metalIntensity: 1 },
  warm: { envMetal: "lounge-blur", envGem: "gem-studio", metalIntensity: 1.05 },
  spotlight: { envMetal: "studio-dark", envGem: "gem-spot", metalIntensity: 0.8 },
};
