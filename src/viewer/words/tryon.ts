/*
 * Every word the client reads in the ring try-on (./../tryon/TryOn.tsx) and in the views in his own space (AR Quick Look on
 * an iPhone, Scene Viewer on Android: ./../ar.ts), in the six languages of the site. English and French are the house's;
 * Spanish, German, Dutch and Arabic are translated from the English (to be read again by natives, like the rest).
 */
import type { Finger } from "@/data/scene3d";

export type TryOnLang = "fr" | "en" | "es" | "de" | "nl" | "ar";

export type TryOnWords = {
  /** The button that opens the try-on (shown by the viewer). */
  tryOn: string;
  /** The button that shows the jewel in the client's own space (AR). */
  viewInSpace: string;
  close: string;
  /** While the camera and the hand tracking start. */
  loading: string;
  /** Under the loading words: nothing leaves the device. */
  privacy: string;
  /** Over the image while no hand is seen. */
  showHand: string;
  switchCamera: string;
  capture: string;
  /** Said once the photo is saved. */
  captured: string;
  /** The title of the choice of finger (for screen readers and the group). */
  finger: string;
  fingers: Record<Finger, string>;
  /** The page is not on https: the camera is refused by the browser. */
  needsHttps: string;
  /** The client refused the camera. */
  cameraDenied: string;
  /** No camera on this device, or it is used by another application. */
  cameraMissing: string;
  /** The browser cannot run the try-on at all. */
  unsupported: string;
  /** Anything else that stopped the start. */
  failed: string;
  retry: string;
  /** While the file of the view in the client's space is prepared. */
  arPreparing: string;
  arFailed: string;
};

export const TRY_ON_WORDS: Record<TryOnLang, TryOnWords> = {
  en: {
    tryOn: "Try the ring on",
    viewInSpace: "View in my space",
    close: "Close",
    loading: "Preparing the try-on…",
    privacy: "The image stays on your device.",
    showHand: "Show the back of your hand",
    switchCamera: "Switch camera",
    capture: "Take a photo",
    captured: "Photo saved",
    finger: "Finger",
    fingers: { ring: "Ring", middle: "Middle", index: "Index", little: "Little" },
    needsHttps: "The try-on needs a secure connection (https).",
    cameraDenied: "Access to the camera was refused. Allow it in your browser settings, then try again.",
    cameraMissing: "No camera is available on this device.",
    unsupported: "This browser cannot open the try-on.",
    failed: "The try-on could not start.",
    retry: "Try again",
    arPreparing: "Preparing the view…",
    arFailed: "The view could not be prepared.",
  },
  fr: {
    tryOn: "Essayer la bague",
    viewInSpace: "Voir chez moi",
    close: "Fermer",
    loading: "Préparation de l’essayage…",
    privacy: "L’image reste sur votre appareil.",
    showHand: "Montrez le dos de votre main",
    switchCamera: "Changer de caméra",
    capture: "Prendre une photo",
    captured: "Photo enregistrée",
    finger: "Doigt",
    fingers: { ring: "Annulaire", middle: "Majeur", index: "Index", little: "Auriculaire" },
    needsHttps: "L’essayage demande une connexion sécurisée (https).",
    cameraDenied: "L’accès à la caméra a été refusé. Autorisez-le dans les réglages du navigateur, puis réessayez.",
    cameraMissing: "Aucune caméra n’est disponible sur cet appareil.",
    unsupported: "Ce navigateur ne permet pas l’essayage.",
    failed: "L’essayage n’a pas pu démarrer.",
    retry: "Réessayer",
    arPreparing: "Préparation de l’aperçu…",
    arFailed: "L’aperçu n’a pas pu être préparé.",
  },
  es: {
    tryOn: "Probarse el anillo",
    viewInSpace: "Ver en mi espacio",
    close: "Cerrar",
    loading: "Preparando la prueba…",
    privacy: "La imagen permanece en su dispositivo.",
    showHand: "Muestre el dorso de su mano",
    switchCamera: "Cambiar de cámara",
    capture: "Hacer una foto",
    captured: "Foto guardada",
    finger: "Dedo",
    fingers: { ring: "Anular", middle: "Corazón", index: "Índice", little: "Meñique" },
    needsHttps: "La prueba necesita una conexión segura (https).",
    cameraDenied: "Se ha denegado el acceso a la cámara. Permítalo en los ajustes del navegador y vuelva a intentarlo.",
    cameraMissing: "No hay ninguna cámara disponible en este dispositivo.",
    unsupported: "Este navegador no permite la prueba.",
    failed: "No se ha podido iniciar la prueba.",
    retry: "Intentar de nuevo",
    arPreparing: "Preparando la vista…",
    arFailed: "No se ha podido preparar la vista.",
  },
  de: {
    tryOn: "Ring anprobieren",
    viewInSpace: "In meinem Raum ansehen",
    close: "Schließen",
    loading: "Anprobe wird vorbereitet…",
    privacy: "Das Bild bleibt auf Ihrem Gerät.",
    showHand: "Zeigen Sie Ihren Handrücken",
    switchCamera: "Kamera wechseln",
    capture: "Foto aufnehmen",
    captured: "Foto gespeichert",
    finger: "Finger",
    fingers: { ring: "Ringfinger", middle: "Mittelfinger", index: "Zeigefinger", little: "Kleiner Finger" },
    needsHttps: "Die Anprobe benötigt eine sichere Verbindung (https).",
    cameraDenied: "Der Zugriff auf die Kamera wurde verweigert. Erlauben Sie ihn in den Browsereinstellungen und versuchen Sie es erneut.",
    cameraMissing: "Auf diesem Gerät ist keine Kamera verfügbar.",
    unsupported: "Dieser Browser unterstützt die Anprobe nicht.",
    failed: "Die Anprobe konnte nicht gestartet werden.",
    retry: "Erneut versuchen",
    arPreparing: "Ansicht wird vorbereitet…",
    arFailed: "Die Ansicht konnte nicht vorbereitet werden.",
  },
  nl: {
    tryOn: "De ring passen",
    viewInSpace: "Bekijken in mijn ruimte",
    close: "Sluiten",
    loading: "Het passen wordt voorbereid…",
    privacy: "Het beeld blijft op uw toestel.",
    showHand: "Toon de rug van uw hand",
    switchCamera: "Andere camera",
    capture: "Foto maken",
    captured: "Foto opgeslagen",
    finger: "Vinger",
    fingers: { ring: "Ringvinger", middle: "Middelvinger", index: "Wijsvinger", little: "Pink" },
    needsHttps: "Het passen vraagt een beveiligde verbinding (https).",
    cameraDenied: "De toegang tot de camera werd geweigerd. Sta hem toe in de instellingen van uw browser en probeer opnieuw.",
    cameraMissing: "Er is geen camera beschikbaar op dit toestel.",
    unsupported: "Deze browser kan het passen niet openen.",
    failed: "Het passen kon niet starten.",
    retry: "Opnieuw proberen",
    arPreparing: "De weergave wordt voorbereid…",
    arFailed: "De weergave kon niet worden voorbereid.",
  },
  ar: {
    tryOn: "جرّب الخاتم",
    viewInSpace: "شاهده في مكاني",
    close: "إغلاق",
    loading: "جارٍ تحضير التجربة…",
    privacy: "تبقى الصورة على جهازك.",
    showHand: "أظهر ظهر يدك",
    switchCamera: "تبديل الكاميرا",
    capture: "التقاط صورة",
    captured: "تم حفظ الصورة",
    finger: "الإصبع",
    fingers: { ring: "البنصر", middle: "الوسطى", index: "السبابة", little: "الخنصر" },
    needsHttps: "تتطلب التجربة اتصالًا آمنًا (https).",
    cameraDenied: "تم رفض الوصول إلى الكاميرا. اسمح به في إعدادات المتصفح، ثم أعد المحاولة.",
    cameraMissing: "لا تتوفر كاميرا على هذا الجهاز.",
    unsupported: "هذا المتصفح لا يدعم التجربة.",
    failed: "تعذّر بدء التجربة.",
    retry: "أعد المحاولة",
    arPreparing: "جارٍ تحضير العرض…",
    arFailed: "تعذّر تحضير العرض.",
  },
};
