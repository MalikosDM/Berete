/*
 * The settings of The Private Atelier, written by Berete in the admin (kept in the base, ServerSetting "atelier.settings"):
 * the commercial terms of Yoni (never written by us: until they are, a quotation cannot be accepted), the switches of each
 * function (the payment, the AI Creation Studio, the automatic WhatsApp messages; the texts of the site follow them), the
 * means of payment besides the card, the days an invitation lasts, the limits of the AI studio.
 */
import { prisma } from "../db.js";

export type AtelierSettings = {
  terms: string;
  features: {
    /** The online payment (shown only when the three Stripe keys are there too). */
    payment: boolean;
    /** The AI Creation Studio (« Create your own piece »). */
    aiStudio: boolean;
    /** Automatic WhatsApp messages: needs a WhatsApp Business account and its key (not there: stays off). */
    whatsappNotify: boolean;
    /** The section « The Private Atelier » of The Bespoke Journey and « Beyond the Creation » on the home page. */
    siteTexts: boolean;
    /** « Client Access » in the menu. */
    clientAccess: boolean;
  };
  /** Besides the card (with Apple Pay and Google Pay): "bank_transfer". */
  methods: string[];
  inviteDays: number;
  ai: { perVisitorDaily: number; dailyTotal: number };
};

export const DEFAULT_SETTINGS: AtelierSettings = {
  terms: "",
  features: { payment: true, aiStudio: false, whatsappNotify: false, siteTexts: true, clientAccess: true },
  methods: [],
  inviteDays: 7,
  ai: { perVisitorDaily: 10, dailyTotal: 200 },
};

const KEY = "atelier.settings";
let cache: { at: number; value: AtelierSettings } | null = null;

function merge(raw: unknown): AtelierSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<AtelierSettings>;
  const f = (r.features ?? {}) as Partial<AtelierSettings["features"]>;
  const ai = (r.ai ?? {}) as Partial<AtelierSettings["ai"]>;
  const n = (v: unknown, d: number, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d);
  return {
    terms: typeof r.terms === "string" ? r.terms : "",
    features: {
      payment: typeof f.payment === "boolean" ? f.payment : DEFAULT_SETTINGS.features.payment,
      aiStudio: typeof f.aiStudio === "boolean" ? f.aiStudio : DEFAULT_SETTINGS.features.aiStudio,
      whatsappNotify: typeof f.whatsappNotify === "boolean" ? f.whatsappNotify : false,
      siteTexts: typeof f.siteTexts === "boolean" ? f.siteTexts : DEFAULT_SETTINGS.features.siteTexts,
      clientAccess: typeof f.clientAccess === "boolean" ? f.clientAccess : DEFAULT_SETTINGS.features.clientAccess,
    },
    methods: Array.isArray(r.methods) ? r.methods.filter((m): m is string => m === "bank_transfer") : [],
    inviteDays: n(r.inviteDays, 7, 1, 30),
    ai: { perVisitorDaily: n(ai.perVisitorDaily, 10, 1, 100), dailyTotal: n(ai.dailyTotal, 200, 1, 5000) },
  };
}

export async function atelierSettings(): Promise<AtelierSettings> {
  if (cache && Date.now() - cache.at < 5000) return cache.value;
  const row = await prisma.serverSetting.findUnique({ where: { key: KEY } });
  let raw: unknown;
  try {
    raw = row ? JSON.parse(row.value) : {};
  } catch {
    raw = {};
  }
  const value = merge(raw);
  cache = { at: Date.now(), value };
  return value;
}

export async function saveAtelierSettings(next: unknown): Promise<AtelierSettings> {
  const value = merge(next);
  await prisma.serverSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: JSON.stringify(value) }, update: { value: JSON.stringify(value) } });
  cache = { at: Date.now(), value };
  return value;
}

/** What a WhatsApp Business automation would need (the slot is ready, switched off). */
export const WHATSAPP_NEEDS = [
  "Un compte WhatsApp Business (Meta Business Suite) au nom de la maison",
  "Le numéro +971 58 593 0211 vérifié dans WhatsApp Business Platform (Cloud API)",
  "Une clé d'accès permanente (WHATSAPP_TOKEN) et l'identifiant du numéro (WHATSAPP_PHONE_ID)",
  "Des modèles de message approuvés par Meta (nouveau message, validation à faire, étape de fabrication)",
];
