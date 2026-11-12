/*
 * Die Wörter der Website, auf Deutsch (Quelle: en.ts), in der Sie-Form.
 * Dieselben Einträge in derselben Reihenfolge; jede Funktion setzt die
 * Werte in den deutschen Satz, mit Artikel und Fall, wo es nötig ist.
 */
import { plural } from "../format";
import type { Messages } from "./en";

const n = (count: number, one: string, other: string) => plural("de-DE", count, { one, other });

/** The text of common.privateCollector, standing alone (nominative). */
const PRIVATE_COLLECTOR = "Ein privater Sammler";
/** The clubs that take the article in a German sentence: "für den VfB Stuttgart" (Inter Mailand takes none). */
const CLUBS_WITH_ARTICLE = new Set(["VfB Stuttgart"]);

type Case = "acc" | "dat";
const CLUB_ARTICLE: Record<Case, string> = { acc: "den ", dat: "dem " };
const COLLECTOR: Record<Case, string> = { acc: "einen privaten Sammler", dat: "einem privaten Sammler" };

/** A name inside a sentence, in its case: für den VfB Stuttgart, mit einem privaten Sammler, für Kevin Schade. */
const named = (name: string, c: Case) => (name === PRIVATE_COLLECTOR ? COLLECTOR[c] : CLUBS_WITH_ARTICLE.has(name) ? CLUB_ARTICLE[c] + name : name);
/** "Of" + name: des VfB Stuttgart, von Inter Mailand, von Kevin Schade. */
const ofName = (name: string) => (CLUBS_WITH_ARTICLE.has(name) ? "des " + name : "von " + named(name, "dat"));

export const de: Messages = {
  site: {
    skip: "Zum Inhalt springen",
    homeLabel: "Berete Jewellers, Startseite",
    tagline: "Von uns gefertigt. Von Ihnen inspiriert.",
    baseLine: "Mit Sitz in Dubai · Weltweiter Versand",
    rights: (year: number) => "© " + year + " Berete Jewellers. Alle Rechte vorbehalten.",
  },

  language: {
    label: "Sprache",
    choose: "Sprache wählen",
  },

  common: {
    startPiece: "Ihr Stück gestalten",
    whatsapp: "WhatsApp",
    chatWhatsapp: "Schreiben Sie uns auf WhatsApp",
    allCreations: "Alle Kreationen",
    allPlayers: "Alle Spieler",
    seePiece: "Stück ansehen",
    readArticle: "Artikel lesen",
    close: "Schließen",
    previous: "Vorherige",
    next: "Nächste",
    back: "Zurück",
    yourPiece: "Ihr Stück",
    yourStory: "Ihre Geschichte, in Diamanten",
    madeFor: (who: string) => "Für " + named(who, "acc"),
    privateCollector: PRIVATE_COLLECTOR,
    newPiecesTitle: "Neue Stücke entstehen gerade",
    newPiecesText: "Diese Kollektion wird bald enthüllt. Gestalten Sie bis dahin Ihr eigenes Stück.",
  },

  whatsapp: {
    hello: "Hallo Berete Jewellers, ich möchte ein Schmuckstück nach Maß in Auftrag geben.",
    piece: (name: string) => "Hallo Berete Jewellers, ich hätte gern ein Stück wie „" + name + "“. Können wir darüber sprechen?",
    configurator: (type: string, budget: string, timing: string, pieceName?: string) =>
      ["Hallo Berete Jewellers, ich möchte ein Schmuckstück in Auftrag geben.", "Stück: " + type, "Budget: " + budget, "Zeitrahmen: " + timing, ...(pieceName ? ["Inspiriert von: „" + pieceName + "“"] : [])].join("\n"),
  },

  types: {
    chain: "Kette",
    pendant: "Anhänger",
    ring: "Ring",
    bracelet: "Armband",
    watch: "Uhr",
  },

  nav: {
    main: "Hauptmenü",
    mobile: "Mobiles Menü",
    creations: "Kreationen",
    players: "Spieler",
    atelier: "Atelier",
    boxes: "Etuis",
    process: "Ablauf",
    about: "Über uns",
    contact: "Kontakt",
    openMenu: "Menü öffnen",
    closeMenu: "Menü schließen",
  },

  footer: {
    creations: "Kreationen",
    house: "Das Haus",
    contact: "Kontakt",
    contactPage: "Kontaktseite",
    yourPiece: "Ihr Stück",
    pitch: "Ketten, Anhänger und Meisterringe, gemeinsam mit Ihnen entworfen und für den großen Moment gefertigt.",
    legal: "Impressum",
    privacy: "Datenschutz",
  },

  collections: {
    items: {
      pendants: { name: "Anhänger", intro: "Initialen, Embleme, Torjubel: Jeder Anhänger erzählt eine Geschichte, plastisch modelliert und Stein für Stein gefasst." },
      chains: { name: "Ketten", intro: "Glieder, eines nach dem anderen gezeichnet, von Schmetterlingen bis zu Infinity-Knoten – allein getragen oder mit einem Anhänger." },
      rings: { name: "Ringe", intro: "Meisterringe für eine ganze Mannschaft und Siegelringe, gefertigt für eine einzige Hand." },
      bracelets: { name: "Armbänder", intro: "Armbänder nach Maß, Glied für Glied gefertigt." },
      watches: { name: "Uhren", intro: "Uhren, mit Diamanten besetzt vom Gehäuse bis zum Armband." },
    },
    eyebrow: "Kollektionen",
    title: "Nach Schmuckart",
    explore: "Entdecken",
    count: (count: number) => n(count, "# Stück", "# Stücke"),
    tileAlt: (collection: string, piece: string) => collection + ": " + piece,
    collection: "Kollektion",
    listLabel: (collection: string) => "Die Schmuckstücke: " + collection,
    others: "Weitere Kollektionen",
    ctaTitle: "Ihr Stück, von der ersten Skizze an.",
    ctaText: "Jedes Stück beginnt mit einem Gespräch. Erzählen Sie uns Ihre Geschichte, wir zeichnen sie.",
    ctaButton: "Auf WhatsApp starten",
  },

  home: {
    filmLabel: "Film von Berete Jewellers, der sich beim Scrollen abspielt",
    kicker: "Berete Jewellers · Dubai",
    title: "Haute Joaillerie nach Maß für Champions.",
    discover: "Kreationen entdecken",
    statements: ["Für Vereine entworfen. Von Champions getragen.", "Der Ringkopf hebt sich und gibt die Trophäe frei.", "Modelliert, dann Stein für Stein gefasst.", "Stücke mit Statement, die gesehen werden wollen."],
    featured: "Capsule im Fokus",
    enterCapsule: "Zur Capsule",
    liftTop: "Ringkopf anheben",
    closeTop: "Ringkopf aufsetzen",
    liftTopLabel: "Den Kopf des Rings anheben",
    closeTopLabel: "Den Kopf des Rings wieder aufsetzen",
    wornBy: "Getragen von",
    players: "Die Spieler",
    inside: "Einblick ins Haus",
    insideTitle: "Von der Skizze zur Übergabe",
    atelierTitle: "Atelier",
    atelierText: "Jeder Stein von Hand gefasst, unter dem Mikroskop.",
    atelierAlt: "Nahaufnahme eines Fasswerkzeugs bei der Arbeit an Diamanten",
    enter: "Eintreten",
    boxesTitle: "Etuis",
    boxesText: "Etuis nach Maß für ausgewählte Stücke, auf Wunsch.",
    discoverShort: "Entdecken",
    processTitle: "Ablauf",
    processText: "Sechs klare Schritte, begleitet auf WhatsApp.",
    follow: "Verfolgen",
  },

  showcase: {
    eyebrow: "Ausgewählte Stücke",
    title: "Die Capsules",
  },

  scroll: {
    hint: "Scrollen",
  },

  creations: {
    eyebrow: "Kreationen",
    title: "Die Kreationen",
    lead: "Ketten, Anhänger, Ringe, Armbänder und Uhren. Jedes Stück wird für eine Person, einen Verein, einen Moment gezeichnet und dann in Dubai gefertigt.",
    listLabel: "Alle Stücke",
    filterLabel: "Stücke filtern",
    all: "Alle",
    // German nouns keep their capital letter: "Zur Kollektion Anhänger".
    enterCollection: (collection: string) => "Zur Kollektion " + collection,
  },

  piece: {
    steps: {
      sketch: { title: "Skizze", text: "Die Idee wird von Hand gezeichnet und dann modelliert, bis jede Proportion stimmt." },
      raw: { title: "Rohling", text: "Das Metall wird gegossen und montiert, bevor auch nur ein Stein gefasst wird." },
      setting: { title: "Fassung", text: "Jeder Stein wird von Hand gefasst, unter Vergrößerung." },
      polishing: { title: "Politur", text: "Jede Oberfläche wird poliert, bis das Metall hinter dem Licht verschwindet." },
      delivery: { title: "Lieferung", text: "Geprüft, fotografiert und dann übergeben – in seinem Etui, sofern es eines hat." },
    },
    want: "Ich möchte ein Stück wie dieses",
    details: "Die Details",
    madeFor: "Gefertigt für",
    theClub: "Der Verein",
    theProfile: "Das Profil",
    stories: (count: number) => n(count, "Die Story", "Die Storys"),
    andOthers: (names: string) => "Sowie " + names + ".",
    seenInStories: "Zu sehen in unseren Storys",
    story: "Die Geschichte",
    makingEyebrow: "Von der Skizze zur Übergabe",
    makingTitle: "Wie es entstand",
    thisPiece: "Dieses Stück",
    inAtelier: "Im Atelier",
    delivered: "Übergeben",
    handedOverTo: (client: string) => "Übergeben an " + named(client, "acc"),
    handover: "Die Übergabe",
    sheet: "Technische Daten",
    customBox: "Etui nach Maß erhältlich",
    deliveredIn: (box: string) => "Geliefert in seinem eigens dafür gefertigten Etui: " + box + ".",
    press: "Presse",
    pressAlt: (outlet: string) => "Presseartikel: " + outlet,
    similar: "Ähnliche Stücke",
    // German nouns keep their capital letter: "Weitere Anhänger".
    more: (collection: string) => "Weitere " + collection,
    theCollection: "Die Kollektion",
    ctaTitle: "Ein Stück wie dieses, für Sie gezeichnet.",
    ctaText: "Senden Sie uns seinen Namen auf WhatsApp: Wir antworten mit einer ersten Idee und den nächsten Schritten.",
    otherWays: "Weitere Kontaktwege",
  },

  gallery: {
    title: "Details",
    hintPinned: "Scrollen zum Entdecken · Tippen zum Vergrößern",
    hint: "Tippen zum Vergrößern",
    open: (what: string) => "Im Vollbild öffnen: " + what,
    photo: "Foto",
    zoomIn: "Vergrößern",
    zoomOut: "Verkleinern",
  },

  players: {
    eyebrow: "Spieler",
    title: "Getragen von Champions",
    lead: "Fußballer, Vereine und Persönlichkeiten, die uns ihren Moment anvertraut haben. Jeder Name öffnet ihre Storys und ihre Stücke.",
    listLabel: "Liste der Spieler",
    groups: { player: "Spieler", club: "Vereine", personality: "Persönlichkeiten" },
    portrait: (name: string) => "Porträt " + ofName(name),
    club: "Verein",
    personality: "Persönlichkeit",
    number: "Nr.",
    bioWithPieces: (name: string) => "Die für " + named(name, "acc") + " gefertigten Stücke und die Momente, die wir auf unserem Instagram geteilt haben.",
    bioStories: (name: string) => "Die Momente, die wir mit " + named(name, "dat") + " auf unserem Instagram geteilt haben.",
    watch: (count: number) => n(count, "Story ansehen", "Storys ansehen"),
    pieces: (count: number) => n(count, "Das Stück", "Die Stücke"),
    stories: "Storys",
    moments: (count: number) => n(count, "# Moment", "# Momente"),
    theirPlayers: "Die Spieler",
  },

  stories: {
    bar: "Storys",
    previous: "Vorherige Storys",
    next: "Nächste Storys",
    open: (title: string) => "Story öffnen: " + title,
    dialog: (title: string) => "Story: " + title,
    alt: (title: string, index: number) => title + ", Story " + index,
    play: "Video abspielen",
    soundOff: "Ton ausschalten",
    soundOn: "Ton einschalten",
    close: "Story schließen",
    help: "Tippen Sie rechts für den nächsten Schritt, links für den vorherigen. Gedrückt halten zum Pausieren.",
    want: "Ihr eigenes Stück? WhatsApp",
    seePieceLabel: (title: string) => "Stück ansehen: " + title,
  },

  atelier: {
    steps: [
      { title: "Guss", text: "Das Modell wird zu rohem Metall: ein Anhänger vor seinem ersten Stein." },
      { title: "Montage", text: "Glied für Glied nimmt ein Armband auf der Werkbank Gestalt an." },
      { title: "Politur", text: "Jedes Glied wird von Hand poliert, damit nur die Steine zu sehen sind." },
      { title: "Vollendung", text: "Ein Signaturstück im Entstehen, unter der Lampe geprüft." },
    ],
    step: (index: number) => "Schritt " + index,
    stepAlt: (step: string) => step + " im Atelier",
    filmLabel: "Von Hand gefasste Steine im Atelier",
    eyebrow: "Dubai",
    title: "Das Atelier",
    lead: "Wo jedes Stück modelliert und dann Stein für Stein gefasst wird.",
    making: "Die Entstehung eines Stücks",
    ctaTitle: "Verfolgen Sie Ihr Stück auf WhatsApp, Schritt für Schritt.",
    ctaText: "Während der gesamten Entstehung erhalten Sie Fotos und Videos vom Fortschritt.",
    seeProcess: "Zum Ablauf",
  },

  boxes: {
    eyebrow: "Nach Maß",
    title: "Etuis",
    lead: "Etuis nach Maß, für ausgewählte Stücke auf Wunsch erhältlich.",
    listLabel: "Etuis nach Maß",
    open: (name: string) => name + " im Vollbild öffnen",
    photos: (count: number) => n(count, "# Foto", "# Fotos"),
  },

  process: {
    filmLabel: "Der Ablauf, Schritt für Schritt, der sich beim Scrollen abspielt",
    steps: [
      { title: "Erster Kontakt", text: "Ideen und Budget. Erzählen Sie uns von dem Moment, den Sie festhalten möchten, von Ihren Referenzen, Ihrer Geschichte.", meter: "0 %", payNote: "In dieser Phase fällt keine Zahlung an." },
      { title: "Design-Anzahlung", text: "Wird bei Bestätigung vom Endpreis abgezogen und deckt bei einer Absage die Designkosten.", meter: "Anzahlung", payNote: "Design-Anzahlung geleistet." },
      { title: "Freigabe", text: "50 % der Produktion werden vor Beginn der Fertigung bezahlt.", meter: "50 %", payNote: "50 % der Produktion bezahlt." },
      { title: "Entstehung", text: "Fotos und Videos vom Fortschritt auf WhatsApp; die Dauer hängt von der Komplexität ab.", meter: "50 %", payNote: "Während der Fertigung ist nichts weiter zu zahlen." },
      { title: "Fotoshooting", text: "Ein eigenes Shooting, dann die Vorbereitung der Lieferung.", meter: "50 %", payNote: "Ihr Stück wird fotografiert, bevor es das Atelier verlässt." },
      { title: "Restzahlung & Lieferung", text: "Die restlichen 50 % etwa eine Woche vor der Übergabe.", meter: "100 %", payNote: "Vollständig bezahlt, bereit zur Übergabe." },
    ],
    eyebrow: "Sechs Schritte, ein Gespräch",
    title: "Der Ablauf",
    lead: "Von Ihrer ersten Nachricht bis zu dem Tag, an dem Sie es tragen.",
    payment: "Zahlung",
    paid: "Bezahlter Betrag",
    noPayment: "In dieser Phase fällt keine Zahlung an.",
    clear: "Klar von Anfang an",
    overviewTitle: "Sechs Schritte, gestaffelt bezahlt",
    overviewText: "Eine Design-Anzahlung, die Hälfte der Produktion bei der Freigabe, der Rest eine Woche vor der Übergabe. Sie verfolgen jeden Schritt auf WhatsApp.",
    closingEyebrow: "Der erste Schritt ist eine Nachricht",
  },

  about: {
    eyebrow: "Über uns",
    title: "Unsere Geschichte",
    lead: "Haute Joaillerie nach Maß, gefertigt in Dubai für alle, die auf dem Platz und darüber hinaus Geschichte schreiben.",
    founderLabel: "Gründer",
    founderPortrait: "Porträt des Gründers",
    provisionalQuote: "Vorläufiges Zitat",
    quote: "„Jedes Stück beginnt mit einer Geschichte. Unsere Aufgabe ist es, sie ein Leben lang strahlen zu lassen.“",
    founder: "Gründer, Berete Jewellers",
    chapters: "Kapitel",
    chapterList: [
      { title: "Die Anfänge", text: "Vorläufiger Text. Wie das erste Stück gezeichnet wurde, für wen es bestimmt war und warum es von Hand gefertigt werden musste, statt fertig aus dem Regal gekauft zu werden." },
      { title: "Dubai", text: "Vorläufiger Text. Ein Haus mit Sitz in Dubai, am Kreuzungspunkt von Steinen, Kunsthandwerkern und Kunden aus allen Kontinenten, mit Lieferung in die ganze Welt." },
      { title: "Für Champions", text: "Vorläufiger Text. Meisterringe für Vereine, Ketten und Anhänger für Spieler und Stars: Stücke, die einen Titel, eine Nummer, einen Namen tragen." },
    ],
  },

  contact: {
    eyebrow: "Kontakt",
    title: "Ihr Stück gestalten",
    lead: "Am schnellsten geht es über WhatsApp. Drei Klicks, eine Nachricht – um alles Weitere kümmern wir uns.",
    inspired: "Von diesem Stück inspiriert?",
    oneConversation: "Ein Gespräch genügt, um zu beginnen. Erzählen Sie uns Ihre Idee auf WhatsApp, wir antworten Ihnen persönlich.",
    trustedBy: "Sie vertrauen uns",
    configTitle: "Ihr Stück in 3 Klicks",
    configSteps: ["Art des Stücks", "Budget", "Zeitrahmen"],
    answer: (question: string) => question + ":",
    pieceChoices: { chain: "Kette", pendant: "Anhänger", ring: "Meisterring", other: "Etwas anderes" },
    budgets: { "10k": "Bis 10.000 USD", "25k": "10.000 bis 25.000 USD", "50k": "25.000 bis 50.000 USD", "50k+": "50.000 USD und mehr", unsure: "Noch unklar" },
    timings: { asap: "Innerhalb eines Monats", quarter: "In 1 bis 3 Monaten", flexible: "Ohne Eile" },
    openWhatsapp: "WhatsApp öffnen",
    startOver: "Neu beginnen",
    name: "Name",
    email: "E-Mail",
    phone: "Telefonnummer",
    idea: "Ihre Idee",
    errName: "Bitte geben Sie Ihren Namen ein.",
    errEmail: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
    errMessage: "Bitte erzählen Sie uns etwas mehr (mindestens 10 Zeichen).",
    errPhone: "Bitte geben Sie eine gültige Telefonnummer ein.",
    errServer: "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut oder schreiben Sie uns auf WhatsApp.",
    errNetwork: "Netzwerkfehler. Bitte versuchen Sie es erneut oder schreiben Sie uns auf WhatsApp.",
    callTitle: "Lieber ein Rückruf?",
    callSent: "Vielen Dank. Wir rufen Sie in Kürze zurück.",
    callButton: "Rückruf anfordern",
    emailTitle: "Lieber per E-Mail?",
    emailSent: "Vielen Dank. Ihre Nachricht ist eingegangen, wir antworten Ihnen persönlich.",
    emailButton: "Nachricht senden",
  },

  legal: {
    eyebrow: "Informationen",
    legalTitle: "Impressum",
    privacyTitle: "Datenschutz",
    updated: "Vorläufige Fassung. Die mit „exemple à adapter“ gekennzeichneten Passagen sind Beispiele, die vor dem Start anzupassen sind.",
    legal: [
      {
        title: "Herausgeber",
        paragraphs: [
          "Diese Website wird von Berete Jewellers mit Sitz in Dubai, Vereinigte Arabische Emirate, herausgegeben.",
          "Handelsname: Berete Jewellers. Sitz: Dubai, Vereinigte Arabische Emirate. Gewerbelizenz ausgestellt in Dubai. (Exemple à adapter : indiquez la raison sociale exacte, le numéro de licence commerciale et l'adresse complète.)",
          "Kontakt: per WhatsApp oder über die Kontaktseite dieser Website.",
        ],
      },
      {
        title: "Hosting",
        paragraphs: ["Diese Website und ihre Daten werden von einem professionellen Cloud-Hosting-Anbieter auf gesicherten Servern gehostet. (Exemple à adapter : indiquez le nom, l'adresse et le contact de votre hébergeur.)"],
      },
      {
        title: "Geistiges Eigentum",
        paragraphs: [
          "Alle Entwürfe, Fotografien, Videos, Texte und visuellen Elemente dieser Website sind Eigentum von Berete Jewellers oder werden mit Genehmigung verwendet. Jede vollständige oder teilweise Vervielfältigung ohne vorherige schriftliche Zustimmung ist untersagt.",
          "Die Namen von Vereinen, Trophäen und Spielern werden genannt, um die für sie gefertigten Stücke zu beschreiben, und bleiben Eigentum ihrer jeweiligen Inhaber.",
        ],
      },
      {
        title: "Haftung",
        paragraphs: ["Die Informationen auf dieser Website dienen der Präsentation. Die gezeigten Stücke sind Maßanfertigungen; für jedes neue Stück wird ein individuelles Angebot erstellt."],
      },
    ],
    privacy: [
      {
        title: "Welche Daten wir erheben",
        paragraphs: [
          "Wenn Sie einen Rückruf anfordern, erheben wir Ihren Namen, Ihre Telefonnummer und gegebenenfalls das Stück, für das Sie sich interessieren. Wenn Sie uns per E-Mail schreiben, erheben wir Ihren Namen, Ihre E-Mail-Adresse und Ihre Nachricht.",
          "Seitenaufrufe werden ohne Cookies gemessen und ohne Sie zu identifizieren.",
        ],
      },
      {
        title: "Wozu wir sie nutzen",
        paragraphs: ["Ausschließlich, um Ihre Anfrage zu beantworten, Ihr Angebot zu erstellen und Ihr Projekt zu begleiten. Wir verkaufen Ihre Daten niemals."],
      },
      {
        title: "WhatsApp",
        paragraphs: ["Mit WhatsApp gekennzeichnete Schaltflächen öffnen ein Gespräch auf WhatsApp, einem Dienst eines Drittanbieters, für den dessen eigene Datenschutzrichtlinie gilt. Nachrichten, die Sie dort senden, werden innerhalb von WhatsApp verarbeitet."],
      },
      {
        title: "Speicherdauer",
        paragraphs: ["Kontakt- und Rückrufanfragen werden bis zu drei Jahre nach unserem letzten Austausch aufbewahrt und anschließend gelöscht. (Exemple à adapter selon votre pratique réelle de conservation.)"],
      },
      {
        title: "Ihre Rechte",
        paragraphs: ["Sie können jederzeit Auskunft über Ihre Daten sowie deren Berichtigung oder Löschung verlangen, indem Sie uns über WhatsApp oder die Kontaktseite kontaktieren."],
      },
    ],
  },

  notFound: {
    eyebrow: "Seite nicht gefunden",
    title: "Dieses Stück gibt es nicht… noch nicht.",
    text: "Die gesuchte Seite wurde verschoben oder hat nie existiert. Jedes große Stück beginnt mit einem Gespräch: Erzählen Sie uns von Ihrem.",
    home: "Zur Startseite",
    whatsapp: "Oder schreiben Sie uns auf WhatsApp",
  },

  seoPages: {
    "/": {
      title: "Berete Jewellers — Haute Joaillerie nach Maß, Dubai",
      description: "Haute Joaillerie nach Maß aus Dubai: Diamantketten, Anhänger und Meisterringe für Vereine, Fußballer und Stars. Von uns gefertigt. Von Ihnen inspiriert.",
    },
    "/creations": {
      title: "Kreationen: Anhänger, Ketten, Ringe und Uhren",
      description: "Alle Stücke von Berete Jewellers, nach Art filterbar: Diamantanhänger, Ketten, Meister- und Siegelringe sowie Uhren, jedes nach Maß in Dubai gefertigt.",
    },
    "/creations/pendants": {
      title: "Anhänger: Diamantanhänger nach Maß",
      description: "Die Anhänger von Berete Jewellers: Initialen, Embleme und Torjubel, plastisch modelliert und Stein für Stein gefasst, für Fußballer und Sammler, gefertigt in Dubai.",
    },
    "/creations/chains": {
      title: "Ketten: Diamantketten nach Maß",
      description: "Die Ketten von Berete Jewellers: Schmetterlingsglieder, Infinity-Knoten und Diamantblüten, Glied für Glied gezeichnet und nach Maß in Dubai gefertigt.",
    },
    "/creations/rings": {
      title: "Ringe: Meisterringe und Siegelringe",
      description: "Meisterringe für den VfB Stuttgart und Inter Mailand sowie diamantbesetzte Siegelringe: die Ringe von Berete Jewellers, gefertigt in Dubai.",
    },
    "/creations/watches": {
      title: "Diamantbesetzte Uhren",
      description: "Uhren, mit Diamanten besetzt vom Gehäuse bis zum Armband, getragen von Fußballern: die Uhren von Berete Jewellers, Dubai.",
    },
    "/creations/bracelets": {
      title: "Armbänder",
      description: "Armbänder nach Maß von Berete Jewellers in Dubai. Neue Stücke entstehen gerade.",
    },
    "/players": {
      title: "Spieler, Vereine und Persönlichkeiten",
      description: "Die Fußballer, Vereine und Persönlichkeiten, die Berete Jewellers tragen: ihre Storys und die für sie gefertigten Stücke nach Maß.",
    },
    "/atelier": {
      title: "Das Atelier in Dubai",
      description: "Einblick in das Atelier von Berete Jewellers in Dubai: Guss, Montage, Politur und Fassung der Steine, jedes Stück von Hand gefertigt.",
    },
    "/boxes": {
      title: "Etuis und Koffer nach Maß",
      description: "Etuis und Koffer, nach Maß gefertigt für ausgewählte Stücke von Berete Jewellers, auf Wunsch erhältlich.",
    },
    "/process": {
      title: "Der Ablauf, Schritt für Schritt",
      description: "Sechs klare Schritte von Ihrer ersten Nachricht bis zur Übergabe: Design-Anzahlung, Freigabe, auf WhatsApp begleitete Entstehung, Fotoshooting und Lieferung.",
    },
    "/about": {
      title: "Unsere Geschichte",
      description: "Die Geschichte von Berete Jewellers, einem Haus aus Dubai, das Haute Joaillerie nach Maß für Champions erschafft.",
    },
    "/contact": {
      title: "Kontakt: Ihr Stück gestalten",
      description: "Gestalten Sie Ihr Stück nach Maß mit Berete Jewellers: Schreiben Sie uns auf WhatsApp, stellen Sie Ihre Anfrage in drei Klicks zusammen oder fordern Sie einen Rückruf an.",
    },
    "/legal": {
      title: "Impressum",
      description: "Impressum und rechtliche Hinweise der Website von Berete Jewellers.",
    },
    "/privacy": {
      title: "Datenschutzerklärung",
      description: "Wie Berete Jewellers die personenbezogenen Daten verarbeitet, die Sie auf dieser Website teilen.",
    },
    "/404": {
      title: "Seite nicht gefunden",
      description: "",
    },
  },

  seo: {
    // The type keeps its capital letter: "Anhänger von Berete Jewellers".
    pieceDescription: (title: string, type: string, who: string) => title + ": " + type + " von Berete Jewellers aus Dubai, gefertigt für " + named(who, "acc") + ".",
    personTitle: (name: string, kind: "player" | "club" | "personality") => name + (kind === "player" ? ", Spieler" : kind === "club" ? ", Verein" : ""),
    personDescription: (name: string, kind: "player" | "club" | "personality") =>
      "Die Storys und die maßgefertigten Stücke " + ofName(name) + " (" + (kind === "club" ? "Verein" : kind === "personality" ? "Persönlichkeit" : "Spieler") + ") bei Berete Jewellers, Haute Joaillerie nach Maß aus Dubai.",
  },

  /** Der 3D-Viewer (Seiten der Stücke, private Links) und die Seite eines privaten Links. */
  viewer: {
    title: "In 3D entdecken",
    /** The button at the top of the page of a piece that has a 3D model. */
    see: "In 3D ansehen",
    /** The mark on the card of a piece that has a 3D model (read aloud). */
    available: "In 3D verfügbar",
    intro: "Drehen Sie es, gehen Sie bis zum kleinsten Stein heran, probieren Sie die Metalle.",
    canvasLabel: (piece: string) => piece + " in 3D",
    loading: (percent: number) => "3D-Modell wird geladen · " + percent + " %",
    preparing: "3D-Modell wird vorbereitet",
    failed: "Das 3D-Modell konnte nicht geladen werden.",
    retry: "Erneut versuchen",
    noWebgl: "Dieser Browser kann kein 3D anzeigen. Versuchen Sie einen anderen oder bitten Sie uns per WhatsApp um Fotos.",
    hint: "Ziehen zum Drehen · Mausrad zoomt dorthin, wo Sie zeigen · Rechtsklick zum Verschieben · Doppelklick auf ein Detail, um näher heranzugehen",
    hintTouch: "Ein Finger zum Drehen · Zwei Finger auseinander zum Zoomen · Zwei Finger zum Verschieben · Doppeltippen auf ein Detail, um näher heranzugehen",
    metal: "Metall",
    metals: { "yellow-gold": "18 Karat Gelbgold", "white-gold": "18 Karat Weißgold", "rose-gold": "18 Karat Roségold", platinum: "Platin", "black-rhodium": "Schwarzes Rhodium" },
    stoneColor: "Farbe der Steine",
    ambiance: "Licht",
    ambiances: { studio: "Studio", warm: "Warm", spotlight: "Spot" },
    light: "Licht drehen",
    views: { front: "Vorne", side: "Seite", top: "Oben" },
    reset: "Zurück zur ersten Ansicht",
    autoRotate: "Von selbst drehen",
    stopRotate: "Drehen anhalten",
    fullscreen: "Vollbild",
    exitFullscreen: "Vollbild verlassen",
    capture: "Bild speichern (PNG)",
    background: "Hintergrund",
    backgrounds: { black: "Schwarz", "studio-dark": "Dunkles Studio", "studio-light": "Helles Studio", white: "Weiß", rose: "Rosé", wood: "Nussbaumtisch", velvet: "Schwarzer Samt", satin: "Champagner-Satin", leather: "Weißes Leder" },
    want: "Ich möchte dieses Stück",
    metalOf: (metal: string, part: string) => metal + " (" + part + ")",
    wantMessage: (piece: string, metals: string) => "Hallo Berete Jewellers, ich möchte das Stück „" + piece + "“" + (metals ? " in " + metals : "") + ". Können wir darüber sprechen?",
    privateEyebrow: "Für Sie vorbereitet",
    privateTitle: "Ihr Stück in 3D",
    privateText: "Drehen Sie es, gehen Sie nah an die Details heran, probieren Sie die Metalle. Dann sagen Sie uns, was Sie davon halten.",
    love: "Ich liebe es",
    change: "Ich hätte gern eine Änderung",
    loveMessage: (piece: string, metals: string, link: string) => "Hallo Berete Jewellers, ich liebe das Stück „" + piece + "“" + (metals ? " in " + metals : "") + ". " + link,
    changeMessage: (piece: string, metals: string, link: string) => "Hallo Berete Jewellers, ich hätte gern eine Änderung am Stück „" + piece + "“" + (metals ? " (" + metals + ")" : "") + ": " + link,
    expiredTitle: "Dieser Link ist abgelaufen",
    expiredText: "Bitten Sie uns per WhatsApp um einen neuen: Wir senden ihn sofort.",
    missingTitle: "Diesen Link gibt es nicht",
    missingText: "Prüfen Sie die erhaltene Adresse oder schreiben Sie uns auf WhatsApp.",
    askLink: "Per WhatsApp anfragen",
    askMessage: "Hallo Berete Jewellers, mein 3D-Link funktioniert nicht mehr. Könnten Sie mir einen neuen senden?",
    passwordTitle: "Dieses Stück ist geschützt",
    passwordText: "Geben Sie das Passwort ein, das Sie mit dem Link erhalten haben.",
    password: "Passwort",
    open: "Öffnen",
    wrongPassword: "Dieses Passwort ist nicht richtig.",
    validUntil: (date: string) => "Link gültig bis " + date,
  },

  /** Der private Bereich der Kunden (/vip). */
  vip: {
    eyebrow: "Berete VIP",
    title: "Ihr privater Bereich",
    intro: "Ihre Stücke in 3D, für Sie vorbereitet von Berete Jewellers.",
    code: "Zugangscode",
    codeHint: "Der Code, den wir Ihnen gesendet haben, zum Beispiel 7KQ2-9MXA.",
    enter: "Eintreten",
    wrong: "Dieser Code ist nicht richtig.",
    opening: "Ihr Bereich wird geöffnet…",
    linkMissing: "Dieser Link funktioniert nicht mehr. Geben Sie Ihren Code ein oder bitten Sie uns per WhatsApp um einen neuen Link.",
    hello: (name: string) => "Hallo " + name,
    yourPieces: "Ihre Stücke",
    none: "Ihre Stücke erscheinen hier, sobald sie fertig sind.",
    logout: "Abmelden",
    footerLink: "Kundenbereich",
    askCode: "Meinen Code per WhatsApp anfragen",
    askMessage: "Hallo Berete Jewellers, könnten Sie mir meinen Zugangscode für meinen privaten Bereich senden?",
  },
};
