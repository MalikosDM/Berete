/*
 * The setting of the try-on in the admin (26/11/2026), in French: the ring on a cylinder that stands for the finger (17 mm,
 * a line of rose gold along the back of the hand), placed by the same reckoning as the try-on of the client (./place.ts),
 * so what Yoni sees here is what the client sees on his hand. Sliders for where on the finger, the size, the rotations and
 * the offsets; the axis of the ring's hole in the file; the finger; and whether the client is offered the try-on at all.
 */
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { DEFAULT_TRY_ON, FINGERS, type Finger, type TryOnSettings, type Vec3 } from "@/data/scene3d";
import type { Object3D } from "three";
import { cylinderFrame, FINGER_MM, measureRing, ringMatrix, ringPoints, SEGMENT_MM } from "./place";
import { prepareRing, useRoomEnvironment, type TryOnRing } from "./ring";

type Props = {
  /** The ring as the viewer draws it (metres); null while it loads. */
  jewel: Object3D | null;
  settings: TryOnSettings;
  onChange(next: TryOnSettings): void;
};

const FINGER_NAMES: Record<Finger, string> = { ring: "Annulaire", middle: "Majeur", index: "Index", little: "Auriculaire" };
const AXIS_NAMES: Record<TryOnSettings["axis"], string> = { x: "Axe X", y: "Axe Y", z: "Axe Z" };

const mm = 0.001;
const field = "block border-t border-white/10 pt-4";
const choice =
  "inline-flex min-h-12 cursor-pointer items-center gap-3 border border-white/20 px-4 text-base text-white has-[:checked]:border-rose-light has-[:checked]:text-rose-light has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-rose-light";

export default function TryOnEditor({ jewel, settings, onChange }: Props) {
  const ring = useMemo(() => (jewel ? prepareRing(jewel) : null), [jewel]);
  useEffect(() => () => ring?.dispose(), [ring]);

  const set = (patch: Partial<TryOnSettings>) => onChange({ ...settings, ...patch });
  const setVec = (key: "rotation" | "offset", i: number, value: number) => {
    const next = [...settings[key]] as Vec3;
    next[i] = value;
    set({ [key]: next });
  };

  return (
    <div className="grid gap-6 text-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <div className="relative aspect-square w-full overflow-hidden border border-white/15 bg-ink">
          {ring ? (
            <Canvas dpr={[1, 2]} camera={{ fov: 30, near: 0.001, far: 2, position: [0.045, 0.055, 0.12] }} gl={{ antialias: true }} frameloop="demand">
              <color attach="background" args={["#141313"]} />
              <EditorScene ring={ring} settings={settings} />
            </Canvas>
          ) : (
            <p className="absolute inset-0 flex items-center justify-center text-base text-mist">Chargement du modèle…</p>
          )}
        </div>
        <p className="mt-3 text-base leading-relaxed text-mist">
          Le cylindre représente le doigt du client ({FINGER_MM} mm). Le trait or rose marque le dos de la main : le dessus de la bague doit
          être de ce côté. Les deux fins anneaux sombres marquent la base du doigt et la première articulation. Faites tourner la vue avec la
          souris ou le doigt.
        </p>
      </div>

      <div className="grid content-start gap-5">
        <label className={choice + " w-fit"}>
          <input type="checkbox" className="size-5 accent-[#e8b4a0]" checked={settings.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
          Proposer l’essayage au client
        </label>

        <fieldset className={field}>
          <legend className="mb-3 text-base text-mist">Doigt</legend>
          <div className="flex flex-wrap gap-2">
            {FINGERS.map((f) => (
              <label key={f} className={choice}>
                <input type="radio" name="tryon-finger" className="size-5 accent-[#e8b4a0]" checked={settings.finger === f} onChange={() => set({ finger: f })} />
                {FINGER_NAMES[f]}
              </label>
            ))}
          </div>
        </fieldset>

        <Slider
          label="Position sur le doigt"
          hint="0 % : à la base du doigt ; 100 % : à la première articulation."
          min={0}
          max={1}
          step={0.01}
          value={settings.along}
          show={(v) => Math.round(v * 100) + " %"}
          onChange={(v) => set({ along: v })}
        />
        <Slider
          label="Taille"
          hint="1 : la bague suit la taille du doigt mesurée sur la main."
          min={0.6}
          max={1.6}
          step={0.01}
          value={settings.scale}
          show={(v) => "× " + v.toFixed(2)}
          onChange={(v) => set({ scale: v })}
        />

        <fieldset className={field}>
          <legend className="mb-3 text-base text-mist">Rotation de la bague</legend>
          <div className="grid gap-4">
            {(["Basculer vers l’ongle ou le poignet (X)", "Tourner autour du doigt (Y)", "Pencher vers la gauche ou la droite (Z)"] as const).map((label, i) => (
              <Slider key={label} label={label} min={-180} max={180} step={1} value={settings.rotation[i]} show={(v) => Math.round(v) + "°"} onChange={(v) => setVec("rotation", i, v)} />
            ))}
          </div>
        </fieldset>

        <fieldset className={field}>
          <legend className="mb-3 text-base text-mist">Décalage de la bague</legend>
          <div className="grid gap-4">
            {(["Vers la gauche ou la droite (X)", "Le long du doigt (Y)", "Plus haut ou plus bas sur le doigt (Z)"] as const).map((label, i) => (
              <Slider key={label} label={label} min={-5} max={5} step={0.1} value={settings.offset[i]} show={(v) => v.toFixed(1) + " mm"} onChange={(v) => setVec("offset", i, v)} />
            ))}
          </div>
        </fieldset>

        <fieldset className={field}>
          <legend className="mb-1 text-base text-mist">Axe du trou de la bague dans le fichier</legend>
          <p className="mb-3 text-base text-mist">Choisissez l’axe qui passe par le trou : la bague doit entourer le cylindre.</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(AXIS_NAMES) as TryOnSettings["axis"][]).map((a) => (
              <label key={a} className={choice}>
                <input type="radio" name="tryon-axis" className="size-5 accent-[#e8b4a0]" checked={settings.axis === a} onChange={() => set({ axis: a })} />
                {AXIS_NAMES[a]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="border-t border-white/10 pt-4">
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center border border-white/30 px-5 text-base font-medium text-white hover:border-rose-light hover:text-rose-light"
            onClick={() => onChange({ ...DEFAULT_TRY_ON, enabled: settings.enabled })}
          >
            Revenir aux réglages de départ
          </button>
        </div>
      </div>
    </div>
  );
}

function Slider(props: { label: string; hint?: string; min: number; max: number; step: number; value: number; show(v: number): string; onChange(v: number): void }) {
  const { label, hint, min, max, step, value, show, onChange } = props;
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-4 text-base">
        <span>{label}</span>
        <span className="shrink-0 tabular-nums text-rose-light">{show(value)}</span>
      </span>
      {hint && <span className="mt-1 block text-base text-mist">{hint}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 block h-12 w-full cursor-pointer accent-[#e8b4a0]"
      />
    </label>
  );
}

/* ---------- The finger and the ring ---------- */

const SKIN = "#c8977f";

function EditorScene({ ring, settings }: { ring: TryOnRing; settings: TryOnSettings }) {
  useRoomEnvironment(1);
  const invalidate = useThree((s) => s.invalidate);
  const fit = useMemo(() => measureRing(ringPoints(ring.root), settings.axis), [ring, settings.axis]);

  const rootRef = useRef<Object3D>(null);

  // The same matrix as on the client's hand, here on the cylinder.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.matrix.copy(ringMatrix(cylinderFrame(settings.along), fit, settings));
    root.matrixWorldNeedsUpdate = true;
    invalidate();
  }, [ring, fit, settings, invalidate]);

  const radius = (FINGER_MM / 2) * mm;
  const segment = SEGMENT_MM * mm;
  const bottom = -14 * mm;
  const top = segment + 22 * mm;
  const target: [number, number, number] = [0, settings.along * segment, 0];

  return (
    <>
      <OrbitControls makeDefault target={target} enableDamping minDistance={0.04} maxDistance={0.4} enablePan={false} />
      <mesh position={[0, (bottom + top) / 2, 0]}>
        <cylinderGeometry args={[radius, radius, top - bottom, 64, 1]} />
        <meshStandardMaterial color={SKIN} roughness={0.75} metalness={0} />
      </mesh>
      {/* The back of the hand. */}
      <mesh position={[0, (bottom + top) / 2, radius + 0.00005]}>
        <boxGeometry args={[0.0012, top - bottom, 0.0001]} />
        <meshBasicMaterial color="#e8b4a0" toneMapped={false} />
      </mesh>
      {/* The base of the finger and its first joint. */}
      {[0, segment].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius + 0.0001, 0.00025, 8, 64]} />
          <meshBasicMaterial color="#3a2f2b" />
        </mesh>
      ))}
      <primitive ref={rootRef} object={ring.root} />
    </>
  );
}
