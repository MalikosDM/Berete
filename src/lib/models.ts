/* The 3D models seen by visitors (server/routes/models.ts). */
import type { PublicModel } from "@/data/models";
import type { Messages } from "@/i18n";
import { listOf } from "@/i18n/format";
import type { Selection } from "@/viewer";

let pieceModels: Promise<Record<string, PublicModel>> | null = null;

/**
 * The model shown on the page of a piece, or null. The list of the pieces that have one is asked
 * once per visit: moving from piece to piece sends no new request.
 */
export async function pieceModel(slug: string): Promise<PublicModel | null> {
  pieceModels ??= fetch("/api/models/pieces", { headers: { Accept: "application/json" } })
    .then((res) => (res.ok ? (res.json() as Promise<Record<string, PublicModel>>) : {}))
    .catch(() => ({}));
  const all = await pieceModels;
  return all[slug] ?? null;
}

export type LinkAnswer =
  | { kind: "ok"; title: string; expiresAt: string | null; model: PublicModel }
  | { kind: "password"; wrong: boolean }
  | { kind: "expired" }
  | { kind: "missing" }
  | { kind: "offline" };

/** A private link: the model, or why it cannot be shown. */
export async function openLink(token: string, password?: string): Promise<LinkAnswer> {
  try {
    const res = await fetch("/api/view/" + encodeURIComponent(token), {
      method: password === undefined ? "GET" : "POST",
      headers: { Accept: "application/json", ...(password === undefined ? {} : { "Content-Type": "application/json" }) },
      body: password === undefined ? undefined : JSON.stringify({ password }),
    });
    if (!res.ok) return { kind: "offline" };
    const answer = (await res.json()) as { state: string; title?: string; expiresAt?: string | null; model?: PublicModel };
    if (answer.state === "ok" && answer.model) return { kind: "ok", title: answer.title ?? answer.model.name, expiresAt: answer.expiresAt ?? null, model: answer.model };
    if (answer.state === "password" || answer.state === "wrong") return { kind: "password", wrong: answer.state === "wrong" };
    if (answer.state === "expired") return { kind: "expired" };
    return { kind: "missing" };
  } catch {
    return { kind: "offline" };
  }
}

/** The metals chosen in the viewer, in words: "18k rose gold" or "18k rose gold (Links) and 18k white gold (Flowers)". */
export function metalsInWords(selection: Selection, words: Messages["viewer"], intl: string): string {
  if (selection.length === 0) return "";
  if (selection.length === 1 || new Set(selection.map((s) => s.metal)).size === 1) return words.metals[selection[0]!.metal];
  return listOf(intl, selection.map((s) => words.metalOf(words.metals[s.metal], s.label)));
}
