/*
 * Les mots du site, en français (source : en.ts). Mêmes entrées, mêmes
 * fonctions ; chaque fonction place les valeurs dans la phrase française.
 */
import { plural, type PluralForms } from "../format";
import type { Messages } from "./en";
import { fr as house } from "../house/fr";

const n = (count: number, forms: PluralForms) => plural("fr-FR", count, forms);

/** Les clubs prennent l’article en français. */
const CLUBS: Record<string, string> = { "VfB Stuttgart": "le VfB Stuttgart", "Inter Milan": "l’Inter Milan" };
/** Le texte de common.privateCollector, écrit en minuscule au milieu d’une phrase. */
const PRIVATE_COLLECTOR = "Un collectionneur privé";

/** Un nom au milieu d’une phrase : le VfB Stuttgart, un collectionneur privé, Kevin Schade. */
const named = (name: string) => CLUBS[name] ?? (name === PRIVATE_COLLECTOR ? "un collectionneur privé" : name);
/** De + nom : du VfB Stuttgart, de l’Inter Milan, d’Angelo Stiller, de Kevin Schade. */
const ofName = (name: string) => {
  const x = named(name);
  if (x.startsWith("le ")) return "du " + x.slice(3);
  return /^[aeiouyàâäéèêëîïôöûü]/i.test(x) ? "d’" + x : "de " + x;
};
/** Les types de bijou féminins, pour l’accord du participe. */
const FEMININE = new Set(["chaîne", "bague", "montre"]);

/** Un message WhatsApp : d’où vient le visiteur, puis le souhait de chaque message (les mots de Yoni, 21/11/2026). */
const discovered = (what: string) => "Bonjour Berete, j’ai découvert " + what + " sur votre site et j’aimerais vous parler d’une création sur mesure, rien qu’à moi.";
const lowerFirst = (s: string) => s.charAt(0).toLocaleLowerCase("fr") + s.slice(1);

export const fr: Messages = {
  site: {
    skip: "Aller au contenu",
    homeLabel: "Berete Jewellers, accueil",
    tagline: "Créé par nous. Inspiré par vous.",
    baseLine: "Basée à Dubaï · Livraison dans le monde entier",
    rights: (year: number) => "© " + year + " Berete Jewellers. Tous droits réservés.",
  },

  language: {
    label: "Langue",
    choose: "Choisir la langue",
  },

  common: {
    startPiece: "Imaginez votre création",
    whatsapp: "WhatsApp",
    chatWhatsapp: "Entamer une conversation privée",
    allCreations: "Toutes les créations",
    allPlayers: "Découvrir le Cercle",
    enterWorld: "Entrer dans l’univers",
    seePiece: "Entrer dans l’univers",
    readArticle: "Découvrir l’article",
    close: "Fermer",
    previous: "Précédent",
    next: "Suivant",
    back: "Retour",
    yourPiece: "Votre prochaine création",
    yourStory: "Votre histoire, en diamants",
    // « Créée exclusivement pour Kevin Schade » : la création, au féminin, pour une bague comme pour un pendentif.
    madeFor: (who: string) => "Créée exclusivement pour " + named(who),
    privateCollector: PRIVATE_COLLECTOR,
    newPiecesTitle: "De nouvelles pièces sont en cours de création",
    newPiecesText: "Cette collection sera bientôt dévoilée. D’ici là, commencez votre pièce.",
  },

  whatsapp: {
    hello: "Bonjour Berete, j’aimerais vous parler d’une création sur mesure, rien qu’à moi.",
    createBox: "Bonjour Berete, j’ai découvert les Écrins Signature sur votre site et j’aimerais imaginer un écrin rien qu’à moi.",
    piece: (name: string) => discovered("la création « " + name + " »"),
    person: (name: string) => discovered("les créations réalisées pour " + named(name)),
    collection: (name: string) => discovered("vos " + lowerFirst(name)),
    pages: {
      home: "Bonjour Berete, j’ai découvert votre site et j’aimerais vous parler d’une création sur mesure, rien qu’à moi.",
      creations: discovered("vos créations"),
      atelier: discovered("l’Atelier"),
      house: discovered("l’histoire de la Maison"),
      circle: discovered("le Cercle Berete"),
      trunks: discovered("les Écrins Signature"),
      journey: discovered("l’Expérience sur mesure"),
    },
    configurator: (type: string, budget: string, timing: string, pieceName?: string) =>
      ["Bonjour Berete, je souhaiterais créer une pièce sur mesure.", "Pièce : " + type, "Budget : " + budget, "Délai : " + timing, ...(pieceName ? ["Inspiration : « " + pieceName + " »"] : [])].join("\n"),
  },

  types: {
    chain: "Chaîne",
    pendant: "Pendentif",
    ring: "Bague",
    bracelet: "Bracelet",
    watch: "Montre",
  },

  nav: {
    main: "Menu principal",
    mobile: "Menu mobile",
    creations: "Les Créations",
    players: "Le Cercle Berete",
    atelier: "L’Atelier",
    boxes: "Écrins Signature",
    process: "L’Expérience sur mesure",
    about: "La Maison",
    contact: "Contact privé",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
  },

  footer: {
    creations: "Les Créations",
    house: "La Maison",
    contact: "Contact privé",
    contactPage: "Contact privé",
    yourPiece: "Votre prochaine création",
    pitch: "Chaînes, pendentifs et bagues de champion, dessinés avec vous et réalisés pour le moment.",
    legal: "Mentions légales",
    privacy: "Confidentialité",
  },

  collections: {
    items: {
      pendants: { name: "Pendentifs", intro: "Initiales, emblèmes, célébrations : chaque pendentif, sculpté en volume et serti pierre par pierre, raconte une histoire." },
      chains: { name: "Chaînes", intro: "Des maillons dessinés un à un, des papillons aux nœuds infinis, pour des chaînes à porter seules ou avec un pendentif." },
      rings: { name: "Bagues", intro: "Bien plus qu’un symbole de victoire. Un héritage immortalisé dans l’or et les diamants." },
      bracelets: { name: "Bracelets", intro: "Des bracelets réalisés sur mesure, maillon par maillon." },
      watches: { name: "Montres", intro: "Des montres serties de diamants, du boîtier au bracelet." },
      "jesus-pieces": { name: "Jesus Pieces", intro: "Le visage du Christ, couronné d’épines ou de fleurs, et le Christ en croix : chaque Jesus piece sculptée en volume et sertie pierre par pierre." },
    },
    eyebrow: "Le Portfolio",
    title: "Explorer les créations",
    explore: "Explorer",
    count: (count: number) => n(count, { one: "# création", other: "# créations" }),
    tileAlt: (collection: string, piece: string) => collection + " : " + piece,
    collection: "Le Portfolio",
    listLabel: (collection: string) => "Les créations de la collection " + collection,
    others: "Plus loin dans le Portfolio",
    ctaTitle: "La vôtre, dès la première esquisse.",
    ctaText: "Chaque pièce commence par une conversation. Racontez-nous votre histoire, nous la dessinons.",
    ctaButton: "Commencer sur WhatsApp",
  },

  home: {
    filmLabel: "Film Berete Jewellers, qui se déroule au fil du défilement",
    kicker: "Berete Jewellers · Dubaï",
    title: "L’Art de la singularité.",
    intro: "Des créations uniques de haute joaillerie pour celles et ceux qui écrivent leur propre histoire.",
    discover: "Explorer les créations",
    statements: ["Créé pour l’excellence. Porté par les champions.", "Le plateau se soulève et révèle le trophée.", "Sculpté, puis serti pierre par pierre.", "Des créations qui affirment une identité."],
    featured: "L’Univers à l’honneur",
    enterCapsule: "Entrer dans l’univers",
    liftTop: "Révéler le secret",
    closeTop: "Refermer le secret",
    liftTopLabel: "Révéler le secret de la bague",
    closeTopLabel: "Refermer le secret de la bague",
    special: {
      eyebrow: "Créations d’exception",
      title: "La Victoire immortalisée",
      lead: "Bien plus qu’un symbole de victoire. Un héritage immortalisé dans l’or et les diamants. Deux bagues pour deux équipes, l’Inter Milan et le VfB Stuttgart, qui s’ouvrent toutes deux sur le trophée.",
      discover: "Découvrir le chef-d’œuvre",
    },
    wornBy: "Portées par des icônes",
    players: "Le Cercle Berete",
    inside: "Au cœur de Berete",
    insideTitle: "De la vision à la réalité",
    atelierTitle: "L’Atelier",
    atelierText: "Chaque pierre sertie à la main, sous le microscope.",
    atelierAlt: "Gros plan sur un outil de sertissage travaillant des diamants",
    enter: "Entrer",
    boxesTitle: "Écrins Signature",
    boxesText: "Des écrins d’exception, pensés pour une sélection de créations.",
    discoverShort: "Découvrir",
    processTitle: "L’Expérience sur mesure",
    processText: "Six étapes claires, suivies sur WhatsApp.",
    follow: "Suivre",
  },

  showcase: {
    eyebrow: "Créations Signature",
    title: "Les Univers",
  },

  scroll: {
    hint: "Faites défiler",
  },

  creations: {
    eyebrow: "Le Portfolio",
    title: "Les Créations",
    lead: "Chaque création. Un univers à part entière.",
    listLabel: "Toutes les créations",
    filterLabel: "Filtrer les pièces",
    all: "Toutes les créations",
    enterCollection: (collection: string) => "Explorer les " + collection.toLowerCase(),
  },

  piece: {
    /** The views of the showcase of a piece (src/components/Showcase.tsx). */
    views: { face: "face", profile: "profil", back: "dos", detail: "détail", worn: "portée" },
    showView: (view: string) => "Voir la vue " + view,
    viewOf: (n: number, total: number) => "Vue " + n + " sur " + total,
    viewsLabel: "Les vues de la pièce",
    viewAlt: (title: string, view: string) => title + ", vue " + view,
    sketchAlt: (title: string) => "La main de Yoni Berete dessinant le premier croquis de " + title,
    steps: {
      sketch: { title: "La Vision", text: "L’idée est dessinée à la main, puis modélisée jusqu’à ce que chaque proportion soit juste." },
      raw: { title: "La sculpture de la matière", text: "Le métal est coulé et assemblé, avant que la moindre pierre ne soit sertie." },
      setting: { title: "L’Art du sertissage", text: "Chaque pierre est sertie à la main, sous la loupe." },
      polishing: { title: "L’Ultime raffinement", text: "Chaque surface est polie jusqu’à ce que le métal s’efface derrière la lumière." },
      delivery: { title: "La Révélation finale", text: "Contrôlée, photographiée, puis remise, dans son écrin lorsqu’elle en a un." },
    },
    want: "Imaginez votre propre création",
    details: "L’Art du détail",
    detailsEyebrow: "Chaque détail raconte une histoire",
    seePhoto: "Découvrir le détail",
    historic: "Créations historiques",
    seenNote: "Matières précieuses : d’après les photos, à confirmer par l’atelier.",
    madeFor: "Créée exclusivement pour",
    theClub: "Découvrir le club",
    theProfile: "Découvrir son univers",
    stories: (_count: number) => "Moments exclusifs",
    andOthers: (names: string) => "Ainsi que " + names + ".",
    seenInStories: "À voir dans nos stories",
    story: "Au cœur de la création",
    makingEyebrow: "De la vision à la réalité",
    makingTitle: "La naissance d’un chef-d’œuvre",
    thisPiece: "Cette pièce",
    makingFilm: "Toute la fabrication de cette pièce, filmée à l’atelier.",
    delivered: "Livrée",
    handedOverTo: (_client: string) => "La Présentation officielle",
    handover: "La remise",
    sheet: "Composition & Savoir-faire",
    customBox: "Présentation sur mesure",
    deliveredIn: (box: string) => "Livrée dans l’écrin conçu pour elle : " + box + ".",
    press: "Sous les projecteurs",
    pressAlt: (outlet: string) => "Article de " + outlet,
    similar: "Au-delà de cet univers",
    more: (_collection: string) => "Découvrir d’autres créations",
    theCollection: "Explorer le Portfolio",
    ctaTitle: "Votre vision. Votre univers.",
    ctaText: "Envoyez-nous son nom sur WhatsApp : nous vous répondons avec une première idée et les prochaines étapes.",
    otherWays: "Contact privé",
  },

  gallery: {
    title: "Détails",
    hintPinned: "Faites défiler pour explorer · Touchez pour agrandir",
    hint: "Touchez pour agrandir",
    open: (what: string) => "Ouvrir en plein écran : " + what,
    photo: "Photo",
    zoomIn: "Zoom avant",
    zoomOut: "Zoom arrière",
    /** The grid of every other photo of a piece, under its gallery. */
    everyAngle: "Sous tous les angles",
    more: (n: number) => "Voir les " + n + " autres",
    film: "Film",
  },

  players: {
    eyebrow: "Le Cercle Berete",
    title: "Portées par des icônes",
    lead: "Des personnalités singulières. Des créations extraordinaires.",
    listLabel: "Le Cercle Berete",
    groups: { player: "Athlètes", club: "Clubs emblématiques", personality: "Figures emblématiques" },
    portrait: (name: string) => "Portrait " + ofName(name),
    photos: "En images",
    photo: (name: string, index: number) => name + ", photo " + index,
    instagramOf: (name: string) => name + " sur Instagram",
    club: "Club emblématique",
    personality: "Figure emblématique",
    number: "N°",
    bioWithPieces: (name: string) => "Les pièces réalisées pour " + named(name) + ", et les moments partagés sur notre Instagram.",
    bioStories: (name: string) => "Les moments partagés avec " + named(name) + " sur notre Instagram.",
    watch: (_count: number) => "Explorer leur univers",
    pieces: (count: number) => n(count, { one: "Création personnelle", other: "Créations personnelles" }),
    stories: "Moments exclusifs",
    moments: (count: number) => n(count, { one: "# moment", other: "# moments" }),
    theirPlayers: "Les athlètes",
  },

  stories: {
    bar: "Stories",
    previous: "Stories précédentes",
    next: "Stories suivantes",
    open: (title: string) => title + ", ouvrir la story",
    dialog: (title: string) => "Story : " + title,
    alt: (title: string, index: number) => title + ", story " + index,
    play: "Lire la vidéo",
    soundOff: "Couper le son",
    soundOn: "Activer le son",
    close: "Fermer la story",
    help: "Touchez le côté droit pour avancer, le côté gauche pour revenir en arrière. Maintenez appuyé pour mettre en pause.",
    want: "Envie de la vôtre ? WhatsApp",
    seePieceLabel: (title: string) => "Entrer dans l’univers : " + title,
  },

  atelier: {
    steps: [
      { title: "La Naissance de la forme", text: "Le modèle devient métal brut : un pendentif avant sa première pierre." },
      { title: "La Précision du geste", text: "Maillon après maillon, un bracelet prend forme sur l’établi." },
      { title: "La Quête de l’éclat", text: "Chaque maillon est poli à la main, pour ne laisser voir que les pierres." },
      { title: "L’Ultime raffinement", text: "Une pièce signature en cours de réalisation, contrôlée sous la lampe." },
    ],
    step: (index: number) => "Étape " + index,
    stepAlt: (step: string) => step + " à l’atelier",
    filmLabel: "Une pièce assemblée à la main à l’atelier",
    eyebrow: "Dubaï",
    title: "L’Atelier",
    lead: "Là où l’imagination rencontre la maîtrise.",
    making: "L’Art du savoir-faire",
    ctaTitle: "Assistez à la naissance de votre création.",
    ctaText: "Des photos et des vidéos de l’avancement vous sont envoyées sur WhatsApp, étape par étape, tout au long de la création.",
    seeProcess: "Découvrir l’expérience sur mesure",
  },

  boxes: {
    eyebrow: "Une conception unique",
    title: "Écrins Signature",
    lead: "Chaque création d’exception mérite une présentation extraordinaire.",
    listLabel: "Écrins d’exception",
    open: (name: string) => "Afficher en plein écran : " + name,
    photos: (count: number) => n(count, { one: "# photo", other: "# photos" }),
    create: "Imaginez votre écrin Signature",
    closing: "Le prolongement de votre création",
  },

  process: {
    filmLabel: "Le processus, étape par étape, qui se déroule au fil du défilement",
    steps: [
      { title: "La Consultation privée", text: "Idées et budget. Racontez-nous le moment que vous souhaitez marquer, vos références, votre histoire.", meter: "0 %", payNote: "Aucun paiement à ce stade." },
      { title: "La Conception sur mesure", text: "Déduit du prix final en cas de confirmation, il couvre les frais de création en cas d’annulation.", meter: "Acompte", payNote: "Acompte de création versé." },
      { title: "Validation du design", text: "50 % de la production réglée avant le début de la fabrication.", meter: "50 %", payNote: "50 % de la production réglée." },
      { title: "L’Art de la création", text: "Photos et vidéos de l’avancement sur WhatsApp ; le délai dépend de la complexité de la pièce.", meter: "50 %", payNote: "Plus rien à régler pendant la fabrication." },
      { title: "La Révélation en images", text: "Une séance photo dédiée, puis la préparation de la livraison.", meter: "50 %", payNote: "Votre pièce est photographiée avant de quitter l’atelier." },
      { title: "Solde & Présentation finale", text: "Les 50 % restants, environ une semaine avant la remise.", meter: "100 %", payNote: "Entièrement réglée, prête à être remise." },
    ],
    eyebrow: "Six chapitres. Une vision.",
    title: "L’Expérience sur mesure",
    lead: "De votre premier message au jour où vous la portez.",
    payment: "Paiement",
    paid: "Montant réglé",
    noPayment: "Aucun paiement à ce stade.",
    clear: "Une transparence absolue",
    overviewTitle: "Votre expérience, étape par étape",
    overviewText: "Un acompte de création, la moitié de la production à la validation, le solde une semaine avant la remise. Vous suivez chaque étape sur WhatsApp.",
    closingEyebrow: "Tout commence par une conversation",
  },

  about: {
    eyebrow: "La Maison",
    title: "La Maison Berete",
    lead: "Une vision indépendante de la haute joaillerie contemporaine.",
    founderLabel: "La Vision de Berete",
    founderPortrait: "Portrait de Yoni Berete",
    chapters: "L’Histoire de Berete",
    quoteNumber: (index: number, label: string) => String(index).padStart(2, "0") + " — " + label,
    quoted: (text: string) => "« " + text + " »",
  },

  house,

  contact: {
    eyebrow: "Contact privé",
    title: "Imaginez votre création",
    lead: "Chaque chef-d’œuvre commence par une conversation.",
    inspired: "Et si vous créiez la vôtre ?",
    oneConversation: "Une conversation suffit pour commencer. Confiez-nous votre idée sur WhatsApp, nous vous répondons personnellement.",
    trustedBy: "La confiance des champions",
    configTitle: "Votre consultation privée",
    configSteps: ["Votre projet de création", "Budget", "Délai"],
    answer: (question: string) => question + " :",
    pieceChoices: { chain: "Chaîne", pendant: "Pendentif", ring: "Bague de champion", bracelet: "Bracelet", watch: "Montre", other: "Une création unique" },
    budgets: { "10k": "Jusqu’à 10 000 USD", "25k": "De 10 000 à 25 000 USD", "50k": "De 25 000 à 50 000 USD", "50k+": "50 000 USD et plus", unsure: "Je ne sais pas encore" },
    timings: { asap: "Dans le mois", quarter: "D’ici 1 à 3 mois", flexible: "Sans urgence" },
    openWhatsapp: "Ouvrir WhatsApp",
    startOver: "Recommencer",
    name: "Nom",
    email: "E-mail",
    phone: "Numéro de téléphone",
    idea: "Votre idée",
    errName: "Veuillez indiquer votre nom.",
    errEmail: "Veuillez indiquer une adresse e-mail valide.",
    errMessage: "Merci de nous en dire un peu plus (10 caractères minimum).",
    errPhone: "Veuillez indiquer un numéro de téléphone valide.",
    callTitle: "Demander un appel privé",
    callSent: "Merci. Nous vous rappellerons très prochainement.",
    callButton: "Rappelez-moi",
    emailTitle: "Correspondance privée",
    emailSent: "Merci. Votre message nous est bien parvenu, nous vous répondrons personnellement.",
    callWhatsapp: (name: string, phone: string, about: string) => "Bonjour Berete Jewellers, pourriez-vous me rappeler ? Nom : " + name + ". Téléphone : " + phone + "." + (about ? " Au sujet de : " + about + "." : ""),
    emailWhatsapp: (name: string, email: string, idea: string) => "Bonjour Berete Jewellers, je suis " + name + " (" + email + "). Mon idée : " + idea,
    readyWhatsapp: "Votre demande s’est ouverte dans WhatsApp, déjà écrite : il ne reste qu’à l’envoyer.",
    failedWhatsapp: "Le formulaire n’a pas pu partir. Envoyez votre demande sur WhatsApp : elle est déjà écrite.",
    sendWhatsapp: "Envoyer sur WhatsApp",
    emailButton: "Envoyer le message",
  },

  legal: {
    eyebrow: "Informations",
    legalTitle: "Mentions légales",
    privacyTitle: "Politique de confidentialité",
    updated: "Version provisoire. Les passages marqués “exemple à adapter” sont des exemples à adapter avant la mise en ligne.",
    legal: [
      {
        title: "Éditeur",
        paragraphs: [
          "Ce site est édité par Berete Jewellers, établie à Dubaï, aux Émirats arabes unis.",
          "Nom commercial : Berete Jewellers. Siège social : Dubaï, Émirats arabes unis. Licence commerciale délivrée à Dubaï. (Exemple à adapter : indiquez la raison sociale exacte, le numéro de licence commerciale et l'adresse complète.)",
          "Contact : par WhatsApp ou via la page Contact de ce site.",
        ],
      },
      {
        title: "Hébergement",
        paragraphs: ["Ce site et ses données sont hébergés par un prestataire professionnel d’hébergement cloud, sur des serveurs sécurisés. (Exemple à adapter : indiquez le nom, l'adresse et le contact de votre hébergeur.)"],
      },
      {
        title: "Propriété intellectuelle",
        paragraphs: [
          "Les créations, photographies, vidéos, textes et éléments visuels de ce site sont la propriété de Berete Jewellers ou utilisés avec autorisation. Toute reproduction, totale ou partielle, sans accord écrit préalable, est interdite.",
          "Les noms de clubs, de trophées et de joueurs sont cités pour décrire les pièces créées pour eux et restent la propriété de leurs détenteurs respectifs.",
        ],
      },
      {
        title: "Responsabilité",
        paragraphs: ["Les informations de ce site sont fournies à titre de présentation. Les pièces présentées sont des créations sur mesure ; chaque nouvelle pièce fait l’objet d’un devis individuel."],
      },
    ],
    privacy: [
      {
        title: "Données collectées",
        paragraphs: [
          "Lorsque vous demandez un rappel, nous recueillons votre nom, votre numéro de téléphone et, le cas échéant, la pièce qui vous intéresse. Lorsque vous nous écrivez par e-mail, nous recueillons votre nom, votre adresse e-mail et votre message.",
          "La fréquentation des pages est mesurée sans cookies et sans vous identifier.",
        ],
      },
      {
        title: "Utilisation",
        paragraphs: ["Uniquement pour répondre à votre demande, préparer votre devis et suivre votre projet. Nous ne vendons jamais vos données."],
      },
      {
        title: "WhatsApp",
        paragraphs: ["Les boutons WhatsApp ouvrent une conversation sur WhatsApp, un service exploité par un tiers selon sa propre politique de confidentialité. Les messages que vous y envoyez sont traités au sein de WhatsApp."],
      },
      {
        title: "Conservation",
        paragraphs: ["Les demandes de contact et de rappel sont conservées jusqu’à trois ans après notre dernier échange, puis supprimées. (Exemple à adapter selon votre pratique réelle de conservation.)"],
      },
      {
        title: "Vos droits",
        paragraphs: ["Vous pouvez à tout moment demander l’accès à vos données, leur rectification ou leur suppression, en nous contactant via WhatsApp ou la page Contact."],
      },
    ],
  },

  notFound: {
    eyebrow: "Page introuvable",
    title: "Cette pièce n’existe pas… encore.",
    text: "La page que vous cherchez a été déplacée ou n’a jamais été créée. Chaque grande pièce commence par une conversation : parlez-nous de la vôtre.",
    home: "Retour à l’accueil",
    whatsapp: "Ou entamez une conversation privée sur WhatsApp",
  },

  seoPages: {
    "/": {
      title: "Berete Jewellers — L’Art de la singularité, Dubaï",
      description: "Des créations uniques de haute joaillerie pour celles et ceux qui écrivent leur propre histoire. Pendentifs, chaînes et bagues de champion créés à Dubaï. Créé par nous. Inspiré par vous.",
    },
    "/creations": {
      title: "Les Créations : pendentifs, chaînes, bagues et montres",
      description: "Chaque création. Un univers à part entière. Les pendentifs, chaînes, bagues de champion et montres de Berete Jewellers, tous créés à Dubaï.",
    },
    "/creations/pendants": {
      title: "Pendentifs en diamants sur mesure",
      description: "Pendentifs Berete Jewellers : initiales, emblèmes et célébrations sculptés en volume, sertis pierre par pierre pour footballeurs et collectionneurs, à Dubaï.",
    },
    "/creations/chains": {
      title: "Chaînes en diamants sur mesure",
      description: "Les chaînes Berete Jewellers : maillons papillon, stations gothiques et fleurs de diamants, dessinés maillon par maillon et créés à Dubaï.",
    },
    "/creations/rings": {
      title: "Bagues : la Victoire immortalisée",
      description: "Bien plus qu’un symbole de victoire. Un héritage immortalisé dans l’or et les diamants : les bagues de champion du VfB Stuttgart et de l’Inter Milan par Berete Jewellers.",
    },
    "/creations/watches": {
      title: "Montres serties de diamants",
      description: "Des montres serties de diamants du boîtier au bracelet, portées par des footballeurs : les montres Berete Jewellers, Dubaï.",
    },
    "/creations/jesus-pieces": {
      title: "Jesus Pieces : pendentifs du Christ en diamants sur mesure",
      description: "Les Jesus pieces de Berete Jewellers : le visage du Christ couronné d’épines ou de fleurs, et le Christ en croix, sculptés et sertis de diamants à Dubaï.",
    },
    "/creations/bracelets": {
      title: "Bracelets",
      description: "Bracelets sur mesure par Berete Jewellers, à Dubaï. De nouvelles pièces sont en cours de création.",
    },
    "/players": {
      title: "Le Cercle Berete",
      description: "Des personnalités singulières. Des créations extraordinaires. Les athlètes, clubs emblématiques et figures emblématiques qui portent Berete Jewellers, et les créations réalisées pour eux.",
    },
    "/atelier": {
      title: "L’Atelier",
      description: "Là où l’imagination rencontre la maîtrise : au cœur de l’atelier Berete Jewellers, de la naissance de la forme à l’ultime raffinement, chaque pièce réalisée à la main.",
    },
    "/boxes": {
      title: "Écrins Signature",
      description: "Chaque création d’exception mérite une présentation extraordinaire. Les écrins Signature et les écrins d’exception de Berete Jewellers.",
    },
    "/process": {
      title: "L’Expérience sur mesure",
      description: "Six chapitres. Une vision. De la consultation privée à la présentation finale, chaque étape de paiement expliquée clairement dès le départ.",
    },
    "/about": {
      title: "La Maison — Yoni Berete, Fondateur & Directeur artistique",
      description: "Une vision indépendante de la haute joaillerie contemporaine. L’histoire de Yoni Berete, fondateur de Berete Jewellers : deux univers, un héritage, une vision singulière.",
    },
    "/contact": {
      title: "Contact privé",
      description: "Chaque chef-d’œuvre commence par une conversation. Imaginez votre création avec Berete Jewellers : une conversation privée sur WhatsApp, une consultation en trois étapes ou un appel privé.",
    },
    "/legal": {
      title: "Mentions légales",
      description: "Mentions légales du site Berete Jewellers.",
    },
    "/privacy": {
      title: "Politique de confidentialité",
      description: "Comment Berete Jewellers traite les données personnelles que vous partagez sur ce site.",
    },
    "/404": {
      title: "Page introuvable",
      description: "",
    },
  },

  seo: {
    pieceDescription: (title: string, type: string, who: string) =>
      title + " : " + type.toLowerCase() + (FEMININE.has(type.toLowerCase()) ? " créée" : " créé") + " exclusivement pour " + named(who) + " par Berete Jewellers, à Dubaï.",
    personTitle: (name: string, kind: "player" | "club" | "personality") => name + (kind === "player" ? ", athlète" : kind === "club" ? ", club emblématique" : ""),
    personDescription: (name: string, kind: "player" | "club" | "personality") =>
      "Les stories et les pièces sur mesure " + ofName(name) + " (" + (kind === "club" ? "club" : kind === "personality" ? "personnalité" : "athlète") + ") avec Berete Jewellers, haute joaillerie sur mesure réalisée à Dubaï.",
  },

  /** Le visualiseur 3D (pages des pièces, liens privés) et la page d’un lien privé. */
  viewer: {
    title: "Explorer en 3D",
    /** The button at the top of the page of a piece that has a 3D model. */
    see: "Voir en 3D",
    /** The mark on the card of a piece that has a 3D model (read aloud). */
    available: "Disponible en 3D",
    intro: "Tournez-la, approchez-vous de la plus petite pierre, essayez ses métaux.",
    canvasLabel: (piece: string) => piece + " en 3D",
    loading: (percent: number) => "Chargement du modèle 3D · " + percent + " %",
    preparing: "Préparation du modèle 3D",
    failed: "Le modèle 3D n’a pas pu être chargé.",
    retry: "Réessayer",
    noWebgl: "Ce navigateur ne peut pas afficher la 3D. Essayez-en un autre, ou demandez-nous des photos sur WhatsApp.",
    hint: "Glissez pour tourner · Molette pour zoomer là où vous pointez · Clic droit pour déplacer · Double-clic sur un détail pour s’en approcher",
    hintTouch: "Un doigt pour tourner · Pincez pour zoomer · Deux doigts pour déplacer · Touchez deux fois un détail pour vous en approcher",
    detailHint: "Faites glisser pour tourner la pièce · Cliquez dessus, puis faites défiler pour zoomer",
    detailHintTouch: "Un doigt pour tourner la pièce · Pincez pour zoomer",
    metal: "Métal",
    metals: { "yellow-gold": "Or jaune 18 carats", "white-gold": "Or blanc 18 carats", "rose-gold": "Or rose 18 carats", platinum: "Platine", "black-rhodium": "Rhodium noir" },
    stoneColor: "Couleur des pierres",
    customize: "Personnaliser",
    ambiance: "Lumière",
    ambiances: { studio: "Studio", warm: "Chaude", spotlight: "Projecteur" },
    light: "Tourner la lumière",
    views: { front: "Face", side: "Côté", top: "Dessus" },
    reset: "Revenir à la première vue",
    autoRotate: "Tourner tout seul",
    stopRotate: "Arrêter de tourner",
    fullscreen: "Plein écran",
    exitFullscreen: "Quitter le plein écran",
    capture: "Enregistrer une image (PNG)",
    background: "Fond",
    backgrounds: { black: "Noir", "studio-dark": "Studio sombre", "studio-light": "Studio clair", white: "Blanc", rose: "Rosé", wood: "Table en noyer", velvet: "Velours noir", satin: "Satin champagne", leather: "Cuir blanc" },
    want: "Je veux cette pièce",
    metalOf: (metal: string, part: string) => metal + " (" + part + ")",
    wantMessage: (piece: string, metals: string) => "Bonjour Berete Jewellers, je veux la pièce « " + piece + " »" + (metals ? " en " + metals.toLowerCase() : "") + ". Pouvons-nous en parler ?",
    privateEyebrow: "Préparé pour vous",
    privateTitle: "Votre pièce en 3D",
    privateText: "Tournez-la, approchez-vous des détails, essayez les métaux. Puis dites-nous ce que vous en pensez.",
    love: "Je l’adore",
    change: "J’aimerais un changement",
    loveMessage: (piece: string, metals: string, link: string) => "Bonjour Berete Jewellers, j’adore la pièce « " + piece + " »" + (metals ? " en " + metals.toLowerCase() : "") + ". " + link,
    changeMessage: (piece: string, metals: string, link: string) => "Bonjour Berete Jewellers, j’aimerais un changement sur la pièce « " + piece + " »" + (metals ? " (" + metals.toLowerCase() + ")" : "") + " : " + link,
    expiredTitle: "Ce lien a expiré",
    expiredText: "Demandez-nous-en un nouveau sur WhatsApp : nous vous l’envoyons tout de suite.",
    missingTitle: "Ce lien n’existe pas",
    missingText: "Vérifiez l’adresse reçue, ou écrivez-nous sur WhatsApp.",
    askLink: "Demander sur WhatsApp",
    askMessage: "Bonjour Berete Jewellers, mon lien 3D ne fonctionne plus. Pourriez-vous m’en envoyer un nouveau ?",
    passwordTitle: "Cette pièce est protégée",
    passwordText: "Saisissez le mot de passe reçu avec le lien.",
    password: "Mot de passe",
    open: "Ouvrir",
    wrongPassword: "Ce mot de passe n’est pas le bon.",
    validUntil: (date: string) => "Lien valable jusqu’au " + date,
  },

  /** L’espace privé des clients (/vip). */
  vip: {
    eyebrow: "Berete VIP",
    title: "Votre espace privé",
    intro: "Vos pièces en 3D, préparées pour vous par Berete Jewellers.",
    code: "Code d’accès",
    codeHint: "Le code que nous vous avons envoyé, par exemple 7KQ2-9MXA.",
    enter: "Entrer",
    wrong: "Ce code n’est pas le bon.",
    opening: "Ouverture de votre espace…",
    linkMissing: "Ce lien ne fonctionne plus. Saisissez votre code, ou demandez-nous un nouveau lien sur WhatsApp.",
    hello: (name: string) => "Bonjour " + name,
    yourPieces: "Vos pièces",
    none: "Vos pièces apparaîtront ici dès qu’elles seront prêtes.",
    logout: "Se déconnecter",
    footerLink: "Espace client",
    askCode: "Demander mon code sur WhatsApp",
    askMessage: "Bonjour Berete Jewellers, pourriez-vous m’envoyer mon code d’accès à mon espace privé ?",
    soon: "Votre espace privé ouvre très bientôt. En attendant, écrivez-nous sur WhatsApp : nous vous envoyons vos pièces en 3D directement.",
    soonMessage: "Bonjour Berete Jewellers, j’aimerais voir mes pièces en 3D.",
  },

  films: {
    eyebrow: "Derrière la pièce",
    enter: "Entrer dans l’atelier",
    lead: (title, reveal) => "Passez derrière l’établi et regardez " + title + " prendre vie" + (reveal ? ", puis découvrez la pièce dans La Révélation finale." : "."),
    making: "La Fabrication",
    reveal: "La Révélation finale",
    dialog: (title) => "L’atelier de " + title,
    play: "Lecture",
    pause: "Pause",
    soundOn: "Activer le son",
    soundOff: "Couper le son",
    silent: "Film sans son",
    seek: (film) => "Position dans " + film,
    leave: "Quitter l’atelier",
    replay: "Revoir",
    next: "Ensuite : La Révélation finale",
    loading: "Chargement du film",
    open: (title) => "Entrer dans l’atelier de " + title,
    sectionEyebrow: "Depuis l’établi",
    sectionTitle: "Chaque pièce, son making-of",
    sectionLead: "Chaque création, filmée à l’établi. Ouvrez son atelier, puis entrez dans son univers.",
    intro: (title: string) => "Le film de " + title,
    skip: "Voir la pièce",
    watch: "Voir le film",
  },
};
