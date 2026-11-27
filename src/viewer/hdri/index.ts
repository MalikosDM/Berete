/*
 * The lightings of our own library (./library.ts) in the viewer (26/11/2026): each one is a Radiance file written by
 * scripts/hdri-library.ts in public/hdri/berete, 2048 × 1024 on a computer, 1024 × 512 on a phone, its address carrying
 * the version of its content (src/data/hdri.generated.json) so that a browser never keeps an old one. Loaded once per
 * address, then shared.
 */
import { EquirectangularReflectionMapping, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, type Texture } from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import versions from "@/data/hdri.generated.json" with { type: "json" };
import { HDRI, type HdriKind } from "./library";

export { HDRI, hdriDirection, hdriLonLat, type HdriInfo, type HdriKind } from "./library";

const VERSIONS: Record<string, { v: string; bytes: number; bytes1k: number }> = versions;

/** The default lighting of each kind (what an unknown or removed id falls back to). */
export const DEFAULT_HDRI: Record<HdriKind, string> = { metal: "studio-clair", gem: "gem-studio" };

/** The id itself when the library has it, else the default of its kind (an id that starts with "gem-" lights stones). */
export function knownHdri(id: string, kind?: HdriKind): string {
  if (HDRI[id] && VERSIONS[id]) return id;
  // « auto » (the stones' lighting chosen per cut by the engine): the studio as the scene's own.
  if (id === "auto") return "gem-tente";
  return DEFAULT_HDRI[kind ?? (id.startsWith("gem-") ? "gem" : "metal")];
}

/** Address of a lighting's file (the smaller one on a phone). */
export function hdriUrl(id: string, phone: boolean): string {
  const known = knownHdri(id);
  return "/hdri/berete/" + known + (phone ? "-1k" : "") + ".hdr?v=" + (VERSIONS[known]?.v ?? "0");
}

const cache = new Map<string, Promise<Texture>>();

/**
 * The lighting `id` as a texture for three (equirectangular, linear, half floats). A lighting of the stones gets its
 * mipmaps and repeats across its seam, as the stones read it directly (textureGrad in their shader); a lighting of the
 * metal goes through three's PMREM and needs neither. A failed load is forgotten, so that the next call tries again.
 */
export function envTexture(id: string, phone: boolean): Promise<Texture> {
  const known = knownHdri(id);
  const url = hdriUrl(known, phone);
  const found = cache.get(url);
  if (found) return found;
  const gem = HDRI[known]?.kind === "gem";
  const promise = new HDRLoader().loadAsync(url).then((texture) => {
    texture.mapping = EquirectangularReflectionMapping;
    if (gem) {
      texture.wrapS = RepeatWrapping;
      texture.magFilter = LinearFilter;
      texture.minFilter = LinearMipmapLinearFilter;
      texture.generateMipmaps = true;
      texture.needsUpdate = true;
    }
    return texture as Texture;
  });
  promise.catch(() => cache.delete(url));
  cache.set(url, promise);
  return promise;
}

/** The French name of a lighting, for the admin (the id itself when unknown). */
export function hdriName(id: string): string {
  if (id === "auto") return "Automatique";
  return HDRI[id]?.name ?? id;
}

/** The lightings of a kind, in the order of the library, for the admin's lists. */
export function hdriList(kind: HdriKind): { id: string; name: string; description: string }[] {
  return Object.entries(HDRI)
    .filter(([, info]) => info.kind === kind)
    .map(([id, info]) => ({ id, name: info.name, description: info.description }));
}
