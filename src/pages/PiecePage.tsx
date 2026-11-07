import { Link, useParams } from "react-router";
import { ArrowLeft, ArrowRight, ArrowUpRight, Gift, Newspaper } from "lucide-react";
import ContactBlock from "@/components/ContactBlock";
import HorizontalGallery from "@/components/HorizontalGallery";
import { Img, MediaView } from "@/components/Media";
import Reveal from "@/components/Reveal";
import { findPiece, peopleOf, TYPE_LABELS } from "@/data/relations";
import { useCatalogue } from "@/lib/catalogue";
import NotFound from "@/pages/NotFound";

const shadow = "[text-shadow:0_2px_30px_rgba(0,0,0,0.75)]";

/** The page of one piece (a "capsule"): /pieces/:slug. */
export default function PiecePage() {
  const { slug = "" } = useParams();
  const cat = useCatalogue();
  const piece = findPiece(cat, slug);
  if (!piece) return <NotFound />;

  const index = cat.pieces.indexOf(piece);
  const next = cat.pieces.length > 1 ? cat.pieces[(index + 1) % cat.pieces.length] : undefined;
  const people = peopleOf(cat, piece);
  const box = piece.boxSlug ? cat.boxes.find((b) => b.slug === piece.boxSlug) : undefined;
  const client = piece.clientPublic ? piece.client : null;

  return (
    <article>
      {/* Opening: the jewel, hero of the screen */}
      <section className="relative mx-auto grid min-h-svh max-w-[1600px] items-center gap-10 px-5 pt-32 pb-16 sm:px-8 lg:grid-cols-12 lg:px-12 lg:pt-28">
        <div className="relative z-10 lg:col-span-5">
          <Link to="/creations" className="inline-flex min-h-12 items-center gap-2 text-base font-semibold uppercase tracking-[0.16em] text-bone hover:text-rose-light">
            <ArrowLeft className="size-4" aria-hidden="true" /> All creations
          </Link>
          <p className="eyebrow mt-8">
            {TYPE_LABELS[piece.type]}
            {client ? " · " + client : ""}
          </p>
          <h1 className={"title-caps mt-5 text-[clamp(2.5rem,6vw,5.5rem)] tracking-[0.06em] break-words text-white [text-wrap:balance] " + shadow}>{piece.title}</h1>
          {piece.line ? <p className="mt-6 max-w-xl text-xl text-bone">{piece.line}</p> : null}
          {piece.story ? <p className="mt-6 max-w-xl text-lg text-mist">{piece.story}</p> : null}
        </div>
        <div className="relative h-[62svh] lg:col-span-7 lg:h-[82svh]">
          <MediaView item={piece.cover} alt={piece.cover.alt ?? piece.title} fit="contain" eager />
        </div>
      </section>

      {piece.gallery.length > 0 ? <HorizontalGallery items={piece.gallery} title="The details" /> : null}

      {piece.handover.length > 0 ? (
        <section aria-labelledby="handover-title" className="mx-auto max-w-[1600px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
          <p className="eyebrow">Delivered</p>
          <h2 id="handover-title" className="title-caps mt-5 text-[clamp(2rem,5vw,4rem)] tracking-[0.12em]">
            {client ? "Handed over to " + client : "The handover"}
          </h2>
          <ul className={"mt-12 grid gap-8 " + (piece.handover.length > 1 ? "md:grid-cols-2" : "")}>
            {piece.handover.map((m) => (
              <li key={m.src}>
                <Reveal>
                  <figure>
                    <span className="block aspect-[4/5] overflow-hidden bg-ink-soft">
                      <MediaView item={m} fit="cover" />
                    </span>
                    {m.caption ? <figcaption className="mt-4 text-base text-bone">{m.caption}</figcaption> : null}
                  </figure>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Technical sheet, box, press, people */}
      <section aria-labelledby="sheet-title" className="mx-auto grid max-w-[1600px] gap-16 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:px-12 lg:py-32">
        <div className="lg:col-span-6">
          <h2 id="sheet-title" className="title-caps text-[clamp(1.75rem,4vw,3rem)] tracking-[0.14em]">Technical sheet</h2>
          {piece.specs.length > 0 ? (
            <dl className="mt-8 border-t border-white/15">
              {piece.specs.map((s) => (
                <div key={s.label} className="grid gap-2 border-b border-white/15 py-5 sm:grid-cols-3 sm:gap-6">
                  <dt className="text-base font-semibold uppercase tracking-[0.16em] text-rose-light">{s.label}</dt>
                  <dd className="text-lg text-white sm:col-span-2">{s.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-8 text-lg text-bone">Full specifications shared on request.</p>
          )}
          {box ? (
            <Link to="/boxes" className="group mt-10 flex items-center gap-5 border border-white/15 p-4 transition-colors hover:border-rose-light">
              <span className="block size-24 shrink-0 overflow-hidden bg-ink-soft">{box.images[0] ? <MediaView item={box.images[0]} fit="cover" /> : null}</span>
              <span>
                <span className="inline-flex items-center gap-2 text-base font-semibold uppercase tracking-[0.16em] text-white group-hover:text-rose-light">
                  <Gift className="size-5 text-rose-light" aria-hidden="true" /> Custom box available
                </span>
                <span className="mt-2 block text-base text-bone">Delivered in the {box.name} box, made for it.</span>
              </span>
            </Link>
          ) : null}
        </div>

        <div className="space-y-14 lg:col-span-5 lg:col-start-8">
          {people.length > 0 ? (
            <div>
              <h2 className="eyebrow">Worn by</h2>
              <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
                {people.map((p) => (
                  <li key={p.slug}>
                    <Link to={"/players/" + p.slug} className="inline-flex min-h-12 items-baseline gap-2 font-display text-2xl uppercase tracking-[0.06em] text-white hover:text-rose-light">
                      {p.number !== null ? <span className="text-rose-gold text-lg">{p.number}</span> : null}
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {piece.press.length > 0 ? (
            <div id="press">
              <h2 className="eyebrow">Press</h2>
              <ul className="mt-5 border-t border-white/15">
                {piece.press.map((p) => (
                  <li key={p.outlet + p.title} className="border-b border-white/15 py-5">
                    <div className="flex items-start gap-5">
                      {p.image ? <Img src={p.image} alt={p.outlet + " article"} loading="lazy" className="h-28 w-20 shrink-0 object-cover object-top" /> : <Newspaper className="mt-1 size-5 shrink-0 text-rose-light" aria-hidden="true" />}
                      <div>
                        <p className="text-base font-semibold uppercase tracking-[0.16em] text-rose-light">{p.outlet}</p>
                        <p className="mt-2 text-lg text-white">{p.title}</p>
                        {p.url ? (
                          <a href={p.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-12 items-center gap-2 text-base font-semibold text-white underline-offset-4 hover:text-rose-light hover:underline">
                            Read the article <ArrowUpRight className="size-4" aria-hidden="true" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {next && next.slug !== piece.slug ? (
            <Link to={"/pieces/" + next.slug} className="group flex min-h-12 items-center justify-between gap-4 border-t border-white/15 pt-8">
              <span>
                <span className="eyebrow block">Next piece</span>
                <span className="title-caps mt-3 block text-2xl tracking-[0.08em] text-white group-hover:text-rose-light">{next.title}</span>
              </span>
              <ArrowRight className="size-6 shrink-0 text-white group-hover:text-rose-light" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </section>

      <ContactBlock pieceName={piece.title} compact id="piece-contact" />
    </article>
  );
}
