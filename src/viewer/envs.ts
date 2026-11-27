/*
 * The two lightings of a scene (26/11/2026): the metal's (scene.environment) and the stones' (given to each stone's
 * material), by id from our own library (./hdri), loaded once and shared.
 *
 * An id "custom:<file>" is a lighting the admin uploaded (« Éclairages importés », server/routes/hdri.ts): the file
 * `<24 hex>.hdr` or `<24 hex>.exr`, served at /hdri/custom/<file> and read by three's HDRLoader or EXRLoader (by its
 * extension). One texture serves both kinds: no mipmaps (the metal's goes through PMREM, the stones read its level 0)
 * and repeated across its seam. A file that cannot be loaded (deleted since, or a site without the server) gives the
 * default lighting of its kind, so that the jewel never goes black.
 */
import { EquirectangularReflectionMapping, LinearFilter, RepeatWrapping, type Texture } from "three";
import { GEM_ENVS } from "@/data/scene3d";
import { DEFAULT_HDRI, envTexture } from "./hdri";

export type EnvKind = "metal" | "gem";

/** The start of the id of an uploaded lighting. */
export const CUSTOM_ENV = "custom:";
const CUSTOM_FILE = /^[a-f0-9]{24}\.(hdr|exr)$/;

/** The id is an uploaded lighting ("custom:<24 hex>.hdr|exr"). */
export function isCustomEnv(id: string): boolean {
  return id.startsWith(CUSTOM_ENV) && CUSTOM_FILE.test(id.slice(CUSTOM_ENV.length));
}

/** Address of an uploaded lighting's file. The dev server (Vite) passes only /api to the API: there, its copy under /api. */
export function customEnvUrl(id: string): string {
  const file = id.slice(CUSTOM_ENV.length);
  const dev = Boolean(import.meta.env?.DEV);
  return (dev ? "/api" : "") + "/hdri/custom/" + file;
}

export function kindOf(id: string): EnvKind {
  return (GEM_ENVS as readonly string[]).includes(id) ? "gem" : "metal";
}

const custom = new Map<string, Promise<Texture>>();

function customTexture(id: string): Promise<Texture> {
  const found = custom.get(id);
  if (found) return found;
  const url = customEnvUrl(id);
  const promise = (async () => {
    const texture: Texture = url.endsWith(".exr")
      ? await new (await import("three/examples/jsm/loaders/EXRLoader.js")).EXRLoader().loadAsync(url)
      : await new (await import("three/examples/jsm/loaders/HDRLoader.js")).HDRLoader().loadAsync(url);
    texture.mapping = EquirectangularReflectionMapping;
    texture.wrapS = RepeatWrapping;
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  })();
  promise.catch(() => custom.delete(id));
  custom.set(id, promise);
  return promise;
}

/**
 * A lighting by id (phones: the lighter copy of ours; an uploaded one has a single size); an unknown id gives the
 * default of its kind. `kind` only chooses the default when an uploaded lighting cannot be loaded (metal if not said).
 */
export function loadEnv(id: string, phone: boolean, kind?: EnvKind): Promise<Texture> {
  if (isCustomEnv(id)) {
    return customTexture(id).catch((error: unknown) => {
      console.warn("[3d] uploaded lighting not loaded, default instead:", id, error);
      return envTexture(DEFAULT_HDRI[kind ?? "metal"], phone);
    });
  }
  return envTexture(id, phone);
}
