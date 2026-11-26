/*
 * What the parts of the 3D viewer say to each other (26/11/2026): the stage (./Stage.tsx) gives these handles to the
 * editor of the admin, the export (images, films, series), the try-on and the stands. Kept here, apart, so that each
 * part depends on the shape only.
 */
import type { Object3D } from "three";
import type { MetalId } from "@/data/models";
import type { CameraView } from "@/data/scene3d";

/** Where the jewel stands, in metres (the units of the viewer: the files are in mm, read as m × 0.001). */
export type JewelFrame = {
  /** Centre of the box around the jewel. */
  center: [number, number, number];
  /** Radius of the sphere around it. */
  radius: number;
  /** Lowest point (y). */
  minY: number;
  /** Size of the box along x, y, z. */
  size: [number, number, number];
};

/** A path the camera follows for a film: one turn around the jewel, or through the saved views. */
export type PathKind = "turn" | "views";

export type RenderApi = {
  /**
   * Draws one image of `width` × `height` pixels (up to 3840 × 3840), smoothed by `samples` images averaged (default
   * 16), the background transparent if asked; the canvas returned holds it until the next call (copy it, or make a
   * VideoFrame of it). It is a 2D copy: it keeps the image after the promise. The screen shows nothing else meanwhile; `restore()` gives it back.
   */
  renderStill(opts: { width: number; height: number; transparent?: boolean; samples?: number }): Promise<HTMLCanvasElement>;
  /** Puts the camera on a path at t ∈ [0, 1]: "turn", one turn around the jewel from the view of the moment; "views", through the saved views with their durations and pauses. */
  setPathTime(kind: PathKind, t: number): void;
  /** Seconds of the path through the saved views (0 without views). */
  viewsDuration(): number;
  views(): CameraView[];
  /** Puts the camera exactly on saved view `index` (the series renders). */
  setView(index: number): void;
  /** The metal of every metal layer (null: back to the saved ones). */
  setMetal(metal: MetalId | null): void;
  /** Ends an export: the size of the screen and the camera as before. */
  restore(): void;
};

/** What the stage gives to the editor and to the tools around it. */
export type StageHandles = {
  render: RenderApi;
  /** The jewel as it is drawn (its meshes and their materials), for the try-on and the AR files; null while loading. */
  jewel(): Object3D | null;
  frame(): JewelFrame | null;
  /** The jewel as a .glb file, with its materials as they look (diamonds: their settings kept in the extras). */
  exportGlb(): Promise<Blob>;
};
