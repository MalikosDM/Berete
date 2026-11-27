/*
 * The words the client reads in the 3D viewer (../JewelViewer.tsx) beyond those of the site (src/i18n/ui, `viewer`), in the
 * six languages of the site (27/11/2026): the names of the materials of the configurator (made from their id in the
 * library, ../library/materials.ts), the name of a group of chips, the colours of the stones, the views the admin named in
 * French, the view in the client's space with WebXR (../webxr.ts) and the frame of the embed code (src/pages/Embed3D.tsx).
 * English and French are the house's; Spanish, German, Dutch and Arabic are translated from the English (to be read again
 * by natives, like the rest). The coloured stones are named by their colour, never by their name (the rule of the house).
 *
 * The admin types the names of his chips in French: they are shown as typed on a French page, or when nothing here
 * translates them (a name of his own).
 */
import { bundleOf, LOCALES, type Locale, type Messages } from "@/i18n";
import type { MetalId } from "@/data/models";
import type { Configurator } from "@/data/scene3d";

export type ViewerLang = Locale;

type Finish = "polished" | "satin" | "brushed" | "hammered" | "aged";
type Stone = "diamond" | "diamond-no-fire" | "diamond-yellow" | "diamond-pink" | "diamond-champagne" | "diamond-black" | "sapphire-blue" | "sapphire-pink" | "ruby" | "emerald";

export type ViewerWords = {
  finishes: Record<Finish, string>;
  stones: Record<Stone, string>;
  /** After the name of a stone with inclusions: "Diamond · with inclusions". */
  inclusions: string;
  pearls: { white: string; cream: string; tahiti: string; nacre: string };
  enamels: { black: string; white: string; red: string; green: string; pink: string };
  ceramicBlack: string;
  ceramicWhite: string;
  onyx: string;
  /** The name of a group of chips, from what it offers (a group of metals is `viewer.metal` of the site). */
  groups: { stones: string; pearls: string; enamel: string; material: string };
  /** The colours of the stones' swatches (read aloud). */
  stoneColors: { white: string; red: string; green: string; pink: string; yellow: string; black: string };
  /** A view the admin left with its first name ("Vue 2"). */
  view: (n: number) => string;
  back: string;
  detail: string;
  /** WebXR (Android): what to do, then the size. */
  arScan: string;
  arTap: string;
  arPlaced: string;
  arTrueSize: string;
  arLarger: string;
  /** The frame of the embed code (another site), when its link no longer opens. */
  embedUnavailable: string;
  /** The small logo of the house in a corner (read aloud). */
  logo: string;
};

export const VIEWER_WORDS: Record<ViewerLang, ViewerWords> = {
  en: {
    finishes: { polished: "polished", satin: "satin", brushed: "brushed", hammered: "hammered", aged: "aged" },
    stones: {
      diamond: "Diamond",
      "diamond-no-fire": "Diamond, without fire",
      "diamond-yellow": "Yellow diamond",
      "diamond-pink": "Pink diamond",
      "diamond-champagne": "Champagne diamond",
      "diamond-black": "Black diamond",
      "sapphire-blue": "Blue stones",
      "sapphire-pink": "Pink stones",
      ruby: "Red stones",
      emerald: "Green stones",
    },
    inclusions: "with inclusions",
    pearls: { white: "White pearl", cream: "Cream pearl", tahiti: "Tahitian black pearl", nacre: "Mother-of-pearl" },
    enamels: { black: "Black enamel", white: "White enamel", red: "Red enamel", green: "Green enamel", pink: "Pink enamel" },
    ceramicBlack: "Black lacquered ceramic",
    ceramicWhite: "White lacquered ceramic",
    onyx: "Onyx",
    groups: { stones: "Stones", pearls: "Pearl", enamel: "Enamel", material: "Material" },
    stoneColors: { white: "White", red: "Red", green: "Green", pink: "Pink", yellow: "Yellow", black: "Black" },
    view: (n) => "View " + n,
    back: "Back",
    detail: "Detail",
    arScan: "Move your phone slowly over a table or the floor",
    arTap: "Tap to place the piece here",
    arPlaced: "Tap elsewhere to move it",
    arTrueSize: "Actual size",
    arLarger: "Larger",
    embedUnavailable: "This 3D view is no longer available.",
    logo: "Berete Jewellers",
  },
  fr: {
    finishes: { polished: "poli", satin: "satiné", brushed: "brossé", hammered: "martelé", aged: "vieilli" },
    stones: {
      diamond: "Diamant",
      "diamond-no-fire": "Diamant, sans feu",
      "diamond-yellow": "Diamant jaune",
      "diamond-pink": "Diamant rose",
      "diamond-champagne": "Diamant champagne",
      "diamond-black": "Diamant noir",
      "sapphire-blue": "Pierres bleues",
      "sapphire-pink": "Pierres roses",
      ruby: "Pierres rouges",
      emerald: "Pierres vertes",
    },
    inclusions: "avec inclusions",
    pearls: { white: "Perle blanche", cream: "Perle crème", tahiti: "Perle noire de Tahiti", nacre: "Nacre" },
    enamels: { black: "Émail noir", white: "Émail blanc", red: "Émail rouge", green: "Émail vert", pink: "Émail rose" },
    ceramicBlack: "Céramique laquée noire",
    ceramicWhite: "Céramique laquée blanche",
    onyx: "Onyx",
    groups: { stones: "Pierres", pearls: "Perle", enamel: "Émail", material: "Matière" },
    stoneColors: { white: "Blanc", red: "Rouge", green: "Vert", pink: "Rose", yellow: "Jaune", black: "Noir" },
    view: (n) => "Vue " + n,
    back: "Dos",
    detail: "Détail",
    arScan: "Passez lentement le téléphone au-dessus d’une table ou du sol",
    arTap: "Touchez pour poser la pièce ici",
    arPlaced: "Touchez ailleurs pour la déplacer",
    arTrueSize: "Taille réelle",
    arLarger: "Plus grande",
    embedUnavailable: "Cette vue 3D n’est plus disponible.",
    logo: "Berete Jewellers",
  },
  es: {
    finishes: { polished: "pulido", satin: "satinado", brushed: "cepillado", hammered: "martillado", aged: "envejecido" },
    stones: {
      diamond: "Diamante",
      "diamond-no-fire": "Diamante, sin fuego",
      "diamond-yellow": "Diamante amarillo",
      "diamond-pink": "Diamante rosa",
      "diamond-champagne": "Diamante champán",
      "diamond-black": "Diamante negro",
      "sapphire-blue": "Piedras azules",
      "sapphire-pink": "Piedras rosas",
      ruby: "Piedras rojas",
      emerald: "Piedras verdes",
    },
    inclusions: "con inclusiones",
    pearls: { white: "Perla blanca", cream: "Perla crema", tahiti: "Perla negra de Tahití", nacre: "Nácar" },
    enamels: { black: "Esmalte negro", white: "Esmalte blanco", red: "Esmalte rojo", green: "Esmalte verde", pink: "Esmalte rosa" },
    ceramicBlack: "Cerámica lacada negra",
    ceramicWhite: "Cerámica lacada blanca",
    onyx: "Ónix",
    groups: { stones: "Piedras", pearls: "Perla", enamel: "Esmalte", material: "Material" },
    stoneColors: { white: "Blanco", red: "Rojo", green: "Verde", pink: "Rosa", yellow: "Amarillo", black: "Negro" },
    view: (n) => "Vista " + n,
    back: "Reverso",
    detail: "Detalle",
    arScan: "Mueva el teléfono despacio sobre una mesa o el suelo",
    arTap: "Toque para colocar la pieza aquí",
    arPlaced: "Toque en otro lugar para moverla",
    arTrueSize: "Tamaño real",
    arLarger: "Más grande",
    embedUnavailable: "Esta vista 3D ya no está disponible.",
    logo: "Berete Jewellers",
  },
  de: {
    finishes: { polished: "poliert", satin: "satiniert", brushed: "gebürstet", hammered: "gehämmert", aged: "patiniert" },
    stones: {
      diamond: "Diamant",
      "diamond-no-fire": "Diamant, ohne Feuer",
      "diamond-yellow": "Gelber Diamant",
      "diamond-pink": "Rosa Diamant",
      "diamond-champagne": "Champagnerfarbener Diamant",
      "diamond-black": "Schwarzer Diamant",
      "sapphire-blue": "Blaue Steine",
      "sapphire-pink": "Rosa Steine",
      ruby: "Rote Steine",
      emerald: "Grüne Steine",
    },
    inclusions: "mit Einschlüssen",
    pearls: { white: "Weiße Perle", cream: "Cremefarbene Perle", tahiti: "Schwarze Tahitiperle", nacre: "Perlmutt" },
    enamels: { black: "Schwarze Emaille", white: "Weiße Emaille", red: "Rote Emaille", green: "Grüne Emaille", pink: "Rosa Emaille" },
    ceramicBlack: "Schwarze lackierte Keramik",
    ceramicWhite: "Weiße lackierte Keramik",
    onyx: "Onyx",
    groups: { stones: "Steine", pearls: "Perle", enamel: "Emaille", material: "Material" },
    stoneColors: { white: "Weiß", red: "Rot", green: "Grün", pink: "Rosa", yellow: "Gelb", black: "Schwarz" },
    view: (n) => "Ansicht " + n,
    back: "Rückseite",
    detail: "Detail",
    arScan: "Bewegen Sie das Telefon langsam über einen Tisch oder den Boden",
    arTap: "Tippen Sie, um das Stück hier abzulegen",
    arPlaced: "Tippen Sie woanders hin, um es zu verschieben",
    arTrueSize: "Originalgröße",
    arLarger: "Größer",
    embedUnavailable: "Diese 3D-Ansicht ist nicht mehr verfügbar.",
    logo: "Berete Jewellers",
  },
  nl: {
    finishes: { polished: "gepolijst", satin: "gesatineerd", brushed: "geborsteld", hammered: "gehamerd", aged: "verouderd" },
    stones: {
      diamond: "Diamant",
      "diamond-no-fire": "Diamant, zonder vuur",
      "diamond-yellow": "Gele diamant",
      "diamond-pink": "Roze diamant",
      "diamond-champagne": "Champagnekleurige diamant",
      "diamond-black": "Zwarte diamant",
      "sapphire-blue": "Blauwe stenen",
      "sapphire-pink": "Roze stenen",
      ruby: "Rode stenen",
      emerald: "Groene stenen",
    },
    inclusions: "met insluitsels",
    pearls: { white: "Witte parel", cream: "Crèmekleurige parel", tahiti: "Zwarte Tahitiparel", nacre: "Parelmoer" },
    enamels: { black: "Zwart email", white: "Wit email", red: "Rood email", green: "Groen email", pink: "Roze email" },
    ceramicBlack: "Zwart gelakt keramiek",
    ceramicWhite: "Wit gelakt keramiek",
    onyx: "Onyx",
    groups: { stones: "Stenen", pearls: "Parel", enamel: "Email", material: "Materiaal" },
    stoneColors: { white: "Wit", red: "Rood", green: "Groen", pink: "Roze", yellow: "Geel", black: "Zwart" },
    view: (n) => "Weergave " + n,
    back: "Achterkant",
    detail: "Detail",
    arScan: "Beweeg uw telefoon langzaam boven een tafel of de vloer",
    arTap: "Tik om het stuk hier te plaatsen",
    arPlaced: "Tik ergens anders om het te verplaatsen",
    arTrueSize: "Ware grootte",
    arLarger: "Groter",
    embedUnavailable: "Deze 3D-weergave is niet meer beschikbaar.",
    logo: "Berete Jewellers",
  },
  ar: {
    finishes: { polished: "مصقول", satin: "ساتان", brushed: "مُصفّى بالفرشاة", hammered: "مطروق", aged: "معتّق" },
    stones: {
      diamond: "ألماس",
      "diamond-no-fire": "ألماس، بلا بريق ناري",
      "diamond-yellow": "ألماس أصفر",
      "diamond-pink": "ألماس وردي",
      "diamond-champagne": "ألماس بلون الشمبانيا",
      "diamond-black": "ألماس أسود",
      "sapphire-blue": "أحجار زرقاء",
      "sapphire-pink": "أحجار وردية",
      ruby: "أحجار حمراء",
      emerald: "أحجار خضراء",
    },
    inclusions: "مع شوائب",
    pearls: { white: "لؤلؤة بيضاء", cream: "لؤلؤة كريمية", tahiti: "لؤلؤة تاهيتي سوداء", nacre: "صدف اللؤلؤ" },
    enamels: { black: "مينا سوداء", white: "مينا بيضاء", red: "مينا حمراء", green: "مينا خضراء", pink: "مينا وردية" },
    ceramicBlack: "سيراميك مطلي أسود",
    ceramicWhite: "سيراميك مطلي أبيض",
    onyx: "عقيق يماني",
    groups: { stones: "الأحجار", pearls: "اللؤلؤ", enamel: "المينا", material: "المادة" },
    stoneColors: { white: "أبيض", red: "أحمر", green: "أخضر", pink: "وردي", yellow: "أصفر", black: "أسود" },
    view: (n) => "المنظر " + n,
    back: "الخلف",
    detail: "التفاصيل",
    arScan: "حرّك هاتفك ببطء فوق طاولة أو فوق الأرض",
    arTap: "المس الشاشة لوضع القطعة هنا",
    arPlaced: "المس مكانًا آخر لتحريكها",
    arTrueSize: "الحجم الحقيقي",
    arLarger: "أكبر",
    embedUnavailable: "لم يعد هذا العرض ثلاثي الأبعاد متاحًا.",
    logo: "Berete Jewellers",
  },
};

/**
 * The language of the viewer: that of the words of the site it was given (the bundle they come from), else that of the
 * document. The page of a piece and a 3D link take it from their address, a sealed link from the browser.
 */
export function viewerLang(words: Messages["viewer"]): ViewerLang {
  const found = LOCALES.find((l) => bundleOf(l).ui.viewer === words);
  if (found) return found;
  const doc = (typeof document === "undefined" ? "" : document.documentElement.lang || "").slice(0, 2);
  return (LOCALES as readonly string[]).includes(doc) ? (doc as ViewerLang) : "en";
}

/** Lower case, without accents nor spaces at the ends: "Métal " is "metal". */
const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/** The name of a material of the library, in the language of the page (null: not one of the library). */
export function materialName(id: string, lang: ViewerLang, metals: Record<MetalId, string>): string | null {
  const w = VIEWER_WORDS[lang];
  const parts = id.split("/");
  if (parts[0] === "metal") {
    const metal = metals[parts[1] as MetalId];
    if (!metal) return null;
    const finish = (parts[2] ?? "polished") as Finish;
    return finish === "polished" || !w.finishes[finish] ? metal : metal + " · " + w.finishes[finish];
  }
  if (parts[0] === "gem") {
    const stone = w.stones[parts[1] as Stone];
    if (!stone) return null;
    return parts[2] === "inclusions" ? stone + " · " + w.inclusions : stone;
  }
  if (parts[0] === "pearl") return w.pearls[parts[1] as keyof ViewerWords["pearls"]] ?? null;
  if (parts[0] === "enamel") return w.enamels[parts[1] as keyof ViewerWords["enamels"]] ?? null;
  if (id === "ceramic/black") return w.ceramicBlack;
  if (id === "ceramic/white") return w.ceramicWhite;
  if (id === "onyx") return w.onyx;
  return null;
}

/** A chip of the configurator: the admin's name on a French page, else the name of its material in the page's language. */
export function optionLabel(option: { material: string; label: string }, lang: ViewerLang, metals: Record<MetalId, string>): string {
  const typed = option.label.trim();
  if (lang === "fr" && typed) return typed;
  return materialName(option.material, lang, metals) ?? (typed || option.material);
}

/** The name of a group of chips: the admin's on a French page, else what the group offers (metal, stones…) in the page's language. */
export function groupLabel(cfg: Configurator, lang: ViewerLang, words: Messages["viewer"]): string {
  const typed = cfg.label.trim();
  if (lang === "fr" && typed) return typed;
  const w = VIEWER_WORDS[lang];
  const kinds = new Set(cfg.options.map((o) => o.material.split("/")[0]));
  if (kinds.size === 1) {
    if (kinds.has("metal")) return words.metal;
    if (kinds.has("gem")) return w.groups.stones;
    if (kinds.has("pearl")) return w.groups.pearls;
    if (kinds.has("enamel")) return w.groups.enamel;
  }
  // A group the options do not name: the admin's name when it is one of the usual French words, else "Material".
  const known = freeLabel(typed, lang, words);
  return known !== typed ? known : cfg.options.length > 0 ? w.groups.material : typed || w.groups.material;
}

/**
 * A name the admin typed in French for a part (a metal layer, a group): its translation when it is one of the usual
 * words (Métal, Pierres…), else as typed (a name of his own: "Maillons").
 */
export function freeLabel(label: string, lang: ViewerLang, words: Messages["viewer"]): string {
  if (lang === "fr" || !label.trim()) return label;
  const w = VIEWER_WORDS[lang];
  const key = plain(label);
  if (key === "metal" || key === "metaux" || key === "or") return words.metal;
  if (key === "pierre" || key === "pierres" || key === "diamants" || key === "pierres de couleur") return w.groups.stones;
  if (key === "couleur des pierres") return words.stoneColor;
  if (key === "matiere" || key === "matieres") return w.groups.material;
  if (key === "perle" || key === "perles") return w.groups.pearls;
  if (key === "email" || key === "emaux") return w.groups.enamel;
  return label;
}

/** A saved view, named by the admin in French ("Face", "Vue 2"): in the page's language when it is a usual name. */
export function viewName(name: string, lang: ViewerLang, words: Messages["viewer"]): string {
  if (lang === "fr") return name;
  const w = VIEWER_WORDS[lang];
  const key = plain(name);
  const numbered = /^vue\s*(\d+)$/.exec(key);
  if (numbered) return w.view(Number(numbered[1]));
  if (key === "face" || key === "devant" || key === "avant") return words.views.front;
  if (key === "profil" || key === "cote") return words.views.side;
  if (key === "dessus") return words.views.top;
  if (key === "dos" || key === "arriere") return w.back;
  if (key === "detail") return w.detail;
  return name;
}

/** The name of a stone colour of the swatches (read aloud), or the colour itself when it is not one of them. */
export function stoneColorName(hex: string, lang: ViewerLang): string {
  const names = VIEWER_WORDS[lang].stoneColors;
  const known: Record<string, string> = { "#ffffff": names.white, "#9b111e": names.red, "#0b6e4f": names.green, "#e75480": names.pink, "#f2c14e": names.yellow, "#1c1c1c": names.black };
  return known[hex.toLowerCase()] ?? hex;
}
