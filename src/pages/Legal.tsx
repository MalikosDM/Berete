import PageIntro from "@/components/PageIntro";

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

const LEGAL: Block[] = [
  {
    title: "Publisher",
    paragraphs: [
      "This website is published by Berete Jewellers, based in Dubai, United Arab Emirates.",
      "Trading name: Berete Jewellers. Registered office: Dubai, United Arab Emirates. Trade licence issued in Dubai. (Exemple à adapter : indiquez la raison sociale exacte, le numéro de licence commerciale et l'adresse complète.)",
      "Contact: via WhatsApp or the contact page of this website.",
    ],
  },
  {
    title: "Hosting",
    paragraphs: ["This website and its data are hosted by a professional cloud hosting provider on secured servers. (Exemple à adapter : indiquez le nom, l'adresse et le contact de votre hébergeur.)"],
  },
  {
    title: "Intellectual property",
    paragraphs: [
      "All designs, photographs, videos, texts and visual elements of this website are the property of Berete Jewellers or used with permission. Any reproduction, in whole or in part, without prior written consent is prohibited.",
      "Club names, trophies and player names are mentioned to describe pieces created for them and remain the property of their respective owners.",
    ],
  },
  {
    title: "Liability",
    paragraphs: [
      "Information on this website is provided for presentation purposes. Pieces shown are custom creations; every new piece is quoted individually.",
    ],
  },
];

const PRIVACY: Block[] = [
  {
    title: "Data we collect",
    paragraphs: [
      "When you ask for a call back, we collect your name, your phone number and, when relevant, the piece you are interested in. When you write to us by email, we collect your name, your email address and your message.",
      "Page views are measured without cookies and without identifying you.",
    ],
  },
  {
    title: "Why we use it",
    paragraphs: ["Only to answer your request, prepare your quote and follow your project. We never sell your data."],
  },
  {
    title: "WhatsApp",
    paragraphs: [
      "Buttons marked WhatsApp open a conversation on WhatsApp, a service operated by a third party under its own privacy policy. Messages you send there are handled within WhatsApp.",
    ],
  },
  {
    title: "Retention",
    paragraphs: ["Contact and call-back requests are kept for up to three years after our last exchange, then deleted. (Exemple à adapter selon votre pratique réelle de conservation.)"],
  },
  {
    title: "Your rights",
    paragraphs: [
      "You may ask to access, correct or delete your data at any time by contacting us through WhatsApp or the contact page.",
    ],
  },
];

export default function Legal() {
  return (
    <>
      <PageIntro eyebrow="Information" title="Legal notice" />
      <PolicyPanel blocks={LEGAL} updated="Provisional version. Passages marked “exemple à adapter” are examples to adapt before launch." />
    </>
  );
}

export function Privacy() {
  return (
    <>
      <PageIntro eyebrow="Information" title="Privacy policy" />
      <PolicyPanel blocks={PRIVACY} updated="Provisional version. Passages marked “exemple à adapter” are examples to adapt before launch." />
    </>
  );
}
