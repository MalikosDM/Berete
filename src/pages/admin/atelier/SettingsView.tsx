import { useEffect, useState } from "react";
import { Check, CircleCheck, CircleAlert, LoaderCircle } from "lucide-react";
import { adminCall, btnMain, inputCls } from "../ui";
import { areaCls, Block, CopyButton, ErrorLine, labelCls, Loading, Saved, Switch, useFail, useFlash, type Go, type Settings, type SettingsStatus } from "./shared";

/*
 * The settings of The Private Atelier: Yoni's commercial terms (his own text: never written by us; until it is, no quotation
 * can be sent or accepted), the switches of each function, the means of payment besides the card, how long an invitation
 * lasts, the limits of the AI studio; and where the keys stand (Stripe, its notification address, the mailbox, OpenAI), with
 * the one command Malik types to set them.
 */

const STRIPE_EVENTS = ["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed", "checkout.session.expired"];

export default function SettingsView({ token, onExpired }: { token: string; onExpired: () => void; go: Go }) {
  const [saved, setSaved] = useState<Settings | null>(null);
  const [d, setD] = useState<Settings | null>(null);
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, fail, setErr] = useFail(onExpired);
  const [flashKey, flash] = useFlash();

  useEffect(() => {
    let alive = true;
    adminCall(token, "GET", "/api/admin/atelier/settings").then(
      (r) => {
        if (!alive) return;
        setSaved(r.settings as Settings);
        setD(r.settings as Settings);
        setStatus(r.status as SettingsStatus);
      },
      (x: unknown) => alive && fail(x),
    );
    return () => {
      alive = false;
    };
  }, [token, fail]);

  if (!d || !saved || !status) return err ? <ErrorLine text={err} /> : <Loading />;

  const dirty = JSON.stringify(d) !== JSON.stringify(saved);
  const feature = (key: keyof Settings["features"], value: boolean) => setD({ ...d, features: { ...d.features, [key]: value } });

  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await adminCall(token, "PUT", "/api/admin/atelier/settings", { terms: d.terms, features: { payment: d.features.payment, aiStudio: d.features.aiStudio, siteTexts: d.features.siteTexts, clientAccess: d.features.clientAccess }, methods: d.methods, inviteDays: d.inviteDays, ai: d.ai });
      setSaved(r.settings as Settings);
      setD(r.settings as Settings);
      flash("saved");
    } catch (x) {
      fail(x);
    } finally {
      setBusy(false);
    }
  };

  const n = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || min)));

  return (
    <div className="grid gap-6" data-atelier-settings>
      <Block
        title="Conditions commerciales"
        intro={
          <>
            Votre propre texte : nous ne l'écrivons jamais pour vous. Il est joint à chaque devis envoyé (figé avec lui dans le PDF). <strong className="font-medium text-white">Tant qu'il n'est pas écrit, aucun devis ne peut être envoyé ni accepté par un client.</strong>
          </>
        }
      >
        {!saved.terms.trim() ? <p className="border border-rose-light bg-rose-deep/25 p-4 text-base text-white">Vos conditions commerciales ne sont pas encore écrites.</p> : null}
        <label className={labelCls}>
          Texte des conditions (le client le lit, en anglais de préférence)
          <textarea name="terms" value={d.terms} onChange={(e) => setD({ ...d, terms: e.target.value })} rows={14} className={inputCls + " " + areaCls + " leading-relaxed"} />
        </label>
        <p className="text-base text-mist">Un changement compte pour les prochains devis envoyés ; un devis déjà envoyé garde les conditions de son jour.</p>
      </Block>

      <Block title="Fonctions" intro="Chaque fonction s'allume ou s'éteint ici ; le site suit.">
        <div className="grid">
          <Switch label="Paiement en ligne" hint={status.stripeKeys ? "Le client paie par carte (Apple Pay et Google Pay compris)." : "Il faut aussi les clés Stripe sur le serveur (voir plus bas) : sans elles, aucun bouton de paiement."} checked={d.features.payment} onChange={(v) => feature("payment", v)} data-feature="payment" />
          <Switch label="AI Creation Studio" hint={status.openai ? "Les visiteurs imaginent leur pièce avec l'IA." : "Il faut aussi la clé OpenAI sur le serveur : sans elle, le studio reste caché."} checked={d.features.aiStudio} onChange={(v) => feature("aiStudio", v)} data-feature="aiStudio" />
          <Switch label="Textes du site" hint="La section « The Private Atelier » de The Bespoke Journey et « Beyond the Creation » sur l'accueil." checked={d.features.siteTexts} onChange={(v) => feature("siteTexts", v)} data-feature="siteTexts" />
          <Switch label="« Client Access » dans le menu" hint="Le lien vers l'espace des clients, en haut du site." checked={d.features.clientAccess} onChange={(v) => feature("clientAccess", v)} data-feature="clientAccess" />
          <Switch
            label="Notifications WhatsApp automatiques"
            hint={
              <>
                Pas encore possible. Il faudrait :
                <ul className="mt-1 list-disc ps-5">
                  {status.whatsapp.needs.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </>
            }
            checked={false}
            disabled
            onChange={() => undefined}
            data-feature="whatsappNotify"
          />
        </div>
      </Block>

      <Block title="Paiement, invitations, AI Studio">
        <label className="flex min-h-12 cursor-pointer items-center gap-3 text-base text-white">
          <input type="checkbox" checked={d.methods.includes("bank_transfer")} onChange={(e) => setD({ ...d, methods: e.target.checked ? ["bank_transfer"] : [] })} className="size-5 accent-[#e8b4a0]" data-method="bank_transfer" />
          Accepter aussi le virement bancaire (en plus de la carte)
        </label>
        <p className="text-base text-mist">Un virement n'est confirmé qu'à l'arrivée de l'argent (Stripe le dit au site).</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={labelCls}>
            Durée des invitations (jours)
            <input type="number" name="inviteDays" min={1} max={30} value={d.inviteDays} onChange={(e) => setD({ ...d, inviteDays: n(e.target.value, 1, 30) })} className={inputCls} />
          </label>
          <label className={labelCls}>
            AI Studio : images par visiteur et par jour
            <input type="number" name="perVisitorDaily" min={1} max={100} value={d.ai.perVisitorDaily} onChange={(e) => setD({ ...d, ai: { ...d.ai, perVisitorDaily: n(e.target.value, 1, 100) } })} className={inputCls} />
          </label>
          <label className={labelCls}>
            AI Studio : images par jour en tout
            <input type="number" name="dailyTotal" min={1} max={5000} value={d.ai.dailyTotal} onChange={(e) => setD({ ...d, ai: { ...d.ai, dailyTotal: n(e.target.value, 1, 5000) } })} className={inputCls} />
          </label>
        </div>
      </Block>

      <div className="sticky bottom-0 z-20 -mx-5 flex flex-wrap items-center gap-4 border-t border-white/10 bg-ink/95 px-5 py-3 backdrop-blur-md sm:mx-0">
        <button type="button" className={btnMain} onClick={() => void save()} disabled={busy} data-save-settings>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />} Enregistrer les réglages
        </button>
        {dirty ? <span className="text-base text-rose-light">Changements pas encore enregistrés</span> : null}
        <Saved show={flashKey === "saved"} />
        <ErrorLine text={err} />
      </div>

      <Block title="État des clés" intro="Ce que le serveur a déjà. Les clés ne s'écrivent jamais ici.">
        <ul className="grid gap-3 text-base">
          <State ok={status.stripeKeys} text={status.stripeKeys ? "Clés Stripe présentes" + (status.stripeTestMode ? " (mode test : aucun vrai paiement)" : " (mode réel)") : "Clés Stripe absentes : pas de paiement en ligne"} />
          <State ok={status.smtp} text={status.smtp ? "Boîte e-mail réglée : les e-mails partent" : "Boîte e-mail pas réglée : les e-mails attendent dans « E-mails envoyés »"} />
          <State ok={status.openai} text={status.openai ? "Clé OpenAI présente (AI Creation Studio)" : "Clé OpenAI absente : l'AI Creation Studio reste caché"} />
        </ul>
        <div className="grid gap-3 border-t border-white/10 pt-5">
          <p className="text-base text-white">Adresse de notification à déclarer chez Stripe (Développeurs → Webhooks)</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="block min-h-12 flex-1 border border-white/20 px-4 py-3 text-base break-all text-white" data-webhook-url>
              {status.webhookUrl}
            </code>
            <CopyButton text={status.webhookUrl} label="Copier l'adresse" />
          </div>
          <p className="text-base text-bone">Événements à cocher :</p>
          <ul className="grid gap-1 ps-5 text-base text-bone">
            {STRIPE_EVENTS.map((e) => (
              <li key={e} className="list-disc">
                <code className="break-all">{e}</code>
              </li>
            ))}
          </ul>
        </div>
        <p className="border-t border-white/10 pt-5 text-base text-mist">
          Pour régler les clés, Malik tape dans le Terminal du Mac : <code className="break-all text-white">npm run vps -- set STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_PUBLISHABLE_KEY</code> (les valeurs sont demandées une par une, sans s'afficher). De même pour la boîte e-mail : <code className="break-all text-white">npm run vps -- set SMTP_USER SMTP_PASS ALERT_TO</code>, et OpenAI : <code className="break-all text-white">npm run vps -- set OPENAI_API_KEY</code>.
        </p>
      </Block>
    </div>
  );
}

function State({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="flex items-start gap-3">
      {ok ? <CircleCheck className="mt-0.5 size-5 shrink-0 text-rose-light" aria-hidden="true" /> : <CircleAlert className="mt-0.5 size-5 shrink-0 text-mist" aria-hidden="true" />}
      <span className={ok ? "text-white" : "text-bone"}>{text}</span>
    </li>
  );
}
