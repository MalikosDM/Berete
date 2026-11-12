/*
 * The place of the 3D viewer, shared by the viewer and by what stands in its
 * place while it loads (./index.tsx), so that nothing jumps when it arrives.
 * On a computer, the choices (metals, background, lighting) stand beside the
 * jewel; on a phone, under it.
 */

/** The jewel, then the panel of choices on its right (computer). */
export const VIEWER_GRID = "lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]";

/** The size of the jewel's frame: as high as the screen allows on a computer, the panel beside it as high. */
export const CANVAS_SIZE = "aspect-[4/5] sm:aspect-[4/3] lg:aspect-auto lg:h-[min(80svh,52vw,800px)]";

/** The panel of choices: a card attached under the jewel (phone), beside it (computer). */
export const PANEL = "border border-white/10 bg-ink-soft";
