/*
 * Types of cdt2d (constrained Delaunay triangulation in the plane, used by ./nurbs.ts), which ships without any.
 * `points`: [x, y]; `edges`: pairs of point numbers that the triangles must keep as sides; with `exterior: false`,
 * only the triangles inside the closed loops of edges are returned, each counter-clockwise.
 */
declare module "cdt2d" {
  type Options = { delaunay?: boolean; interior?: boolean; exterior?: boolean; infinity?: boolean };
  function cdt2d(points: [number, number][], edges?: [number, number][], options?: Options): [number, number, number][];
  export default cdt2d;
}
