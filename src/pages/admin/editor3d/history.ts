/*
 * « Annuler / Rétablir » in the 3D editor (27/11/2026): the history of the draft settings, up to 100 steps. The moves of
 * one slider (the same setting changed while the pointer is held, or again within a moment) make a single step, as in
 * jewellers' tools; any other change is a step of its own.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const LIMIT = 100;
/** Changes of the same setting closer than this (ms) are one step, even without the pointer held (keys held, a colour picked). */
const QUICK = 350;

/** The settings that differ between two values ("scene.envMetal.intensity", "layers.Metal 01.metal"), at most 2 000. */
export function changedPaths(a: unknown, b: unknown, prefix = "", out: string[] = []): string[] {
  if (a === b || out.length >= 2000) return out;
  const plain = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
  // A group of settings that appears or goes (the scene written for the first time) counts by its settings.
  if ((plain(a) || a === undefined) && (plain(b) || b === undefined)) {
    const x = (a ?? {}) as Record<string, unknown>;
    const y = (b ?? {}) as Record<string, unknown>;
    for (const key of new Set([...Object.keys(x), ...Object.keys(y)])) changedPaths(x[key], y[key], prefix ? prefix + "." + key : key, out);
    return out;
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) out.push(prefix || "*");
  return out;
}

export class History<T> {
  past: T[] = [];
  future: T[] = [];
  private lastAt = 0;
  private lastPaths = new Set<string>();

  constructor(
    private readonly limit = LIMIT,
    private readonly quick = QUICK,
  ) {}

  /** A change from `before` to `next`; `held`: the pointer is down (a slider being dragged). False when nothing changed. */
  record(before: T, next: T, held = false, now = Date.now()): boolean {
    const paths = changedPaths(before, next);
    if (paths.length === 0) return false;
    // The same setting again (or a part of the last change: the first move of a slider can write the whole scene).
    const same = this.past.length > 0 && paths.every((p) => this.lastPaths.has(p) || [...this.lastPaths].some((l) => p.startsWith(l + ".")));
    const merge = same && (held ? now - this.lastAt < 4000 : now - this.lastAt < this.quick);
    if (!merge) {
      this.past.push(before);
      if (this.past.length > this.limit) this.past.shift();
    }
    this.future = [];
    this.lastAt = now;
    this.lastPaths = new Set(paths);
    return true;
  }

  undo(current: T): T | undefined {
    const previous = this.past.pop();
    if (previous === undefined) return undefined;
    this.future.push(current);
    this.lastPaths = new Set();
    return previous;
  }

  redo(current: T): T | undefined {
    const next = this.future.pop();
    if (next === undefined) return undefined;
    this.past.push(current);
    this.lastPaths = new Set();
    return next;
  }
}

/** Whether a pointer button is down on the page now (a slider being dragged). */
let pointerHeld = false;
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", () => (pointerHeld = true), true);
  for (const type of ["pointerup", "pointercancel", "blur"]) window.addEventListener(type, () => (pointerHeld = false), true);
}

/**
 * The history of a value held elsewhere (the draft of Models3D): `change` sets it and records a step, `undo` and `redo`
 * set it back. The value read is always the latest one (a ref), so quick changes never record a stale one.
 */
export function useHistory<T>(value: T | null, set: (next: T) => void) {
  const [history] = useState(() => new History<T>());
  const [counts, setCounts] = useState({ past: 0, future: 0 });
  const current = useRef(value);
  useEffect(() => {
    current.current = value;
  }, [value]);

  const after = useCallback(
    (next: T) => {
      current.current = next;
      set(next);
      setCounts({ past: history.past.length, future: history.future.length });
    },
    [history, set],
  );
  const change = useCallback(
    (next: T) => {
      const before = current.current;
      if (before !== null) history.record(before, next, pointerHeld);
      after(next);
    },
    [history, after],
  );
  const undo = useCallback(() => {
    const previous = current.current === null ? undefined : history.undo(current.current);
    if (previous === undefined) return false;
    after(previous);
    return true;
  }, [history, after]);
  const redo = useCallback(() => {
    const next = current.current === null ? undefined : history.redo(current.current);
    if (next === undefined) return false;
    after(next);
    return true;
  }, [history, after]);

  return { change, undo, redo, canUndo: counts.past > 0, canRedo: counts.future > 0, steps: counts.past };
}
