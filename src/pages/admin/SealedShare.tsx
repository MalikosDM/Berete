/*
 * « Lien de partage chiffré » (26/11/2026), in the 3D editor of the admin: a link to the model, valid for a chosen number of
 * days, with an optional password. The model is encrypted here, in the browser of the admin (src/lib/sealed.ts), before it
 * is sent: the server keeps only a ciphertext it cannot open (server/routes/shares.ts). Without a password, the key is in
 * the end of the link (#k=…), never sent to the server: it is kept on this device only, so that « Copier » still gives the
 * whole link later.
 */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Copy, LoaderCircle, LockKeyhole, Plus, Trash2 } from "lucide-react";
import type { ModelSettings } from "@/data/models";
import { canSeal, ITERATIONS, makeVerifier, newSalt, pack, passwordKey, randomKey, seal } from "@/lib/sealed";
import { adminCall, btn, btnMain, inputCls } from "./ui";

type Props = {
  /** The session of the admin. */
  token: string;
  model: { id: string; name: string; files: { full: string; light: string }; settings: ModelSettings; size?: [number, number, number] };
  /** Called with the error too (the admin logs out on "expired"); the message is shown here anyway. */
  onError?: (error: unknown) => void;
};

type ShareRow = { id: string; token: string; expiresAt: string; hasPassword: boolean; bytes: number; createdAt: string; ready: boolean };

const DAYS = [1, 3, 7, 14, 30] as const;
const MIN_PASSWORD = 6;
const KEY_STORE = "bj_sealed_key:";

function rememberKey(shareToken: string, fragment: string): void {
  try {
    window.localStorage.setItem(KEY_STORE + shareToken, fragment);
  } catch {
    // No storage (private window): the link is shown once, right after its creation.
  }
}

function keyOf(shareToken: string): string | null {
  try {
    return window.localStorage.getItem(KEY_STORE + shareToken);
  } catch {
    return null;
  }
}

function forgetKey(shareToken: string): void {
  try {
    window.localStorage.removeItem(KEY_STORE + shareToken);
  } catch {
    // Nothing kept.
  }
}

function weight(bytes: number): string {
  return (bytes / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " Mo";
}

function message(error: unknown): string {
  if (error instanceof Error && error.message === "expired") return "Session expirée, reconnectez-vous.";
  return error instanceof Error && error.message ? error.message : "Une erreur est survenue, réessayez.";
}

/** One file of the model, whole (its signed address, given by the admin). */
async function download(url: string): Promise<Uint8Array<ArrayBuffer>> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Le modèle n'a pas pu être lu, rechargez la page.");
  return new Uint8Array(await res.arrayBuffer());
}

/** Sends the ciphertext by pieces; a piece lost on the way is sent again from where the server stopped. */
async function upload(session: string, id: string, data: ArrayBuffer, chunk: number, onProgress: (percent: number) => void): Promise<void> {
  let offset = 0;
  let failures = 0;
  while (offset < data.byteLength) {
    const end = Math.min(offset + chunk, data.byteLength);
    const res = await fetch("/api/admin/shares/" + id + "/blob?offset=" + offset, {
      method: "PUT",
      headers: { Authorization: "Bearer " + session, "Content-Type": "application/octet-stream", Accept: "application/json" },
      body: new Uint8Array(data, offset, end - offset),
    }).catch(() => null);
    if (res?.status === 401) throw new Error("expired");
    const json = res ? ((await res.json().catch(() => ({}))) as { received?: number; error?: string }) : {};
    if (res?.ok && typeof json.received === "number") {
      offset = json.received;
      failures = 0;
      onProgress(Math.round((100 * offset) / data.byteLength));
      continue;
    }
    // The server already has more (or less) than we thought: start again from there.
    if (res?.status === 409 && typeof json.received === "number") {
      offset = json.received;
      continue;
    }
    failures += 1;
    if (failures >= 3 || (res && res.status !== 409 && res.status < 500)) throw new Error(json.error ?? "L'envoi a échoué, vérifiez la connexion et réessayez.");
    await new Promise((r) => setTimeout(r, 1000 * failures));
  }
}

export default function SealedShare({ token, model, onError }: Props) {
  const [days, setDays] = useState<number>(7);
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [items, setItems] = useState<ShareRow[] | null>(null);
  const [fresh, setFresh] = useState<{ id: string; link: string } | null>(null);
  const [copied, setCopied] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const fail = useCallback(
    (x: unknown) => {
      setError(message(x));
      onError?.(x);
    },
    [onError],
  );

  const list = useCallback(async () => ((await adminCall(token, "GET", "/api/admin/shares?model=" + encodeURIComponent(model.id))).items as ShareRow[]) ?? [], [token, model.id]);

  const refresh = async () => {
    try {
      setItems(await list());
      setNow(Date.now());
    } catch (x) {
      fail(x);
    }
  };

  useEffect(() => {
    let alive = true;
    list()
      .then((rows) => {
        if (!alive) return;
        setItems(rows);
        setNow(Date.now());
      })
      .catch((x: unknown) => alive && fail(x));
    return () => {
      alive = false;
    };
  }, [list, fail]);

  const linkOf = (share: ShareRow): string | null => {
    if (share.hasPassword) return origin + "/s/" + share.token;
    const key = keyOf(share.token);
    return key ? origin + "/s/" + share.token + "#k=" + key : null;
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setFresh(null);
    if (!canSeal()) {
      setError("Ce navigateur ne sait pas chiffrer (il faut une adresse en https).");
      return;
    }
    if (password && password.length < MIN_PASSWORD) {
      setError("Le mot de passe doit avoir au moins " + MIN_PASSWORD + " caractères.");
      return;
    }
    let created: { id: string; token: string; chunkBytes: number } | null = null;
    try {
      setStep("Lecture du modèle…");
      const [full, light] = await Promise.all([download(model.files.full), download(model.files.light)]);
      setStep("Chiffrement sur cet appareil…");
      const salt = password ? newSalt() : "";
      const sealedKey = password ? { key: await passwordKey(password, salt, ITERATIONS), fragment: "" } : await randomKey();
      const verifier = await makeVerifier(sealedKey.key);
      const { iv, data } = await seal(sealedKey.key, pack({ name: model.name, settings: model.settings, size: model.size ?? [0, 0, 0], full, light }));
      const res = await adminCall(token, "POST", "/api/admin/shares", {
        modelId: model.id,
        days,
        hasPassword: Boolean(password),
        salt,
        iv,
        iterations: password ? ITERATIONS : 0,
        verifier,
        bytes: data.byteLength,
      });
      created = { id: String(res.id), token: String(res.token), chunkBytes: Number(res.chunkBytes) || 8 * 1024 * 1024 };
      const id = created.id;
      setStep("Envoi : 0 %");
      await upload(token, id, data, created.chunkBytes, (p) => setStep("Envoi : " + p + " %"));
      await adminCall(token, "POST", "/api/admin/shares/" + id + "/complete");
      if (sealedKey.fragment) rememberKey(created.token, sealedKey.fragment);
      setFresh({ id, link: origin + "/s/" + created.token + (sealedKey.fragment ? "#k=" + sealedKey.fragment : "") });
      setPassword("");
      await refresh();
    } catch (x) {
      // A link half sent is removed at once.
      if (created) await adminCall(token, "DELETE", "/api/admin/shares/" + created.id).catch(() => undefined);
      fail(x);
    } finally {
      setStep(null);
    }
  };

  const copy = async (id: string, link: string) => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("Copiez le lien :", link);
    }
    setCopied(id);
    window.setTimeout(() => setCopied(""), 2000);
  };

  const remove = async (share: ShareRow) => {
    if (!window.confirm("Supprimer ce lien ? La personne qui l'a reçu ne pourra plus voir la pièce.")) return;
    try {
      await adminCall(token, "DELETE", "/api/admin/shares/" + share.id);
      forgetKey(share.token);
      if (fresh?.id === share.id) setFresh(null);
      await refresh();
    } catch (x) {
      fail(x);
    }
  };

  const busy = step !== null;
  return (
    <fieldset className="grid gap-5 border border-white/15 p-4 sm:p-5" data-sealed-share-admin>
      <legend className="px-2 text-base text-bone">Lien de partage chiffré</legend>
      <p className="text-base text-mist">
        La pièce est chiffrée sur cet appareil avant d'être envoyée : même le serveur ne peut pas l'ouvrir. Avec un mot de passe, donnez-le à part (par
        appel ou par message) ; sans mot de passe, la clé est dans le lien lui-même.
      </p>
      <form onSubmit={create} className="grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-end">
        <label className="block text-base text-bone">
          Durée
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={inputCls + " pe-10"} data-share-days>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d === 1 ? "1 jour" : d + " jours"}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-base text-bone">
          Mot de passe (facultatif)
          <input type="text" autoComplete="off" spellCheck={false} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} data-share-password-input />
        </label>
        <button type="submit" disabled={busy} className={btnMain} data-share-create>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />} Créer le lien
        </button>
      </form>
      {step ? (
        <p role="status" className="text-base text-bone" data-share-step>
          {step}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-base text-rose-light">
          {error}
        </p>
      ) : null}
      {fresh ? (
        <div className="grid gap-3 border border-rose-light/40 p-4" data-share-fresh>
          <p className="text-base text-white">Le lien est prêt. Copiez-le maintenant pour l'envoyer.</p>
          <p className="break-all text-base text-mist" data-share-link>
            {fresh.link}
          </p>
          <button type="button" className={btn + " justify-self-start"} onClick={() => void copy("fresh", fresh.link)}>
            {copied === "fresh" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />} {copied === "fresh" ? "Copié" : "Copier"}
          </button>
        </div>
      ) : null}
      {items && items.length > 0 ? (
        <ul className="border-t border-white/15">
          {items.map((share) => {
            const expired = new Date(share.expiresAt).getTime() <= now;
            const link = expired ? null : linkOf(share);
            const date = new Date(share.expiresAt).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
            return (
              <li key={share.id} className="flex flex-wrap items-center gap-3 border-b border-white/15 py-3" data-share-row={share.token}>
                <span className="min-w-0 flex-1 text-base">
                  <span className="block break-all text-white">{origin}/s/{share.token.slice(0, 10)}…</span>
                  <span className={"block " + (expired ? "text-rose-light" : "text-mist")}>
                    {(expired ? "Expiré le " : "Expire le ") + date}
                    {" · " + weight(share.bytes)}
                    {share.hasPassword ? (
                      <>
                        {" · "}
                        <LockKeyhole className="inline size-4 align-[-2px]" aria-hidden="true" /> avec mot de passe
                      </>
                    ) : null}
                  </span>
                  {!expired && !link ? <span className="block text-mist">La clé de ce lien est restée sur l'appareil qui l'a créé.</span> : null}
                </span>
                {link ? (
                  <button type="button" className={btn} onClick={() => void copy(share.id, link)}>
                    {copied === share.id ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />} {copied === share.id ? "Copié" : "Copier"}
                  </button>
                ) : null}
                <button type="button" className={btn} onClick={() => void remove(share)}>
                  <Trash2 className="size-4" aria-hidden="true" /> Supprimer
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </fieldset>
  );
}
