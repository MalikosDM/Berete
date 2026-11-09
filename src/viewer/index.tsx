/*
 * The 3D viewer, loaded only when it comes near the screen: three.js and its
 * tools (about 1 MB) never slow down the pages that do not show a model.
 */
import { lazy, Suspense, useEffect, useRef, useState, type Ref } from "react";
import type { PublicModel } from "@/data/models";
import type { Messages } from "@/i18n";
import type { Selection, ViewerHandle } from "./JewelViewer";

const JewelViewer = lazy(() => import("./JewelViewer"));

export type { Selection, ViewerHandle };

type Props = {
  model: PublicModel;
  words: Messages["viewer"];
  highlight?: string | null;
  settings?: PublicModel["settings"];
  onSelection?: (selection: Selection) => void;
  className?: string;
  /** Load at once (private link, admin) instead of when it comes near the screen. */
  eager?: boolean;
  ref?: Ref<ViewerHandle>;
};

function Waiting({ model, words }: { model: PublicModel; words: Messages["viewer"] }) {
  return (
    <div className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden bg-ink sm:aspect-[4/3] lg:aspect-[16/10]" role="status">
      {model.poster ? <img src={model.poster} alt="" className="absolute inset-0 h-full w-full object-contain opacity-60" /> : null}
      <span className="relative text-base text-bone">{words.preparing}</span>
    </div>
  );
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
        <Waiting model={props.model} words={props.words} />
      </div>
    );
  }
  return (
    <Suspense fallback={<Waiting model={props.model} words={props.words} />}>
      <JewelViewer {...props} />
    </Suspense>
  );
}
