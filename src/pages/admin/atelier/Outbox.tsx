import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { adminCall, btn } from "../ui";
import { ErrorLine, Loading, Tag, useFail, when, type Go } from "./shared";

/*
 * The e-mails of The Private Atelier: every e-mail the site sent or wanted to send (invitations, codes, notices, receipts,
 * the team's alerts). Without a mailbox set on the server, they wait here: a link of invitation can be copied from them.
 * Once really sent, the links and codes they carried are hidden here (only the client's mailbox has them).
 */

type Mail = { id: string; to: string; subject: string; kind: string; sentAt: string | null; error: string | null; createdAt: string; text: string };

const KIND_FR: Record<string, string> = { invite: "Invitation", code: "Code de connexion", magic: "Lien de connexion", notice: "Avis au client", receipt: "Reçu de paiement", team: "Alerte pour la maison" };

export default function Outbox({ token, onExpired }: { token: string; onExpired: () => void; go: Go }) {
  const [data, setData] = useState<{ mailbox: boolean; items: Mail[] } | null>(null);
  const [round, setRound] = useState(0);
  const [err, fail] = useFail(onExpired);

  useEffect(() => {
    let alive = true;
    adminCall(token, "GET", "/api/admin/atelier/outbox").then(
      (d) => alive && setData(d as unknown as { mailbox: boolean; items: Mail[] }),
      (x: unknown) => alive && fail(x),
    );
    return () => {
      alive = false;
    };
  }, [token, fail, round]);

  if (!data) return err ? <ErrorLine text={err} /> : <Loading />;

  return (
    <section className="grid gap-5 border border-white/15 p-5 sm:p-7" data-outbox>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="title-caps t-sub tracking-[0.12em]">E-mails envoyés</h3>
          <p className="mt-2 max-w-3xl text-base text-mist">
            {data.mailbox
              ? "La boîte e-mail est réglée : les e-mails partent. Les liens et les codes qu'ils contiennent sont cachés ici."
              : "Aucune boîte e-mail n'est réglée sur le serveur : les e-mails ne partent pas, ils attendent ici. Copiez un lien d'invitation pour l'envoyer vous-même."}
          </p>
        </div>
        <button type="button" className={btn} onClick={() => setRound((n) => n + 1)}>
          <RefreshCw className="size-4" aria-hidden="true" /> Actualiser
        </button>
      </div>
      {data.items.length === 0 ? <p className="text-base text-mist">Aucun e-mail pour l'instant.</p> : null}
      <ul className="grid gap-3">
        {data.items.map((m) => (
          <li key={m.id} className="border border-white/10" data-mail={m.kind}>
            <details className="group">
              <summary className="flex min-h-12 cursor-pointer list-none flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0 text-base">
                  <span className="block text-white">{m.subject}</span>
                  <span className="mt-1 block break-all text-mist">
                    À {m.to} · {KIND_FR[m.kind] ?? m.kind} · {when(m.createdAt)}
                  </span>
                </span>
                <span className="shrink-0">{m.sentAt ? <Tag tone="good">Envoyé le {when(m.sentAt)}</Tag> : m.error ? <Tag tone="wait">Échec</Tag> : <Tag>En attente (pas de boîte e-mail)</Tag>}</span>
              </summary>
              <div className="grid gap-2 border-t border-white/10 p-4">
                {m.error ? <p className="text-base text-rose-light">Erreur : {m.error}</p> : null}
                <pre className="overflow-x-auto font-sans text-base break-words whitespace-pre-wrap text-bone">{m.text}</pre>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
