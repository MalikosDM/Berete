/*
 * The words of the site, in English: the source of every other language.
 * fr.ts, es.ts and ar.ts must give each entry (the type checks it). A
 * function receives the values to place in the sentence, so each language
 * can order the words and choose its plurals.
 */
import { plural } from "../format";

const n = (count: number, one: string, other: string) => plural("en", count, { one, other });

export const en = {
  site: {
    skip: "Skip to content",
    homeLabel: "Berete Jewellers, home",
    tagline: "Made by us. Inspired by you.",
    baseLine: "Based in Dubai · Worldwide delivery",
    rights: (year: number) => "© " + year + " Berete Jewellers. All rights reserved.",
  },

  language: {
    label: "Language",
    choose: "Choose the language",
  },

  /** Buttons and links found on many pages. */
  common: {
    startPiece: "Start your piece",
    whatsapp: "WhatsApp",
    chatWhatsapp: "Chat with us on WhatsApp",
    allCreations: "All creations",
    allPlayers: "All players",
    seePiece: "See the piece",
    readArticle: "Read the article",
    close: "Close",
    previous: "Previous",
    next: "Next",
    back: "Back",
    yourPiece: "Your piece",
    yourStory: "Your story, in diamonds",
    madeFor: (who: string) => "Made for " + who,
    privateCollector: "A private collector",
    newPiecesTitle: "New pieces are being crafted",
    newPiecesText: "This collection will be revealed soon. Start yours in the meantime.",
  },

  /** The messages written for the visitor in WhatsApp. */
  whatsapp: {
    hello: "Hello Berete Jewellers, I would like to start a custom piece.",
    piece: (name: string) => 'Hello Berete Jewellers, I want a piece like "' + name + '". Can we talk about it?',
    configurator: (type: string, budget: string, timing: string, pieceName?: string) =>
      ["Hello Berete Jewellers, I would like to start a piece.", "Piece: " + type, "Budget: " + budget, "Timing: " + timing, ...(pieceName ? ['Inspired by: "' + pieceName + '"'] : [])].join("\n"),
  },

  types: {
    chain: "Chain",
    pendant: "Pendant",
    ring: "Ring",
    bracelet: "Bracelet",
    watch: "Watch",
  },

  nav: {
    main: "Main",
    mobile: "Mobile",
    creations: "Creations",
    players: "Players",
    atelier: "Atelier",
    boxes: "Boxes",
    process: "Process",
    about: "About",
    contact: "Contact",
    openMenu: "Open menu",
    closeMenu: "Close menu",
  },

  footer: {
    creations: "Creations",
    house: "House",
    contact: "Contact",
    contactPage: "Contact page",
    yourPiece: "Your piece",
    pitch: "Chains, pendants and championship rings, designed with you and crafted for the moment.",
    legal: "Legal notice",
    privacy: "Privacy",
  },

  collections: {
    /** By address of the collection (/creations/pendants). */
    items: {
      pendants: { name: "Pendants", intro: "Initials, emblems, celebrations: each pendant tells one story, sculpted in volume and set stone by stone." },
      chains: { name: "Chains", intro: "Links drawn one by one, from butterflies to infinity knots, made to be worn alone or with a pendant." },
      rings: { name: "Rings", intro: "Championship rings for a whole squad, and signet rings made for one hand." },
      bracelets: { name: "Bracelets", intro: "Bracelets made to measure, link by link." },
      watches: { name: "Watches", intro: "Watches set with diamonds from the case to the bracelet." },
    },
    eyebrow: "Collections",
    title: "By type of jewel",
    explore: "Explore",
    count: (count: number) => n(count, "# piece", "# pieces"),
    tileAlt: (collection: string, piece: string) => collection + ": " + piece,
    /* The page of one collection */
    collection: "Collection",
    listLabel: (collection: string) => "The pieces: " + collection,
    others: "Other collections",
    ctaTitle: "Yours, from the first sketch.",
    ctaText: "Every piece starts with one conversation. Tell us your story, we draw it.",
    ctaButton: "Start on WhatsApp",
  },

  home: {
    filmLabel: "Berete Jewellers film, played by scrolling",
    kicker: "Berete Jewellers · Dubai",
    title: "Custom high jewellery for champions.",
    discover: "Discover creations",
    statements: ["Designed for clubs. Worn by champions.", "The top lifts off and reveals the trophy.", "Sculpted, then set stone by stone.", "Statement pieces, made to be seen."],
    featured: "Featured capsule",
    enterCapsule: "Enter the capsule",
    liftTop: "Lift the top",
    closeTop: "Close the top",
    liftTopLabel: "Lift the top of the ring",
    closeTopLabel: "Close the top of the ring",
    wornBy: "Worn by",
    players: "The players",
    inside: "Inside the house",
    insideTitle: "From sketch to handover",
    atelierTitle: "Atelier",
    atelierText: "Every stone set by hand, under the microscope.",
    atelierAlt: "Close-up of a setting tool working on diamonds",
    enter: "Enter",
    boxesTitle: "Boxes",
    boxesText: "Custom boxes on selected pieces, as an option.",
    discoverShort: "Discover",
    processTitle: "Process",
    processText: "Six clear steps, followed on WhatsApp.",
    follow: "Follow",
  },

  showcase: {
    eyebrow: "Selected pieces",
    title: "The capsules",
  },

  scroll: {
    hint: "Scroll",
  },

  creations: {
    eyebrow: "Creations",
    title: "The Creations",
    lead: "Chains, pendants, rings, bracelets and watches. Each piece is drawn for one person, one club, one moment, then crafted in Dubai.",
    listLabel: "All pieces",
    filterLabel: "Filter the pieces",
    all: "All",
    enterCollection: (collection: string) => "Enter the " + collection.toLowerCase() + " collection",
  },

  piece: {
    steps: {
      sketch: { title: "Sketch", text: "The idea is drawn by hand, then modelled until every proportion is right." },
      raw: { title: "Raw piece", text: "The metal is cast and assembled, before a single stone is set." },
      setting: { title: "Setting", text: "Each stone is set by hand, under magnification." },
      polishing: { title: "Polishing", text: "Every surface is polished until the metal disappears behind the light." },
      delivery: { title: "Delivery", text: "Checked, photographed, then handed over, in its box when it has one." },
    },
    want: "I want a piece like this",
    details: "The details",
    madeFor: "Made for",
    theClub: "The club",
    theProfile: "The profile",
    stories: (count: number) => n(count, "The story", "The stories"),
    andOthers: (names: string) => "And " + names + ".",
    seenInStories: "Seen in our stories",
    story: "The story",
    makingEyebrow: "From sketch to handover",
    makingTitle: "How it was made",
    thisPiece: "This piece",
    inAtelier: "In the atelier",
    delivered: "Delivered",
    handedOverTo: (client: string) => "Handed over to " + client,
    handover: "The handover",
    sheet: "Technical sheet",
    customBox: "Custom box available",
    deliveredIn: (box: string) => "Delivered in the " + box + ", made for it.",
    press: "Press",
    pressAlt: (outlet: string) => outlet + " article",
    similar: "Similar pieces",
    more: (collection: string) => "More " + collection.toLowerCase(),
    theCollection: "The collection",
    ctaTitle: "A piece like this one, drawn for you.",
    ctaText: "Send us its name on WhatsApp: we answer with a first idea and the next steps.",
    otherWays: "Other ways to reach us",
  },

  gallery: {
    title: "Details",
    hintPinned: "Scroll to explore · Tap to zoom",
    hint: "Tap to zoom",
    open: (what: string) => "Open in full screen: " + what,
    photo: "Photo",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
  },

  players: {
    eyebrow: "Players",
    title: "Worn by champions",
    lead: "Footballers, clubs and personalities who trusted us with their moment. Each name opens their stories and their pieces.",
    listLabel: "Players list",
    groups: { player: "Players", club: "Clubs", personality: "Personalities" },
    portrait: (name: string) => "Portrait of " + name,
    club: "Club",
    personality: "Personality",
    number: "No.",
    bioWithPieces: (name: string) => "The pieces made for " + name + ", and the moments shared on our Instagram.",
    bioStories: (name: string) => "The moments shared with " + name + " on our Instagram.",
    watch: (count: number) => n(count, "Watch the story", "Watch the stories"),
    pieces: (count: number) => n(count, "The piece", "The pieces"),
    stories: "Stories",
    moments: (count: number) => n(count, "# moment", "# moments"),
    theirPlayers: "The players",
  },

  stories: {
    bar: "Stories",
    previous: "Previous stories",
    next: "Next stories",
    open: (title: string) => "Open the story " + title,
    dialog: (title: string) => "Story: " + title,
    /** The text of a photo or video of a story without its own: "Kevin Schade, story 3". */
    alt: (title: string, index: number) => title + ", story " + index,
    play: "Play the video",
    soundOff: "Mute the sound",
    soundOn: "Turn the sound on",
    close: "Close the story",
    /** In a right-to-left language the sides are mirrored: the left side goes forward. */
    help: "Tap the right side for the next step, the left side for the previous one. Hold to pause.",
    want: "Want yours? WhatsApp",
    seePieceLabel: (title: string) => "See the piece: " + title,
  },

  atelier: {
    steps: [
      { title: "Casting", text: "The model becomes raw metal: a pendant before its first stone." },
      { title: "Assembly", text: "Link by link, a bracelet takes shape on the bench." },
      { title: "Polishing", text: "Each link is polished by hand, so only the stones are seen." },
      { title: "Finishing", text: "A signature piece in the making, checked under the lamp." },
    ],
    step: (index: number) => "Step " + index,
    stepAlt: (step: string) => step + " at the atelier",
    filmLabel: "Stones set by hand at the atelier",
    eyebrow: "Dubai",
    title: "The Atelier",
    lead: "Where every piece is sculpted, then set stone by stone.",
    making: "The making of a piece",
    ctaTitle: "Follow it on WhatsApp, step by step.",
    ctaText: "Progress photos and videos are shared with you during the whole creation.",
    seeProcess: "See the process",
  },

  boxes: {
    eyebrow: "Made to measure",
    title: "Boxes",
    lead: "Custom boxes available on selected pieces, as an option.",
    listLabel: "Custom boxes",
    open: (name: string) => "Open " + name + " full screen",
    photos: (count: number) => n(count, "# photo", "# photos"),
  },

  process: {
    filmLabel: "The process, step by step, played by scrolling",
    steps: [
      { title: "First contact", text: "Ideas and budget. Tell us the moment you want to mark, your references, your story.", meter: "0%", payNote: "No payment at this stage." },
      { title: "Design deposit", text: "Deducted from the final price if confirmed, covers design costs if cancelled.", meter: "Deposit", payNote: "Design deposit paid." },
      { title: "Validation", text: "50% of production paid before crafting starts.", meter: "50%", payNote: "50% of production paid." },
      { title: "Creation", text: "Progress photos and videos on WhatsApp, timing depends on complexity.", meter: "50%", payNote: "Nothing more to pay while we craft." },
      { title: "Photoshoot", text: "Dedicated shoot, then delivery preparation.", meter: "50%", payNote: "Your piece is photographed before it leaves the atelier." },
      { title: "Balance & delivery", text: "Remaining 50% about one week before handover.", meter: "100%", payNote: "Fully paid, ready for handover." },
    ],
    eyebrow: "Six steps, one conversation",
    title: "The Process",
    lead: "From your first message to the day you wear it.",
    payment: "Payment",
    paid: "Amount paid",
    noPayment: "No payment at this stage.",
    clear: "Clear from the start",
    overviewTitle: "Six steps, paid in stages",
    overviewText: "A design deposit, half of production at validation, the balance one week before handover. You follow every stage on WhatsApp.",
    closingEyebrow: "Step one is a message",
  },

  about: {
    eyebrow: "About",
    title: "Our story",
    lead: "Custom high jewellery, made in Dubai for the people who make history on the pitch and beyond.",
    founderLabel: "Founder",
    founderPortrait: "Portrait of the founder",
    provisionalQuote: "Provisional quote",
    quote: "“Every piece starts with a story. Our job is to make it shine for a lifetime.”",
    founder: "Founder, Berete Jewellers",
    chapters: "Chapters",
    chapterList: [
      { title: "The beginning", text: "Provisional text. How the first piece was drawn, who it was for, and why it had to be made by hand rather than bought off a shelf." },
      { title: "Dubai", text: "Provisional text. A house based in Dubai, at the crossroads of stones, craftsmen and clients from every continent, delivering worldwide." },
      { title: "For champions", text: "Provisional text. Championship rings for clubs, chains and pendants for players and stars: pieces that carry a title, a number, a name." },
    ],
  },

  contact: {
    eyebrow: "Contact",
    title: "Start your piece",
    lead: "The fastest way is WhatsApp. Three clicks, one message, and we take it from there.",
    inspired: "Inspired by this piece?",
    oneConversation: "One conversation is enough to begin. Tell us your idea on WhatsApp, we answer personally.",
    trustedBy: "Trusted by",
    /* The configurator */
    configTitle: "Your piece in 3 clicks",
    configSteps: ["Type of piece", "Budget", "Timing"],
    /** One answer of the summary: "Budget: Up to 10,000 USD". */
    answer: (question: string) => question + ":",
    pieceChoices: { chain: "Chain", pendant: "Pendant", ring: "Championship ring", other: "Something else" },
    budgets: { "10k": "Up to 10,000 USD", "25k": "10,000 to 25,000 USD", "50k": "25,000 to 50,000 USD", "50k+": "50,000 USD and above", unsure: "Not sure yet" },
    timings: { asap: "Within a month", quarter: "In 1 to 3 months", flexible: "No rush" },
    openWhatsapp: "Open WhatsApp",
    startOver: "Start over",
    /* The forms */
    name: "Name",
    email: "Email",
    phone: "Phone number",
    idea: "Your idea",
    errName: "Please enter your name.",
    errEmail: "Please enter a valid email address.",
    errMessage: "Please tell us a little more (10 characters minimum).",
    errPhone: "Please enter a valid phone number.",
    errServer: "Something went wrong. Please try again or message us on WhatsApp.",
    errNetwork: "Network error. Please try again or message us on WhatsApp.",
    callTitle: "Prefer a call back?",
    callSent: "Thank you. We will call you back shortly.",
    callButton: "Call me back",
    emailTitle: "Prefer email?",
    emailSent: "Thank you. Your message has been received, we will reply personally.",
    emailButton: "Send message",
  },

  legal: {
    eyebrow: "Information",
    legalTitle: "Legal notice",
    privacyTitle: "Privacy policy",
    updated: "Provisional version. Passages marked “exemple à adapter” are examples to adapt before launch.",
    legal: [
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
        paragraphs: ["Information on this website is provided for presentation purposes. Pieces shown are custom creations; every new piece is quoted individually."],
      },
    ],
    privacy: [
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
        paragraphs: ["Buttons marked WhatsApp open a conversation on WhatsApp, a service operated by a third party under its own privacy policy. Messages you send there are handled within WhatsApp."],
      },
      {
        title: "Retention",
        paragraphs: ["Contact and call-back requests are kept for up to three years after our last exchange, then deleted. (Exemple à adapter selon votre pratique réelle de conservation.)"],
      },
      {
        title: "Your rights",
        paragraphs: ["You may ask to access, correct or delete your data at any time by contacting us through WhatsApp or the contact page."],
      },
    ],
  },

  notFound: {
    eyebrow: "Page not found",
    title: "This piece does not exist… yet.",
    text: "The page you are looking for has moved or was never made. Every great piece starts with a conversation: tell us yours.",
    home: "Back home",
    whatsapp: "Or chat with us on WhatsApp",
  },

  /**
   * The title and description of each page for search engines, by address
   * ("/creations"). English: in src/extensions/seo/seo.json; the other
   * languages write theirs here.
   */
  seoPages: {} as Record<string, { title: string; description: string }>,

  /** The title and description of the pages of one piece or one person (search engines, shares). */
  seo: {
    pieceDescription: (title: string, type: string, who: string) => title + ": " + type.toLowerCase() + " made for " + who + " by Berete Jewellers, Dubai.",
    personTitle: (name: string, kind: "player" | "club" | "personality") => name + (kind === "player" ? ", Player" : kind === "club" ? ", Club" : ""),
    personDescription: (name: string, kind: "player" | "club" | "personality") =>
      "The stories and the custom pieces of " + name + " (" + (kind === "club" ? "club" : kind === "personality" ? "personality" : "player") + ") with Berete Jewellers, custom high jewellery made in Dubai.",
  },
  /** The 3D viewer (pages of pieces, private links) and the page of a private link. */
  viewer: {
    title: "Explore in 3D",
    intro: "Turn it, come close to the smallest stone, try its metals.",
    canvasLabel: (piece: string) => piece + " in 3D",
    loading: (percent: number) => "Loading the 3D model · " + percent + "%",
    preparing: "Preparing the 3D model",
    failed: "The 3D model could not be loaded.",
    retry: "Try again",
    noWebgl: "This browser cannot show 3D. Try another one, or ask us for photos on WhatsApp.",
    hint: "Drag to turn · Scroll to zoom where you point · Right-click to move · Double-click a detail to come closer",
    hintTouch: "One finger to turn · Pinch to zoom · Two fingers to move · Double-tap a detail to come closer",
    metal: "Metal",
    metals: { "yellow-gold": "18k yellow gold", "white-gold": "18k white gold", "rose-gold": "18k rose gold", platinum: "Platinum", "black-rhodium": "Black rhodium" },
    stoneColor: "Colour of the stones",
    ambiance: "Lighting",
    ambiances: { studio: "Studio", warm: "Warm", spotlight: "Spotlight" },
    light: "Turn the light",
    views: { front: "Front", side: "Side", top: "Top" },
    reset: "Back to the first view",
    autoRotate: "Turn by itself",
    stopRotate: "Stop turning",
    fullscreen: "Full screen",
    exitFullscreen: "Leave full screen",
    capture: "Save an image (PNG)",
    background: "Background",
    backgrounds: { black: "Black", "studio-dark": "Dark studio", "studio-light": "Light studio", white: "White", rose: "Rose", wood: "Walnut table", velvet: "Black velvet", satin: "Champagne satin", leather: "White leather" },
    want: "I want this piece",
    metalOf: (metal: string, part: string) => metal + " (" + part + ")",
    wantMessage: (piece: string, metals: string) => 'Hello Berete Jewellers, I want the piece "' + piece + '"' + (metals ? " in " + metals : "") + ". Can we talk about it?",
    privateEyebrow: "Prepared for you",
    privateTitle: "Your piece in 3D",
    privateText: "Turn it, come close to the details, try the metals. Then tell us what you think.",
    love: "I love it",
    change: "I'd like a change",
    loveMessage: (piece: string, metals: string, link: string) => 'Hello Berete Jewellers, I love the piece "' + piece + '"' + (metals ? " in " + metals : "") + ". " + link,
    changeMessage: (piece: string, metals: string, link: string) => 'Hello Berete Jewellers, I would like a change to the piece "' + piece + '"' + (metals ? " (" + metals + ")" : "") + ": " + link,
    expiredTitle: "This link has expired",
    expiredText: "Ask us for a new one on WhatsApp: we will send it at once.",
    missingTitle: "This link does not exist",
    missingText: "Check the address you received, or write to us on WhatsApp.",
    askLink: "Ask on WhatsApp",
    askMessage: "Hello Berete Jewellers, my 3D link no longer works. Could you send me a new one?",
    passwordTitle: "This piece is protected",
    passwordText: "Enter the password you received with the link.",
    password: "Password",
    open: "Open",
    wrongPassword: "This password is not the right one.",
    validUntil: (date: string) => "Link valid until " + date,
  },
  /** The private space of the clients (/vip). */
  vip: {
    eyebrow: "Berete VIP",
    title: "Your private space",
    intro: "Your pieces in 3D, prepared for you by Berete Jewellers.",
    code: "Access code",
    codeHint: "The code we sent you, for example 7KQ2-9MXA.",
    enter: "Enter",
    wrong: "This code is not the right one.",
    opening: "Opening your space…",
    linkMissing: "This link no longer works. Enter your code, or ask us for a new link on WhatsApp.",
    hello: (name: string) => "Hello " + name,
    yourPieces: "Your pieces",
    none: "Your pieces will appear here as soon as they are ready.",
    logout: "Log out",
    footerLink: "Client space",
    askCode: "Ask for my code on WhatsApp",
    askMessage: "Hello Berete Jewellers, could you send me my access code to my private space?",
  },
};

/** The shape every language must fill: the same entries, with its own words. */
type Widen<T> = T extends string ? string : T extends (...args: infer A) => infer R ? (...args: A) => Widen<R> : T extends readonly (infer U)[] ? Widen<U>[] : { [K in keyof T]: Widen<T[K]> };
export type Messages = Widen<typeof en>;
