/*
 * The 3D viewer, loaded only when it comes near the screen: three.js and its
 * tools (about 1 MB) never slow down the pages that do not show a model. If it
 * cannot load, it says so in its place (with "Retry"): the page stays.
 */
import { Component, Suspense, useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { lazyPart } from "@/lib/lazy";
import type { PublicModel } from "@/data/models";
import type { Messages } from "@/i18n";
import type { Selection, ViewerHandle } from "./JewelViewer";
import { CANVAS_SIZE, PANEL, VIEWER_GRID } from "./layout";

const JewelViewer = lazyPart(() => import("./JewelViewer"));

export type { Selection, ViewerHandle };

type Props = {
  model: PublicModel;
  words: Messages["viewer"];
  highlight?: string | null;
  settings?: PublicModel["settings"];
  onSelection?: (selection: Selection) => void;
  /** Buttons at the foot of the panel of choices (WhatsApp): beside the jewel, right under the metals. */
  actions?: ReactNode;
  className?: string;
  /** Load at once (private link, admin) instead of when it comes near the screen. */
  eager?: boolean;
  ref?: Ref<ViewerHandle>;
};

/** In the viewer's place while it loads (or when it could not): the same frame, and the panel of choices beside it (computer). */
function Waiting({ model, words, className = "", failed = false }: { model: PublicModel; words: Messages["viewer"]; className?: string; failed?: boolean }) {
  return (
    <div className={VIEWER_GRID + " lg:gap-4 " + className} data-viewer-failed={failed || undefined}>
      <div className={"relative flex w-full items-center justify-center overflow-hidden bg-ink " + CANVAS_SIZE} role="status">
        {model.poster ? <img src={model.poster} alt="" className="absolute inset-0 h-full w-full object-contain opacity-60" /> : null}
        {failed ? (
          <span className="relative flex flex-col items-center gap-4 px-6 text-center">
            <span className="text-base text-bone">{words.failed}</span>
            <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-12 items-center rounded-full border border-white/40 bg-ink/60 px-6 text-base text-white hover:border-rose-light hover:text-rose-light">
              {words.retry}
            </button>
          </span>
        ) : (
          <span className="relative text-base text-bone">{words.preparing}</span>
        )}
      </div>
      <div className={"hidden lg:block " + PANEL} aria-hidden="true" />
    </div>
  );
}

/** Whatever breaks inside the viewer stays inside it: "could not be loaded" in its place, the rest of the page untouched. */
class Guard extends Component<{ fallback: ReactNode; children: ReactNode }, { broken: boolean }> {
  override state = { broken: false };

  static getDerivedStateFromError() {
    return { broken: true };
  }

  override render() {
    return this.state.broken ? this.props.fallback : this.props.children;
  }
}

export function Jewel3D({ eager = false, ...props }: Props) {
  const spot = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(() => eager || typeof IntersectionObserver === "undefined");
  useEffect(() => {
    if (near || !spot.current) return undefined;
    const io = new IntersectionObserver(([entry]) => entry?.isIntersecting && setNear(true), { rootMargin: "400px 0px" });
    io.observe(spot.current);
    return () => io.disconnect();
  }, [near]);
  if (!near) {
    return (
      <div ref={spot}>
        <Waiting model={props.model} words={props.words} className={props.className} />
      </div>
    );
  }
  return (
    <Guard fallback={<Waiting model={props.model} words={props.words} className={props.className} failed />}>
      <Suspense fallback={<Waiting model={props.model} words={props.words} className={props.className} />}>
        <JewelViewer {...props} />
      </Suspense>
    </Guard>
  );
}
