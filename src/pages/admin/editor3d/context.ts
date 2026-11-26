/* What every part of the 3D editor reads and changes (26/11/2026). */
import type { LayerSetting, ModelSettings, PublicModel } from "@/data/models";
import type { SceneSettings, TryOnSettings, ViewerOptions, ViewsSettings } from "@/data/scene3d";
import type { StageApi } from "@/viewer/Stage";

export type LayerInfo = { name: string; meshes: number; copies: number; triangles: number; size: [number, number, number]; guess: string; check: boolean; color?: string };

export type EditorCtx = {
  model: PublicModel;
  layers: LayerInfo[];
  settings: ModelSettings;
  scene: SceneSettings;
  views: ViewsSettings;
  viewer: ViewerOptions;
  tryOn: TryOnSettings;
  api: StageApi | null;
  selected: string | null;
  highlight: string | null;
  token: string;
  set(next: ModelSettings): void;
  setScene(next: SceneSettings): void;
  setViews(next: ViewsSettings): void;
  setViewer(next: ViewerOptions): void;
  setTryOn(next: TryOnSettings): void;
  setLayer(name: string, patch: Partial<LayerSetting>): void;
  select(name: string | null): void;
  setHighlight(name: string | null): void;
  /** Shows a tab of the right side (the left side's "Exporter" opens "Export"). */
  showTab(tab: TabId): void;
};

export const TABS = [
  ["view", "Vue"],
  ["parts", "Parties"],
  ["scene", "Scène"],
  ["render", "Rendu"],
  ["effects", "Effets"],
  ["cameras", "Vues de caméra"],
  ["configurator", "Configurateur"],
  ["export", "Export"],
] as const;
export type TabId = (typeof TABS)[number][0];
