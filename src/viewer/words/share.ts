/*
 * The words of a sealed share link (/s/<token>, src/pages/SealedView.tsx), in the 6 languages of the site. The page is
 * opened alone, without the address of a language: it speaks the language of the browser, French by default.
 */

export const SHARE_LANGS = ["fr", "en", "es", "de", "nl", "ar"] as const;
export type ShareLang = (typeof SHARE_LANGS)[number];

export type ShareWords = {
  eyebrow: string;
  sealedNote: string;
  passwordTitle: string;
  passwordText: string;
  password: string;
  open: string;
  checking: string;
  wrongPassword: string;
  loading: string;
  downloading: string;
  decrypting: string;
  expiredTitle: string;
  expiredText: string;
  missingTitle: string;
  missingText: string;
  keyTitle: string;
  keyText: string;
  failedTitle: string;
  failedText: string;
  retry: string;
  busyText: string;
  unsupportedTitle: string;
  unsupportedText: string;
  validUntil: (date: string) => string;
  askLink: string;
  askMessage: string;
};

export const SHARE_WORDS: Record<ShareLang, ShareWords> = {
  fr: {
    eyebrow: "Lien privé chiffré",
    sealedNote: "Cette pièce est chiffrée : seul votre appareil peut l’ouvrir.",
    passwordTitle: "Cette pièce est protégée",
    passwordText: "Saisissez le mot de passe reçu avec ce lien.",
    password: "Mot de passe",
    open: "Ouvrir",
    checking: "Vérification…",
    wrongPassword: "Ce mot de passe n’est pas le bon. Vérifiez-le et réessayez.",
    loading: "Ouverture du lien…",
    downloading: "Téléchargement de la pièce",
    decrypting: "Déchiffrement de la pièce…",
    expiredTitle: "Ce lien a expiré",
    expiredText: "Demandez un nouveau lien à la maison Berete.",
    missingTitle: "Ce lien n’existe pas",
    missingText: "Il a peut-être été supprimé. Demandez un nouveau lien à la maison Berete.",
    keyTitle: "Lien incomplet",
    keyText: "Ouvrez le lien en entier, tel qu’il vous a été envoyé (avec la fin, après le #).",
    failedTitle: "La pièce n’a pas pu être ouverte",
    failedText: "Vérifiez votre connexion, puis réessayez.",
    retry: "Réessayer",
    busyText: "Trop de demandes. Réessayez dans quelques minutes.",
    unsupportedTitle: "Navigateur non compatible",
    unsupportedText: "Ce lien sécurisé s’ouvre avec Safari, Chrome, Edge ou Firefox à jour.",
    validUntil: (date) => "Lien valable jusqu’au " + date,
    askLink: "Écrire à la maison",
    askMessage: "Bonjour Berete Jewellers, mon lien 3D ne s’ouvre plus. Pourriez-vous m’en envoyer un nouveau ?",
  },
  en: {
    eyebrow: "Private encrypted link",
    sealedNote: "This piece is encrypted: only your device can open it.",
    passwordTitle: "This piece is protected",
    passwordText: "Enter the password you received with this link.",
    password: "Password",
    open: "Open",
    checking: "Checking…",
    wrongPassword: "This password is not the right one. Check it and try again.",
    loading: "Opening the link…",
    downloading: "Downloading the piece",
    decrypting: "Decrypting the piece…",
    expiredTitle: "This link has expired",
    expiredText: "Ask the house of Berete for a new link.",
    missingTitle: "This link does not exist",
    missingText: "It may have been deleted. Ask the house of Berete for a new link.",
    keyTitle: "Incomplete link",
    keyText: "Open the whole link, exactly as it was sent to you (including the end, after the #).",
    failedTitle: "The piece could not be opened",
    failedText: "Check your connection, then try again.",
    retry: "Try again",
    busyText: "Too many requests. Please try again in a few minutes.",
    unsupportedTitle: "Browser not supported",
    unsupportedText: "This secure link opens in an up-to-date Safari, Chrome, Edge or Firefox.",
    validUntil: (date) => "Link valid until " + date,
    askLink: "Write to the house",
    askMessage: "Hello Berete Jewellers, my 3D link no longer opens. Could you send me a new one?",
  },
  es: {
    eyebrow: "Enlace privado cifrado",
    sealedNote: "Esta pieza está cifrada: solo su dispositivo puede abrirla.",
    passwordTitle: "Esta pieza está protegida",
    passwordText: "Introduzca la contraseña que recibió con este enlace.",
    password: "Contraseña",
    open: "Abrir",
    checking: "Comprobando…",
    wrongPassword: "Esta contraseña no es correcta. Compruébela e inténtelo de nuevo.",
    loading: "Abriendo el enlace…",
    downloading: "Descargando la pieza",
    decrypting: "Descifrando la pieza…",
    expiredTitle: "Este enlace ha caducado",
    expiredText: "Pida un nuevo enlace a la casa Berete.",
    missingTitle: "Este enlace no existe",
    missingText: "Puede que se haya eliminado. Pida un nuevo enlace a la casa Berete.",
    keyTitle: "Enlace incompleto",
    keyText: "Abra el enlace completo, tal como se lo enviaron (incluido el final, tras el #).",
    failedTitle: "No se ha podido abrir la pieza",
    failedText: "Compruebe su conexión e inténtelo de nuevo.",
    retry: "Reintentar",
    busyText: "Demasiadas solicitudes. Inténtelo de nuevo en unos minutos.",
    unsupportedTitle: "Navegador no compatible",
    unsupportedText: "Este enlace seguro se abre con Safari, Chrome, Edge o Firefox actualizados.",
    validUntil: (date) => "Enlace válido hasta el " + date,
    askLink: "Escribir a la casa",
    askMessage: "Hola Berete Jewellers, mi enlace 3D ya no se abre. ¿Podrían enviarme uno nuevo?",
  },
  de: {
    eyebrow: "Privater verschlüsselter Link",
    sealedNote: "Dieses Stück ist verschlüsselt: Nur Ihr Gerät kann es öffnen.",
    passwordTitle: "Dieses Stück ist geschützt",
    passwordText: "Geben Sie das Passwort ein, das Sie mit diesem Link erhalten haben.",
    password: "Passwort",
    open: "Öffnen",
    checking: "Wird geprüft …",
    wrongPassword: "Dieses Passwort ist nicht richtig. Bitte prüfen Sie es und versuchen Sie es erneut.",
    loading: "Link wird geöffnet …",
    downloading: "Das Stück wird geladen",
    decrypting: "Das Stück wird entschlüsselt …",
    expiredTitle: "Dieser Link ist abgelaufen",
    expiredText: "Bitten Sie das Haus Berete um einen neuen Link.",
    missingTitle: "Diesen Link gibt es nicht",
    missingText: "Vielleicht wurde er gelöscht. Bitten Sie das Haus Berete um einen neuen Link.",
    keyTitle: "Unvollständiger Link",
    keyText: "Öffnen Sie den ganzen Link, genau so, wie er Ihnen geschickt wurde (auch das Ende nach dem #).",
    failedTitle: "Das Stück konnte nicht geöffnet werden",
    failedText: "Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
    retry: "Erneut versuchen",
    busyText: "Zu viele Anfragen. Bitte versuchen Sie es in einigen Minuten erneut.",
    unsupportedTitle: "Browser nicht unterstützt",
    unsupportedText: "Dieser sichere Link öffnet sich in einem aktuellen Safari, Chrome, Edge oder Firefox.",
    validUntil: (date) => "Link gültig bis " + date,
    askLink: "Dem Haus schreiben",
    askMessage: "Hallo Berete Jewellers, mein 3D-Link öffnet sich nicht mehr. Könnten Sie mir einen neuen senden?",
  },
  nl: {
    eyebrow: "Versleutelde privélink",
    sealedNote: "Dit stuk is versleuteld: alleen uw toestel kan het openen.",
    passwordTitle: "Dit stuk is beveiligd",
    passwordText: "Voer het wachtwoord in dat u bij deze link hebt ontvangen.",
    password: "Wachtwoord",
    open: "Openen",
    checking: "Controleren…",
    wrongPassword: "Dit wachtwoord klopt niet. Controleer het en probeer het opnieuw.",
    loading: "Link wordt geopend…",
    downloading: "Het stuk wordt gedownload",
    decrypting: "Het stuk wordt ontsleuteld…",
    expiredTitle: "Deze link is verlopen",
    expiredText: "Vraag het huis Berete om een nieuwe link.",
    missingTitle: "Deze link bestaat niet",
    missingText: "Misschien is hij verwijderd. Vraag het huis Berete om een nieuwe link.",
    keyTitle: "Onvolledige link",
    keyText: "Open de volledige link, precies zoals hij u is gestuurd (ook het einde, na de #).",
    failedTitle: "Het stuk kon niet worden geopend",
    failedText: "Controleer uw verbinding en probeer het opnieuw.",
    retry: "Opnieuw proberen",
    busyText: "Te veel verzoeken. Probeer het over enkele minuten opnieuw.",
    unsupportedTitle: "Browser niet ondersteund",
    unsupportedText: "Deze beveiligde link opent in een recente versie van Safari, Chrome, Edge of Firefox.",
    validUntil: (date) => "Link geldig tot " + date,
    askLink: "Het huis schrijven",
    askMessage: "Hallo Berete Jewellers, mijn 3D-link opent niet meer. Kunt u mij een nieuwe sturen?",
  },
  ar: {
    eyebrow: "رابط خاص مشفّر",
    sealedNote: "هذه القطعة مشفّرة: لا يستطيع فتحها إلا جهازك.",
    passwordTitle: "هذه القطعة محمية",
    passwordText: "أدخل كلمة المرور التي تلقيتها مع هذا الرابط.",
    password: "كلمة المرور",
    open: "فتح",
    checking: "جارٍ التحقق…",
    wrongPassword: "كلمة المرور هذه غير صحيحة. تحقّق منها وحاول مرة أخرى.",
    loading: "جارٍ فتح الرابط…",
    downloading: "جارٍ تنزيل القطعة",
    decrypting: "جارٍ فك تشفير القطعة…",
    expiredTitle: "انتهت صلاحية هذا الرابط",
    expiredText: "اطلب رابطًا جديدًا من دار Berete.",
    missingTitle: "هذا الرابط غير موجود",
    missingText: "ربما تم حذفه. اطلب رابطًا جديدًا من دار Berete.",
    keyTitle: "رابط غير مكتمل",
    keyText: "افتح الرابط كاملًا كما أُرسل إليك (بما في ذلك الجزء الذي يلي العلامة #).",
    failedTitle: "تعذّر فتح القطعة",
    failedText: "تحقّق من اتصالك ثم حاول مرة أخرى.",
    retry: "إعادة المحاولة",
    busyText: "طلبات كثيرة جدًا. حاول مرة أخرى بعد بضع دقائق.",
    unsupportedTitle: "المتصفح غير مدعوم",
    unsupportedText: "يُفتح هذا الرابط الآمن في إصدار حديث من Safari أو Chrome أو Edge أو Firefox.",
    validUntil: (date) => "الرابط صالح حتى " + date,
    askLink: "راسل الدار",
    askMessage: "مرحبًا Berete Jewellers، رابط الأبعاد الثلاثية الخاص بي لم يعد يُفتح. هل يمكنكم إرسال رابط جديد؟",
  },
};

/** The language of the browser among the six of the site; French when none of them. */
export function shareLang(): ShareLang {
  const asked = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of asked) {
    const base = (tag ?? "").toLowerCase().split("-")[0] as ShareLang;
    if ((SHARE_LANGS as readonly string[]).includes(base)) return base;
  }
  return "fr";
}
