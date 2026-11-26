/*
 * The ring of the try-on and of its setting in the admin (26/11/2026): a copy of the jewel as the viewer draws it (the
 * shapes shared, never copied), its metals kept (copies of their materials, so nothing changes in the viewer behind), and
 * its stones in a light glass instead of the traced diamonds of the viewer: the try-on must stay fluid on a phone.
 * And the light of both: a soft room (three's RoomEnvironment), so that gold looks like gold.
 */
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Color, MeshPhysicalMaterial, PMREMGenerator, type Material, type Mesh, type MeshStandardMaterial, type Object3D } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type TryOnRing = { root: Object3D; dispose(): void };

const isStandard = (m: Material): m is MeshStandardMaterial => (m as MeshStandardMaterial).isMeshStandardMaterial === true;

/** A copy of the jewel to put on a finger. Its own transform is left out: the placement gives the whole of it. */
export function prepareRing(jewel: Object3D): TryOnRing {
  const root = jewel.clone(true);
  root.matrixAutoUpdate = false;
  root.matrix.identity();
  const made: Material[] = [];
  const glass = new MeshPhysicalMaterial({
    name: "stone",
    color: new Color("#ffffff"),
    metalness: 0,
    roughness: 0,
    transmission: 1,
    ior: 2.42,
    thickness: 0.0015,
    specularIntensity: 1,
    envMapIntensity: 1.6,
  });
  made.push(glass);
  const swap = (m: Material): Material => {
    if (!isStandard(m)) return glass;
    const copy = m.clone();
    made.push(copy);
    return copy;
  };
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    // The jewel moves with the hand: never left out because of an old bounding sphere.
    mesh.frustumCulled = false;
  });
  return {
    root,
    dispose() {
      for (const m of made) m.dispose();
    },
  };
}

/** The soft room light, made once per canvas (prefiltered for the metals). */
export function useRoomEnvironment(intensity = 1): void {
  // The renderer and the scene are read when needed (get), never kept from a render.
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { gl, scene, invalidate } = get();
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    scene.environment = target.texture;
    scene.environmentIntensity = intensity;
    invalidate();
    return () => {
      if (scene.environment === target.texture) scene.environment = null;
      target.dispose();
      room.dispose();
      pmrem.dispose();
    };
  }, [get, intensity]);
}
