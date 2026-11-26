/*
 * The two lightings of a scene (26/11/2026): the metal's (scene.environment) and the stones' (given to each stone's
 * material), by id from our own library (./hdri), loaded once and shared.
 */
import type { Texture } from "three";
import { GEM_ENVS } from "@/data/scene3d";
import { envTexture } from "./hdri";

export type EnvKind = "metal" | "gem";

export function kindOf(id: string): EnvKind {
  return (GEM_ENVS as readonly string[]).includes(id) ? "gem" : "metal";
}

/** A lighting by id (phones: the lighter copy); an unknown id gives the default of its kind. */
export function loadEnv(id: string, phone: boolean): Promise<Texture> {
  return envTexture(id, phone);
}
