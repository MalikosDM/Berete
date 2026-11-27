import { useCallback, useState } from "react";
import Dashboard from "./Dashboard";
import ClientsView from "./ClientsView";
import ProjectPage from "./ProjectPage";
import SettingsView from "./SettingsView";
import Outbox from "./Outbox";
import AuditLog from "./AuditLog";
import type { Nav, Place } from "./shared";

/*
 * Admin « Private Atelier » (27/11/2026): the commissions of the clients, end to end. Its own small menu: the dashboard
 * (what waits), the clients (their invitation, their access, their projects), the settings (Yoni's commercial terms, the
 * switches, the keys), the e-mails sent, the journal of who did what. A project opens on its own page (versions of the
 * design, quotations, payments, order, making, journal of the atelier, messages, the client's view). The place is kept for
 * the visit (a reload comes back to the same project).
 */

const NAV: { key: Nav; label: string }[] = [
  { key: "dashboard", label: "Tableau de bord" },
  { key: "clients", label: "Clients" },
  { key: "settings", label: "Réglages" },
  { key: "outbox", label: "E-mails envoyés" },
  { key: "audit", label: "Journal des actions" },
];

const PLACE_KEY = "bj-atelier-place";
const START: Place = { nav: "dashboard", clientId: null, projectId: null };

function readPlace(): Place {
  try {
    const raw = JSON.parse(sessionStorage.getItem(PLACE_KEY) ?? "null") as Partial<Place> | null;
    if (!raw || !NAV.some((n) => n.key === raw.nav)) return START;
    return { nav: raw.nav as Nav, clientId: typeof raw.clientId === "string" ? raw.clientId : null, projectId: typeof raw.projectId === "string" ? raw.projectId : null };
  } catch {
    return START;
  }
}

function writePlace(p: Place): void {
  try {
    sessionStorage.setItem(PLACE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

export default function PrivateAtelier({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [place, setPlace] = useState<Place>(readPlace);

  const go = useCallback((next: Partial<Place>) => {
    setPlace((p) => {
      const nav = next.nav ?? p.nav;
      // Another part of the menu: no project or client open there unless given.
      const fresh = next.nav && next.nav !== p.nav;
      const value: Place = {
        nav,
        clientId: next.clientId !== undefined ? next.clientId : fresh ? null : p.clientId,
        projectId: next.projectId !== undefined ? next.projectId : fresh ? null : p.projectId,
      };
      writePlace(value);
      return value;
    });
    window.scrollTo({ top: 0 });
  }, []);

  const props = { token, onExpired, go };

  return (
    <div className="grid gap-8 [&>*]:min-w-0 [&_.grid>*]:min-w-0" data-private-atelier>
      <div>
        <h2 className="title-caps text-2xl tracking-[0.12em]">Private Atelier</h2>
        <p className="mt-2 max-w-3xl text-base text-mist">Les commandes sur mesure des clients, de la première version du design à la livraison.</p>
      </div>
      <nav aria-label="Private Atelier" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
        {NAV.map((n) => {
          const current = place.nav === n.key;
          return (
            <button
              key={n.key}
              type="button"
              aria-current={current ? "page" : undefined}
              onClick={() => go({ nav: n.key, clientId: null, projectId: null })}
              className={"min-h-12 shrink-0 border px-4 text-base whitespace-nowrap transition-colors " + (current ? "border-rose-light text-rose-light" : "border-white/20 text-bone hover:border-white/50 hover:text-white")}
              data-atelier-nav={n.key}
            >
              {n.label}
            </button>
          );
        })}
      </nav>

      {place.projectId ? (
        <ProjectPage key={place.projectId} id={place.projectId} {...props} />
      ) : place.nav === "dashboard" ? (
        <Dashboard {...props} />
      ) : place.nav === "clients" ? (
        <ClientsView key={place.clientId ?? "list"} clientId={place.clientId} {...props} />
      ) : place.nav === "settings" ? (
        <SettingsView {...props} />
      ) : place.nav === "outbox" ? (
        <Outbox {...props} />
      ) : (
        <AuditLog {...props} />
      )}
    </div>
  );
}
