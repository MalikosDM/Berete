/* Settings shared by the whole site. The only place to change the contact details. The words of the site are in src/i18n. */

/** WhatsApp number, digits only with the country code. Placeholder: replace with the real number. */
export const WHATSAPP_NUMBER = "971XXXXXXXXX";
/** Public email address. Empty: not shown on the site (the email form still works). */
export const EMAIL = "";
export const INSTAGRAM_HANDLE = "beretejewellers";
export const INSTAGRAM_URL = "https://www.instagram.com/" + INSTAGRAM_HANDLE + "/";

/**
 * The name BERETE as a watermark, very discreet, in the background of the home page, of the pages of the pieces (in their
 * universe) and of the circle: true shows it, false removes it everywhere. Always under the pieces, never over a jewel.
 */
export const BRAND_WATERMARK = true;

/**
 * Whether this version of the site has its server (the API: forms, 3D models, client space, admin). The version put
 * online before the real server (Vercel) has none: it asks nothing of the API, its forms open WhatsApp with the request
 * already written, the client space and the admin say they open soon.
 */
export const HAS_SERVER: boolean = __HAS_SERVER__;

/** A WhatsApp conversation opened with this message (written in the language of the page). */
export function waLink(message: string): string {
  return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
}

/* ---------- Contact configurator: the answers, whose words are in src/i18n (contact.pieceChoices...) ---------- */

/** The kinds of piece of the configurator: the collections of the creations, in their order (24/11/2026). */
export const PIECE_CHOICES = ["pendant", "chain", "ring", "watch"] as const;
export const BUDGETS = ["10k", "25k", "50k", "50k+", "unsure"] as const;
export const TIMINGS = ["asap", "quarter", "flexible"] as const;
