import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { adminCall, btn } from "../ui";
import { ACTION_FR, actorFr, ErrorLine, Loading, useFail, when, type AuditRow, type Go } from "./shared";

/*
 * The journal of the actions: who did what, when, from which address (Berete in the admin, the client in his space, Stripe).
 * The whole house here (the 200 last), a project on its own page.
 */

/** What an action's details say, in a few words (never a secret: the server keeps none there). */
function detailOf(row: AuditRow): string {
  const d = row.data ?? {};
  const parts: string[] = [];
  if (typeof d.version === "number") parts.push("version " + d.version);
  if (typeof d.quote === "number") parts.push("devis Q" + d.quote);
  if (typeof d.title === "string") parts.push("« " + d.title + " »");
  if (typeof d.days === "number") parts.push(d.days + " jours");
  if (typeof d.step === "number") parts.push("étape " + (d.step + 1));
  if (typeof d.what === "string") parts.push("« " + d.what + " »");
  if (typeof d.sha256 === "string") parts.push("empreinte " + d.sha256.slice(0, 12) + "…");
  if (row.action === "settings" && d.terms === true) parts.push("conditions commerciales modifiées");
  return parts.join(" · ");
}

export function AuditList({ rows, opener }: { rows: AuditRow[]; opener?: (target: string) => (() => void) | null }) {
  if (rows.length === 0) return <p className="text-base text-mist">Aucune action pour l'instant.</p>;
  return (
    <ul className="grid gap-2" data-audit>
      {rows.map((r) => {
        const open = opener && r.target ? opener(r.target) : null;
        return (
        <li key={r.id} className="grid gap-1 border-b border-white/10 pb-2 text-base sm:grid-cols-[13rem_1fr]" data-audit-row={r.action}>
          <span className="text-mist">{when(r.createdAt)}</span>
          <span className="min-w-0">
            <span className="text-white">{ACTION_FR[r.action] ?? r.action}</span>
            <span className="text-bone"> · {actorFr(r.actor)}</span>
            {detailOf(r) ? <span className="text-bone"> · {detailOf(r)}</span> : null}
            {r.ip ? <span className="text-mist"> · IP {r.ip}</span> : null}
            {open ? (
              <button type="button" className="ms-1 inline-flex min-h-11 items-center px-2 align-middle text-rose-light underline underline-offset-4" onClick={open}>
                ouvrir
              </button>
            ) : null}
          </span>
        </li>
        );
      })}
    </ul>
  );
}

export default function AuditLog({ token, onExpired, go }: { token: string; onExpired: () => void; go: Go }) {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [projects, setProjects] = useState<Map<string, string>>(new Map());
  const [clients, setClients] = useState<Set<string>>(new Set());
  const [round, setRound] = useState(0);
  const [err, fail] = useFail(onExpired);

  useEffect(() => {
    let alive = true;
    Promise.all([adminCall(token, "GET", "/api/admin/atelier/audit"), adminCall(token, "GET", "/api/admin/atelier/projects"), adminCall(token, "GET", "/api/admin/clients")]).then(
      ([a, p, c]) => {
        if (!alive) return;
        setRows((a.items as AuditRow[]) ?? []);
        setProjects(new Map(((p.items as { id: string; client: { id: string } }[]) ?? []).map((x) => [x.id, x.client.id])));
        setClients(new Set(((c.items as { id: string }[]) ?? []).map((x) => x.id)));
      },
      (x: unknown) => alive && fail(x),
    );
    return () => {
      alive = false;
    };
  }, [token, fail, round]);

  if (!rows) return err ? <ErrorLine text={err} /> : <Loading />;

  // The target of an action is a project or a client: « ouvrir » leads there.
  const opener = (target: string) => {
    const client = projects.get(target);
    if (client) return () => go({ nav: "clients", clientId: client, projectId: target });
    if (clients.has(target)) return () => go({ nav: "clients", clientId: target, projectId: null });
    return null;
  };

  return (
    <section className="grid gap-5 border border-white/15 p-5 sm:p-7" data-atelier-audit>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="title-caps t-sub tracking-[0.12em]">Journal des actions</h3>
          <p className="mt-2 text-base text-mist">Les 200 dernières actions : Berete dans l'administration, les clients dans leur espace, Stripe.</p>
        </div>
        <button type="button" className={btn} onClick={() => setRound((n) => n + 1)}>
          <RefreshCw className="size-4" aria-hidden="true" /> Actualiser
        </button>
      </div>
      <AuditList rows={rows} opener={opener} />
    </section>
  );
}
