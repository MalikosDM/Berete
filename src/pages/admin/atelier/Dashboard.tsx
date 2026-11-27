import { useEffect, useState } from "react";
import { ArrowRight, MessageCircle, RefreshCw } from "lucide-react";
import { adminCall, btn } from "../ui";
import { ErrorLine, Loading, money, stepFr, Tag, useFail, when, type Go } from "./shared";

/*
 * The dashboard: what waits for Berete or for the client. Designs published that the client has not approved yet, quotations
 * sent and not yet accepted, the payments received, the balances due (the piece ready, something still to pay), the pieces
 * being made. Each line opens its project.
 */

type Row = {
  id: string;
  title: string;
  client: { id: string; name: string; accessEnabled: boolean; activated: boolean };
  awaitingApproval: boolean;
  latestVersion: number | null;
  quoteSent: number | null;
  quoteAccepted: number | null;
  remainingCents: number | null;
  depositPaid: boolean;
  lastPaymentAt: string | null;
  pendingPayments: number;
  orderAccepted: boolean;
  production: boolean;
  step: number;
  stepLabel: string | null;
  unread: number;
  currency: string;
  updatedAt: string;
};

type Data = { projects: Row[]; awaitingApproval: Row[]; quotesSent: Row[]; paymentsReceived: Row[]; balanceDue: Row[]; inProduction: Row[] };

const GROUPS: { key: "awaiting" | "quotes" | "payments" | "balance" | "production"; list: keyof Data; title: string; empty: string; line: (r: Row) => string }[] = [
  { key: "awaiting", list: "awaitingApproval", title: "Designs en attente de validation", empty: "Aucun design n'attend la validation d'un client.", line: (r) => "Version " + r.latestVersion + " publiée : le client ne l'a pas encore validée." },
  { key: "quotes", list: "quotesSent", title: "Devis envoyés", empty: "Aucun devis n'attend l'accord d'un client.", line: (r) => "Devis Q" + r.quoteSent + " envoyé : en attente de l'accord du client." },
  { key: "payments", list: "paymentsReceived", title: "Paiements reçus", empty: "Aucun paiement reçu pour l'instant.", line: (r) => "Dernier paiement le " + when(r.lastPaymentAt) + (r.remainingCents !== null ? " · reste " + money(r.remainingCents, r.currency) : "") },
  { key: "balance", list: "balanceDue", title: "Soldes dus", empty: "Aucun solde à réclamer.", line: (r) => "Pièce prête · reste à payer " + money(r.remainingCents ?? 0, r.currency) },
  { key: "production", list: "inProduction", title: "Fabrication en cours", empty: "Aucune pièce en fabrication.", line: (r) => "Étape : " + stepFr(r.step) },
];

export default function Dashboard({ token, onExpired, go }: { token: string; onExpired: () => void; go: Go }) {
  const [data, setData] = useState<Data | null>(null);
  const [round, setRound] = useState(0);
  const [err, fail] = useFail(onExpired);

  useEffect(() => {
    let alive = true;
    adminCall(token, "GET", "/api/admin/atelier/dashboard").then(
      (d) => alive && setData(d as unknown as Data),
      (x: unknown) => alive && fail(x),
    );
    return () => {
      alive = false;
    };
  }, [token, fail, round]);

  if (!data) return err ? <ErrorLine text={err} /> : <Loading />;

  const open = (r: Row) => go({ nav: "clients", clientId: r.client.id, projectId: r.id });
  const others = data.projects;

  return (
    <div className="grid gap-6" data-atelier-dashboard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-mist">{others.length === 0 ? "Aucun projet pour l'instant : créez-en un depuis la fiche d'un client (menu « Clients »)." : others.length + (others.length > 1 ? " projets en cours." : " projet en cours.")}</p>
        <button type="button" className={btn} onClick={() => setRound((n) => n + 1)}>
          <RefreshCw className="size-4" aria-hidden="true" /> Actualiser
        </button>
      </div>
      <ErrorLine text={err} />
      <div className="grid gap-5 lg:grid-cols-2">
        {GROUPS.map((g) => {
          const rows = data[g.list];
          return (
            <section key={g.key} className="grid content-start gap-4 border border-white/15 p-5" data-dash={g.key}>
              <h3 className="flex items-center justify-between gap-3 text-base text-white">
                <span className="title-caps t-sub tracking-[0.12em]">{g.title}</span>
                <Tag tone={rows.length > 0 ? "wait" : "neutral"}>{rows.length}</Tag>
              </h3>
              {rows.length === 0 ? (
                <p className="text-base text-mist">{g.empty}</p>
              ) : (
                <ul className="grid gap-2">
                  {rows.map((r) => (
                    <li key={r.id}>
                      <ProjectLine row={r} line={g.line(r)} onOpen={() => open(r)} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
        <section className="grid content-start gap-4 border border-white/15 p-5 lg:col-span-2" data-dash="all">
          <h3 className="title-caps t-sub tracking-[0.12em]">Tous les projets en cours</h3>
          {others.length === 0 ? (
            <p className="text-base text-mist">Rien pour l'instant.</p>
          ) : (
            <ul className="grid gap-2 lg:grid-cols-2">
              {others.map((r) => (
                <li key={r.id}>
                  <ProjectLine row={r} line={r.step >= 0 ? "Étape : " + stepFr(r.step) : r.latestVersion ? "Version " + r.latestVersion + " publiée" : "Aucune version publiée"} onOpen={() => open(r)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function ProjectLine({ row, line, onOpen }: { row: Row; line: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="flex min-h-12 w-full items-center justify-between gap-4 border border-white/10 px-4 py-3 text-left hover:border-rose-light" data-dash-project={row.id}>
      <span className="min-w-0">
        <span className="block text-base text-white">
          {row.title} <span className="text-mist">· {row.client.name}</span>
        </span>
        <span className="mt-1 block text-base text-bone">{line}</span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {row.unread > 0 ? (
          <span className="inline-flex items-center gap-1 text-base text-rose-light" title="Messages non lus">
            <MessageCircle className="size-4" aria-hidden="true" /> {row.unread}
          </span>
        ) : null}
        <ArrowRight className="size-4 text-rose-light" aria-hidden="true" />
      </span>
    </button>
  );
}
