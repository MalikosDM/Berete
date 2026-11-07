/* Constants and copy shared by the whole site. Texts are provisional (English). */

const WHATSAPP_NUMBER = "971XXXXXXXXX"; // placeholder: replace with the real number
export const INSTAGRAM_HANDLE = "beretejewellers";
export const INSTAGRAM_URL = "https://www.instagram.com/" + INSTAGRAM_HANDLE + "/";
export const BASE_LINE = "Based in Dubai · Worldwide delivery";

export function waLink(message: string): string {
  return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
}

export const DEFAULT_MESSAGE = "Hello Berete Jewellers, I would like to start a custom piece.";

export function pieceMessage(name: string): string {
  return 'Hello Berete Jewellers, I want a piece like "' + name + '". Can we talk about it?';
}











/* ---------- Contact configurator ---------- */

export type Choice = { value: string; label: string };

export const PIECE_TYPES: Choice[] = [
  { value: "chain", label: "Chain" },
  { value: "pendant", label: "Pendant" },
  { value: "ring", label: "Championship ring" },
  { value: "other", label: "Something else" },
];

export const BUDGETS: Choice[] = [
  { value: "10k", label: "Up to 10,000 USD" },
  { value: "25k", label: "10,000 to 25,000 USD" },
  { value: "50k", label: "25,000 to 50,000 USD" },
  { value: "50k+", label: "50,000 USD and above" },
  { value: "unsure", label: "Not sure yet" },
];

export const TIMINGS: Choice[] = [
  { value: "asap", label: "Within a month" },
  { value: "quarter", label: "In 1 to 3 months" },
  { value: "flexible", label: "No rush" },
];

export function configuratorMessage(type: string, budget: string, timing: string, pieceName?: string): string {
  const lines = [
    "Hello Berete Jewellers, I would like to start a piece.",
    "Piece: " + type,
    "Budget: " + budget,
    "Timing: " + timing,
  ];
  if (pieceName) lines.push('Inspired by: "' + pieceName + '"');
  return lines.join("\n");
}

