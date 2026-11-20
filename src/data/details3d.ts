/*
 * "The Art of Detail" in 3D (src/viewer/DetailViewer.tsx): the points of the 3D model of a piece tied to its details
 * (Piece.details, by their place in the list), placed in the admin by a click on the model. The points are in the space
 * of the model they were placed on: another model on the piece shows none of them until they are placed again.
 */

export type DetailPoint = { detail: number; at: [number, number, number] };
export type PieceDetailPoints = { model: string; points: DetailPoint[] };

const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && Math.abs(v) < 1e4;

/** The points as stored: a model, one point per detail at most (the last one given), in the order of the details. */
export function cleanDetailPoints(value: unknown): PieceDetailPoints | null {
  if (value === null || typeof value !== "object") return null;
  const v = value as { model?: unknown; points?: unknown };
  if (typeof v.model !== "string" || !/^[a-z0-9-]{1,64}$/i.test(v.model) || !Array.isArray(v.points)) return null;
  const byDetail = new Map<number, DetailPoint>();
  for (const p of v.points.slice(0, 60)) {
    const q = p as { detail?: unknown; at?: unknown };
    if (!Number.isInteger(q.detail) || (q.detail as number) < 0 || (q.detail as number) > 59) continue;
    if (!Array.isArray(q.at) || q.at.length !== 3 || !q.at.every(num)) continue;
    byDetail.set(q.detail as number, { detail: q.detail as number, at: [q.at[0], q.at[1], q.at[2]] as [number, number, number] });
  }
  const points = [...byDetail.values()].sort((a, b) => a.detail - b.detail);
  return points.length > 0 ? { model: v.model, points } : null;
}

/** The points of a piece for the model it shows now, among its details (none when they were placed on another model). */
export function pointsFor(points: PieceDetailPoints | null | undefined, modelId: string | null | undefined, details: number): DetailPoint[] {
  if (!points || !modelId || points.model !== modelId) return [];
  return points.points.filter((p) => p.detail < details);
}
