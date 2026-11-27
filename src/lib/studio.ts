/*
 * The calls of the AI Creation Studio (src/pages/Studio.tsx) to its API (server/routes/studio.ts), and what they answer.
 * The private token of a studio is kept in this browser (localStorage, a convenience only: the private link is the real key),
 * so /create brings a visitor back to his studio.
 */
export type StudioConcept = { id: string; url: string; prompt: string; variant: string; kept: boolean; sent: boolean; createdAt: string };
export type StudioReference = { id: string; name: string; url: string; mime: string; sent: boolean; createdAt: string };
export type StudioState = {
  email: string;
  createdAt: string;
  concepts: StudioConcept[];
  references: StudioReference[];
  requests: { id: string; createdAt: string }[];
  open: boolean;
  reason: "off" | "key" | null;
  max: number;
  remaining: number;
};
export type StudioStatus = { open: boolean; reason: "off" | "key" | null; max: number; remaining: number };

export const PIECE_KEYS = ["pendant", "ring", "chain", "bracelet"] as const;
export const METAL_KEYS = ["yellow", "white", "rose"] as const;
export const SHAPE_KEYS = ["bolder", "finer", "geometric", "organic"] as const;
export type PieceKey = (typeof PIECE_KEYS)[number];
export type MetalKey = (typeof METAL_KEYS)[number];
export type ShapeKey = (typeof SHAPE_KEYS)[number];
export type VariantKey = "another" | MetalKey | ShapeKey;

/** What the server says when it refuses (src/i18n/studio errors), with the minutes to wait for « too-many ». */
export type StudioProblem = { error: string; wait?: number };

export class StudioError extends Error {
  constructor(
    public code: string,
    public wait = 0,
    public status = 0,
  ) {
    super(code);
  }
}

const TIMEOUT = 120_000;

async function call<T>(method: string, url: string, body?: unknown, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT);
  let res: Response;
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined && !(body instanceof Blob)) headers["Content-Type"] = "application/json";
    if (body instanceof Blob) headers["Content-Type"] = body.type || "application/octet-stream";
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : body instanceof Blob ? body : JSON.stringify(body), signal: controller.signal, ...init });
  } catch {
    throw new StudioError(controller.signal.aborted ? "timeout" : "network");
  } finally {
    window.clearTimeout(timer);
  }
  const json = (await res.json().catch(() => null)) as (T & { error?: unknown; wait?: unknown }) | null;
  if (!res.ok) {
    const code = typeof json?.error === "string" ? json.error : res.status === 413 ? "file" : res.status === 504 ? "timeout" : "unavailable";
    throw new StudioError(code, Math.max(1, Math.round(Number(json?.wait)) || 1), res.status);
  }
  return json as T;
}

export const studioApi = {
  status: () => call<StudioStatus>("GET", "/api/studio/status"),
  create: () => call<{ token: string }>("POST", "/api/studio"),
  load: (token: string) => call<StudioState>("GET", "/api/studio/" + token),
  generate: (token: string, body: { idea: string; piece: PieceKey | null; metal: MetalKey | null; photos: boolean }) => call<{ concept: StudioConcept; remaining: number }>("POST", "/api/studio/" + token + "/generate", body),
  variant: (token: string, id: string, variant: VariantKey) => call<{ concept: StudioConcept; remaining: number }>("POST", "/api/studio/" + token + "/concepts/" + id + "/variant", { variant }),
  keep: (token: string, id: string, kept: boolean) => call<{ kept: boolean }>("PUT", "/api/studio/" + token + "/concepts/" + id, { kept }),
  removeConcept: (token: string, id: string) => call<{ ok: true }>("DELETE", "/api/studio/" + token + "/concepts/" + id),
  addReference: (token: string, name: string, blob: Blob) => call<{ reference: StudioReference }>("POST", "/api/studio/" + token + "/references?name=" + encodeURIComponent(name), blob),
  removeReference: (token: string, id: string) => call<{ ok: true }>("DELETE", "/api/studio/" + token + "/references/" + id),
  email: (token: string, email: string, language: string) => call<{ ok: true }>("POST", "/api/studio/" + token + "/email", { email, language }),
  request: (token: string, body: { name: string; email: string; phone: string; message: string; conceptIds: string[]; referenceIds: string[]; language: string; company: string }) =>
    call<{ ok: true; request: { id: string; createdAt: string } }>("POST", "/api/studio/" + token + "/requests", body),
};

/* ---------- The token kept in this browser ---------- */

const KEY = "bj-studio";

export function savedToken(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveToken(token: string): void {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the private link is enough */
  }
}

/** The settings kept with a concept ("piece:ring,rose,bolder,photos,another"). */
export function variantParts(variant: string): string[] {
  return variant.split(",").filter(Boolean);
}
