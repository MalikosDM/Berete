/*
 * Heavy downloads wait until the page is on screen: they would otherwise
 * share the phone's connection with the text and photos the visitor sees
 * first.
 */

type Options = {
  /** Extra wait once the page has loaded, in milliseconds. */
  delay?: number;
  /** Start at once on the visitor's first gesture (scroll, touch, click, key). */
  onGesture?: boolean;
};

const GESTURES = ["scroll", "wheel", "touchstart", "pointerdown", "keydown"] as const;

/** Runs `run` once, after the page has loaded and the browser is idle. Returns a function that cancels it. */
export function afterLoad(run: () => void, { delay = 0, onGesture = false }: Options = {}): () => void {
  let done = false;
  let timer = 0;
  let idle = 0;
  const go = () => {
    if (done) return;
    done = true;
    cleanup();
    run();
  };
  const whenIdle = () => {
    if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(go, { timeout: 2000 });
    else timer = window.setTimeout(go, 1);
  };
  const onLoad = () => {
    timer = window.setTimeout(whenIdle, delay);
  };
  function cleanup() {
    window.clearTimeout(timer);
    if (idle && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
    window.removeEventListener("load", onLoad);
    if (onGesture) for (const g of GESTURES) window.removeEventListener(g, go);
  }

  if (onGesture) for (const g of GESTURES) window.addEventListener(g, go, { passive: true, once: true });
  if (document.readyState === "complete") onLoad();
  else window.addEventListener("load", onLoad, { once: true });
  return () => {
    done = true;
    cleanup();
  };
}
