/*
 * « The House » on the home page, after Press (Yoni and Malik, 28/11/2026): a short summary of the story of Yoni Berete, made
 * only of sentences of the chapters of the page The House (src/i18n/house/<lang>.ts), in each language its validated
 * translation: who he is and where he comes from (two continents), how he began (Antwerp, 2020), what drives him (the bridge
 * between diamonds and football, the freedom to be himself), then Dubai in 2025. Nothing added: from the second sentence on
 * his name becomes « he » (SWAPS), and the last sentence of the page loses its « Because » (LEADS). tests/accueil2811.spec.ts builds
 * each summary again from the chapters with this recipe and compares it with the text below, character for character.
 * Malik can write another one in the admin (« Textes de l'accueil », block « house-summary »), language by language.
 */
import type { HomeLang } from "./homeTexts.js";

/**
 * The recipe: [chapter, paragraph] (from 0), its sentence (from 0) when only one is kept, whether his name becomes « he »,
 * whether the word that tied it to the sentence before is left out (LEADS).
 */
export const HOUSE_SUMMARY_PARTS: { chapter: number; paragraph: number; sentence?: number; pronoun?: boolean; lead?: boolean }[] = [
  // 1. A legacy across two continents: born in Belgium, a family bound to the diamond.
  { chapter: 0, paragraph: 0 },
  // 4. Antwerp, at the heart of the diamond.
  { chapter: 3, paragraph: 0, pronoun: true },
  // 5. 2020 — A beginning out of time.
  { chapter: 4, paragraph: 0, pronoun: true },
  // 10. Building a bridge between diamonds and football: his grandfather's bridge between Africa and Antwerp, then his own.
  { chapter: 9, paragraph: 6 },
  { chapter: 9, paragraph: 7, pronoun: true },
  // 12. Writing his own legacy: the freedom to embrace his identity (its last words; « Because » left with the sentence before).
  { chapter: 11, paragraph: 6, lead: true },
  // 11. 2025 — From Belgium to Dubai.
  { chapter: 10, paragraph: 1 },
];

/** His name, then « he » (the first that fits; in Spanish and Arabic the verb says it alone). */
export const HOUSE_SUMMARY_SWAPS: Record<HomeLang, [string, string][]> = {
  en: [["Yoni Berete", "he"]],
  fr: [["que Yoni Berete", "qu’il"], ["Yoni Berete", "il"]],
  es: [["Yoni Berete ", ""]],
  de: [["Yoni Berete", "er"]],
  nl: [["Yoni Berete", "hij"]],
  ar: [["يوني بيريتي ", ""]],
};
/** A sentence kept alone loses the word that tied it to the one before (« Because »), its next word then begins it. */
export const HOUSE_SUMMARY_LEADS: Record<HomeLang, string> = { en: "Because ", fr: "Parce que ", es: "Porque ", de: "Denn ", nl: "Want ", ar: "لأن " };

/** The summary in each language (built from the chapters with the recipe above; the test checks it). */
export const HOUSE_SUMMARY: Record<HomeLang, string> = {
  en: "Born in Belgium, Yoni Berete grew up in a family whose story is deeply bound to the diamond. It was while living in Antwerp that he built his own expertise and his professional network within the diamond industry. In January 2020, he set out as an entrepreneur. Once, his grandfather had built a bridge between Africa and Antwerp. In turn, he builds his own, between diamonds and football, between high jewellery and contemporary culture. True singularity does not lie in choosing one identity, but in the freedom to embrace it in its entirety. In 2025, he decided to open a new chapter by moving his business to Dubai.",
  fr: "Né en Belgique, Yoni Berete grandit au sein d’une famille dont l’histoire est profondément liée au diamant. C’est en vivant à Anvers qu’il développe sa propre expertise et construit son réseau professionnel au sein de l’industrie diamantaire. En janvier 2020, il se lance dans l’entrepreneuriat. Autrefois, son grand-père avait créé un pont entre l’Afrique et Anvers. À son tour, il crée le sien, entre le diamant et le football, entre la haute joaillerie et la culture contemporaine. La véritable singularité ne réside pas dans le choix d’une identité, mais dans la liberté de l’assumer dans son intégralité. En 2025, il décide d’ouvrir un nouveau chapitre en exportant son activité à Dubaï.",
  es: "Nacido en Bélgica, Yoni Berete creció en una familia cuya historia está profundamente ligada al diamante. Fue durante su etapa en Amberes cuando desarrolló su propia pericia y construyó su red profesional en la industria del diamante. En enero de 2020, se lanzó a emprender. En su día, su abuelo tendió un puente entre África y Amberes. A su vez, tiende el suyo, entre el diamante y el fútbol, entre la alta joyería y la cultura contemporánea. La verdadera singularidad no está en elegir una identidad, sino en la libertad de asumirla por completo. En 2025, decidió abrir un nuevo capítulo trasladando su actividad a Dubái.",
  de: "Yoni Berete wurde in Belgien geboren und wuchs in einer Familie auf, deren Geschichte zutiefst mit dem Diamanten verbunden ist. In seiner Zeit in Antwerpen baute er seine eigene Expertise und sein berufliches Netzwerk in der Diamantenbranche auf. Im Januar 2020 wagte er den Schritt in die Selbstständigkeit. Einst hatte sein Großvater eine Brücke zwischen Afrika und Antwerpen geschlagen. Heute schlägt er seine eigene – zwischen Diamant und Fußball, zwischen Haute Joaillerie und zeitgenössischer Kultur. Wahre Einzigartigkeit liegt nicht darin, sich für eine Identität zu entscheiden, sondern in der Freiheit, sie in ihrer Ganzheit anzunehmen. 2025 beschloss er, ein neues Kapitel aufzuschlagen und sein Geschäft nach Dubai zu verlegen.",
  nl: "Yoni Berete werd geboren in België en groeide op in een familie waarvan de geschiedenis diep verweven is met de diamant. Tijdens zijn jaren in Antwerpen bouwde hij zijn eigen expertise en zijn professionele netwerk in de diamantsector op. In januari 2020 zette hij de stap naar het ondernemerschap. Ooit sloeg zijn grootvader een brug tussen Afrika en Antwerpen. Op zijn beurt slaat hij de zijne, tussen diamant en voetbal, tussen haute joaillerie en hedendaagse cultuur. Ware uniciteit schuilt niet in de keuze voor één identiteit, maar in de vrijheid om die in haar geheel te omarmen. In 2025 besloot hij een nieuw hoofdstuk te openen door zijn activiteiten naar Dubai te verhuizen.",
  ar: "وُلد يوني بيريتي في بلجيكا، ونشأ في كنف عائلة يرتبط تاريخها ارتباطاً وثيقاً بالألماس. خلال إقامته في أنتويرب، طوّر خبرته الخاصة وبنى شبكة علاقاته المهنية في قلب صناعة الألماس. في يناير 2020، خاض غمار ريادة الأعمال. في الماضي، مدّ جدّه جسراً بين أفريقيا وأنتويرب. واليوم، يمدّ بدوره جسره الخاص، بين الألماس وكرة القدم، بين المجوهرات الراقية والثقافة المعاصرة. التفرّد الحقيقي لا يكمن في اختيار هوية واحدة، بل في حرية احتضانها بكل أبعادها. وفي عام 2025، قرّر أن يفتح فصلاً جديداً بنقل نشاطه إلى دبي.",
};

/** Builds a summary again from the chapters of a language (the test of the page uses it). */
export function composeHouseSummary(chapters: { paragraphs: string[] }[], lang: HomeLang): string {
  return HOUSE_SUMMARY_PARTS.map(({ chapter, paragraph, sentence, pronoun, lead }) => {
    let text = chapters[chapter]!.paragraphs[paragraph]!;
    if (sentence !== undefined) text = text.split(/(?<=[.!?])\s+/)[sentence]!;
    if (lead && text.startsWith(HOUSE_SUMMARY_LEADS[lang])) {
      text = text.slice(HOUSE_SUMMARY_LEADS[lang].length);
      text = text.charAt(0).toLocaleUpperCase(lang) + text.slice(1);
    }
    if (pronoun) {
      const swap = HOUSE_SUMMARY_SWAPS[lang].find(([from]) => text.includes(from));
      if (swap) text = text.replace(swap[0], swap[1]);
    }
    return text;
  }).join(" ");
}
