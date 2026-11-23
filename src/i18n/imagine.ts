/*
 * The words of « Imaginez votre création » (src/components/Imagine.tsx, on Private Enquiries), in the 6 languages of
 * the site. French and English as Yoni asked for them (23/11/2026); the 4 others translate the English.
 */
import type { Locale } from "./locales";

/** Why no image came back (server/imagine.ts), or why none was asked for. */
export type ImagineError = "empty" | "too-long" | "refused" | "timeout" | "unavailable" | "network";

export type ImagineText = {
  eyebrow: string;
  title: string;
  lead: string;
  /** The label of the field. */
  label: string;
  placeholder: string;
  generate: string;
  loading: string;
  loadingHint: string;
  /** The alternative text of the image. */
  alt: (idea: string) => string;
  /** Under the image: an AI proposal, the house designs the real piece. */
  note: string;
  restart: string;
  finalise: string;
  /** Once the idea and the image are in the form. */
  attached: string;
  /** The first line of the message written in the form, before the idea. */
  messageIntro: string;
  /** The name of the image joined to the form. */
  fileName: string;
  errors: Record<ImagineError, string>;
  tooMany: (minutes: number) => string;
};

const en: ImagineText = {
  eyebrow: "A first sketch",
  title: "Imagine Your Creation",
  lead: "Describe the piece you dream of. A first image takes shape in under a minute; the house then designs the real piece with you.",
  label: "Describe your idea",
  placeholder: "E.g. a rose gold pendant, my initials set with diamonds, a crown above them",
  generate: "Imagine my creation",
  loading: "Your creation is taking shape…",
  loadingHint: "This can take up to a minute.",
  alt: (idea) => "AI proposal: " + idea,
  note: "An AI-generated proposal, for inspiration only: the house designs the real piece, with you.",
  restart: "Start again",
  finalise: "Contact the house to finalise",
  attached: "Your idea and the image are now in the form below: check them, then send.",
  messageIntro: "Here is the creation I imagined on your website (the AI proposal is attached):",
  fileName: "imagined-creation.jpg",
  errors: {
    empty: "Describe your idea in a few words.",
    "too-long": "Your description is too long: 600 characters at most.",
    refused: "This idea cannot be imagined here. Rephrase it, or describe it to the house in the form below.",
    timeout: "The image took too long. Please try again in a moment.",
    unavailable: "The image could not be created. Please try again in a moment, or write to the house in the form below.",
    network: "No connection. Check your network and try again.",
  },
  tooMany: (minutes) => "You have imagined many creations in a short time: try again in " + minutes + " min.",
};

const fr: ImagineText = {
  eyebrow: "Une première esquisse",
  title: "Imaginez votre création",
  lead: "Décrivez la pièce dont vous rêvez. Une première image prend forme en moins d’une minute ; la maison dessine ensuite la vraie pièce, avec vous.",
  label: "Décrivez votre idée",
  placeholder: "Ex. : un pendentif en or rose, mes initiales serties de diamants, une couronne au-dessus",
  generate: "Imaginer ma création",
  loading: "Votre création prend forme…",
  loadingHint: "Cela peut prendre jusqu’à une minute.",
  alt: (idea) => "Proposition de l’IA : " + idea,
  note: "Proposition imaginée par une intelligence artificielle, à titre d’inspiration : la maison dessine la vraie pièce, avec vous.",
  restart: "Recommencer",
  finalise: "Contacter la maison pour finaliser",
  attached: "Votre idée et l’image sont maintenant dans le formulaire ci-dessous : vérifiez-les, puis envoyez.",
  messageIntro: "Voici la création que j’ai imaginée sur votre site (la proposition de l’IA est jointe) :",
  fileName: "creation-imaginee.jpg",
  errors: {
    empty: "Décrivez votre idée en quelques mots.",
    "too-long": "Votre description est trop longue : 600 caractères au plus.",
    refused: "Cette idée ne peut pas être imaginée ici. Reformulez-la, ou décrivez-la à la maison dans le formulaire ci-dessous.",
    timeout: "L’image a pris trop de temps. Réessayez dans un instant.",
    unavailable: "L’image n’a pas pu être créée. Réessayez dans un instant, ou écrivez à la maison dans le formulaire ci-dessous.",
    network: "Pas de connexion. Vérifiez votre réseau et réessayez.",
  },
  tooMany: (minutes) => "Vous avez imaginé beaucoup de créations en peu de temps : réessayez dans " + minutes + " min.",
};

const es: ImagineText = {
  eyebrow: "Un primer boceto",
  title: "Imagine su creación",
  lead: "Describa la pieza con la que sueña. Una primera imagen toma forma en menos de un minuto; después, la casa diseña la pieza real con usted.",
  label: "Describa su idea",
  placeholder: "Ej.: un colgante de oro rosa, mis iniciales engastadas con diamantes y una corona encima",
  generate: "Imaginar mi creación",
  loading: "Su creación está tomando forma…",
  loadingHint: "Puede tardar hasta un minuto.",
  alt: (idea) => "Propuesta de la IA: " + idea,
  note: "Propuesta generada por inteligencia artificial, solo como inspiración: la casa diseña la pieza real, con usted.",
  restart: "Empezar de nuevo",
  finalise: "Contactar con la casa para finalizar",
  attached: "Su idea y la imagen ya están en el formulario de abajo: revíselas y envíelas.",
  messageIntro: "Esta es la creación que imaginé en su web (adjunto la propuesta de la IA):",
  fileName: "creacion-imaginada.jpg",
  errors: {
    empty: "Describa su idea en pocas palabras.",
    "too-long": "Su descripción es demasiado larga: 600 caracteres como máximo.",
    refused: "Esta idea no puede imaginarse aquí. Reformúlela o descríbala a la casa en el formulario de abajo.",
    timeout: "La imagen ha tardado demasiado. Inténtelo de nuevo en un momento.",
    unavailable: "No se ha podido crear la imagen. Inténtelo de nuevo en un momento o escriba a la casa en el formulario de abajo.",
    network: "Sin conexión. Compruebe su red e inténtelo de nuevo.",
  },
  tooMany: (minutes) => "Ha imaginado muchas creaciones en poco tiempo: inténtelo de nuevo dentro de " + minutes + " min.",
};

const de: ImagineText = {
  eyebrow: "Ein erster Entwurf",
  title: "Stellen Sie sich Ihre Kreation vor",
  lead: "Beschreiben Sie das Schmuckstück, von dem Sie träumen. In weniger als einer Minute entsteht ein erstes Bild; danach entwirft das Haus mit Ihnen das echte Stück.",
  label: "Beschreiben Sie Ihre Idee",
  placeholder: "Z. B. ein Anhänger aus Roségold, meine Initialen mit Diamanten besetzt, darüber eine Krone",
  generate: "Meine Kreation entwerfen",
  loading: "Ihre Kreation nimmt Gestalt an…",
  loadingHint: "Das kann bis zu einer Minute dauern.",
  alt: (idea) => "KI-Vorschlag: " + idea,
  note: "Ein von künstlicher Intelligenz erstellter Vorschlag, nur zur Inspiration: Das Haus entwirft das echte Stück, mit Ihnen.",
  restart: "Neu beginnen",
  finalise: "Das Haus zur Fertigstellung kontaktieren",
  attached: "Ihre Idee und das Bild stehen jetzt im Formular unten: Prüfen Sie beides und senden Sie es ab.",
  messageIntro: "Hier ist die Kreation, die ich mir auf Ihrer Website vorgestellt habe (der KI-Vorschlag ist beigefügt):",
  fileName: "kreation-entwurf.jpg",
  errors: {
    empty: "Beschreiben Sie Ihre Idee in ein paar Worten.",
    "too-long": "Ihre Beschreibung ist zu lang: höchstens 600 Zeichen.",
    refused: "Diese Idee kann hier nicht dargestellt werden. Formulieren Sie sie um oder beschreiben Sie sie dem Haus im Formular unten.",
    timeout: "Das Bild hat zu lange gedauert. Bitte versuchen Sie es gleich noch einmal.",
    unavailable: "Das Bild konnte nicht erstellt werden. Bitte versuchen Sie es gleich noch einmal oder schreiben Sie dem Haus über das Formular unten.",
    network: "Keine Verbindung. Prüfen Sie Ihr Netzwerk und versuchen Sie es erneut.",
  },
  tooMany: (minutes) => "Sie haben in kurzer Zeit viele Kreationen entworfen: Versuchen Sie es in " + minutes + " Min. erneut.",
};

const nl: ImagineText = {
  eyebrow: "Een eerste schets",
  title: "Verbeeld uw creatie",
  lead: "Beschrijf het juweel waarvan u droomt. Binnen een minuut krijgt een eerste afbeelding vorm; daarna ontwerpt het huis het echte stuk, samen met u.",
  label: "Beschrijf uw idee",
  placeholder: "Bijv. een hanger in roségoud, mijn initialen gezet met diamanten, met een kroon erboven",
  generate: "Mijn creatie verbeelden",
  loading: "Uw creatie krijgt vorm…",
  loadingHint: "Dit kan tot een minuut duren.",
  alt: (idea) => "Voorstel van de AI: " + idea,
  note: "Een voorstel gemaakt door kunstmatige intelligentie, alleen ter inspiratie: het huis ontwerpt het echte stuk, samen met u.",
  restart: "Opnieuw beginnen",
  finalise: "Contact opnemen met het huis om af te ronden",
  attached: "Uw idee en de afbeelding staan nu in het formulier hieronder: controleer ze en verstuur.",
  messageIntro: "Dit is de creatie die ik op uw website heb bedacht (het AI-voorstel zit in de bijlage):",
  fileName: "bedachte-creatie.jpg",
  errors: {
    empty: "Beschrijf uw idee in een paar woorden.",
    "too-long": "Uw beschrijving is te lang: maximaal 600 tekens.",
    refused: "Dit idee kan hier niet worden verbeeld. Formuleer het anders, of beschrijf het aan het huis in het formulier hieronder.",
    timeout: "De afbeelding duurde te lang. Probeer het zo meteen opnieuw.",
    unavailable: "De afbeelding kon niet worden gemaakt. Probeer het zo meteen opnieuw, of schrijf het huis via het formulier hieronder.",
    network: "Geen verbinding. Controleer uw netwerk en probeer het opnieuw.",
  },
  tooMany: (minutes) => "U hebt in korte tijd veel creaties bedacht: probeer het over " + minutes + " min. opnieuw.",
};

const ar: ImagineText = {
  eyebrow: "رسم أوّلي",
  title: "تخيّلوا إبداعكم",
  lead: "صِفوا القطعة التي تحلمون بها. تتشكّل صورة أولى في أقل من دقيقة، ثم تصمّم الدار القطعة الحقيقية معكم.",
  label: "صِفوا فكرتكم",
  placeholder: "مثال: قلادة من الذهب الوردي، الأحرف الأولى من اسمي مرصّعة بالألماس، وفوقها تاج",
  generate: "تخيّل إبداعي",
  loading: "إبداعكم يتشكّل…",
  loadingHint: "قد يستغرق ذلك حتى دقيقة واحدة.",
  alt: (idea) => "اقتراح الذكاء الاصطناعي: " + idea,
  note: "اقتراح من إنشاء الذكاء الاصطناعي، للإلهام فقط: الدار تصمّم القطعة الحقيقية معكم.",
  restart: "البدء من جديد",
  finalise: "التواصل مع الدار لإتمام الإبداع",
  attached: "فكرتكم والصورة الآن في النموذج أدناه: راجعوهما ثم أرسلوا.",
  messageIntro: "هذا هو الإبداع الذي تخيّلته على موقعكم (اقتراح الذكاء الاصطناعي مرفق):",
  fileName: "imagined-creation.jpg",
  errors: {
    empty: "صِفوا فكرتكم ببضع كلمات.",
    "too-long": "الوصف طويل جدًا: 600 حرف كحد أقصى.",
    refused: "لا يمكن تخيّل هذه الفكرة هنا. أعيدوا صياغتها، أو صِفوها للدار في النموذج أدناه.",
    timeout: "استغرقت الصورة وقتًا طويلًا. يُرجى المحاولة مرة أخرى بعد قليل.",
    unavailable: "تعذّر إنشاء الصورة. يُرجى المحاولة مرة أخرى بعد قليل، أو مراسلة الدار عبر النموذج أدناه.",
    network: "لا يوجد اتصال. تحقّقوا من الشبكة وحاولوا مرة أخرى.",
  },
  tooMany: (minutes) => "لقد تخيّلتم إبداعات كثيرة في وقت قصير: حاولوا مرة أخرى بعد " + minutes + " دقيقة.",
};

export const IMAGINE: Record<Locale, ImagineText> = { en, fr, es, de, nl, ar };
