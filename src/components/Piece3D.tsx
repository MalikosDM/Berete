import { useEffect, useState } from "react";
import BrandIcon from "@/components/BrandIcon";
import type { PublicModel } from "@/data/models";
import type { Piece } from "@/data/types";
import { useI18n } from "@/i18n";
import { afterLoad } from "@/lib/idle";
import { metalsInWords, pieceModel } from "@/lib/models";
import { waLink } from "@/lib/site";
import { Jewel3D, type Selection } from "@/viewer";

/**
 * "Explore in 3D" on the page of a piece, when the jeweller attached a model
 * to it (admin, 3D). Asked once the page has loaded; the viewer itself loads
 * when it comes near the screen. The WhatsApp button names the metals chosen.
 */
export default function Piece3D({ piece }: { piece: Piece }) {
  const { t, intl } = useI18n();
  const [model, setModel] = useState<PublicModel | null>(null);
  const [selection, setSelection] = useState<Selection>([]);
  useEffect(() => {
    let alive = true;
    const cancel = afterLoad(() => {
      pieceModel(piece.slug)
        .then((m) => alive && setModel(m))
        .catch(() => undefined);
    });
    return () => {
      alive = false;
      cancel();
    };
  }, [piece.slug]);
  if (!model) return null;
  const metals = metalsInWords(selection, t.viewer, intl);
  return (
    <section aria-labelledby="piece-3d-title" data-piece-3d className="mx-auto max-w-[1600px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">3D</p>
          <h2 id="piece-3d-title" className="title-caps mt-4 text-[clamp(2rem,5vw,4rem)] tracking-[0.12em]">{t.viewer.title}</h2>
          <p className="mt-4 max-w-2xl text-lg text-bone">{t.viewer.intro}</p>
        </div>
      </div>
      <Jewel3D model={model} words={t.viewer} onSelection={setSelection} className="mt-10" />
      <a href={waLink(t.viewer.wantMessage(piece.title, metals))} target="_blank" rel="noreferrer" data-want-3d className="mt-8 inline-flex min-h-14 w-full items-center justify-center gap-3 bg-white px-7 text-base font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-rose-light sm:w-auto">
        <BrandIcon name="whatsapp" className="size-5" /> {t.viewer.want}
      </a>
    </section>
  );
}
