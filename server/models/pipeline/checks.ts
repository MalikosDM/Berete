/*
 * Faces turned inside out (26/11/2026), as iJewel checks a file at import: in each closed piece (every edge shared by
 * exactly two triangles), the triangles are made to agree with their neighbours, then the piece is turned outward if its
 * volume comes out negative (its faces looked inward: the viewer would show its inside, a stone would vanish). An open
 * piece (a surface, a part with holes) is left as it is: it has no inside to tell.
 */
import type { Soup } from "./geometry.js";

/**
 * Turns the closed pieces of a soup outward, in place. Gives back how many pieces had triangles turned. Works on a
 * piece of any size (vertices numbered from 0, as `extract` gives them) or a soup of several pieces.
 */
export function orientOutward(soup: Soup): number {
  const idx = soup.indices;
  const p = soup.positions;
  const triCount = idx.length / 3;
  const vertexCount = p.length / 3;
  if (triCount < 4) return 0;
  // Triangles around each vertex.
  const start = new Uint32Array(vertexCount + 1);
  for (let k = 0; k < idx.length; k++) start[idx[k]! + 1]!++;
  for (let v = 0; v < vertexCount; v++) start[v + 1]! += start[v]!;
  const fill = start.slice(0, vertexCount);
  const around = new Uint32Array(idx.length);
  for (let k = 0; k < idx.length; k++) around[fill[idx[k]!]!++] = (k / 3) | 0;

  // For each side of each triangle: the one triangle across it (-1: none or several), and whether it runs the same way.
  const across = new Int32Array(triCount * 3).fill(-1);
  const same = new Uint8Array(triCount * 3);
  const open = new Uint8Array(triCount * 3);
  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const a = idx[t * 3 + k]!;
      const b = idx[t * 3 + ((k + 1) % 3)]!;
      let found = -1;
      let count = 0;
      let direction = 0;
      for (let i = start[a]!; i < start[a + 1]!; i++) {
        const s = around[i]!;
        if (s === t) continue;
        const s0 = idx[s * 3]!;
        const s1 = idx[s * 3 + 1]!;
        const s2 = idx[s * 3 + 2]!;
        // Does s hold the side a→b (same way) or b→a (the way of a well-made neighbour)?
        const forward = (s0 === a && s1 === b) || (s1 === a && s2 === b) || (s2 === a && s0 === b);
        const backward = (s0 === b && s1 === a) || (s1 === b && s2 === a) || (s2 === b && s0 === a);
        if (!forward && !backward) continue;
        count++;
        found = s;
        direction = forward ? 1 : 0;
      }
      if (count === 1) {
        across[t * 3 + k] = found;
        same[t * 3 + k] = direction;
      } else open[t * 3 + k] = 1;
    }
  }

  // Each piece, by walking from triangle to triangle: which triangles to turn so that all agree.
  const turn = new Int8Array(triCount).fill(-1);
  const queue = new Int32Array(triCount);
  const members: number[] = [];
  let pieces = 0;
  for (let seed = 0; seed < triCount; seed++) {
    if (turn[seed] !== -1) continue;
    members.length = 0;
    let head = 0;
    let tail = 0;
    queue[tail++] = seed;
    turn[seed] = 0;
    let closed = true;
    let orientable = true;
    while (head < tail) {
      const t = queue[head++]!;
      members.push(t);
      for (let k = 0; k < 3; k++) {
        if (open[t * 3 + k]) {
          closed = false;
          continue;
        }
        const s = across[t * 3 + k]!;
        if (s < 0) continue;
        const want = turn[t]! ^ same[t * 3 + k]!;
        if (turn[s] === -1) {
          turn[s] = want;
          queue[tail++] = s;
        } else if (turn[s] !== want) orientable = false;
      }
    }
    if (!closed || !orientable) {
      for (const t of members) turn[t] = 0;
      continue;
    }
    // Volume as the triangles will be: negative, the whole piece is turned.
    let volume = 0;
    for (const t of members) {
      const a = idx[t * 3]! * 3;
      const b = idx[t * 3 + 1]! * 3;
      const c = idx[t * 3 + 2]! * 3;
      const det = p[a]! * (p[b + 1]! * p[c + 2]! - p[b + 2]! * p[c + 1]!) - p[a + 1]! * (p[b]! * p[c + 2]! - p[b + 2]! * p[c]!) + p[a + 2]! * (p[b]! * p[c + 1]! - p[b + 1]! * p[c]!);
      volume += turn[t] ? -det : det;
    }
    if (volume < 0) for (const t of members) turn[t] = turn[t] ? 0 : 1;
    let changed = false;
    for (const t of members) {
      if (!turn[t]) continue;
      changed = true;
      const b = idx[t * 3 + 1]!;
      idx[t * 3 + 1] = idx[t * 3 + 2]!;
      idx[t * 3 + 2] = b;
      turn[t] = 0;
    }
    if (changed) pieces++;
  }
  return pieces;
}
