/*
 * What stands around the jewel in the 3D scene (26/11/2026): the ground (a soft shadow, a contact shadow, a mirror),
 * the lights added by the jeweller, the surface of a named background (walnut, velvet...) and the stand.
 */
import { useEffect, useMemo, useState } from "react";
import { AccumulativeShadows, ContactShadows, MeshReflectorMaterial, RandomizedLight } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Color, MeshPhysicalMaterial, RepeatWrapping, SRGBColorSpace, TextureLoader, type Texture } from "three";
import type { ExtraLight, GroundSettings } from "@/data/scene3d";
import { fadeTexture, type Surface } from "./backgrounds";

/** Where the jewel stands, in plain numbers, for the lights, the ground and the stand. */
export type Frame = { key: number; cx: number; cy: number; cz: number; radius: number; minY: number; width: number; height: number; depth: number };

/* ---------- Ground ---------- */

export function Ground({ ground, frame, light, onReady }: { ground: GroundSettings; frame: Frame; light: boolean; onReady: () => void }) {
  const get = useThree((s) => s.get);
  const y = frame.minY - frame.radius * 0.002 - ground.height * 0.001;
  const scale = Math.max(frame.width, frame.depth, frame.radius) * Math.max(0.5, ground.size);
  useEffect(() => {
    if (ground.preset !== "soft") return undefined;
    const renderer = get().gl;
    renderer.shadowMap.enabled = true;
    onReady();
    return () => {
      renderer.shadowMap.enabled = false;
    };
  }, [ground.preset, get, onReady]);
  if (ground.preset === "none") return null;
  if (ground.preset === "contact") {
    return (
      <ContactShadows
        userData={{ noPick: true, noPrepass: true }}
        position={[frame.cx, y, frame.cz]}
        scale={scale}
        far={Math.max(frame.height, frame.radius * 0.2) * 1.5}
        blur={2.2}
        opacity={ground.opacity * (light ? 0.7 : 1)}
        resolution={1024}
        frames={1}
        color="#000000"
      />
    );
  }
  if (ground.preset === "soft") {
    const [dx, dy, dz] = ground.light.direction;
    const d = Math.hypot(dx, dy, dz) || 1;
    const far = frame.radius * 6;
    return (
      <AccumulativeShadows
        key={frame.key + ":" + ground.shadowFrames + ":" + ground.light.radius + ":" + ground.light.spread}
        userData={{ noPick: true, noPrepass: true }}
        position={[frame.cx, y, frame.cz]}
        scale={scale * 2}
        frames={Math.max(1, Math.min(200, Math.round(ground.shadowFrames)))}
        temporal={false}
        alphaTest={0.75}
        opacity={ground.opacity}
        color={ground.light.color}
        colorBlend={2}
      >
        <RandomizedLight
          amount={Math.max(1, Math.round(ground.light.spread))}
          radius={frame.radius * Math.max(0.1, ground.light.radius) * 2}
          ambient={1 - Math.min(1, Math.max(0, ground.light.focus))}
          intensity={ground.light.intensity}
          position={[frame.cx + (dx / d) * far, frame.cy + (dy / d) * far, frame.cz + (dz / d) * far]}
          bias={ground.light.bias}
          size={scale * 2}
          near={frame.radius * 0.05}
          far={far * 3}
          mapSize={1024}
        />
      </AccumulativeShadows>
    );
  }
  // A polished surface mirroring the jewel.
  return (
    <mesh userData={{ noPick: true }} rotation={[-Math.PI / 2, 0, 0]} position={[frame.cx, y, frame.cz]} renderOrder={-1}>
      <circleGeometry args={[scale * 1.5, 96]} />
      <MeshReflectorMaterial
        resolution={1024}
        blur={[200, 80]}
        mixBlur={0.6}
        mixStrength={1.2}
        mirror={0.8}
        depthScale={0}
        color={ground.material.color}
        roughness={ground.material.roughness}
        metalness={ground.material.metalness}
        transparent={ground.renderToDepth}
        alphaMap={ground.renderToDepth ? fadeTexture() : undefined}
        opacity={ground.opacity}
      />
    </mesh>
  );
}

/* ---------- Lights added by the jeweller ---------- */

export function Lights({ lights, frame }: { lights: ExtraLight[]; frame: Frame }) {
  return (
    <>
      {lights.map((l) => {
        const p: [number, number, number] = [frame.cx + l.position[0] * frame.radius * 3, frame.cy + l.position[1] * frame.radius * 3, frame.cz + l.position[2] * frame.radius * 3];
        if (l.kind === "ambient") return <ambientLight key={l.id} color={l.color} intensity={l.intensity} />;
        if (l.kind === "directional") return <directionalLight key={l.id} position={p} color={l.color} intensity={l.intensity} />;
        if (l.kind === "point") return <pointLight key={l.id} position={p} color={l.color} intensity={l.intensity * frame.radius * frame.radius * 400} decay={2} />;
        return <spotLight key={l.id} position={p} color={l.color} intensity={l.intensity * frame.radius * frame.radius * 400} angle={l.angle} penumbra={l.penumbra} decay={2} />;
      })}
    </>
  );
}

/* ---------- The surface of a named background ---------- */

const textureLoader = new TextureLoader();
const surfaceCache = new Map<string, Promise<{ map: Texture; normal: Texture; rough: Texture }>>();

function loadSurface(name: string): Promise<{ map: Texture; normal: Texture; rough: Texture }> {
  let found = surfaceCache.get(name);
  if (!found) {
    const one = (kind: string) => textureLoader.loadAsync("/decor/" + name + "_" + kind + ".jpg");
    found = Promise.all([one("diff"), one("nor"), one("rough")]).then(([map, normal, rough]) => {
      map.colorSpace = SRGBColorSpace;
      for (const t of [map, normal, rough]) {
        t.wrapS = RepeatWrapping;
        t.wrapT = RepeatWrapping;
        t.anisotropy = 8;
      }
      return { map, normal, rough };
    });
    found.catch(() => surfaceCache.delete(name));
    surfaceCache.set(name, found);
  }
  return found;
}

/** The surface the jewel lies on (walnut, velvet...), fading into the room behind. */
export function SurfaceUnder({ surface, frame, onReady }: { surface: Surface; frame: Frame; onReady: () => void }) {
  const [textures, setTextures] = useState<{ map: Texture; normal: Texture; rough: Texture } | null>(null);
  useEffect(() => {
    let alive = true;
    loadSurface(surface.name)
      .then((t) => {
        if (!alive) return;
        setTextures(t);
        onReady();
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [surface.name, onReady]);
  const radius = Math.max(frame.width * 3, frame.radius * 6, 0.12);
  const material = useMemo(() => {
    if (!textures) return null;
    const repeat = (radius * 2) / surface.tile;
    const own = (t: Texture) => {
      const c = t.clone();
      c.repeat.set(repeat, repeat);
      c.needsUpdate = true;
      return c;
    };
    return new MeshPhysicalMaterial({
      map: own(textures.map),
      normalMap: own(textures.normal),
      roughnessMap: own(textures.rough),
      color: new Color(surface.tint ?? "#ffffff"),
      sheen: surface.sheen ? 1 : 0,
      sheenColor: new Color(surface.sheen ?? "#000000"),
      sheenRoughness: 0.45,
      roughness: surface.roughness ?? 1,
      alphaMap: fadeTexture(),
      transparent: true,
      envMapIntensity: 0.7,
    });
  }, [textures, radius, surface]);
  useEffect(() => () => material?.dispose(), [material]);
  if (!material) return null;
  return (
    <mesh userData={{ noPick: true, noPrepass: true }} material={material} rotation={[-Math.PI / 2, 0, 0]} position={[frame.cx, frame.minY - frame.radius * 0.004, frame.cz]} renderOrder={-1}>
      <circleGeometry args={[radius, 96]} />
    </mesh>
  );
}
