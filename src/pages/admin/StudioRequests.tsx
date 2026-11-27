/*
 * Admin « AI Studio » (Phase 2, 27/11/2026): the requests sent from the AI Creation Studio (/create) with their concepts and
 * their photos of inspiration, one click to make the client and his project (Clients VIP, The Private Atelier); the images
 * made and their cost (an estimate) today, this month, since the start. The switch of the studio and its limits live in
 * « Private Atelier » → Réglages. API: server/routes/studio.ts (/api/studio/admin/...).
 */
import { useCallback, useEffect, useState } from "react";
import { Archive, Check, ExternalLink, LoaderCircle, Mail, Phone, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { adminCall, btn, btnMain, inputCls } from "./ui";

type Concept = { id: string; url: string; prompt: string; variant: string; kept: boolean; costCents: number; model: string; createdAt: string; studioId: string };
type Reference = { id: string; name: string; mime: string; size: number; url: string };
type Request = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  language: string;
  status: string;
  createdAt: string;
  studio: { id: string; email: string | null; createdAt: string; concepts: number; cents: number };
  concepts: Concept[];
  references: Reference[];
  client: { id: string; name: string } | null;
  project: { id: string; title: string } | null;
};
type Overview = {
  settings: { open: boolean; key: boolean; perVisitorDaily: number; dailyTotal: number; quality: string; centsPerImage: number };
  usage: { today: { count: number; cents: number }; month: { count: number; cents: number }; all: { count: number; cents: number }; last24h: number; studios: number };
  requests: Request[];
  generations: Concept[];
};

const usd = (cents: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD" }).format(cents / 100);
const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dubai" });

const VARIANT_FR: Record<string, string> = {
  yellow: "or jaune",
  white: "or blanc",
  rose: "or rose",
  bolder: "plus affirmé",
  finer: "plus fin",
  geometric: "plus géométrique",
  organic: "plus organique",
  another: "autre interprétation",
  photos: "d'après ses photos",
  "piece:pendant": "pendentif",
  "piece:ring": "bague",
  "piece:chain": "chaîne",
  "piece:bracelet": "bracelet",
};
const variantFr = (v: string) =>
  v
    .split(",")
    .filter(Boolean)
    .map((p) => VARIANT_FR[p] ?? p)
    .join(" · ");

const STATUS_FR: Record<string, string> = { new: "Nouvelle", read: "Lue", archived: "Archivée", project: "Client et projet créés" };

/** The title proposed for the project: the idea of the first concept, else the first line of the message. */
function proposedTitle(r: Request): string {
  const raw = (r.concepts[0]?.prompt || r.message.split("\n")[0] || "").trim();
  if (!raw) return "Création sur mesure — " + r.name;
  const short = raw.length > 80 ? raw.slice(0, 78).replace(/\s+\S*$/, "") + "…" : raw;
  return short.charAt(0).toUpperCase() + short.slice(1);
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-white/15 p-4">
      <p className="text-base text-mist">{label}</p>
      <p className="mt-1 text-2xl text-white">{value}</p>
      {sub ? <p className="mt-1 text-base text-mist">{sub}</p> : null}
    </div>
  );
}

function RequestCard({ r, token, onChanged, fail }: { r: Request; token: string; onChanged: () => void; fail: (x: unknown) => void }) {
  const [title, setTitle] = useState(() => proposedTitle(r));
  const [busy, setBusy] = useState("");
  const [made, setMade] = useState<{ title: string; code: string } | null>(null);

  const act = async (what: string, run: () => Promise<unknown>) => {
    setBusy(what);
    try {
      await run();
      onChanged();
    } catch (x) {
      fail(x);
    } finally {
      setBusy("");
    }
  };

  const makeClient = () =>
    act("client", async () => {
      const res = await adminCall(token, "POST", "/api/studio/admin/requests/" + r.id + "/client", { title: title.trim() || undefined });
      setMade({ title: String(res.title ?? title), code: String(res.code ?? "") });
    });

  return (
    <article data-studio-request={r.id} className={"grid gap-5 border p-5 sm:p-6 " + (r.status === "new" ? "border-rose-light/50" : "border-white/15")}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl text-white">{r.name}</h3>
          <p className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-base text-bone">
            <a href={"mailto:" + r.email} className="inline-flex items-center gap-1.5 hover:text-rose-light">
              <Mail className="size-4" aria-hidden="true" /> {r.email}
            </a>
            {r.phone ? (
              <a href={"tel:" + r.phone.replace(/\s/g, "")} className="inline-flex items-center gap-1.5 hover:text-rose-light">
                <Phone className="size-4" aria-hidden="true" /> {r.phone}
              </a>
            ) : null}
          </p>
          <p className="mt-1 text-base text-mist">
            {when(r.createdAt)} · langue : {r.language.toUpperCase()} · studio du {when(r.studio.createdAt)} : {r.studio.concepts} image{r.studio.concepts > 1 ? "s" : ""}, {usd(r.studio.cents)} (estimation)
          </p>
        </div>
        <span className={"border px-3 py-1 text-base " + (r.status === "new" ? "border-rose-light text-rose-light" : "border-white/25 text-bone")} data-status={r.status}>
          {STATUS_FR[r.status] ?? r.status}
        </span>
      </header>

      {r.message ? <p className="whitespace-pre-line text-base text-bone">{r.message}</p> : <p className="text-base text-mist">(sans message)</p>}

      {r.concepts.length ? (
        <div>
          <p className="text-base text-mist">Concepts choisis ({r.concepts.length}) — images IA, pas des pièces Berete</p>
          <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {r.concepts.map((c) => (
              <li key={c.id} className="grid gap-1">
                <a href={c.url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden border border-white/15 bg-black" title="Ouvrir en grand">
                  <img src={c.url} alt={"Concept IA : " + c.prompt} loading="lazy" className="size-full object-cover" />
                </a>
                <p className="line-clamp-2 text-base text-bone">{c.prompt}</p>
                {c.variant ? <p className="text-base text-mist">{variantFr(c.variant)}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {r.references.length ? (
        <div>
          <p className="text-base text-mist">Photos d'inspiration ({r.references.length})</p>
          <ul className="mt-2 flex flex-wrap gap-3">
            {r.references.map((x) => (
              <li key={x.id}>
                <a href={x.url} target="_blank" rel="noreferrer" className="block size-24 overflow-hidden border border-white/15 bg-black" title={x.name}>
                  <img src={x.url} alt={x.name} loading="lazy" className="size-full object-cover" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {r.client ? (
        <p className="flex flex-wrap items-center gap-2 text-base text-bone" data-studio-linked>
          <Check className="size-5 text-rose-light" aria-hidden="true" />
          Client : <strong className="font-medium text-white">{r.client.name}</strong>
          {r.project ? (
            <>
              — projet : <strong className="font-medium text-white">{r.project.title}</strong> (onglets « Clients VIP » et « Private Atelier »)
            </>
          ) : null}
        </p>
      ) : (
        <div className="grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-base text-bone">
            Titre du projet
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} className={inputCls} data-studio-title />
          </label>
          <button type="button" onClick={() => void makeClient()} disabled={Boolean(busy)} className={btnMain} data-studio-make-client>
            {busy === "client" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <UserPlus className="size-4" aria-hidden="true" />}
            Créer le client et son projet
          </button>
        </div>
      )}
      {made ? (
        <p role="status" className="text-base text-rose-light">
          Client et projet « {made.title} » créés.{made.code ? " Code d'accès à l'espace VIP (affiché une seule fois) : " + made.code : ""}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {r.status === "new" ? (
          <button type="button" className={btn} disabled={Boolean(busy)} onClick={() => void act("read", () => adminCall(token, "PUT", "/api/studio/admin/requests/" + r.id, { status: "read" }))}>
            <Check className="size-4" aria-hidden="true" /> Marquer comme lue
          </button>
        ) : null}
        {r.status === "read" || r.status === "new" ? (
          <button type="button" className={btn} disabled={Boolean(busy)} onClick={() => void act("archive", () => adminCall(token, "PUT", "/api/studio/admin/requests/" + r.id, { status: "archived" }))}>
            <Archive className="size-4" aria-hidden="true" /> Archiver
          </button>
        ) : null}
        {r.status === "archived" ? (
          <button type="button" className={btn} disabled={Boolean(busy)} onClick={() => void act("unarchive", () => adminCall(token, "PUT", "/api/studio/admin/requests/" + r.id, { status: "read" }))}>
            Désarchiver
          </button>
        ) : null}
        <button
          type="button"
          className={btn}
          disabled={Boolean(busy)}
          onClick={() => {
            if (window.confirm("Supprimer cette demande ? Le studio du visiteur et ses images restent.")) void act("delete", () => adminCall(token, "DELETE", "/api/studio/admin/requests/" + r.id));
          }}
        >
          <Trash2 className="size-4" aria-hidden="true" /> Supprimer la demande
        </button>
      </div>
    </article>
  );
}

export default function StudioRequests({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState("");
  const [shown, setShown] = useState<"open" | "all" | "archived">("open");
  const [loading, setLoading] = useState(false);

  const fail = useCallback(
    (x: unknown) => {
      if (x instanceof Error && x.message === "expired") onExpired();
      else setErr(x instanceof Error ? x.message : "Une erreur est survenue.");
    },
    [onExpired],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData((await adminCall(token, "GET", "/api/studio/admin/overview")) as unknown as Overview);
      setErr("");
    } catch (x) {
      fail(x);
    } finally {
      setLoading(false);
    }
  }, [token, fail]);

  useEffect(() => {
    let alive = true;
    adminCall(token, "GET", "/api/studio/admin/overview")
      .then((res) => alive && setData(res as unknown as Overview))
      .catch((x: unknown) => alive && fail(x));
    return () => {
      alive = false;
    };
  }, [token, fail]);

  if (!data) {
    return err ? (
      <p role="alert" className="text-base text-rose-light">
        {err}
      </p>
    ) : (
      <p role="status" className="flex items-center gap-3 text-base text-mist">
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Chargement…
      </p>
    );
  }

  const { settings, usage } = data;
  const requests = data.requests.filter((r) => (shown === "all" ? true : shown === "archived" ? r.status === "archived" : r.status !== "archived"));
  const fresh = data.requests.filter((r) => r.status === "new").length;

  return (
    <div className="grid gap-10" data-admin-studio>
      <header className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="title-caps text-3xl tracking-[0.12em]">AI Studio</h1>
          <button type="button" className={btn} onClick={() => void load()} disabled={loading}>
            <RefreshCw className={"size-4 " + (loading ? "animate-spin" : "")} aria-hidden="true" /> Actualiser
          </button>
        </div>
        <p className="max-w-3xl text-base text-bone">
          Le studio de création IA du site (« Create Your Own Piece », adresse /create) : les demandes envoyées par les visiteurs avec leurs concepts et leurs photos, et ce que coûtent les images. Les images sont des concepts IA pour l'inspiration, jamais des pièces Berete.
        </p>
        <p className="text-base" data-studio-state={settings.open && settings.key ? "open" : "closed"}>
          {settings.open && settings.key ? (
            <span className="text-rose-light">Studio ouvert au public (avec l'accès au site).</span>
          ) : (
            <span className="text-mist">
              Studio fermé{!settings.open ? " (interrupteur « AI Studio » éteint)" : ""}
              {!settings.key ? " (clé OpenAI absente sur le serveur : OPENAI_API_KEY)" : ""} : la page /create dit « Le studio ouvre bientôt ».
            </span>
          )}{" "}
          <span className="text-mist">Interrupteur et limites : onglet « Private Atelier » → Réglages.</span>
        </p>
      </header>

      {err ? (
        <p role="alert" className="text-base text-rose-light">
          {err}
        </p>
      ) : null}

      <section aria-labelledby="studio-usage" className="grid gap-4">
        <h2 id="studio-usage" className="title-caps text-xl tracking-[0.12em]">
          Images et coût
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-studio-usage>
          <Stat label="Aujourd'hui (Dubaï)" value={usd(usage.today.cents)} sub={usage.today.count + " image" + (usage.today.count > 1 ? "s" : "")} />
          <Stat label="Ce mois-ci" value={usd(usage.month.cents)} sub={usage.month.count + " image" + (usage.month.count > 1 ? "s" : "")} />
          <Stat label="Depuis le début" value={usd(usage.all.cents)} sub={usage.all.count + " image" + (usage.all.count > 1 ? "s" : "") + " · " + usage.studios + " studio" + (usage.studios > 1 ? "s" : "")} />
          <Stat label="Limites" value={settings.perVisitorDaily + " / visiteur"} sub={usage.last24h + " sur " + settings.dailyTotal + " en 24 h (tous visiteurs)"} />
        </div>
        <p className="text-base text-mist">
          Coût estimé, pas la facture d'OpenAI : environ {usd(settings.centsPerImage)} par image en qualité « {settings.quality} » (gpt-image-1, 1024 × 1024), un peu plus quand des photos sont envoyées avec. La facture réelle : platform.openai.com → Usage.
        </p>
      </section>

      <section aria-labelledby="studio-requests" className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="studio-requests" className="title-caps text-xl tracking-[0.12em]">
            Demandes de consultation{fresh ? " (" + fresh + " nouvelle" + (fresh > 1 ? "s" : "") + ")" : ""}
          </h2>
          <div className="flex gap-1" role="group" aria-label="Afficher">
            {(
              [
                ["open", "En cours"],
                ["archived", "Archivées"],
                ["all", "Toutes"],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={shown === k} onClick={() => setShown(k)} className={"min-h-12 border-b-2 px-3 text-base " + (shown === k ? "border-rose-light text-rose-light" : "border-transparent text-bone hover:text-white")}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {requests.length === 0 ? <p className="text-base text-mist">Aucune demande pour l'instant.</p> : null}
        {requests.map((r) => (
          <RequestCard key={r.id} r={r} token={token} onChanged={() => void load()} fail={fail} />
        ))}
      </section>

      <section aria-labelledby="studio-generations" className="grid gap-4">
        <h2 id="studio-generations" className="title-caps text-xl tracking-[0.12em]">
          Dernières images créées
        </h2>
        {data.generations.length === 0 ? <p className="text-base text-mist">Aucune image pour l'instant.</p> : null}
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" data-studio-generations>
          {data.generations.map((c) => (
            <li key={c.id} className="grid content-start gap-1">
              <a href={c.url} target="_blank" rel="noreferrer" className="relative block aspect-square overflow-hidden border border-white/15 bg-black" title="Ouvrir en grand">
                <img src={c.url} alt={"Concept IA : " + c.prompt} loading="lazy" className="size-full object-cover" />
                <ExternalLink className="absolute end-1.5 top-1.5 size-4 text-white/70" aria-hidden="true" />
              </a>
              <p className="line-clamp-2 text-base text-bone">{c.prompt}</p>
              <p className="text-base text-mist">
                {[variantFr(c.variant), usd(c.costCents), when(c.createdAt)].filter(Boolean).join(" · ")}
                {c.kept ? " · ♥" : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
