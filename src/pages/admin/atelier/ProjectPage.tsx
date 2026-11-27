import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageCircle, RefreshCw } from "lucide-react";
import { adminCall, btn } from "../ui";
import ProjectSettings from "./ProjectSettings";
import Versions from "./Versions";
import Quotes from "./Quotes";
import Payments from "./Payments";
import Making from "./Making";
import Journal from "./Journal";
import Messages from "./Messages";
import Preview from "./Preview";
import { AuditList } from "./AuditLog";
import { Block, ErrorLine, Loading, stepFr, Tag, useFail, type AuditRow, type Go, type ProjectView } from "./shared";

/*
 * The page of a project, everything Berete needs in one place: who the client is and whether he can enter, the settings of
 * the project, the versions of the design (drafts, published and frozen, approvals, changes asked), the quotations (drafts,
 * sent as a frozen PDF, replaced), the payments and the amounts, the order, the ten steps of the making, the journal of the
 * atelier, the messages, the view of the client, the journal of the actions. Every action reads the project again.
 */

export type Section = { token: string; project: ProjectView; reload: () => Promise<void>; onExpired: () => void };

type Loaded = { project: ProjectView; audit: AuditRow[]; termsWritten: boolean };

const JUMPS = [
  ["reglages", "Réglages"],
  ["versions", "Versions"],
  ["devis", "Devis"],
  ["paiements", "Paiements"],
  ["commande", "Commande"],
  ["fabrication", "Fabrication"],
  ["journal", "Journal"],
  ["messages", "Messages"],
  ["apercu", "Aperçu client"],
  ["actions", "Actions"],
] as const;

export default function ProjectPage({ id, token, onExpired, go }: { id: string; token: string; onExpired: () => void; go: Go }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [err, fail] = useFail(onExpired);
  const [missing, setMissing] = useState(false);
  // The messages of the client not read when the page opened (shown as new, then marked read).
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const marked = useRef(false);

  const fetchIt = useCallback(async () => (await adminCall(token, "GET", "/api/admin/atelier/projects/" + id)) as unknown as Loaded, [token, id]);

  useEffect(() => {
    let alive = true;
    fetchIt().then(
      (d) => {
        if (!alive) return;
        setData(d);
        const unread = d.project.thread.filter((t) => t.type === "message" && t.author === "client" && !t.readAt).map((t) => t.id);
        if (unread.length > 0 && !marked.current) {
          marked.current = true;
          setUnreadIds(new Set(unread));
          void adminCall(token, "POST", "/api/admin/atelier/projects/" + id + "/read").catch(() => undefined);
        }
      },
      (x: unknown) => {
        if (!alive) return;
        if (x instanceof Error && x.message === "Projet introuvable.") setMissing(true);
        else fail(x);
      },
    );
    return () => {
      alive = false;
    };
  }, [fetchIt, fail, token, id]);

  // The bar of the parts stays under the bar of the admin (its height read, on a computer as on a phone).
  const [navTop, setNavTop] = useState(0);
  useEffect(() => {
    const header = document.querySelector("[data-admin] > header");
    if (!header) return undefined;
    const ro = new ResizeObserver(() => setNavTop(Math.round(header.getBoundingClientRect().height)));
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  const reload = useCallback(async () => {
    try {
      setData(await fetchIt());
    } catch (x) {
      fail(x);
    }
  }, [fetchIt, fail]);

  if (missing) {
    return (
      <div className="grid gap-4">
        <p className="text-base text-bone">Ce projet n'existe plus.</p>
        <button type="button" className={btn + " justify-self-start"} onClick={() => go({ projectId: null })}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Retour
        </button>
      </div>
    );
  }
  if (!data) return err ? <ErrorLine text={err} /> : <Loading label="Chargement du projet" />;

  const p = data.project;
  const section: Section = { token, project: p, reload, onExpired };
  const unread = unreadIds.size;
  const accessText = p.client.accessEnabled === false ? "Accès coupé" : p.client.activated ? "Accès actif" : "Invitation pas encore utilisée";

  return (
    <div className="grid gap-6" data-admin-project={p.id}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className={btn} onClick={() => go({ nav: "clients", clientId: p.client.id, projectId: null })}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Fiche de {p.client.name}
        </button>
        <button type="button" className={btn} onClick={() => void reload()}>
          <RefreshCw className="size-4" aria-hidden="true" /> Actualiser
        </button>
      </div>

      {/* Who, whether he can enter, where the piece is */}
      <header className="grid gap-4 border border-white/15 p-5 sm:p-7">
        <p className="eyebrow">Projet</p>
        <h3 className="font-display text-3xl text-white sm:text-4xl" data-project-title>
          {p.title}
        </h3>
        <div className="flex flex-wrap gap-2">
          <Tag>Client : {p.client.name}</Tag>
          <Tag tone={p.client.accessEnabled === false ? "wait" : p.client.activated ? "good" : "neutral"}>{accessText}</Tag>
          <Tag tone={p.step >= 0 ? "good" : "neutral"}>Étape : {stepFr(p.step)}</Tag>
          {unread > 0 ? (
            <a href="#messages" className="inline-flex min-h-8 items-center gap-1 border border-rose-light bg-rose-deep/30 px-2.5 text-base text-white">
              <MessageCircle className="size-4" aria-hidden="true" /> {unread} {unread > 1 ? "nouveaux messages" : "nouveau message"}
            </a>
          ) : null}
        </div>
        {p.client.email ? <p className="text-base text-mist">E-mail du client : {p.client.email}</p> : <p className="text-base text-rose-light">Ce client n'a pas d'e-mail : ajoutez-le sur sa fiche pour l'inviter et le prévenir.</p>}
      </header>

      <nav aria-label="Parties du projet" style={{ top: navTop }} className="no-scrollbar sticky z-30 -mx-5 flex gap-1 overflow-x-auto border-y border-white/10 bg-ink px-5 py-1 sm:mx-0 sm:px-2">
        {JUMPS.map(([anchor, label]) => (
          <a key={anchor} href={"#" + anchor} className="inline-flex min-h-12 shrink-0 items-center px-3 text-base whitespace-nowrap text-bone hover:text-rose-light">
            {label}
          </a>
        ))}
      </nav>

      <ErrorLine text={err} />

      <ProjectSettings {...section} />
      <Versions {...section} />
      <Quotes {...section} termsWritten={data.termsWritten} openSettings={() => go({ nav: "settings", clientId: null, projectId: null })} />
      <Payments {...section} />
      <Making {...section} />
      <Journal {...section} />
      <Messages {...section} unreadIds={unreadIds} />
      <Preview {...section} />
      <Block id="actions" title="Journal des actions" intro="Qui a fait quoi sur ce projet, et quand (Berete, le client, Stripe).">
        <AuditList rows={data.audit} />
      </Block>
    </div>
  );
}
