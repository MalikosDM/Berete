/*
 * Die Wörter der Website, auf Deutsch (Quelle: en.ts), in der Sie-Form.
 * Dieselben Einträge in derselben Reihenfolge; jede Funktion setzt die
 * Werte in den deutschen Satz, mit Artikel und Fall, wo es nötig ist.
 */
import { plural } from "../format";
import type { Messages } from "./en";
import { de as house } from "../house/de";

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

/** Eine WhatsApp-Nachricht: woher der Besucher kommt, dann der Wunsch jeder Nachricht. */
const discovered = (what: string) => "Hallo Berete, ich habe " + what + " auf Ihrer Website entdeckt und würde gern über eine eigene Kreation nach Maß sprechen.";

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
    startPiece: "Ihre Kreation gestalten",
    whatsapp: "WhatsApp",
    chatWhatsapp: "Ein privates Gespräch beginnen",
    allCreations: "Alle Kreationen",
    allPlayers: "Den Kreis entdecken",
    enterWorld: "In die Welt eintauchen",
    seePiece: "In die Welt eintauchen",
    readArticle: "Zum Artikel",
    close: "Schließen",
    previous: "Vorherige",
    next: "Nächste",
    back: "Zurück",
    yourPiece: "Ihre nächste Kreation",
    yourStory: "Ihre Geschichte, in Diamanten",
    madeFor: (who: string) => "Exklusiv geschaffen für " + named(who, "acc"),
    privateCollector: PRIVATE_COLLECTOR,
    newPiecesTitle: "Neue Stücke entstehen gerade",
    newPiecesText: "Diese Kollektion wird bald enthüllt. Gestalten Sie bis dahin Ihr eigenes Stück.",
  },

  whatsapp: {
    hello: "Hallo Berete, ich würde gern über eine eigene Kreation nach Maß sprechen.",
    createBox: "Hallo Berete, ich habe die Signature-Etuis auf Ihrer Website entdeckt und möchte mein eigenes Etui in Auftrag geben.",
    piece: (name: string) => discovered("die Kreation „" + name + "“"),
    person: (name: string) => discovered("die Kreationen für " + named(name, "acc")),
    collection: (name: string) => discovered("Ihre " + name),
    pages: {
      home: "Hallo Berete, ich habe Ihre Website entdeckt und würde gern über eine eigene Kreation nach Maß sprechen.",
      creations: discovered("Ihre Kreationen"),
      atelier: discovered("das Atelier"),
      house: discovered("die Geschichte des Hauses"),
      circle: discovered("den Berete-Kreis"),
      trunks: discovered("die Signature-Etuis"),
      journey: discovered("den Weg zum Unikat"),
    },
    configurator: (type: string, budget: string, timing: string, pieceName?: string) =>
      ["Hallo Berete, ich möchte eine Kreation nach Maß in Auftrag geben.", "Stück: " + type, "Budget: " + budget, "Zeitrahmen: " + timing, ...(pieceName ? ["Inspiriert von: „" + pieceName + "“"] : [])].join("\n"),
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
    creations: "Die Kreationen",
    players: "Der Berete-Kreis",
    atelier: "Das Atelier",
    boxes: "Signature-Etuis",
    process: "Der Weg zum Unikat",
    about: "Das Haus",
    contact: "Private Anfragen",
    openMenu: "Menü öffnen",
    closeMenu: "Menü schließen",
  },

  footer: {
    creations: "Die Kreationen",
    house: "Das Haus",
    contact: "Private Anfragen",
    contactPage: "Private Anfragen",
    yourPiece: "Ihre nächste Kreation",
    pitch: "Ketten, Anhänger und Meisterringe, gemeinsam mit Ihnen entworfen und für den großen Moment gefertigt.",
    legal: "Impressum",
    privacy: "Datenschutz",
  },

  collections: {
    items: {
      pendants: { name: "Anhänger", intro: "Initialen, Embleme, Torjubel: Jeder Anhänger erzählt eine Geschichte, plastisch modelliert und Stein für Stein gefasst." },
      chains: { name: "Ketten", intro: "Glieder, eines nach dem anderen gezeichnet, von Schmetterlingen bis zu Infinity-Knoten – allein getragen oder mit einem Anhänger." },
      rings: { name: "Ringe", intro: "Mehr als ein Symbol des Sieges. Ein Vermächtnis, verewigt in Gold und Diamanten." },
      bracelets: { name: "Armbänder", intro: "Armbänder nach Maß, Glied für Glied gefertigt." },
      watches: { name: "Uhren", intro: "Uhren, mit Diamanten besetzt vom Gehäuse bis zum Armband." },
      "jesus-pieces": { name: "Jesus Pieces", intro: "Das Antlitz Christi, mit Dornen oder Blumen gekrönt, und Christus am Kreuz: jedes Jesus Piece plastisch modelliert und Stein für Stein gefasst." },
    },
    eyebrow: "Das Portfolio",
    title: "Die Kreationen entdecken",
    explore: "Entdecken",
    count: (count: number) => n(count, "# Kreation", "# Kreationen"),
    tileAlt: (collection: string, piece: string) => collection + ": " + piece,
    collection: "Das Portfolio",
    listLabel: (collection: string) => "Die Kreationen: " + collection,
    others: "Mehr aus dem Portfolio",
    ctaTitle: "Ihr Stück, von der ersten Skizze an.",
    ctaText: "Jedes Stück beginnt mit einem Gespräch. Erzählen Sie uns Ihre Geschichte, wir zeichnen sie.",
    ctaButton: "Auf WhatsApp starten",
  },

  home: {
    filmLabel: "Film von Berete Jewellers, der sich beim Scrollen abspielt",
    kicker: "Berete Jewellers · Dubai",
    title: "Die Kunst der Individualität.",
    intro: "Unikate der Haute Joaillerie – für alle, die ihr eigenes Vermächtnis schaffen.",
    discover: "Die Kreationen entdecken",
    statements: ["Für Größe geschaffen. Von Champions getragen.", "Der Ringkopf hebt sich und gibt die Trophäe frei.", "Modelliert, dann Stein für Stein gefasst.", "Kreationen, die Identität prägen."],
    featured: "Welt im Fokus",
    enterCapsule: "In die Welt eintauchen",
    liftTop: "Das Geheimnis enthüllen",
    closeTop: "Das Geheimnis verbergen",
    liftTopLabel: "Das Geheimnis des Rings enthüllen",
    closeTopLabel: "Das Geheimnis des Rings verbergen",
    special: {
      eyebrow: "Außergewöhnliche Auftragswerke",
      title: "Der Sieg, verewigt",
      lead: "Mehr als ein Symbol des Sieges. Ein Vermächtnis, verewigt in Gold und Diamanten. Zwei Ringe für zwei Mannschaften, Inter Mailand und den VfB Stuttgart – beide öffnen sich zur Trophäe.",
      discover: "Das Meisterwerk entdecken",
    },
    wornBy: "Getragen von Ikonen",
    players: "Der Berete-Kreis",
    inside: "Im Herzen von Berete",
    insideTitle: "Von der Vision zur Wirklichkeit",
    atelierTitle: "Das Atelier",
    atelierText: "Jeder Stein von Hand gefasst, unter dem Mikroskop.",
    atelierAlt: "Nahaufnahme eines Fasswerkzeugs bei der Arbeit an Diamanten",
    enter: "Eintreten",
    boxesTitle: "Signature-Etuis",
    boxesText: "Präsentationsetuis nach Maß, gefertigt für ausgewählte Kreationen.",
    discoverShort: "Entdecken",
    processTitle: "Der Weg zum Unikat",
    processText: "Sechs klare Schritte, begleitet auf WhatsApp.",
    follow: "Verfolgen",
  },

  showcase: {
    eyebrow: "Signature-Kreationen",
    title: "Die Welten",
  },

  scroll: {
    hint: "Scrollen",
  },

  creations: {
    eyebrow: "Das Portfolio",
    title: "Die Kreationen",
    lead: "Jede Kreation. Eine eigene Welt.",
    listLabel: "Alle Kreationen",
    filterLabel: "Kreationen filtern",
    all: "Alle Kreationen",
    // German nouns keep their capital letter, and every collection is a plural: "Die Anhänger entdecken".
    enterCollection: (collection: string) => "Die " + collection + " entdecken",
  },

  piece: {
    /** The views of the showcase of a piece (src/components/Showcase.tsx). */
    views: { face: "Vorderseite", profile: "Profil", back: "Rückseite", detail: "Detail", worn: "getragen" },
    showView: (view: string) => "Ansicht anzeigen: " + view,
    viewOf: (n: number, total: number) => "Ansicht " + n + " von " + total,
    viewsLabel: "Die Ansichten des Stücks",
    viewAlt: (title: string, view: string) => title + ", Ansicht: " + view,
    sketchAlt: (title: string) => "Die Hand von Yoni Berete zeichnet die erste Skizze von " + title,
    steps: {
      sketch: { title: "Die Vision", text: "Die Idee wird von Hand gezeichnet und dann modelliert, bis jede Proportion stimmt." },
      raw: { title: "Die Formgebung", text: "Das Metall wird gegossen und montiert, bevor auch nur ein Stein gefasst wird." },
      setting: { title: "Die Kunst des Fassens", text: "Jeder Stein wird von Hand gefasst, unter Vergrößerung." },
      polishing: { title: "Der letzte Schliff", text: "Jede Oberfläche wird poliert, bis das Metall hinter dem Licht verschwindet." },
      delivery: { title: "Die große Enthüllung", text: "Geprüft, fotografiert und dann übergeben – in seinem Etui, sofern es eines hat." },
    },
    want: "Ihr Unikat in Auftrag geben",
    details: "Die Kunst des Details",
    detailsEyebrow: "Jedes Detail erzählt eine Geschichte",
    seePhoto: "Das Detail entdecken",
    historic: "Historische Auftragswerke",
    seenNote: "Edle Materialien: nach den Fotos, vom Atelier noch zu bestätigen.",
    madeFor: "Exklusiv geschaffen für",
    theClub: "Den Verein entdecken",
    // No "his" or "her": the profile may be of anyone.
    theProfile: "Das Porträt entdecken",
    stories: (_count: number) => "Die Momente",
    andOthers: (names: string) => "Sowie " + names + ".",
    seenInStories: "Zu sehen in unseren Storys",
    story: "Die Geschichte dahinter",
    makingEyebrow: "Von der Vision zur Wirklichkeit",
    makingTitle: "Die Entstehung eines Meisterwerks",
    thisPiece: "Dieses Stück",
    makingFilm: "Die ganze Fertigung dieses Stücks, im Atelier gefilmt.",
    delivered: "Übergeben",
    handedOverTo: (_client: string) => "Die feierliche Übergabe",
    handover: "Die Übergabe",
    sheet: "Komposition & Handwerkskunst",
    customBox: "Präsentation nach Maß",
    deliveredIn: (box: string) => "Geliefert in seinem eigens dafür gefertigten Etui: " + box + ".",
    press: "Im Rampenlicht",
    pressAlt: (outlet: string) => "Presseartikel: " + outlet,
    similar: "Weitere Welten",
    more: (_collection: string) => "Weitere Kreationen entdecken",
    theCollection: "Das Portfolio entdecken",
    ctaTitle: "Ihre Vision. Ihre Welt.",
    ctaText: "Senden Sie uns seinen Namen auf WhatsApp: Wir antworten mit einer ersten Idee und den nächsten Schritten.",
    otherWays: "Private Anfragen",
  },

  gallery: {
    title: "Details",
    hintPinned: "Scrollen zum Entdecken · Tippen zum Vergrößern",
    hint: "Tippen zum Vergrößern",
    open: (what: string) => "Im Vollbild öffnen: " + what,
    photo: "Foto",
    zoomIn: "Vergrößern",
    zoomOut: "Verkleinern",
    /** The grid of every other photo of a piece, under its gallery. */
    everyAngle: "Aus jedem Blickwinkel",
    more: (n: number) => n + " weitere ansehen",
    film: "Film",
  },

  players: {
    eyebrow: "Der Berete-Kreis",
    title: "Getragen von Ikonen",
    lead: "Herausragende Persönlichkeiten. Außergewöhnliche Kreationen.",
    listLabel: "Der Berete-Kreis",
    groups: { player: "Athleten", club: "Legendäre Vereine", personality: "Kulturikonen" },
    portrait: (name: string) => "Porträt " + ofName(name),
    photos: "In Bildern",
    photo: (name: string, index: number) => name + ", Foto " + index,
    instagramOf: (name: string) => name + " auf Instagram",
    club: "Legendärer Verein",
    personality: "Kulturikone",
    number: "Nr.",
    bioWithPieces: (name: string) => "Die für " + named(name, "acc") + " gefertigten Stücke und die Momente, die wir auf unserem Instagram geteilt haben.",
    bioStories: (name: string) => "Die Momente, die wir mit " + named(name, "dat") + " auf unserem Instagram geteilt haben.",
    // No "his" or "her": the profile may be of anyone.
    watch: (_count: number) => "Die Momente entdecken",
    pieces: (count: number) => n(count, "Persönliche Kreation", "Persönliche Kreationen"),
    stories: "Die Momente",
    moments: (count: number) => n(count, "# Moment", "# Momente"),
    theirPlayers: "Die Athleten",
  },

  stories: {
    bar: "Storys",
    previous: "Vorherige Storys",
    next: "Nächste Storys",
    open: (title: string) => title + ", Story öffnen",
    dialog: (title: string) => "Story: " + title,
    alt: (title: string, index: number) => title + ", Story " + index,
    play: "Video abspielen",
    soundOff: "Ton ausschalten",
    soundOn: "Ton einschalten",
    close: "Story schließen",
    help: "Tippen Sie rechts für den nächsten Schritt, links für den vorherigen. Gedrückt halten zum Pausieren.",
    want: "Ihr eigenes Stück? WhatsApp",
    seePieceLabel: (title: string) => "In die Welt eintauchen: " + title,
  },

  atelier: {
    steps: [
      { title: "Die Geburt der Form", text: "Das Modell wird zu rohem Metall: ein Anhänger vor seinem ersten Stein." },
      { title: "Präzision in jedem Detail", text: "Glied für Glied nimmt ein Armband auf der Werkbank Gestalt an." },
      { title: "Das Streben nach Brillanz", text: "Jedes Glied wird von Hand poliert, damit nur die Steine zu sehen sind." },
      { title: "Der letzte Schliff", text: "Ein Signaturstück im Entstehen, unter der Lampe geprüft." },
    ],
    step: (index: number) => "Schritt " + index,
    stepAlt: (step: string) => step + " im Atelier",
    filmLabel: "Ein Stück, von Hand im Atelier montiert",
    eyebrow: "Dubai",
    title: "Das Atelier",
    lead: "Wo Vorstellungskraft auf Meisterschaft trifft.",
    making: "Die Kunst des Handwerks",
    ctaTitle: "Erleben Sie, wie Ihre Kreation zum Leben erwacht.",
    ctaText: "Während der gesamten Entstehung erhalten Sie auf WhatsApp Fotos und Videos vom Fortschritt, Schritt für Schritt.",
    seeProcess: "Den Weg zum Unikat entdecken",
  },

  boxes: {
    eyebrow: "Individuell gefertigt",
    title: "Signature-Etuis",
    lead: "Jede besondere Kreation verdient eine außergewöhnliche Präsentation.",
    listLabel: "Präsentationsetuis nach Maß",
    open: (name: string) => name + " im Vollbild öffnen",
    photos: (count: number) => n(count, "# Foto", "# Fotos"),
    create: "Ihr Signature-Etui in Auftrag geben",
    closing: "Die Vollendung Ihrer Kreation",
  },

  process: {
    filmLabel: "Der Ablauf, Schritt für Schritt, der sich beim Scrollen abspielt",
    steps: [
      { title: "Die private Beratung", text: "Ideen und Budget. Erzählen Sie uns von dem Moment, den Sie festhalten möchten, von Ihren Referenzen, Ihrer Geschichte.", meter: "0 %", payNote: "In dieser Phase fällt keine Zahlung an." },
      { title: "Der Designauftrag", text: "Wird bei Bestätigung vom Endpreis abgezogen und deckt bei einer Absage die Designkosten.", meter: "Anzahlung", payNote: "Design-Anzahlung geleistet." },
      { title: "Die Designfreigabe", text: "50 % der Produktion werden vor Beginn der Fertigung bezahlt.", meter: "50 %", payNote: "50 % der Produktion bezahlt." },
      { title: "Die Kunst der Entstehung", text: "Fotos und Videos vom Fortschritt auf WhatsApp; die Dauer hängt von der Komplexität ab.", meter: "50 %", payNote: "Während der Fertigung ist nichts weiter zu zahlen." },
      { title: "Die Enthüllung in Bildern", text: "Ein eigenes Shooting, dann die Vorbereitung der Lieferung.", meter: "50 %", payNote: "Ihr Stück wird fotografiert, bevor es das Atelier verlässt." },
      { title: "Restzahlung & feierliche Übergabe", text: "Die restlichen 50 % etwa eine Woche vor der Übergabe.", meter: "100 %", payNote: "Vollständig bezahlt, bereit zur Übergabe." },
    ],
    eyebrow: "Sechs Kapitel. Eine Vision.",
    title: "Der Weg zum Unikat",
    lead: "Von Ihrer ersten Nachricht bis zu dem Tag, an dem Sie es tragen.",
    payment: "Zahlung",
    paid: "Bezahlter Betrag",
    noPayment: "In dieser Phase fällt keine Zahlung an.",
    clear: "Volle Transparenz",
    overviewTitle: "Ihr Weg, Schritt für Schritt",
    overviewText: "Eine Design-Anzahlung, die Hälfte der Produktion bei der Freigabe, der Rest eine Woche vor der Übergabe. Sie verfolgen jeden Schritt auf WhatsApp.",
    closingEyebrow: "Alles beginnt mit einem Gespräch",
  },

  about: {
    eyebrow: "Das Haus",
    title: "Das Haus Berete",
    lead: "Eine unabhängige Vision zeitgenössischer Haute Joaillerie.",
    founderLabel: "Die Vision hinter Berete",
    founderPortrait: "Porträt von Yoni Berete",
    chapters: "Die Geschichte von Berete",
    quoteNumber: (index: number, label: string) => String(index).padStart(2, "0") + " — " + label,
    quoted: (text: string) => "„" + text + "“",
  },

  house,

  contact: {
    eyebrow: "Private Anfragen",
    title: "Ihre Kreation gestalten",
    lead: "Jedes Meisterwerk beginnt mit einem Gespräch.",
    inspired: "Bereit für Ihre eigene Kreation?",
    oneConversation: "Ein Gespräch genügt, um zu beginnen. Erzählen Sie uns Ihre Idee auf WhatsApp, wir antworten Ihnen persönlich.",
    trustedBy: "Das Vertrauen der Champions",
    configTitle: "Ihre private Beratung",
    configSteps: ["Ihre Wunschkreation", "Budget", "Zeitrahmen"],
    answer: (question: string) => question + ":",
    pieceChoices: { chain: "Kette", pendant: "Anhänger", ring: "Meisterring", bracelet: "Armband", watch: "Uhr", other: "Etwas ganz Eigenes" },
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
    callTitle: "Privater Rückruf",
    callSent: "Vielen Dank. Wir rufen Sie in Kürze zurück.",
    callButton: "Rückruf anfordern",
    emailTitle: "Private Korrespondenz",
    emailSent: "Vielen Dank. Ihre Nachricht ist eingegangen, wir antworten Ihnen persönlich.",
    callWhatsapp: (name: string, phone: string, about: string) => "Hallo Berete Jewellers, könnten Sie mich zurückrufen? Name: " + name + ". Telefon: " + phone + "." + (about ? " Es geht um: " + about + "." : ""),
    emailWhatsapp: (name: string, email: string, idea: string) => "Hallo Berete Jewellers, ich bin " + name + " (" + email + "). Meine Idee: " + idea,
    readyWhatsapp: "Ihre Anfrage wurde in WhatsApp geöffnet, bereits geschrieben: Sie müssen sie nur noch senden.",
    failedWhatsapp: "Das Formular konnte nicht gesendet werden. Senden Sie Ihre Anfrage per WhatsApp: Sie ist bereits geschrieben.",
    sendWhatsapp: "Per WhatsApp senden",
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
    whatsapp: "Oder beginnen Sie ein privates Gespräch auf WhatsApp",
  },

  seoPages: {
    "/": {
      title: "Berete Jewellers — Die Kunst der Individualität, Dubai",
      description: "Unikate der Haute Joaillerie für alle, die ihr eigenes Vermächtnis schaffen. Anhänger, Ketten, Meisterringe aus Dubai. Von uns gefertigt. Von Ihnen inspiriert.",
    },
    "/creations": {
      title: "Die Kreationen: Anhänger, Ketten, Ringe und Uhren",
      description: "Jede Kreation. Eine eigene Welt. Die Anhänger, Ketten, Meisterringe und Uhren von Berete Jewellers, jedes Stück in Dubai geschaffen.",
    },
    "/creations/pendants": {
      title: "Anhänger: Diamantanhänger nach Maß",
      description: "Die Anhänger von Berete Jewellers: Initialen, Embleme und Torjubel, plastisch modelliert und Stein für Stein gefasst, für Fußballer und Sammler, aus Dubai.",
    },
    "/creations/chains": {
      title: "Ketten: Diamantketten nach Maß",
      description: "Die Ketten von Berete Jewellers: Schmetterlingsglieder, gotische Zwischenstücke und Diamantblüten, Glied für Glied gezeichnet und in Dubai geschaffen.",
    },
    "/creations/rings": {
      title: "Ringe: Der Sieg, verewigt",
      description: "Mehr als ein Symbol des Sieges. Ein Vermächtnis, verewigt in Gold und Diamanten: die Meisterringe von Berete Jewellers für den VfB Stuttgart und Inter Mailand.",
    },
    "/creations/watches": {
      title: "Diamantbesetzte Uhren",
      description: "Uhren, mit Diamanten besetzt vom Gehäuse bis zum Armband, getragen von Fußballern: die Uhren von Berete Jewellers, Dubai.",
    },
    "/creations/jesus-pieces": {
      title: "Jesus Pieces: Christus-Anhänger mit Diamanten nach Maß",
      description: "Die Jesus Pieces von Berete Jewellers: das Antlitz Christi mit Dornen- oder Blumenkrone und Christus am Kreuz, modelliert und mit Diamanten besetzt in Dubai.",
    },
    "/creations/bracelets": {
      title: "Armbänder",
      description: "Armbänder nach Maß von Berete Jewellers in Dubai. Neue Stücke entstehen gerade.",
    },
    "/players": {
      title: "Der Berete-Kreis",
      description: "Herausragende Persönlichkeiten. Außergewöhnliche Kreationen. Die Athleten, Vereine und Kulturikonen, die Berete Jewellers tragen, und ihre Kreationen.",
    },
    "/atelier": {
      title: "Das Atelier",
      description: "Wo Vorstellungskraft auf Meisterschaft trifft: das Atelier von Berete Jewellers, von der Geburt der Form bis zum letzten Schliff, alles von Hand.",
    },
    "/boxes": {
      title: "Signature-Etuis",
      description: "Jede besondere Kreation verdient eine außergewöhnliche Präsentation. Die Signature-Etuis und Präsentationsetuis nach Maß von Berete Jewellers.",
    },
    "/process": {
      title: "Der Weg zum Unikat",
      description: "Sechs Kapitel. Eine Vision. Von der privaten Beratung bis zur feierlichen Übergabe, jede Zahlungsphase von Anfang an klar erklärt.",
    },
    "/about": {
      title: "Das Haus — Yoni Berete, Gründer & Kreativdirektor",
      description: "Eine unabhängige Vision zeitgenössischer Haute Joaillerie. Die Geschichte von Yoni Berete, Gründer von Berete Jewellers: zwei Welten, ein Erbe, eine Vision.",
    },
    "/contact": {
      title: "Private Anfragen",
      description: "Jedes Meisterwerk beginnt mit einem Gespräch. Ihre Kreation mit Berete Jewellers: privat auf WhatsApp, in einer Beratung in drei Schritten oder per Rückruf.",
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
    pieceDescription: (title: string, type: string, who: string) => title + ": " + type + " von Berete Jewellers aus Dubai, exklusiv geschaffen für " + named(who, "acc") + ".",
    personTitle: (name: string, kind: "player" | "club" | "personality") => name + (kind === "player" ? ", Athlet" : kind === "club" ? ", legendärer Verein" : ""),
    personDescription: (name: string, kind: "player" | "club" | "personality") =>
      "Die Storys und die maßgefertigten Stücke " + ofName(name) + " (" + (kind === "club" ? "Verein" : kind === "personality" ? "Persönlichkeit" : "Athlet") + ") bei Berete Jewellers, Haute Joaillerie nach Maß aus Dubai.",
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
    detailHint: "Ziehen, um das Schmuckstück zu drehen · Anklicken, dann scrollen zum Zoomen",
    detailHintTouch: "Mit einem Finger drehen · Mit zwei Fingern zoomen",
    metal: "Metall",
    metals: { "yellow-gold": "18 Karat Gelbgold", "white-gold": "18 Karat Weißgold", "rose-gold": "18 Karat Roségold", platinum: "Platin", "black-rhodium": "Schwarzes Rhodium" },
    stoneColor: "Farbe der Steine",
    customize: "Personalisieren",
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
    soon: "Ihr privater Bereich öffnet sehr bald. Schreiben Sie uns bis dahin auf WhatsApp, und wir senden Ihnen Ihre Stücke direkt in 3D.",
    soonMessage: "Hallo Berete Jewellers, ich würde gern meine Stücke in 3D sehen.",
  },

  films: {
    eyebrow: "Hinter dem Stück",
    enter: "Das Atelier betreten",
    lead: (title, reveal) => "Treten Sie hinter die Werkbank und sehen Sie, wie " + title + " entsteht" + (reveal ? " – dann entdecken Sie das Stück in Die große Enthüllung." : "."),
    making: "Die Anfertigung",
    reveal: "Die große Enthüllung",
    dialog: (title) => "Das Atelier von " + title,
    play: "Abspielen",
    pause: "Pause",
    soundOn: "Ton einschalten",
    soundOff: "Ton ausschalten",
    silent: "Film ohne Ton",
    seek: (film) => "Position in " + film,
    leave: "Das Atelier verlassen",
    replay: "Noch einmal ansehen",
    next: "Als Nächstes: Die große Enthüllung",
    loading: "Der Film wird geladen",
    open: (title) => "Das Atelier von " + title + " betreten",
    sectionEyebrow: "Von der Werkbank",
    sectionTitle: "Jedes Stück, sein Making-of",
    sectionLead: "Jede Kreation, an der Werkbank gefilmt. Öffnen Sie ihr Atelier und tauchen Sie dann in ihre Welt ein.",
    intro: (title: string) => "Der Film von " + title,
    skip: "Zum Schmuckstück",
    watch: "Film ansehen",
  },
};
