import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Copy, KeyRound, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { BrandIconLink, adminCall, btn, btnMain, iconBtn, inputCls, type ModelSummary } from "./ui";

/*
 * Admin "Clients VIP": each client gets a private space on the site (/vip)
 * with the 3D pieces chosen for him. Share his personal link (one click, no
 * code) or his access code (to enter from any device).
 */

type ClientRow = { id: string; name: string; email: string | null; phone: string | null; token: string; lastSeenAt: string | null; createdAt: string; modelIds: string[] };
type Draft = { id?: string; name: string; email: string; phone: string; modelIds: string[] };

const EMPTY: Draft = { name: "", email: "", phone: "", modelIds: [] };

function linkOf(token: string): string {
  return (typeof window === "undefined" ? "" : window.location.origin) + "/vip/" + token;
}

function messageOf(name: string, token: string, code: string | null, lang: "fr" | "en"): string {
  const link = linkOf(token);
  if (lang === "en") return "Hello " + name + ", your pieces in 3D are ready in your private Berete space: " + link + (code ? " (access code: " + code + ")" : "");
  return "Bonjour " + name + ", vos pièces en 3D sont prêtes dans votre espace privé Berete : " + link + (code ? " (code d'accès : " + code + ")" : "");
}

async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    window.prompt("Copiez ce texte :", text);
  }
}

export default function Clients({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [shown, setShown] = useState<{ id: string; code: string } | null>(null);
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const fail = useCallback(
    (x: unknown) => {
      if (x instanceof Error && x.message === "expired") onExpired();
      else setErr(x instanceof Error ? x.message : "Une erreur est survenue.");
    },
    [onExpired],
  );

  const load = useCallback(async () => {
    try {
      const [c, m] = await Promise.all([adminCall(token, "GET", "/api/admin/clients"), adminCall(token, "GET", "/api/admin/models")]);
      setClients((c.items as ClientRow[]) ?? []);
      setModels(((m.items as ModelSummary[]) ?? []).filter((x) => x.status === "ready"));
    } catch (x) {
      fail(x);
    }
  }, [token, fail]);

  useEffect(() => {
    let alive = true;
    Promise.all([adminCall(token, "GET", "/api/admin/clients"), adminCall(token, "GET", "/api/admin/models")])
      .then(([c, m]) => {
        if (!alive) return;
        setClients((c.items as ClientRow[]) ?? []);
        setModels(((m.items as ModelSummary[]) ?? []).filter((x) => x.status === "ready"));
      })
      .catch((x: unknown) => alive && fail(x));
    return () => {
      alive = false;
    };
  }, [token, fail]);

  const flash = (key: string) => {
    setCopied(key);
    window.setTimeout(() => setCopied(""), 2000);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setErr("");
    try {
      const body = { name: draft.name, email: draft.email || null, phone: draft.phone || null, modelIds: draft.modelIds };
      if (draft.id) await adminCall(token, "PUT", "/api/admin/clients/" + draft.id, body);
      else {
        const made = await adminCall(token, "POST", "/api/admin/clients", body);
        setShown({ id: String(made.id), code: String(made.code) });
      }
      setDraft(null);
      await load();
    } catch (x) {
      fail(x);
    } finally {
      setBusy(false);
    }
  };

  const newCode = async (client: ClientRow) => {
    if (!window.confirm("Créer un nouveau code pour " + client.name + " ? L'ancien code ne marchera plus.")) return;
    try {
      const made = await adminCall(token, "POST", "/api/admin/clients/" + client.id + "/code");
      setShown({ id: client.id, code: String(made.code) });
    } catch (x) {
      fail(x);
    }
  };

  const remove = async (client: ClientRow) => {
    if (!window.confirm("Supprimer " + client.name + " ? Son espace et son lien ne marcheront plus.")) return;
    try {
      await adminCall(token, "DELETE", "/api/admin/clients/" + client.id);
      await load();
    } catch (x) {
      fail(x);
    }
  };

  if (draft) {
    const toggle = (id: string) => setDraft({ ...draft, modelIds: draft.modelIds.includes(id) ? draft.modelIds.filter((m) => m !== id) : [...draft.modelIds, id] });
    return (
      <form onSubmit={save} className="mt-8 grid gap-6 border border-rose-light/40 p-5 sm:p-8" data-client-form>
        <h2 className="title-caps text-2xl tracking-[0.12em]">{draft.id ? "Modifier le client" : "Ajouter un client"}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-base text-bone">
            Nom
            <input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} />
          </label>
          <label className="block text-base text-bone">
            E-mail
            <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className={inputCls} />
          </label>
          <label className="block text-base text-bone">
            Téléphone (WhatsApp)
            <input type="tel" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+971…" className={inputCls + " placeholder:text-mist/60"} />
          </label>
        </div>
        <fieldset>
          <legend className="text-base text-bone">Pièces visibles dans son espace</legend>
          {models.length === 0 ? <p className="mt-2 text-base text-mist">Envoyez d'abord un modèle dans l'onglet 3D.</p> : null}
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {models.map((m) => (
              <li key={m.id}>
                <label className="flex min-h-12 items-center gap-3 border border-white/10 px-3 text-base text-white">
                  <input type="checkbox" className="size-5" checked={draft.modelIds.includes(m.id)} onChange={() => toggle(m.id)} />
                  {m.preview?.poster ? <img src={m.preview.poster} alt="" className="size-10 object-cover" /> : null}
                  <span className="min-w-0 break-words">{m.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        {err ? <p role="alert" className="text-base text-rose-light">{err}</p> : null}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="submit" disabled={busy} className={btnMain}>
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />} Enregistrer
          </button>
          <button type="button" onClick={() => setDraft(null)} className={btn}>
            Annuler
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-8 grid gap-8" data-admin-clients>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base text-bone">Partagez ses pièces en 3D avec chaque client, dans son espace privé du site.</p>
        <button type="button" onClick={() => setDraft({ ...EMPTY })} className={btnMain} data-add-client>
          <Plus className="size-4" aria-hidden="true" /> Ajouter un client
        </button>
      </div>
      {err ? <p role="alert" className="text-base text-rose-light">{err}</p> : null}
      {clients === null ? (
        <p className="flex items-center gap-3 text-bone"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Chargement</p>
      ) : clients.length === 0 ? (
        <p className="border border-white/15 p-8 text-center text-bone">Aucun client pour l'instant.</p>
      ) : (
        <ul className="border-t border-white/15">
          {clients.map((c) => {
            const code = shown?.id === c.id ? shown.code : null;
            const pieces = models.filter((m) => c.modelIds.includes(m.id));
            return (
              <li key={c.id} className="grid gap-4 border-b border-white/15 py-5" data-client={c.name}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="break-words text-lg text-white">{c.name}</p>
                    <p className="text-base text-mist">
                      {[c.email, c.phone].filter(Boolean).join(" · ") || "Pas de contact"} · {pieces.length} {pieces.length > 1 ? "pièces" : "pièce"} · {c.lastSeenAt ? "vu le " + new Date(c.lastSeenAt).toLocaleDateString("fr-FR") : "jamais connecté"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" aria-label="Modifier le client" className={iconBtn} onClick={() => setDraft({ id: c.id, name: c.name, email: c.email ?? "", phone: c.phone ?? "", modelIds: c.modelIds })}>
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                    <button type="button" aria-label="Supprimer le client" className={iconBtn} onClick={() => void remove(c)}>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {code ? (
                  <div className="flex flex-wrap items-center gap-3 border border-rose-light/50 p-4" data-client-code>
                    <p className="text-base text-bone">
                      Code d'accès : <span className="font-semibold tracking-[0.2em] text-white">{code}</span> <span className="text-mist">(visible une seule fois : copiez-le maintenant)</span>
                    </p>
                    <button type="button" aria-label="Masquer le code" className={iconBtn} onClick={() => setShown(null)}>
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button type="button" className={btn} onClick={() => void copy(linkOf(c.token)).then(() => flash(c.id + "link"))} data-copy-client-link>
                    {copied === c.id + "link" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />} Copier le lien
                  </button>
                  <button type="button" className={btn} onClick={() => void copy(messageOf(c.name, c.token, code, "fr")).then(() => flash(c.id + "fr"))}>
                    {copied === c.id + "fr" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />} Copier le message (FR)
                  </button>
                  <button type="button" className={btn} onClick={() => void copy(messageOf(c.name, c.token, code, "en")).then(() => flash(c.id + "en"))}>
                    {copied === c.id + "en" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />} Copier le message (EN)
                  </button>
                  {c.phone ? <BrandIconLink href={"https://wa.me/" + c.phone.replace(/[^0-9]/g, "") + "?text=" + encodeURIComponent(messageOf(c.name, c.token, code, "fr"))} label="Envoyer sur WhatsApp" /> : null}
                  <button type="button" className={btn} onClick={() => void newCode(c)} data-new-code>
                    <KeyRound className="size-4" aria-hidden="true" /> Créer un nouveau code
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
