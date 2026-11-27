/*
 * What the pages of the site may show of The Private Atelier (the switches of the admin, GET /api/atelier/public): its section
 * in The Bespoke Journey and « Beyond the Creation », « Client Access » in the menu, and each step of the journey only when it
 * really works (the AI studio with its key, the online payment with the keys of Stripe). Asked once per visit. Without the
 * server (the pages built in advance, before the answer), the texts show and the steps that wait for a switch do not.
 */
import { useEffect, useState } from "react";
import { HAS_SERVER } from "./site";

export type AtelierPublic = { siteTexts: boolean; clientAccess: boolean; aiStudio: boolean; payment: boolean };

const FIRST: AtelierPublic = { siteTexts: true, clientAccess: true, aiStudio: false, payment: false };
let asked: Promise<AtelierPublic> | null = null;
let known: AtelierPublic | null = null;

function ask(): Promise<AtelierPublic> {
  asked ??= fetch("/api/atelier/public", { credentials: "same-origin" })
    .then((r) => (r.ok ? (r.json() as Promise<AtelierPublic>) : FIRST))
    .catch(() => FIRST)
    .then((v) => (known = v));
  return asked;
}

export function useAtelierPublic(): AtelierPublic & { server: boolean } {
  const [value, setValue] = useState<AtelierPublic>(known ?? FIRST);
  useEffect(() => {
    if (!HAS_SERVER) return;
    let alive = true;
    void ask().then((v) => alive && setValue(v));
    return () => {
      alive = false;
    };
  }, []);
  return { ...value, server: HAS_SERVER };
}
