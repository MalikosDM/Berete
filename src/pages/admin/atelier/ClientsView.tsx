import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, Lock, LogOut, Mail, Pencil, Plus, Unlock, X } from "lucide-react";
import { adminCall, BrandIconLink, btn, btnMain, inputCls } from "../ui";
import { Block, centsToText, CopyButton, dayShort, deviceOf, ErrorLine, FEE_METHODS, labelCls, Loading, LOGIN_FR, stepFr, Tag, toCents, today, useFail, when, type ClientRow, type Go } from "./shared";

/*
 * The clients of The Private Atelier: the list, a new client (name, e-mail, phone), and the page of one client: his personal
 * invitation (a link used once, that expires; sent by e-mail when a mailbox is set, else waiting in « E-mails envoyés » and
 * to copy), his access (cut: every device signed out at once), his devices, his sign-ins, his invitations, his projects and
 * a new project (title, currency, the design fee already paid: its amount, day and means).
 */

type Props = { token: string; onExpired: () => void; go: Go };

export default function ClientsView({ clientId, ...props }: Props & { clientId: string | null }) {
  return clientId ? <ClientPage clientId={clientId} {...props} /> : <ClientList {...props} />;
}

/* ---------- The list ---------- */

function ClientList({ token, onExpired, go }: Props) {
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [err, fail, setErr] = useFail(onExpired);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  useEffect(() => {
    let alive = true;
    adminCall(token, "GET", "/api/admin/clients").then(
      (r) => alive && setClients((r.items as ClientRow[]) ?? []),
      (x: unknown) => alive && fail(x),
    );
    return () => {
      alive = false;
    };
  }, [token, fail]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setErr("Indiquez le nom du client.");
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setErr("Cet e-mail ne semble pas valide.");
    setBusy(true);
    setErr("");
    try {
      const r = await adminCall(token, "POST", "/api/admin/clients", { name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null, modelIds: [] });
      go({ nav: "clients", clientId: String(r.id), projectId: null });
    } catch (x) {
      fail(x);
    } finally {
      setBusy(false);
    }
  };

  if (!clients) return err ? <ErrorLine text={err} /> : <Loading />;

  return (
    <div className="grid gap-6" data-atelier-clients>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-mist">{clients.length === 0 ? "Aucun client pour l'instant." : clients.length + (clients.length > 1 ? " clients." : " client.") + " Ouvrez une fiche pour inviter le client et suivre ses projets."}</p>
      </div>

      <form onSubmit={create} className="grid gap-4 border border-white/15 p-5 sm:p-7" data-new-client>
          <h3 className="title-caps t-sub tracking-[0.12em]">Nouveau client</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <label className={labelCls}>
              Nom
              <input name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} autoComplete="off" required />
            </label>
            <label className={labelCls}>
              E-mail (pour l'invitation)
              <input name="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} autoComplete="off" />
            </label>
            <label className={labelCls}>
              Téléphone (facultatif)
              <input name="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} autoComplete="off" placeholder="+971…" />
            </label>
          </div>
          <ErrorLine text={err} />
          <button type="submit" className={btnMain + " justify-self-start"} disabled={busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />} Créer le client
          </button>
        </form>

      {clients.length > 0 ? (
        <ul className="grid gap-2">
          {clients.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => go({ nav: "clients", clientId: c.id, projectId: null })} className="flex min-h-12 w-full items-center justify-between gap-4 border border-white/15 px-4 py-3 text-left hover:border-rose-light" data-atelier-client={c.id}>
                <span className="min-w-0">
                  <span className="block text-base text-white">{c.name}</span>
                  <span className="mt-1 block truncate text-base text-mist">{[c.email, c.phone].filter(Boolean).join(" · ") || "Ni e-mail ni téléphone"}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-rose-light" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* ---------- One client ---------- */

type Security = {
  client: { id: string; name: string; email: string | null; accessEnabled: boolean; activated: boolean; activatedAt: string | null; twoFactor: string };
  sessions: { id: string; ip: string; userAgent: string; createdAt: string; lastSeenAt: string; expiresAt: string; revokedAt: string | null; alive: boolean }[];
  logins: { event: string; email: string; ip: string; userAgent: string; at: string }[];
  invites: { id: string; createdAt: string; expiresAt: string; usedAt: string | null }[];
};

type ProjectRow = { id: string; title: string; step: number; archived: boolean; createdAt: string };

const TWO_FACTOR_FR: Record<string, string> = { off: "aucune", email: "code par e-mail", totp: "application d'authentification" };

function ClientPage({ clientId, token, onExpired, go }: Props & { clientId: string }) {
  const [row, setRow] = useState<ClientRow | null>(null);
  const [sec, setSec] = useState<Security | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [inviteDays, setInviteDays] = useState(7);
  const [invite, setInvite] = useState<{ link: string; days: number; mailbox: boolean; email: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ name: "", email: "", phone: "" });
  const [busy, setBusy] = useState("");
  const [err, fail, setErr] = useFail(onExpired);
  const [missing, setMissing] = useState(false);
  const [loadedAt, setLoadedAt] = useState(0);

  const fetchAll = useCallback(async () => {
    const [list, security, proj] = await Promise.all([
      adminCall(token, "GET", "/api/admin/clients"),
      adminCall(token, "GET", "/api/admin/atelier/clients/" + clientId + "/security"),
      adminCall(token, "GET", "/api/admin/atelier/projects?clientId=" + encodeURIComponent(clientId)),
    ]);
    return { client: ((list.items as ClientRow[]) ?? []).find((c) => c.id === clientId) ?? null, security: security as unknown as Security, projects: (proj.items as ProjectRow[]) ?? [] };
  }, [token, clientId]);

  const show = useCallback((d: Awaited<ReturnType<typeof fetchAll>>) => {
    setLoadedAt(Date.now());
    setRow(d.client);
    setSec(d.security);
    setProjects(d.projects);
  }, []);

  useEffect(() => {
    let alive = true;
    fetchAll().then(
      (d) => alive && show(d),
      (x: unknown) => {
        if (!alive) return;
        if (x instanceof Error && x.message === "Client introuvable.") setMissing(true);
        else fail(x);
      },
    );
    adminCall(token, "GET", "/api/admin/atelier/settings").then(
      (s) => alive && setInviteDays(Number((s.settings as { inviteDays?: number } | undefined)?.inviteDays) || 7),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [fetchAll, show, fail, token]);

  const reload = async () => show(await fetchAll());

  const act = async (key: string, run: () => Promise<void>) => {
    setBusy(key);
    setErr("");
    try {
      await run();
      await reload();
    } catch (x) {
      fail(x);
    } finally {
      setBusy("");
    }
  };

  if (missing) {
    return (
      <div className="grid gap-4">
        <p className="text-base text-bone">Ce client n'existe plus.</p>
        <button type="button" className={btn + " justify-self-start"} onClick={() => go({ nav: "clients", clientId: null })}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Tous les clients
        </button>
      </div>
    );
  }
  if (!sec) return err ? <ErrorLine text={err} /> : <Loading />;

  const c = sec.client;
  const email = c.email ?? row?.email ?? null;

  const sendInvite = () =>
    act("invite", async () => {
      const r = await adminCall(token, "POST", "/api/admin/atelier/clients/" + clientId + "/invite", { days: inviteDays });
      setInvite({ link: String(r.link), days: Number(r.days), mailbox: Boolean(r.mailbox), email: email ?? "" });
    });

  const toggleAccess = () => {
    const cut = c.accessEnabled;
    const ok = window.confirm(cut ? "Couper l'accès de " + c.name + " ? Tous ses appareils seront déconnectés tout de suite et ses invitations ne marcheront plus." : "Rendre l'accès à " + c.name + " ? Il pourra de nouveau se connecter à son Private Atelier.");
    if (!ok) return;
    void act("access", async () => {
      await adminCall(token, "PUT", "/api/admin/atelier/clients/" + clientId + "/access", { enabled: !cut });
      if (cut) setInvite(null);
    });
  };

  const saveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!edit.name.trim()) return setErr("Indiquez le nom du client.");
    void act("edit", async () => {
      await adminCall(token, "PUT", "/api/admin/clients/" + clientId, { name: edit.name.trim(), email: edit.email.trim() || null, phone: edit.phone.trim() || null, modelIds: row?.modelIds ?? [] });
      setEditing(false);
    });
  };

  const accessLine = !c.accessEnabled ? "Accès coupé" : c.activated ? "Accès actif (compte créé le " + when(c.activatedAt) + ")" : "Pas encore de compte : envoyez-lui l'invitation";
  const aliveSessions = sec.sessions.filter((s) => s.alive);
  const waText = invite ? "Hello " + c.name + ", here is your personal invitation to The Private Atelier by BERETE: " + invite.link + " (valid " + invite.days + " days, for you only)." : "";
  const phoneDigits = (row?.phone ?? "").replace(/[^\d]/g, "");

  return (
    <div className="grid gap-6" data-atelier-client-page={clientId}>
      <button type="button" className={btn + " justify-self-start"} onClick={() => go({ nav: "clients", clientId: null })}>
        <ArrowLeft className="size-4" aria-hidden="true" /> Tous les clients
      </button>

      {/* The client himself (the same mark as his line in the list: right after « Créer le client », his page is open). */}
      <section className="grid gap-4 border border-white/15 p-4 sm:p-7" data-atelier-client={clientId}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-3xl text-white">{c.name}</h3>
            <p className="mt-2 text-base text-bone">{[email, row?.phone].filter(Boolean).join(" · ") || "Ni e-mail ni téléphone"}</p>
          </div>
          <Tag tone={!c.accessEnabled ? "wait" : c.activated ? "good" : "neutral"}>{accessLine}</Tag>
        </div>
        <p className="text-base text-mist">Double vérification à la connexion : {TWO_FACTOR_FR[c.twoFactor] ?? c.twoFactor}.</p>
        {editing ? (
          <form onSubmit={saveEdit} className="grid gap-4 border-t border-white/10 pt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <label className={labelCls}>
                Nom
                <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={inputCls} required />
              </label>
              <label className={labelCls}>
                E-mail
                <input type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} className={inputCls} />
              </label>
              <label className={labelCls}>
                Téléphone
                <input type="tel" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} className={inputCls} />
              </label>
            </div>
            {c.activated ? <p className="text-base text-mist">Son compte est déjà créé : il se connecte avec l'e-mail de son invitation, que ce changement ne modifie pas.</p> : null}
            <div className="flex flex-wrap gap-3">
              <button type="submit" className={btnMain} disabled={busy === "edit"}>
                <Check className="size-4" aria-hidden="true" /> Enregistrer
              </button>
              <button type="button" className={btn} onClick={() => setEditing(false)}>
                <X className="size-4" aria-hidden="true" /> Annuler
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className={btn + " justify-self-start"}
            onClick={() => {
              setEdit({ name: row?.name ?? c.name, email: row?.email ?? "", phone: row?.phone ?? "" });
              setEditing(true);
            }}
            disabled={!row}
          >
            <Pencil className="size-4" aria-hidden="true" /> Modifier le nom, l'e-mail ou le téléphone
          </button>
        )}
      </section>

      <ErrorLine text={err} />

      {/* The invitation and the access */}
      <Block title="Invitation et accès" intro="L'invitation est un lien personnel, valable une seule fois et pendant quelques jours : le client y choisit son mot de passe. Une nouvelle invitation annule les précédentes.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className={labelCls + " sm:w-56"}>
            Valable pendant
            <select value={inviteDays} onChange={(e) => setInviteDays(Number(e.target.value))} className={inputCls}>
              {[...new Set([1, 3, 7, 14, 30, inviteDays])].sort((a, b) => a - b).map((d) => (
                <option key={d} value={d}>
                  {d} {d > 1 ? "jours" : "jour"}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={btnMain} onClick={sendInvite} disabled={busy === "invite" || !c.accessEnabled} data-invite>
            {busy === "invite" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Mail className="size-4" aria-hidden="true" />} Envoyer l'invitation
          </button>
          <button type="button" className={btn} onClick={toggleAccess} disabled={busy === "access"} data-access-toggle={c.accessEnabled ? "cut" : "restore"}>
            {c.accessEnabled ? <Lock className="size-4" aria-hidden="true" /> : <Unlock className="size-4" aria-hidden="true" />} {c.accessEnabled ? "Couper l'accès" : "Rendre l'accès"}
          </button>
        </div>
        {!email ? <p className="text-base text-rose-light">Indiquez d'abord l'e-mail du client (« Modifier » ci-dessus) : l'invitation part à cette adresse.</p> : null}
        {!c.accessEnabled ? <p className="text-base text-rose-light">L'accès est coupé : rendez-le avant d'envoyer une invitation.</p> : null}
        {invite ? (
          <div className="grid gap-3 border border-rose-light/40 p-4" role="status">
            <p className="text-base text-white">{invite.mailbox ? "Invitation envoyée par e-mail à " + invite.email + "." : "Invitation créée. Aucune boîte e-mail n'est réglée : l'e-mail attend dans « E-mails envoyés ». Copiez le lien et envoyez-le vous-même au client."}</p>
            <a href={invite.link} target="_blank" rel="noreferrer" className="block text-base break-all text-rose-light underline underline-offset-4" data-invite-link>
              {invite.link}
            </a>
            <p className="text-base text-mist">Valable {invite.days} jours, une seule fois. Ne le transmettez qu'au client.</p>
            <div className="flex flex-wrap gap-3">
              <CopyButton text={invite.link} label="Copier le lien" />
              <BrandIconLink href={"https://wa.me/" + phoneDigits + "?text=" + encodeURIComponent(waText)} label="Envoyer par WhatsApp" />
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 border-t border-white/10 pt-5">
          <h4 className="text-base text-white">Invitations</h4>
          {sec.invites.length === 0 ? (
            <p className="text-base text-mist">Aucune invitation envoyée.</p>
          ) : (
            <ul className="grid gap-1 text-base text-bone">
              {sec.invites.map((i) => {
                const state = i.usedAt ? "utilisée le " + when(i.usedAt) : new Date(i.expiresAt).getTime() < loadedAt ? "expirée ou remplacée" : "valable jusqu'au " + when(i.expiresAt);
                return (
                  <li key={i.id} data-admin-invite>
                    Envoyée le {when(i.createdAt)} · {state}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Block>

      {/* His devices */}
      <Block title="Ses appareils connectés" intro="Chaque appareil où le client s'est connecté. Déconnectez celui que vous ne reconnaissez pas.">
        {aliveSessions.length === 0 ? <p className="text-base text-mist">Aucun appareil connecté.</p> : null}
        <ul className="grid gap-2">
          {sec.sessions.map((s) => (
            <li key={s.id} className={"flex flex-col gap-3 border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between " + (s.alive ? "" : "opacity-60")} data-admin-session={s.id}>
              <span className="min-w-0 text-base">
                <span className="block text-white">{deviceOf(s.userAgent)}</span>
                <span className="mt-1 block text-mist">
                  Adresse IP {s.ip || "inconnue"} · connecté le {when(s.createdAt)} · vu le {when(s.lastSeenAt)}
                </span>
                {!s.alive ? <span className="mt-1 block text-bone">{s.revokedAt ? "Déconnecté le " + when(s.revokedAt) : "Session expirée"}</span> : null}
              </span>
              {s.alive ? (
                <button type="button" className={btn} disabled={busy === "s" + s.id} onClick={() => void act("s" + s.id, async () => void (await adminCall(token, "DELETE", "/api/admin/atelier/clients/" + clientId + "/sessions/" + s.id)))} data-admin-session-revoke>
                  <LogOut className="size-4" aria-hidden="true" /> Déconnecter
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </Block>

      {/* His sign-ins */}
      <Block title="Journal des connexions">
        {sec.logins.length === 0 ? (
          <p className="text-base text-mist">Aucune connexion pour l'instant.</p>
        ) : (
          <ul className="grid gap-2" data-admin-logins>
            {sec.logins.map((l, i) => (
              <li key={i} className="border-b border-white/10 pb-2 text-base">
                <span className={l.event.includes("failed") || l.event.includes("paused") ? "text-rose-light" : "text-white"}>{LOGIN_FR[l.event] ?? l.event}</span>
                <span className="text-mist">
                  {" "}
                  · {when(l.at)} · {deviceOf(l.userAgent)} · IP {l.ip || "inconnue"}
                  {l.email ? " · " + l.email : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Block>

      {/* His projects */}
      <Block title="Ses projets">
        {projects.length === 0 ? <p className="text-base text-mist">Aucun projet pour l'instant.</p> : null}
        <ul className="grid gap-2">
          {projects.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => go({ nav: "clients", clientId, projectId: p.id })} className="flex min-h-12 w-full items-center justify-between gap-4 border border-white/15 px-4 py-3 text-left hover:border-rose-light" data-atelier-project={p.id}>
                <span className="min-w-0">
                  <span className="block text-base text-white">{p.title}</span>
                  <span className="mt-1 block text-base text-mist">
                    {p.archived ? "Archivé · " : ""}
                    {p.step >= 0 ? "Étape : " + stepFr(p.step) : "Créé le " + dayShort(p.createdAt)}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-rose-light" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <NewProject token={token} clientId={clientId} onCreated={(id) => go({ nav: "clients", clientId, projectId: id })} fail={fail} />
      </Block>
    </div>
  );
}

/* ---------- A new project ---------- */

const CURRENCIES = [
  { code: "EUR", name: "Euro (€)" },
  { code: "USD", name: "Dollar américain ($)" },
  { code: "AED", name: "Dirham (AED)" },
  { code: "GBP", name: "Livre sterling (£)" },
  { code: "CHF", name: "Franc suisse (CHF)" },
];

function NewProject({ token, clientId, onCreated, fail }: { token: string; clientId: string; onCreated: (id: string) => void; fail: (x: unknown) => void }) {
  const [f, setF] = useState({ title: "", currency: "EUR", designFee: centsToText(100_000), paidAt: today(), method: "Virement bancaire" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    const cents = toCents(f.designFee);
    if (!f.title.trim()) return setErr("Donnez un titre au projet (par exemple : « Bague de fiançailles »).");
    if (cents === null) return setErr("Le montant des frais de design n'est pas un nombre (exemple : 1000 ou 1000,50).");
    setBusy(true);
    try {
      const r = await adminCall(token, "POST", "/api/admin/atelier/projects", { clientId, title: f.title.trim(), currency: f.currency, designFeeCents: cents, designFeePaidAt: cents > 0 && f.paidAt ? f.paidAt : null, designFeeMethod: cents > 0 ? f.method.trim() : "" });
      onCreated(String(r.id));
    } catch (x) {
      fail(x);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 border-t border-white/10 pt-5" data-new-project>
      <h4 className="text-base text-white">Nouveau projet pour ce client</h4>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelCls}>
          Titre du projet
          <input name="title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputCls} placeholder="Bague de fiançailles" required />
        </label>
        <label className={labelCls}>
          Devise
          <select name="currency" value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} className={inputCls}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className={labelCls}>
          Frais de design déjà payés ({f.currency})
          <input name="designFee" inputMode="decimal" value={f.designFee} onChange={(e) => setF({ ...f, designFee: e.target.value })} className={inputCls} />
          <span className="mt-1 block text-base text-mist">Ils comptent dans l'acompte du client. 0 s'il n'a rien payé.</span>
        </label>
        <label className={labelCls}>
          Payés le
          <input name="designFeePaidAt" type="date" value={f.paidAt} onChange={(e) => setF({ ...f, paidAt: e.target.value })} className={inputCls + " [color-scheme:dark]"} />
        </label>
        <label className={labelCls}>
          Moyen de paiement
          <input name="designFeeMethod" list="atelier-fee-methods" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} className={inputCls} />
          <datalist id="atelier-fee-methods">
            {FEE_METHODS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>
      </div>
      <ErrorLine text={err} />
      <button type="submit" className={btnMain + " justify-self-start"} disabled={busy}>
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />} Créer le projet
      </button>
    </form>
  );
}

