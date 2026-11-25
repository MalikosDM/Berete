/*
 * What the code of the pages expects from its build (vite.config.ts, "define"), for the few files the server shares with
 * the pages: src/lib/site.ts (the contact details of the house, kept in one place) reads __HAS_SERVER__. Imported first.
 */
declare global {
  var __HAS_SERVER__: boolean;
}
globalThis.__HAS_SERVER__ = true;

export {};
