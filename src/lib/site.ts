/* Settings shared by the whole site. The only place to change the contact details. The words of the site are in src/i18n. */

/** WhatsApp number, digits only with the country code. Placeholder: replace with the real number. */
export const WHATSAPP_NUMBER = "971XXXXXXXXX";
/** Public email address. Empty: not shown on the site (the email form still works). */
export const EMAIL = "";
export const INSTAGRAM_HANDLE = "beretejewellers";
export const INSTAGRAM_URL = "https://www.instagram.com/" + INSTAGRAM_HANDLE + "/";

/** A WhatsApp conversation opened with this message (written in the language of the page). */
export function waLink(message: string): string {
  return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
}

/* ---------- Contact configurator: the answers, whose words are in src/i18n (contact.pieceChoices...) ---------- */

export const PIECE_CHOICES = ["chain", "pendant", "ring", "other"] as const;
export const BUDGETS = ["10k", "25k", "50k", "50k+", "unsure"] as const;
export const TIMINGS = ["asap", "quarter", "flexible"] as const;
