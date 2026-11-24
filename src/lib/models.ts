/* The 3D models seen by visitors (server/routes/models.ts). */
import { useEffect, useState } from "react";
import type { PublicModel } from "@/data/models";
import type { Messages } from "@/i18n";
import { listOf } from "@/i18n/format";
import { afterLoad } from "@/lib/idle";
import { HAS_SERVER } from "@/lib/site";
import type { Selection } from "@/viewer";

let pieceModels: Promise<Record<string, PublicModel>> | null = null;

/** The pieces that have a 3D model, by piece. Asked once per visit: moving from page to page sends no new request. */
function allPieceModels(): Promise<Record<string, PublicModel>> {
  pieceModels ??= !HAS_SERVER
    ? Promise.resolve({})
    : fetch("/api/models/pieces", { headers: { Accept: "application/json" } })
        .then((res) => (res.ok ? (res.json() as Promise<Record<string, PublicModel>>) : {}))
        .catch(() => ({}));
  return pieceModels;
}

/** The model shown on the page of a piece, or null. */
export async function pieceModel(slug: string): Promise<PublicModel | null> {
  return (await allPieceModels())[slug] ?? null;
}

/**
 * The pieces that have a 3D model (null until known), asked once the page has
 * loaded so that it never delays the photos.
 */
export function usePieceModels(): Record<string, PublicModel> | null {
  const [all, setAll] = useState<Record<string, PublicModel> | null>(null);
  useEffect(() => {
    let alive = true;
    const cancel = afterLoad(() => {
      void allPieceModels().then((m) => alive && setAll(m));
    });
    return () => {
      alive = false;
      cancel();
    };
  }, []);
  return all;
}

/** The model of one piece (null while unknown or when it has none). */
export function usePieceModel(slug: string): PublicModel | null {
  return usePieceModels()?.[slug] ?? null;
}

export type LinkAnswer =
  | { kind: "ok"; title: string; expiresAt: string | null; model: PublicModel }
  | { kind: "password"; wrong: boolean }
  | { kind: "expired" }
  | { kind: "missing" }
  | { kind: "offline" };

/** A private link: the model, or why it cannot be shown. */
export async function openLink(token: string, password?: string): Promise<LinkAnswer> {
  if (!HAS_SERVER) return { kind: "offline" };
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

/* ---------- The client space (/vip) ---------- */

/** A photo or a video of a news of the atelier (served only to the client: server/routes/vip.ts). */
export type VipFile = { id: string; kind: "image" | "video"; url: string; width: number | null; height: number | null };
/** A news of the atelier: its day ("2027-03-12"), a short note, its photos and videos. */
export type VipUpdate = { id: string; date: string; note: string; createdAt: string; files: VipFile[] };

/**
 * The client entered: his pieces in 3D and the follow-up of his commission: the step of his piece among the six of The
 * Bespoke Journey (0 to 5; 6: every step done), its estimated day and, when it changed, the day it replaced and when; the
 * news of the atelier, newest first.
 */
export type VipSpace = {
  state: "ok";
  name: string;
  pieces: PublicModel[];
  stage: number;
  estimatedAt: string | null;
  dateChange: { previous: string; at: string } | null;
  updates: VipUpdate[];
};
export type VipAnswer = VipSpace | { state: "out" };

async function vipCall(path: string, body?: object): Promise<Record<string, unknown>> {
  if (!HAS_SERVER) return { state: "out" };
  try {
    const res = await fetch("/api/vip/" + path, {
      method: body ? "POST" : "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.ok ? ((await res.json()) as Record<string, unknown>) : { state: "out" };
  } catch {
    return { state: "out" };
  }
}

/** Enter the space with the access code or the personal link. */
export async function vipEnter(by: { code: string } | { token: string }): Promise<{ state: "ok" | "wrong" | "missing" | "out" }> {
  return (await vipCall("code" in by ? "login" : "link", by)) as { state: "ok" | "wrong" | "missing" | "out" };
}

/** The client entered and his pieces, or { state: "out" }. */
export async function vipMe(): Promise<VipAnswer> {
  const answer = await vipCall("me");
  if (answer.state !== "ok") return { state: "out" };
  const space = answer as Partial<VipSpace>;
  return { state: "ok", name: space.name ?? "", pieces: space.pieces ?? [], stage: space.stage ?? 0, estimatedAt: space.estimatedAt ?? null, dateChange: space.dateChange ?? null, updates: space.updates ?? [] };
}

export async function vipLeave(): Promise<void> {
  await vipCall("logout", {});
}
