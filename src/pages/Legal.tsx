import PageIntro from "@/components/PageIntro";
import { useI18n } from "@/i18n";

type Block = { title: string; paragraphs: string[] };

function PolicyPanel({ blocks, updated }: { blocks: Block[]; updated: string }) {
  return (
    <section className="bg-ink pb-28 lg:pb-40">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <div className="bg-bone px-6 py-12 text-ink sm:px-12 sm:py-16">
          <p className="text-base text-ink/80">{updated}</p>
          {blocks.map((b) => (
            <div key={b.title} className="mt-12 first-of-type:mt-8">
              <h2 className="font-display text-3xl font-normal uppercase tracking-[0.12em] text-ink">{b.title}</h2>
              <div className="mt-4 h-px w-16 bg-rose-deep" aria-hidden="true" />
              {b.paragraphs.map((p, i) => (
                <p key={i} className="mt-4 text-base leading-relaxed text-ink sm:text-lg">
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Legal() {
  const { t } = useI18n();
  return (
    <>
      <PageIntro eyebrow={t.legal.eyebrow} title={t.legal.legalTitle} />
      <PolicyPanel blocks={t.legal.legal} updated={t.legal.updated} />
    </>
  );
}

export function Privacy() {
  const { t } = useI18n();
  return (
    <>
      <PageIntro eyebrow={t.legal.eyebrow} title={t.legal.privacyTitle} />
      <PolicyPanel blocks={t.legal.privacy} updated={t.legal.updated} />
    </>
  );
}
