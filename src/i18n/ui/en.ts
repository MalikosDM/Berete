/*
 * The words of the site, in English: the source of every other language.
 * fr.ts, es.ts and ar.ts must give each entry (the type checks it). A
 * function receives the values to place in the sentence, so each language
 * can order the words and choose its plurals.
 */
import { plural } from "../format";
import { en as house } from "../house/en";

const n = (count: number, one: string, other: string) => plural("en", count, { one, other });

const PRIVATE_COLLECTOR = "A private collector";
/** "A private collector" in the middle of a sentence: "Created exclusively for a private collector". */
const inSentence = (who: string) => (who === PRIVATE_COLLECTOR ? "a private collector" : who);

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
    startPiece: "Begin Your Creation",
    whatsapp: "WhatsApp",
    chatWhatsapp: "Begin a Private Conversation",
    allCreations: "All Creations",
    allPlayers: "Discover the Circle",
    /** The signature button that opens a piece, everywhere. */
    enterWorld: "Enter the World",
    seePiece: "Enter the World",
    readArticle: "Read the Feature",
    close: "Close",
    previous: "Previous",
    next: "Next",
    back: "Back",
    yourPiece: "Your Next Creation",
    yourStory: "Your story, in diamonds",
    madeFor: (who: string) => "Created exclusively for " + inSentence(who),
    privateCollector: PRIVATE_COLLECTOR,
    newPiecesTitle: "New pieces are being crafted",
    newPiecesText: "This collection will be revealed soon. Start yours in the meantime.",
  },

  /** The messages written for the visitor in WhatsApp. */
  whatsapp: {
    hello: "Hello Berete Jewellers, I would like to start a custom piece.",
    createBox: "Hello Berete Jewellers, I would like to commission my own Signature Trunk.",
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
    creations: "The Creations",
    players: "The Berete Circle",
    atelier: "The Atelier",
    boxes: "Signature Trunks",
    process: "The Bespoke Journey",
    about: "The House",
    contact: "Private Enquiries",
    openMenu: "Open menu",
    closeMenu: "Close menu",
  },

  footer: {
    creations: "The Creations",
    house: "The House",
    contact: "Private Enquiries",
    contactPage: "Private Enquiries",
    yourPiece: "Your Next Creation",
    pitch: "Chains, pendants and championship rings, designed with you and crafted for the moment.",
    legal: "Legal notice",
    privacy: "Privacy",
  },

  collections: {
    /** By address of the collection (/creations/pendants). */
    items: {
      pendants: { name: "Pendants", intro: "Initials, emblems, celebrations: each pendant tells one story, sculpted in volume and set stone by stone." },
      chains: { name: "Chains", intro: "Links drawn one by one, from butterflies to infinity knots, made to be worn alone or with a pendant." },
      rings: { name: "Rings", intro: "More than a symbol of victory. A legacy immortalised in gold and diamonds." },
      bracelets: { name: "Bracelets", intro: "Bracelets made to measure, link by link." },
      watches: { name: "Watches", intro: "Watches set with diamonds from the case to the bracelet." },
    },
    eyebrow: "The Portfolio",
    title: "Explore the Creations",
    explore: "Discover",
    count: (count: number) => n(count, "# creation", "# creations"),
    tileAlt: (collection: string, piece: string) => collection + ": " + piece,
    /* The page of one collection */
    collection: "The Portfolio",
    listLabel: (collection: string) => "The creations: " + collection,
    others: "More of the Portfolio",
    ctaTitle: "Yours, from the first sketch.",
    ctaText: "Every piece starts with one conversation. Tell us your story, we draw it.",
    ctaButton: "Start on WhatsApp",
  },

  home: {
    filmLabel: "Berete Jewellers film, played by scrolling",
    kicker: "Berete Jewellers · Dubai",
    title: "The Art of Individuality.",
    /** The sentence under the title of the home page. */
    intro: "One-of-one high jewellery for those who define their own legacy.",
    discover: "Discover the Creations",
    statements: ["Crafted for Greatness. Worn by Champions.", "The top lifts off and reveals the trophy.", "Sculpted, then set stone by stone.", "Creations That Define Identity."],
    featured: "Featured Universe",
    enterCapsule: "Enter the World",
    liftTop: "Reveal the Secret",
    closeTop: "Conceal the Secret",
    liftTopLabel: "Reveal the secret of the ring",
    closeTopLabel: "Conceal the secret of the ring",
    /** The special project after the film: the championship rings of Inter Milan and VfB Stuttgart. */
    special: {
      eyebrow: "Exceptional Commissions",
      title: "Victory, Immortalised",
      lead: "More than a symbol of victory. A legacy immortalised in gold and diamonds. Two rings for two squads, Inter Milan and VfB Stuttgart, both opening onto the trophy.",
      discover: "Discover the Masterpiece",
    },
    wornBy: "Worn by Icons",
    players: "The Berete Circle",
    inside: "Inside Berete",
    insideTitle: "From Vision to Reality",
    atelierTitle: "The Atelier",
    atelierText: "Every stone set by hand, under the microscope.",
    atelierAlt: "Close-up of a setting tool working on diamonds",
    enter: "Enter",
    boxesTitle: "Signature Trunks",
    boxesText: "Bespoke presentation cases, made for selected creations.",
    discoverShort: "Discover",
    processTitle: "The Bespoke Journey",
    processText: "Six clear steps, followed on WhatsApp.",
    follow: "Follow",
  },

  showcase: {
    eyebrow: "Signature Creations",
    title: "The Universes",
  },

  scroll: {
    hint: "Scroll",
  },

  creations: {
    eyebrow: "The Portfolio",
    title: "The Creations",
    lead: "Every creation. A universe of its own.",
    listLabel: "All creations",
    filterLabel: "Filter the creations",
    all: "All Creations",
    enterCollection: (collection: string) => "Discover the " + collection.toLowerCase(),
  },

  piece: {
    /** The views of the showcase of a piece (src/components/Showcase.tsx). */
    views: { face: "front", profile: "profile", back: "back", detail: "detail", worn: "worn" },
    showView: (view: string) => "Show the " + view + " view",
    viewOf: (n: number, total: number) => "View " + n + " of " + total,
    viewsLabel: "The views of the piece",
    viewAlt: (title: string, view: string) => title + ", " + view + " view",
    /** Text of the first sketch of a piece (step "Sketch"). */
    sketchAlt: (title: string) => "Yoni Berete's hand drawing the first sketch of " + title,
    steps: {
      sketch: { title: "The Vision", text: "The idea is drawn by hand, then modelled until every proportion is right." },
      raw: { title: "Sculpting the Form", text: "The metal is cast and assembled, before a single stone is set." },
      setting: { title: "The Art of Stone Setting", text: "Each stone is set by hand, under magnification." },
      polishing: { title: "The Final Refinement", text: "Every surface is polished until the metal disappears behind the light." },
      delivery: { title: "The Final Reveal", text: "Checked, photographed, then handed over, in its box when it has one." },
    },
    want: "Commission Your Own",
    details: "The Art of Detail",
    /** The title of the photos of a piece that has "The details" (its symbols, one by one). */
    upClose: "A Closer Look",
    /** Above the title "The Art of Detail". */
    detailsEyebrow: "Every Detail Tells a Story",
    seePhoto: "Discover the Detail",
    /** Above the title of the championship rings (the special project). */
    historic: "Historic Commissions",
    /** Under the technical sheet of a draft: the row "Precious Materials" comes from the photos. */
    seenNote: "Precious materials: as seen in the photos, to be confirmed by the atelier.",
    madeFor: "Created Exclusively for",
    theClub: "Discover the Club",
    theProfile: "Discover Their World",
    stories: (_count: number) => "The Moments",
    andOthers: (names: string) => "And " + names + ".",
    seenInStories: "Seen in our stories",
    story: "Behind the Creation",
    makingEyebrow: "From Vision to Reality",
    makingTitle: "The Making of a Masterpiece",
    thisPiece: "This piece",
    inAtelier: "In the atelier",
    delivered: "Delivered",
    handedOverTo: (_client: string) => "The Official Presentation",
    handover: "The handover",
    sheet: "Composition & Craftsmanship",
    customBox: "Bespoke Presentation",
    deliveredIn: (box: string) => "Delivered in the " + box + ", made for it.",
    press: "In the Spotlight",
    pressAlt: (outlet: string) => outlet + " article",
    similar: "Beyond This Universe",
    more: (_collection: string) => "Discover More Creations",
    theCollection: "Explore the Portfolio",
    ctaTitle: "Your Vision. Your Universe.",
    ctaText: "Send us its name on WhatsApp: we answer with a first idea and the next steps.",
    otherWays: "Private Enquiries",
  },

  gallery: {
    title: "Details",
    hintPinned: "Scroll to explore · Tap to zoom",
    hint: "Tap to zoom",
    open: (what: string) => "Open in full screen: " + what,
    photo: "Photo",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    /** The grid of every other photo of a piece, under its gallery. */
    everyAngle: "Every Angle",
    more: (n: number) => "See " + n + " more",
    film: "Film",
  },

  players: {
    eyebrow: "The Berete Circle",
    title: "Worn by Icons",
    lead: "Exceptional individuals. Extraordinary creations.",
    listLabel: "The Berete Circle",
    groups: { player: "Athletes", club: "Iconic Clubs", personality: "Cultural Icons" },
    portrait: (name: string) => "Portrait of " + name,
    /** The other photos of a person on their page, and the text of each. */
    photos: "In Pictures",
    photo: (name: string, index: number) => name + ", photo " + index,
    instagramOf: (name: string) => name + " on Instagram",
    club: "Iconic Club",
    personality: "Cultural Icon",
    number: "No.",
    bioWithPieces: (name: string) => "The pieces made for " + name + ", and the moments shared on our Instagram.",
    bioStories: (name: string) => "The moments shared with " + name + " on our Instagram.",
    watch: (_count: number) => "Explore Their World",
    pieces: (count: number) => n(count, "Personal Creation", "Personal Creations"),
    stories: "The Moments",
    moments: (count: number) => n(count, "# moment", "# moments"),
    theirPlayers: "The Athletes",
  },

  stories: {
    bar: "Stories",
    previous: "Previous stories",
    next: "Next stories",
    open: (title: string) => title + ", open the story",
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
    seePieceLabel: (title: string) => "Enter the World: " + title,
  },

  atelier: {
    steps: [
      { title: "The Birth of Form", text: "The model becomes raw metal: a pendant before its first stone." },
      { title: "Precision in Every Detail", text: "Link by link, a bracelet takes shape on the bench." },
      { title: "The Pursuit of Brilliance", text: "Each link is polished by hand, so only the stones are seen." },
      { title: "The Final Refinement", text: "A signature piece in the making, checked under the lamp." },
    ],
    step: (index: number) => "Step " + index,
    stepAlt: (step: string) => step + " at the atelier",
    filmLabel: "A piece assembled by hand at the atelier",
    eyebrow: "Dubai",
    title: "The Atelier",
    lead: "Where imagination meets mastery.",
    making: "The Art of Craftsmanship",
    ctaTitle: "Witness Your Creation Come to Life.",
    ctaText: "Progress photos and videos are shared with you on WhatsApp, step by step, during the whole creation.",
    seeProcess: "Discover the Bespoke Journey",
  },

  boxes: {
    eyebrow: "Individually Crafted",
    title: "Signature Trunks",
    lead: "Every exceptional creation deserves an extraordinary presentation.",
    listLabel: "Bespoke Presentation Cases",
    open: (name: string) => "Open " + name + " full screen",
    photos: (count: number) => n(count, "# photo", "# photos"),
    create: "Commission Your Signature Trunk",
    closing: "An Extension of Your Creation",
  },

  process: {
    filmLabel: "The process, step by step, played by scrolling",
    steps: [
      { title: "The Private Consultation", text: "Ideas and budget. Tell us the moment you want to mark, your references, your story.", meter: "0%", payNote: "No payment at this stage." },
      { title: "The Design Commission", text: "Deducted from the final price if confirmed, covers design costs if cancelled.", meter: "Deposit", payNote: "Design deposit paid." },
      { title: "Design Approval", text: "50% of production paid before crafting starts.", meter: "50%", payNote: "50% of production paid." },
      { title: "The Art of Creation", text: "Progress photos and videos on WhatsApp, timing depends on complexity.", meter: "50%", payNote: "Nothing more to pay while we craft." },
      { title: "The Editorial Reveal", text: "Dedicated shoot, then delivery preparation.", meter: "50%", payNote: "Your piece is photographed before it leaves the atelier." },
      { title: "Final Payment & Presentation", text: "Remaining 50% about one week before handover.", meter: "100%", payNote: "Fully paid, ready for handover." },
    ],
    eyebrow: "Six Chapters. One Vision.",
    title: "The Bespoke Journey",
    lead: "From your first message to the day you wear it.",
    payment: "Payment",
    paid: "Amount paid",
    noPayment: "No payment at this stage.",
    clear: "Complete Transparency",
    overviewTitle: "Your Journey, Step by Step",
    overviewText: "A design deposit, half of production at validation, the balance one week before handover. You follow every stage on WhatsApp.",
    closingEyebrow: "It All Begins with a Conversation",
  },

  about: {
    eyebrow: "The House",
    title: "The House of Berete",
    lead: "An independent vision of contemporary high jewellery.",
    /** The opening of the page: the founder. */
    founderLabel: "The Vision Behind Berete",
    founderPortrait: "Portrait of Yoni Berete",
    /** The title of the chapters of his story. */
    chapters: "The Berete Journey",
    /** "01 — The Identity", above each quote. */
    quoteNumber: (index: number, label: string) => String(index).padStart(2, "0") + " — " + label,
    /** A quote of Yoni, in the quotation marks of the language. */
    quoted: (text: string) => "“" + text + "”",
  },

  /** The story of Yoni Berete, founder of the house (src/i18n/house/en.ts). */
  house,

  contact: {
    eyebrow: "Private Enquiries",
    title: "Begin Your Creation",
    lead: "Every masterpiece begins with a conversation.",
    inspired: "Inspired to Create?",
    oneConversation: "One conversation is enough to begin. Tell us your idea on WhatsApp, we answer personally.",
    trustedBy: "The Trust of Champions",
    /* The configurator */
    configTitle: "Your Private Consultation",
    configSteps: ["Your Desired Creation", "Budget", "Timing"],
    /** One answer of the summary: "Budget: Up to 10,000 USD". */
    answer: (question: string) => question + ":",
    pieceChoices: { chain: "Chain", pendant: "Pendant", ring: "Championship ring", bracelet: "Bracelet", watch: "Watch", other: "A Unique Commission" },
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
    callTitle: "Request a Private Call",
    callSent: "Thank you. We will call you back shortly.",
    callButton: "Call me back",
    emailTitle: "Private Correspondence",
    emailSent: "Thank you. Your message has been received, we will reply personally.",
    /** The site without its server (online before the real server): the forms go through WhatsApp, already written. */
    callWhatsapp: (name: string, phone: string, about: string) => "Hello Berete Jewellers, could you call me back? Name: " + name + ". Phone: " + phone + "." + (about ? " About: " + about + "." : ""),
    emailWhatsapp: (name: string, email: string, idea: string) => "Hello Berete Jewellers, I am " + name + " (" + email + "). My idea: " + idea,
    readyWhatsapp: "Your request opened in WhatsApp, already written: just send it.",
    failedWhatsapp: "The form could not be sent. Send your request on WhatsApp instead: it is already written.",
    sendWhatsapp: "Send on WhatsApp",
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
    whatsapp: "Or begin a private conversation on WhatsApp",
  },

  /**
   * The title and description of each page for search engines, by address
   * ("/creations"). English: in src/extensions/seo/seo.json; the other
   * languages write theirs here.
   */
  seoPages: {} as Record<string, { title: string; description: string }>,

  /** The title and description of the pages of one piece or one person (search engines, shares). */
  seo: {
    pieceDescription: (title: string, type: string, who: string) => title + ": " + type.toLowerCase() + " created exclusively for " + inSentence(who) + " by Berete Jewellers, Dubai.",
    personTitle: (name: string, kind: "player" | "club" | "personality") => name + (kind === "player" ? ", Athlete" : kind === "club" ? ", Iconic Club" : ""),
    personDescription: (name: string, kind: "player" | "club" | "personality") =>
      "The stories and the custom pieces of " + name + " (" + (kind === "club" ? "club" : kind === "personality" ? "personality" : "athlete") + ") with Berete Jewellers, custom high jewellery made in Dubai.",
  },
  /** The 3D viewer (pages of pieces, private links) and the page of a private link. */
  viewer: {
    title: "Explore in 3D",
    /** The button at the top of the page of a piece that has a 3D model. */
    see: "See it in 3D",
    /** The mark on the card of a piece that has a 3D model (read aloud). */
    available: "Available in 3D",
    intro: "Turn it, come close to the smallest stone, try its metals.",
    canvasLabel: (piece: string) => piece + " in 3D",
    loading: (percent: number) => "Loading the 3D model · " + percent + "%",
    preparing: "Preparing the 3D model",
    failed: "The 3D model could not be loaded.",
    retry: "Try again",
    noWebgl: "This browser cannot show 3D. Try another one, or ask us for photos on WhatsApp.",
    hint: "Drag to turn · Scroll to zoom where you point · Right-click to move · Double-click a detail to come closer",
    hintTouch: "One finger to turn · Pinch to zoom · Two fingers to move · Double-tap a detail to come closer",
    detailHint: "Drag to turn the piece · Click it, then scroll to zoom",
    detailHintTouch: "One finger to turn the piece · Pinch to zoom",
    metal: "Metal",
    metals: { "yellow-gold": "18k yellow gold", "white-gold": "18k white gold", "rose-gold": "18k rose gold", platinum: "Platinum", "black-rhodium": "Black rhodium" },
    stoneColor: "Colour of the stones",
    /** The title of the panel of choices beside the 3D viewer (metals, background, lighting). */
    customize: "Customise",
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
    /** The client space on the site without its server. */
    soon: "Your private space opens very soon. Until then, write to us on WhatsApp and we will send you your pieces in 3D directly.",
    soonMessage: "Hello Berete Jewellers, I would like to see my pieces in 3D.",
  },

  /** "Enter the Atelier": the films of a piece, its making-of then the finished piece (src/components/AtelierRoom.tsx). */
  films: {
    eyebrow: "Behind the Piece",
    enter: "Enter the Atelier",
    lead: (title: string, reveal: boolean) => "Step behind the bench and watch " + title + " come to life" + (reveal ? ", then discover it in The Final Reveal." : "."),
    making: "The Making",
    reveal: "The Final Reveal",
    dialog: (title: string) => "The atelier of " + title,
    play: "Play",
    pause: "Pause",
    soundOn: "Turn the sound on",
    soundOff: "Turn the sound off",
    silent: "Silent film",
    seek: (film: string) => "Position in " + film,
    leave: "Leave the atelier",
    replay: "Watch again",
    next: "Next: The Final Reveal",
    loading: "Loading the film",
    open: (title: string) => "Enter the atelier of " + title,
    sectionEyebrow: "From the Bench",
    sectionTitle: "Every Piece, Its Making-of",
    sectionLead: "Each creation, filmed at the bench. Open its atelier, then enter its world.",
    /** The film of the finished piece that opens its page (src/components/PieceFilm.tsx). */
    intro: (title: string) => "The film of " + title,
    skip: "See the piece",
    watch: "Watch the film",
  },
};

/** The shape every language must fill: the same entries, with its own words. */
type Widen<T> = T extends string ? string : T extends (...args: infer A) => infer R ? (...args: A) => Widen<R> : T extends readonly (infer U)[] ? Widen<U>[] : { [K in keyof T]: Widen<T[K]> };
export type Messages = Widen<typeof en>;
