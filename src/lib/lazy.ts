/*
 * A part of the site loaded only when it is needed (the 3D viewer, the admin,
 * the private pages). After a new version of the site, a page opened before
 * asks for files that no longer exist: instead of breaking, the page loads
 * again once, from the new version. Still failing (no network), the error goes
 * on to what shows "could not be loaded" (see ../viewer/index.tsx).
 */
import { lazy } from "react";

const KEY = "bj-reloaded-at";

/** What React's lazy() takes: a function that imports a module whose default export is a component. */
type Load = Parameters<typeof lazy>[0];

export function lazyPart<L extends Load>(load: L) {
  return lazy<Awaited<ReturnType<L>>["default"]>(() =>
    load().catch((error: unknown) => {
      let last = 0;
      try {
        last = Number(window.sessionStorage.getItem(KEY) ?? 0);
      } catch {
        // No storage: the time of the last reload cannot be kept, so no reload (below), never a loop.
      }
      // Once only: a page that still fails after loading again does not reload in a loop.
      if (Date.now() - last < 15_000) throw error;
      try {
        window.sessionStorage.setItem(KEY, String(Date.now()));
      } catch {
        throw error;
      }
      window.location.reload();
      return new Promise<never>(() => undefined);
    }),
  );
}
