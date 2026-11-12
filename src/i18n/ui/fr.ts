/*
 * Les mots du site, en français (source : en.ts). Mêmes entrées, mêmes
 * fonctions ; chaque fonction place les valeurs dans la phrase française.
 */
import { plural, type PluralForms } from "../format";
import type { Messages } from "./en";

const n = (count: number, forms: PluralForms) => plural("fr-FR", count, forms);

/** Les clubs prennent l’article en français. */
const CLUBS: Record<string, string> = { "VfB Stuttgart": "le VfB Stuttgart", "Inter Milan": "l’Inter Milan" };
/** Le texte de common.privateCollector, écrit en minuscule au milieu d’une phrase. */
const PRIVATE_COLLECTOR = "Un collectionneur privé";

/** Un nom au milieu d’une phrase : le VfB Stuttgart, un collectionneur privé, Kevin Schade. */
const named = (name: string) => CLUBS[name] ?? (name === PRIVATE_COLLECTOR ? "un collectionneur privé" : name);
/** À + nom : au VfB Stuttgart, à l’Inter Milan, à Kevin Schade. */
const toName = (name: string) => {
  const x = named(name);
  return x.startsWith("le ") ? "au " + x.slice(3) : "à " + x;
};
/** De + nom : du VfB Stuttgart, de l’Inter Milan, d’Angelo Stiller, de Kevin Schade. */
const ofName = (name: string) => {
  const x = named(name);
  if (x.startsWith("le ")) return "du " + x.slice(3);
  return /^[aeiouyàâäéèêëîïôöûü]/i.test(x) ? "d’" + x : "de " + x;
};
/** Les types de bijou féminins, pour l’accord du participe. */
const FEMININE = new Set(["chaîne", "bague", "montre"]);

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
    startPiece: "Créer votre pièce",
    whatsapp: "WhatsApp",
    chatWhatsapp: "Écrivez-nous sur WhatsApp",
    allCreations: "Toutes les créations",
    allPlayers: "Tous les joueurs",
    seePiece: "Voir la pièce",
    readArticle: "Lire l’article",
    close: "Fermer",
    previous: "Précédent",
    next: "Suivant",
    back: "Retour",
    yourPiece: "Votre pièce",
    yourStory: "Votre histoire, en diamants",
    // « Pour Kevin Schade » : sans participe, juste pour une bague comme pour un pendentif.
    madeFor: (who: string) => "Pour " + named(who),
    privateCollector: PRIVATE_COLLECTOR,
    newPiecesTitle: "De nouvelles pièces sont en cours de création",
    newPiecesText: "Cette collection sera bientôt dévoilée. D’ici là, commencez votre pièce.",
  },

  whatsapp: {
    hello: "Bonjour Berete Jewellers, je souhaiterais créer une pièce sur mesure.",
    piece: (name: string) => "Bonjour Berete Jewellers, je souhaiterais une pièce dans l’esprit de « " + name + " ». Pourrions-nous en parler ?",
    configurator: (type: string, budget: string, timing: string, pieceName?: string) =>
      ["Bonjour Berete Jewellers, je souhaiterais créer une pièce.", "Pièce : " + type, "Budget : " + budget, "Délai : " + timing, ...(pieceName ? ["Inspiration : « " + pieceName + " »"] : [])].join("\n"),
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
    creations: "Créations",
    players: "Joueurs",
    atelier: "Atelier",
    boxes: "Écrins",
    process: "Processus",
    about: "À propos",
    contact: "Contact",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
  },

  footer: {
    creations: "Créations",
    house: "La maison",
    contact: "Contact",
    contactPage: "Page contact",
    yourPiece: "Votre pièce",
    pitch: "Chaînes, pendentifs et bagues de champion, dessinés avec vous et réalisés pour le moment.",
    legal: "Mentions légales",
    privacy: "Confidentialité",
  },

  collections: {
    items: {
      pendants: { name: "Pendentifs", intro: "Initiales, emblèmes, célébrations : chaque pendentif, sculpté en volume et serti pierre par pierre, raconte une histoire." },
      chains: { name: "Chaînes", intro: "Des maillons dessinés un à un, des papillons aux nœuds infinis, pour des chaînes à porter seules ou avec un pendentif." },
      rings: { name: "Bagues", intro: "Des bagues de champion pour toute une équipe, et des chevalières pensées pour une seule main." },
      bracelets: { name: "Bracelets", intro: "Des bracelets réalisés sur mesure, maillon par maillon." },
      watches: { name: "Montres", intro: "Des montres serties de diamants, du boîtier au bracelet." },
    },
    eyebrow: "Collections",
    title: "Par type de bijou",
    explore: "Découvrir",
    count: (count: number) => n(count, { one: "# pièce", other: "# pièces" }),
    tileAlt: (collection: string, piece: string) => collection + " : " + piece,
    collection: "Collection",
    listLabel: (collection: string) => "Les pièces de la collection " + collection,
    others: "Les autres collections",
    ctaTitle: "La vôtre, dès la première esquisse.",
    ctaText: "Chaque pièce commence par une conversation. Racontez-nous votre histoire, nous la dessinons.",
    ctaButton: "Commencer sur WhatsApp",
  },

  home: {
    filmLabel: "Film Berete Jewellers, qui se déroule au fil du défilement",
    kicker: "Berete Jewellers · Dubaï",
    title: "Haute joaillerie sur mesure pour les champions.",
    discover: "Découvrir les créations",
    statements: ["Pensé pour les clubs. Porté par les champions.", "Le plateau se soulève et révèle le trophée.", "Sculpté, puis serti pierre par pierre.", "Des pièces affirmées, faites pour être vues."],
    featured: "Capsule à l’honneur",
    enterCapsule: "Découvrir la capsule",
    liftTop: "Soulever le plateau",
    closeTop: "Refermer le plateau",
    liftTopLabel: "Soulever le plateau de la bague",
    closeTopLabel: "Refermer le plateau de la bague",
    wornBy: "Portées par",
    players: "Les joueurs",
    inside: "Au cœur de la maison",
    insideTitle: "De l’esquisse à la remise",
    atelierTitle: "L’atelier",
    atelierText: "Chaque pierre sertie à la main, sous le microscope.",
    atelierAlt: "Gros plan sur un outil de sertissage travaillant des diamants",
    enter: "Entrer",
    boxesTitle: "Écrins",
    boxesText: "Des écrins sur mesure pour une sélection de pièces, en option.",
    discoverShort: "Découvrir",
    processTitle: "Le processus",
    processText: "Six étapes claires, suivies sur WhatsApp.",
    follow: "Suivre",
  },

  showcase: {
    eyebrow: "Pièces choisies",
    title: "Les capsules",
  },

  scroll: {
    hint: "Faites défiler",
  },

  creations: {
    eyebrow: "Créations",
    title: "Les créations",
    lead: "Chaînes, pendentifs, bagues, bracelets et montres. Chaque pièce est dessinée pour une personne, un club, un moment, puis réalisée à Dubaï.",
    listLabel: "Toutes les pièces",
    filterLabel: "Filtrer les pièces",
    all: "Toutes",
    enterCollection: (collection: string) => "Découvrir les " + collection.toLowerCase(),
  },

  piece: {
    steps: {
      sketch: { title: "Esquisse", text: "L’idée est dessinée à la main, puis modélisée jusqu’à ce que chaque proportion soit juste." },
      raw: { title: "Pièce brute", text: "Le métal est coulé et assemblé, avant que la moindre pierre ne soit sertie." },
      setting: { title: "Sertissage", text: "Chaque pierre est sertie à la main, sous la loupe." },
      polishing: { title: "Polissage", text: "Chaque surface est polie jusqu’à ce que le métal s’efface derrière la lumière." },
      delivery: { title: "Livraison", text: "Contrôlée, photographiée, puis remise, dans son écrin lorsqu’elle en a un." },
    },
    want: "Je souhaite une pièce comme celle-ci",
    details: "Les détails",
    madeFor: "Réalisée pour",
    theClub: "Le club",
    theProfile: "Le profil",
    stories: (count: number) => n(count, { one: "La story", other: "Les stories" }),
    andOthers: (names: string) => "Ainsi que " + names + ".",
    seenInStories: "À voir dans nos stories",
    story: "L’histoire",
    makingEyebrow: "De l’esquisse à la remise",
    makingTitle: "Sa réalisation",
    thisPiece: "Cette pièce",
    inAtelier: "À l’atelier",
    delivered: "Livrée",
    handedOverTo: (client: string) => "Remise " + toName(client),
    handover: "La remise",
    sheet: "Fiche technique",
    customBox: "Écrin sur mesure disponible",
    deliveredIn: (box: string) => "Livrée dans l’écrin conçu pour elle : " + box + ".",
    press: "Presse",
    pressAlt: (outlet: string) => "Article de " + outlet,
    similar: "Pièces similaires",
    more: (collection: string) => "D’autres " + collection.toLowerCase(),
    theCollection: "La collection",
    ctaTitle: "Une pièce comme celle-ci, dessinée pour vous.",
    ctaText: "Envoyez-nous son nom sur WhatsApp : nous vous répondons avec une première idée et les prochaines étapes.",
    otherWays: "Autres moyens de nous joindre",
  },

  gallery: {
    title: "Détails",
    hintPinned: "Faites défiler pour explorer · Touchez pour agrandir",
    hint: "Touchez pour agrandir",
    open: (what: string) => "Ouvrir en plein écran : " + what,
    photo: "Photo",
    zoomIn: "Zoom avant",
    zoomOut: "Zoom arrière",
  },

  players: {
    eyebrow: "Joueurs",
    title: "Portées par des champions",
    lead: "Des footballeurs, des clubs et des personnalités qui nous ont confié leur moment. Chaque nom ouvre sur leurs stories et leurs pièces.",
    listLabel: "Liste des joueurs",
    groups: { player: "Joueurs", club: "Clubs", personality: "Personnalités" },
    portrait: (name: string) => "Portrait " + ofName(name),
    club: "Club",
    personality: "Personnalité",
    number: "N°",
    bioWithPieces: (name: string) => "Les pièces réalisées pour " + named(name) + ", et les moments partagés sur notre Instagram.",
    bioStories: (name: string) => "Les moments partagés avec " + named(name) + " sur notre Instagram.",
    watch: (count: number) => n(count, { one: "Voir la story", other: "Voir les stories" }),
    pieces: (count: number) => n(count, { one: "La pièce", other: "Les pièces" }),
    stories: "Stories",
    moments: (count: number) => n(count, { one: "# moment", other: "# moments" }),
    theirPlayers: "Les joueurs",
  },

  stories: {
    bar: "Stories",
    previous: "Stories précédentes",
    next: "Stories suivantes",
    open: (title: string) => "Ouvrir la story « " + title + " »",
    dialog: (title: string) => "Story : " + title,
    alt: (title: string, index: number) => title + ", story " + index,
    play: "Lire la vidéo",
    soundOff: "Couper le son",
    soundOn: "Activer le son",
    close: "Fermer la story",
    help: "Touchez le côté droit pour avancer, le côté gauche pour revenir en arrière. Maintenez appuyé pour mettre en pause.",
    want: "Envie de la vôtre ? WhatsApp",
    seePieceLabel: (title: string) => "Voir la pièce : " + title,
  },

  atelier: {
    steps: [
      { title: "Fonte", text: "Le modèle devient métal brut : un pendentif avant sa première pierre." },
      { title: "Assemblage", text: "Maillon après maillon, un bracelet prend forme sur l’établi." },
      { title: "Polissage", text: "Chaque maillon est poli à la main, pour ne laisser voir que les pierres." },
      { title: "Finitions", text: "Une pièce signature en cours de réalisation, contrôlée sous la lampe." },
    ],
    step: (index: number) => "Étape " + index,
    stepAlt: (step: string) => step + " à l’atelier",
    filmLabel: "Pierres serties à la main à l’atelier",
    eyebrow: "Dubaï",
    title: "L’atelier",
    lead: "Là où chaque pièce est sculptée, puis sertie pierre par pierre.",
    making: "La réalisation d’une pièce",
    ctaTitle: "Suivez-la sur WhatsApp, étape par étape.",
    ctaText: "Des photos et des vidéos de l’avancement vous sont envoyées tout au long de la création.",
    seeProcess: "Voir le processus",
  },

  boxes: {
    eyebrow: "Sur mesure",
    title: "Écrins",
    lead: "Des écrins sur mesure, disponibles en option pour une sélection de pièces.",
    listLabel: "Écrins sur mesure",
    open: (name: string) => "Afficher en plein écran : " + name,
    photos: (count: number) => n(count, { one: "# photo", other: "# photos" }),
  },

  process: {
    filmLabel: "Le processus, étape par étape, qui se déroule au fil du défilement",
    steps: [
      { title: "Premier contact", text: "Idées et budget. Racontez-nous le moment que vous souhaitez marquer, vos références, votre histoire.", meter: "0 %", payNote: "Aucun paiement à ce stade." },
      { title: "Acompte de création", text: "Déduit du prix final en cas de confirmation, il couvre les frais de création en cas d’annulation.", meter: "Acompte", payNote: "Acompte de création versé." },
      { title: "Validation", text: "50 % de la production réglée avant le début de la fabrication.", meter: "50 %", payNote: "50 % de la production réglée." },
      { title: "Création", text: "Photos et vidéos de l’avancement sur WhatsApp ; le délai dépend de la complexité de la pièce.", meter: "50 %", payNote: "Plus rien à régler pendant la fabrication." },
      { title: "Séance photo", text: "Une séance photo dédiée, puis la préparation de la livraison.", meter: "50 %", payNote: "Votre pièce est photographiée avant de quitter l’atelier." },
      { title: "Solde et livraison", text: "Les 50 % restants, environ une semaine avant la remise.", meter: "100 %", payNote: "Entièrement réglée, prête à être remise." },
    ],
    eyebrow: "Six étapes, une conversation",
    title: "Le processus",
    lead: "De votre premier message au jour où vous la portez.",
    payment: "Paiement",
    paid: "Montant réglé",
    noPayment: "Aucun paiement à ce stade.",
    clear: "Clair dès le départ",
    overviewTitle: "Six étapes, un paiement échelonné",
    overviewText: "Un acompte de création, la moitié de la production à la validation, le solde une semaine avant la remise. Vous suivez chaque étape sur WhatsApp.",
    closingEyebrow: "La première étape est un message",
  },

  about: {
    eyebrow: "À propos",
    title: "Notre histoire",
    lead: "Haute joaillerie sur mesure, réalisée à Dubaï pour celles et ceux qui écrivent l’histoire, sur le terrain et au-delà.",
    founderLabel: "Fondateur",
    founderPortrait: "Portrait du fondateur",
    provisionalQuote: "Citation provisoire",
    quote: "« Chaque pièce commence par une histoire. Notre métier est de la faire briller toute une vie. »",
    founder: "Fondateur, Berete Jewellers",
    chapters: "Chapitres",
    chapterList: [
      { title: "Les débuts", text: "Texte provisoire. Comment la première pièce a été dessinée, pour qui, et pourquoi elle devait être faite à la main plutôt que choisie en vitrine." },
      { title: "Dubaï", text: "Texte provisoire. Une maison établie à Dubaï, au carrefour des pierres, des artisans et des clients de tous les continents, qui livre dans le monde entier." },
      { title: "Pour les champions", text: "Texte provisoire. Des bagues de champion pour les clubs, des chaînes et des pendentifs pour les joueurs et les stars : des pièces qui portent un titre, un numéro, un nom." },
    ],
  },

  contact: {
    eyebrow: "Contact",
    title: "Créer votre pièce",
    lead: "Le plus simple, c’est WhatsApp. Trois clics, un message, et nous prenons le relais.",
    inspired: "Cette pièce vous inspire ?",
    oneConversation: "Une conversation suffit pour commencer. Confiez-nous votre idée sur WhatsApp, nous vous répondons personnellement.",
    trustedBy: "Ils nous font confiance",
    configTitle: "Votre pièce en 3 clics",
    configSteps: ["Type de pièce", "Budget", "Délai"],
    answer: (question: string) => question + " :",
    pieceChoices: { chain: "Chaîne", pendant: "Pendentif", ring: "Bague de champion", other: "Autre chose" },
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
    errServer: "Une erreur est survenue. Veuillez réessayer ou nous écrire sur WhatsApp.",
    errNetwork: "Erreur de réseau. Veuillez réessayer ou nous écrire sur WhatsApp.",
    callTitle: "Vous préférez un rappel ?",
    callSent: "Merci. Nous vous rappellerons très prochainement.",
    callButton: "Rappelez-moi",
    emailTitle: "Vous préférez l’e-mail ?",
    emailSent: "Merci. Votre message nous est bien parvenu, nous vous répondrons personnellement.",
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
    whatsapp: "Ou écrivez-nous sur WhatsApp",
  },

  seoPages: {
    "/": {
      title: "Berete Jewellers — Haute joaillerie sur mesure, Dubaï",
      description: "Haute joaillerie sur mesure à Dubaï : chaînes, pendentifs et bagues de champion en diamants pour clubs, footballeurs et stars. Créé par nous. Inspiré par vous.",
    },
    "/creations": {
      title: "Créations : pendentifs, chaînes, bagues et montres",
      description: "Toutes les pièces Berete Jewellers, par type : pendentifs, chaînes, bagues de champion, chevalières et montres en diamants, réalisés sur mesure à Dubaï.",
    },
    "/creations/pendants": {
      title: "Pendentifs en diamants sur mesure",
      description: "Pendentifs Berete Jewellers : initiales, emblèmes et célébrations sculptés en volume, sertis pierre par pierre pour footballeurs et collectionneurs, à Dubaï.",
    },
    "/creations/chains": {
      title: "Chaînes en diamants sur mesure",
      description: "Les chaînes Berete Jewellers : maillons papillon, nœuds infinis et fleurs de diamants, dessinés maillon par maillon et réalisés sur mesure à Dubaï.",
    },
    "/creations/rings": {
      title: "Bagues de champion et chevalières",
      description: "Bagues de champion pour le VfB Stuttgart et l’Inter Milan, chevalières serties de diamants : les bagues Berete Jewellers, réalisées à Dubaï.",
    },
    "/creations/watches": {
      title: "Montres serties de diamants",
      description: "Des montres serties de diamants du boîtier au bracelet, portées par des footballeurs : les montres Berete Jewellers, Dubaï.",
    },
    "/creations/bracelets": {
      title: "Bracelets",
      description: "Bracelets sur mesure par Berete Jewellers, à Dubaï. De nouvelles pièces sont en cours de création.",
    },
    "/players": {
      title: "Joueurs, clubs et personnalités",
      description: "Les footballeurs, clubs et personnalités qui portent Berete Jewellers : leurs stories et les pièces sur mesure réalisées pour eux.",
    },
    "/atelier": {
      title: "L’atelier à Dubaï",
      description: "Au cœur de l’atelier Berete Jewellers à Dubaï : fonte, assemblage, polissage et sertissage, chaque pièce réalisée à la main.",
    },
    "/boxes": {
      title: "Écrins et malles sur mesure",
      description: "Des écrins et des malles réalisés sur mesure pour une sélection de pièces Berete Jewellers, disponibles en option.",
    },
    "/process": {
      title: "Le processus, étape par étape",
      description: "Six étapes claires, de votre premier message à la remise : acompte de création, validation, création suivie sur WhatsApp, séance photo et livraison.",
    },
    "/about": {
      title: "Notre histoire",
      description: "L’histoire de Berete Jewellers, maison de Dubaï qui crée une haute joaillerie sur mesure pour les champions.",
    },
    "/contact": {
      title: "Contact : créer votre pièce",
      description: "Commencez votre pièce sur mesure avec Berete Jewellers : écrivez-nous sur WhatsApp, composez votre demande en trois clics ou demandez un rappel.",
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
      title + " : " + type.toLowerCase() + (FEMININE.has(type.toLowerCase()) ? " réalisée" : " réalisé") + " pour " + named(who) + " par Berete Jewellers, à Dubaï.",
    personTitle: (name: string, kind: "player" | "club" | "personality") => name + (kind === "player" ? ", joueur" : kind === "club" ? ", club" : ""),
    personDescription: (name: string, kind: "player" | "club" | "personality") =>
      "Les stories et les pièces sur mesure " + ofName(name) + " (" + (kind === "club" ? "club" : kind === "personality" ? "personnalité" : "joueur") + ") avec Berete Jewellers, haute joaillerie sur mesure réalisée à Dubaï.",
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
    metal: "Métal",
    metals: { "yellow-gold": "Or jaune 18 carats", "white-gold": "Or blanc 18 carats", "rose-gold": "Or rose 18 carats", platinum: "Platine", "black-rhodium": "Rhodium noir" },
    stoneColor: "Couleur des pierres",
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
  },
};
