/*
 * The definitive texts of Yoni (26-27/11/2026), word for word in English: copied by a script from the brief of Malik (the blocks
 * are kept as they came in tests/fixtures/yoni-2711.json, which the test of the pages compares with what they show). Each
 * other language translates them in src/i18n/content/<lang>.ts, keyed by the English text.
 *   story    the paragraphs of « The Vision Behind the Creation » (its first one, the line of the piece, set apart as its lead);
 *   specs    « Composition & Craftsmanship », [label, value]: a label in capitals is a line of the composition (a value whose first
 *            line is a figure is shown large), an empty label a free line ("⸻": a fine rule), a label in small letters a note;
 *   details  « The Art of Detail », [title, text], each beside the photo that shows it (src/data/magazine.ts).
 */
type Texts = { story: string[]; specs?: [string, string][]; details?: [string, string][] };

export const YONI: Record<string, Texts> = {
  "kevin-schade-dragon-ball-pendant": {
    story: [
      "Created for Kevin Schade, a passionate Dragon Ball Z admirer, this piece began with a challenge: to reinterpret Goku's iconic Genki Dama through high jewellery.",
      "The Spirit Bomb draws energy from living beings and the world around them, uniting different sources into one collective force.",
      "We translated this philosophy through contrasting gemstone cuts, settings and orientations. Even the inverted diamonds represent the unseen contributions that form this energy.",
      "But to us, energy was never meant to remain still.",
      "We therefore engineered the Spirit Bomb to rotate, transforming symbolism into movement.",
      "Beneath it, Goku channels this collective power, surrounded by the seven Dragon Balls.",
      "Every stone, every setting, every movement has a purpose.",
    ],
    specs: [
      ["", "A fusion of sculptural artistry, precision stone setting and mechanical innovation."],
      ["THE COMPOSITION", "Goku beneath the Spirit Bomb, surrounded by the seven Dragon Balls, each bearing its distinctive number of stars."],
      ["THE MECHANISM", "A custom-engineered rotating Spirit Bomb, bringing movement to the heart of the creation."],
      ["DIAMOND CUTS & COMPOSITION", "Round, emerald, baguette and princess cuts, carefully combined to create a multidimensional composition."],
      ["SETTING TECHNIQUES", "Pavé, channel, bezel and reverse settings — each chosen for its distinct visual expression."],
      ["", "⸻"],
      ["MATERIALS & GEMSTONES", "Gold — 10K · 137.47 g\nVVS Round Diamonds — 51.486 ct\nAquamarine — 14.254 ct"],
      ["", "⸻"],
      ["", "Created Exclusively for Kevin Schade."],
    ],
  },
  "vfb-stuttgart-dfb-pokal-2025": {
    story: [
      "Some victories deserve more than a memory.",
      "Created to immortalise VfB Stuttgart's historic 2025 DFB-Pokal triumph, this championship ring transforms the club's identity and its players' achievements into high jewellery.",
      "Stuttgart's iconic white jersey and signature red chest stripe are reinterpreted through contrasting white baguette-cut diamonds and deep-red gemstones, with each ring personalised with the player's name and number.",
      "The club's crest, surrounded by diamonds, crowns the design, while \"Furchtlos und treu\" honours its enduring spirit.",
      "But the most extraordinary detail lies within.",
      "An intricate opening mechanism reveals a miniature DFB-Pokal trophy sculpted in rose gold, concealing the ultimate symbol of victory inside the ring itself.",
      "A victory celebrated on the outside. Immortalised on the inside.",
    ],
    specs: [
      ["GOLD WEIGHT", "42.45 g"],
      ["DIAMONDS", "11.252 ct\nRound · Baguette · Emerald · Kite Cuts"],
      ["RUBIES", "3.141 ct\nBullet · Round · Emerald Cuts"],
      ["TOTAL GEMSTONE WEIGHT", "14.393 ct"],
      ["HIDDEN MECHANISM", "Removable ring top revealing a miniature DFB-Pokal trophy sculpted in rose gold."],
      ["PERSONALIZATION", "Individual player name and shirt number."],
    ],
    details: [
      ["THE JERSEY, REIMAGINED", "Stuttgart's iconic white jersey and red chest stripe are reinterpreted through contrasting diamonds and deep-red gemstones. Each ring carries its player's name and number."],
      ["THE CLUB'S IDENTITY", "At the heart of the design, the enamelled VfB Stuttgart crest is framed by a shield-shaped composition of red gemstones — a tribute to the club's identity."],
      ["THE HIDDEN VICTORY", "Beneath the removable crown lies a miniature DFB-Pokal trophy sculpted in rose gold. An intricate mechanism transforms the ring into a lasting tribute to victory."],
    ],
  },
  "campione-d-italia-2023-2024": {
    story: [
      "Twenty titles. One historic moment.",
      "Born from a special project initiated by Marcus Thuram alongside Hakan Çalhanoğlu and Marko Arnautović, this ring was conceived to immortalise Inter Milan's historic 20th Scudetto.",
      "Twenty stars and twenty diamonds surround the iconic crest, celebrating the club's championship legacy.",
      "The Nerazzurri's black-and-blue identity, Italy's tricolour and personalised player details unite history and individuality within one creation.",
      "Beyond its design lies an unexpected transformation.",
      "The ring's crown detaches to become a necklace pendant, revealing a miniature Serie A trophy concealed beneath.",
      "Twenty championships. One creation. A legacy made tangible.",
    ],
    specs: [
      ["GOLD WEIGHT", "53.39 g"],
      ["VVS DIAMONDS", "15.916 ct\nRound · Emerald Cuts"],
      ["FINISHING", "Custom Enamel Detailing"],
      ["MECHANISM", "Detachable ring top, wearable as a pendant, revealing a hidden miniature Serie A trophy."],
    ],
    details: [
      ["01 — TWENTY STARS, TWENTY DIAMONDS", "One star and one diamond for each of Inter Milan's twenty Serie A titles."],
      ["02 — THE NERAZZURRI COLORS", "The club's iconic black-and-blue stripes reinterpreted around the ring's crown."],
      ["03 — THE ITALIAN IDENTITY", "Italy's green, white and red tricolor, complemented by the club's commemorative inscriptions."],
      ["04 — A PERSONAL LEGACY", "Each ring personalized with the player's name and shirt number."],
      ["05 — THE HISTORIC TWENTIETH", "The Serie A emblem accompanied by the number 20, commemorating Inter's twentieth league title."],
      ["06 — BEYOND THE RING", "The detachable crown transforms into a necklace pendant, revealing a miniature Serie A trophy concealed beneath."],
    ],
  },
  "kenan-yildiz-celebration-pendant": {
    story: [
      "A signature celebration. Immortalised in diamonds.",
      "Inspired by Kenan Yıldız's distinctive goal celebration, this pendant transforms a personal gesture into a lasting expression of identity.",
      "The crossed hands, instantly recognisable on the football pitch, are recreated in a sculptural composition, capturing the movement and character of the original gesture.",
      "Every curve is carefully shaped, with diamonds following the contours of the hands and contrasting stone cuts bringing depth to the creation.",
      "More than a representation of a celebration, the piece captures something uniquely his.",
      "A moment on the pitch. A signature beyond it.",
    ],
  },
  "noah-okafor-oka-pendant": {
    story: [
      "His name. His origins. His game.",
      "The first creation for Noah Okafor began through a mutual friend whose Swiss military service inspired an unexpected design direction: camouflage.",
      "Layered across the diamond-set OKA initials, the camouflage conceals two maps: Nigeria within the O and Switzerland within the K, honouring both sides of his heritage.",
      "Between the letters, a miniature football rotates, bringing movement to the sport that defines his career.",
      "Paired with a bespoke two-tone Cuban chain, the creation transforms three simple letters into something deeply personal.",
      "More than a name. An identity hidden in plain sight.",
    ],
    specs: [
      ["TOTAL GOLD WEIGHT", "628.09 g"],
      ["TOTAL DIAMOND WEIGHT", "132.444 ct"],
      ["OKA PENDANT", "Gold Weight: 196.53 g\nDiamonds: 69.267 ct\nRound · Emerald Cuts\nPavé · Invisible Settings\nDimensions: 110.10 mm wide × 47.67 mm high (excluding bail)"],
      ["TWO-TONE CUBAN CHAIN", "Gold Weight: 431.56 g\nDiamonds: 63.177 ct\nRound · Baguette Cuts\nChannel-set Baguette Diamonds\nWidth: 20 mm\nLength: 55 cm"],
      ["SPECIAL MECHANISM", "Rotating football integrated between the OKA initials."],
    ],
    details: [
      ["01 — CAMOUFLAGE, REIMAGINED", "Inspired by Swiss military service, polished rose-gold camouflage patterns are layered over the diamond-set initials, creating depth and contrast."],
      ["02 — TWO HIDDEN COUNTRIES", "Concealed within the camouflage are two maps: Nigeria inside the O and Switzerland inside the K. A subtle tribute to Noah's heritage."],
      ["03 — THE ROTATING FOOTBALL", "Positioned between the O and K, a miniature football rotates, representing Noah's passion and career."],
      ["04 — THE ART OF SETTING", "Invisible-set emerald-cut diamonds define the O and A, while round pavé diamonds shape the K. Rose-gold frames and larger diamonds along the borders complete the composition."],
      ["05 — THE TWO-TONE CUBAN", "A bespoke 20 mm-wide, 55 cm-long Cuban chain combining white and rose gold, with baguette diamonds arranged in channel settings across every link."],
    ],
  },
  "noah-okafor-jersey-pendant": {
    story: [
      "His celebration. His roots. His legacy.",
      "Created for Noah Okafor, this monumental pendant transforms his signature crossed-arms goal celebration into an extraordinary piece of high jewellery.",
      "Standing over 13 centimetres tall, the creation brings together his Swiss and Nigerian heritage through intricate gemstone compositions and symbolic details.",
      "On the reverse, OKA 4 forms a personal interpretation of his surname, crowned by a tribute to family and legacy.",
      "Suspended from BERETE's detachable Safi Link, the creation moves beyond conventional jewellery — designed to be worn as a statement or displayed as a personal trophy.",
      "A moment on the pitch, immortalised beyond it.",
    ],
    specs: [
      ["GOLD WEIGHT", "421.30 g"],
      ["VVS DIAMONDS", "495.333 ct"],
      ["STONE CUTS", "Round · Pear · Hexagon · Oval · Baguette · Trillion Cuts"],
      ["COLORED GEMSTONES", "24.114 ct\nRubies · Tsavorites"],
      ["DIMENSIONS", "131.61 × 108.57 mm"],
      ["CONSTRUCTION", "Detachable XXL pendant with convertible Safi Link chain."],
      ["Motif", "Noah Okafor's signature celebration, reimagined as a jersey pendant with crossed arms."],
      ["Structure", "Oversized pendant with detachable chain system."],
      ["Chain", "Removable Safi Link, designed to be worn with or without the pendant."],
      ["Setting Techniques", "Pavé, invisible, mosaic, channel and hexagon pattern setting."],
      ["Construction", "White-gold jersey, rose-gold arms, articulated for scale, presence and transformation."],
    ],
    details: [
      ["THE SIGNATURE CELEBRATION", "Noah's crossed-arms goal celebration recreated in jewellery."],
      ["TWO FLAGS, ONE IDENTITY", "Swiss emblem and Nigerian flag, both featuring invisible-set baguette stones."],
      ["THE NIGERIAN STRIPES", "Green, white and green shoulder stripes."],
      ["OKA 4", "The personalized name and number forming a play on \"Okafor.\""],
      ["THE CROWN", "A symbol of legacy and his four siblings."],
      ["THE ART OF SETTING", "Mosaic-set rose-gold arms, hexagon-cut stones on the sleeves, and contrasting diamond settings across the jersey."],
      ["THE SAFI LINK", "Removable chain that can be closed and worn independently."],
      ["BEYOND JEWELLERY", "The oversized pendant can also be displayed as a personal trophy."],
    ],
  },
  "noah-okafor-octagon-pendant": {
    story: [
      "Two letters. One identity.",
      "Following his first OKA creation, Noah Okafor returned to BERETE with a new vision: something more compact, yet equally personal.",
      "This time, the design centred around his initials, N and O, brought together in a sculptural octagonal composition.",
      "White and rose gold create a deliberate contrast, while invisible-set baguettes, prong-set emerald cuts and bezel-set pear diamonds introduce different dimensions of light.",
      "Paired with diamond tennis chains, the creation reflects the same individuality as his first commission, expressed through a more refined silhouette.",
      "A signature made personal. An identity expressed in diamonds.",
    ],
    specs: [
      ["GOLD WEIGHT", "47.50 g"],
      ["VVS DIAMONDS", "21.434 ct\nRound · Emerald · Baguette · Pear Cuts"],
      ["SETTING TECHNIQUES", "Invisible · Prong · Bezel · Mosaic"],
      ["ACCOMPANYING TENNIS CHAINS", "Double-row tennis chains featuring 0.50 ct round diamonds per stone, presented in white and rose gold versions."],
    ],
    details: [
      ["01 — THE LETTER O", "Crafted in white gold, the O features invisible-set baguette diamonds, with prong-set emerald-cut diamonds adding depth to the composition."],
      ["02 — THE LETTER N", "Sculpted in rose gold, the N combines a mosaic-set foundation with pear-shaped diamonds in bezel settings."],
      ["03 — TWO METALS, ONE IDENTITY", "The contrast between white and rose gold brings Noah's two initials together in a distinctive octagonal composition."],
      ["04 — THE TENNIS CHAINS", "Double-row tennis chains featuring 0.50 ct round diamonds per stone, presented in white and rose gold versions."],
    ],
  },
  "marcus-thuram-t-serpent-pendant": {
    story: [
      "An evolving signature. A new identity.",
      "For Marcus Thuram, the letter T has become a personal signature, reimagined through several creations with BERETE.",
      "For its latest evolution, we drew inspiration from Inter Milan's iconic serpent, transforming his shirt number 9 into a sculptural, snake-inspired form intertwined with his initial.",
      "The white-gold T contrasts with a rose-gold 9, whose layered pear-shaped diamonds recreate the texture of serpent scales through our distinctive Serpent Bezel Setting.",
      "Through our Float Setting, partially embedded baguette diamonds extend beyond the metal's edges, introducing an unexpected architectural dimension.",
      "A deep red pear-shaped ruby completes the composition.",
      "A signature in constant evolution. An identity expressed through jewellery.",
    ],
    specs: [
      ["GOLD WEIGHT", "171.90 g"],
      ["VVS DIAMONDS", "44.328 ct\nRound · Baguette · Pear Cuts"],
      ["RUBIES", "3.385 ct\nPear Cut"],
      ["GOLD COMPOSITION", "White & Rose Gold"],
      ["SETTING TECHNIQUES", "Mosaic · Pavé · Serpent Bezel Setting · Float Setting"],
      ["TOTAL GEMSTONE WEIGHT", "47.713 ct"],
    ],
    details: [
      ["01 — THE DIAMOND MOSAIC", "The white-gold T features round diamonds in varying sizes, creating depth and texture through a carefully arranged mosaic."],
      ["02 — THE FLOAT SETTING", "Baguette-cut diamonds are partially embedded in the metal, with their exposed ends extending beyond its edges, creating the illusion of floating diamonds.\nThis distinctive technique frames the T and contributes to the pointed detailing of the number 9."],
      ["03 — THE SERPENT BEZEL SETTING", "The rose-gold 9 features overlapping layers of pear-shaped diamonds, individually secured in bezel settings to recreate the natural texture of serpent scales.\nA signature artistic feature of the T9 creation."],
      ["04 — THE RUBY EYE", "A pear-shaped ruby, framed by pavé diamonds, forms the focal point of the serpent-inspired composition."],
      ["05 — TWO ELEMENTS, ONE SIGNATURE", "The white-gold T and rose-gold 9 come together in a sculptural design representing Marcus Thuram's initial and shirt number."],
    ],
  },
};

/** The story behind the Inter ring (Yoni, 26/11/2026), beside his photo with the players in Milan. */
export const INTER_STORY = {
  "title": "THE STORY BEHIND THE RING",
  "lead": "A Victory Shared. A Legacy Created.",
  "paragraphs": [
    "With Inter Milan already crowned champions before the end of the 2023–24 Serie A season, an extraordinary idea began to take shape.",
    "Through our close relationship with Marcus Thuram, the opportunity emerged to create something special for the team.",
    "Together with Hakan Çalhanoğlu and Marko Arnautović, the vision was to commemorate Inter's historic 20th title with personalised championship rings for the squad.",
    "After developing the design, we travelled to Milan to present the project, where it was immediately embraced.",
    "What began as an idea shared among players became a lasting symbol of an extraordinary achievement."
  ]
} as const;

/** The hand-over in Dubai of Noah Okafor's jersey pendant (Yoni, 27/11/2026), beside its film. */
export const JERSEY_REVEAL = {
  "title": "THE MOMENT OF REVEAL",
  "paragraphs": [
    "From the first sketches to the final fitting, every detail was created around Noah Okafor's vision.",
    "In Dubai, the journey reached its final moment as Noah received his monumental jersey pendant and signature Safi Link.",
    "A personal creation. A moment to remember."
  ]
} as const;

/** The evolution of Marcus Thuram's T (Yoni, 27/11/2026): each step linked to its piece only when it is sure. */
export const T_EVOLUTION = {
  "title": "THE EVOLUTION OF A SIGNATURE",
  "intro": "From a simple initial to increasingly elaborate interpretations, Marcus Thuram's T has evolved through several bespoke BERETE creations.",
  "steps": [
    "The Original T",
    "The T with a Sculpted Hand",
    "The T with a Rose-Gold Hand",
    "The T with a Rose-Gold Hand and Thorns",
    "The T9 — The Serpent Evolution"
  ]
} as const;

/** The text of the way to the making-of of the Inter ring (« Behind the Creation »). */
export const INTER_BEHIND = "Discover the craftsmanship behind Inter Milan's historic championship rings.";
/** The sections of a page of a piece, in the order of the page (src/pages/PiecePage.tsx). */
export type PageSection =
  | "vision"
  | "angles"
  | "details"
  | "model3d"
  | "part"
  | "worn-with"
  | "composition"
  | "created-for"
  | "circle"
  | "champions"
  | "story-ring"
  | "reveal"
  | "evolution"
  | "trunk"
  | "presentation"
  | "atelier"
  | "press";

/** The order of every page (the house, 24/11/2026): its vision beside its film, its photos, its composition, for whom, its trunk… */
export const DEFAULT_ORDER: PageSection[] = ["vision", "angles", "details", "model3d", "part", "composition", "created-for", "trunk", "atelier", "press"];

/**
 * The final order of Yoni's pages (26-27/11/2026). The Inter ring: its vision, its photos, then the story behind it, the
 * champions with their rings, its case (« The Art of Presentation »), « Behind the Creation », its press. Noah Okafor's OKA:
 * Every Angle first, the vision, its composition, its details, its Cuban chain, for whom, the Atelier. His jersey: the vision,
 * its composition, its details and its Safi Link, the moment of reveal in Dubai, for whom (no photo again: the reveal holds them), the
 * Atelier. His octagon: Every Angle, the
 * vision, its composition, its details, its tennis chains, The Berete Circle, its trunk, the Atelier. Marcus Thuram's T9: Every
 * Angle, the vision, its composition, its details, the evolution of the T, The Berete Circle, the Atelier.
 */
export const PAGE_ORDER: Record<string, PageSection[]> = {
  "campione-d-italia-2023-2024": ["vision", "angles", "composition", "details", "model3d", "story-ring", "champions", "presentation", "atelier", "press"],
  "noah-okafor-oka-pendant": ["angles", "vision", "composition", "details", "model3d", "worn-with", "created-for", "atelier", "press"],
  "noah-okafor-jersey-pendant": ["vision", "composition", "details", "model3d", "worn-with", "reveal", "created-for", "atelier", "press"],
  "noah-okafor-octagon-pendant": ["angles", "vision", "composition", "details", "model3d", "part", "circle", "trunk", "atelier", "press"],
  "marcus-thuram-t-serpent-pendant": ["angles", "vision", "composition", "details", "model3d", "evolution", "circle", "atelier", "press"],
};

/** The four photos of the Inter case shown first in « The Art of Presentation »: its lid, open, the ring in it, its card. */
export const PRESENTATION_FIRST: Record<string, string[]> = {
  "campione-d-italia-case": ["p22", "p20", "01", "p2"],
};

/** The photo of The Berete Circle on a page (the octagon: Noah Okafor at the counter with its trunk); else his portrait. */
export const CIRCLE_PHOTO: Record<string, string> = {
  "noah-okafor-octagon-pendant": "/media/stories/noah-okafor-ii/05.webp",
};

/** The name of the chain a pendant is worn on, as Yoni writes it (« Worn on / The Two-Tone Baguette Cuban »). */
export const WORN_ON_NAME: Record<string, string> = {
  "noah-okafor-oka-pendant": "The Two-Tone Baguette Cuban",
};

/** The texts of these sections, to translate in every language (scripts/i18n-check.ts). */
export const SECTION_TEXTS: string[] = [
  INTER_STORY.title,
  INTER_STORY.lead,
  ...INTER_STORY.paragraphs,
  JERSEY_REVEAL.title,
  ...JERSEY_REVEAL.paragraphs,
  T_EVOLUTION.title,
  T_EVOLUTION.intro,
  ...T_EVOLUTION.steps,
  INTER_BEHIND,
  ...Object.values(WORN_ON_NAME),
];
