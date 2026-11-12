import BrandIcon from "@/components/BrandIcon";
import { useI18n } from "@/i18n";
import { waLink } from "@/lib/site";

/**
 * A form's request handed to WhatsApp, already written: on the version of the
 * site online without its server, or when the server did not take it. The
 * button opens it again if the browser did not (or if it was closed).
 */
export default function WhatsAppHandoff({ message, failed }: { message: string; failed: boolean }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-4" data-whatsapp-handoff={failed ? "failed" : "ready"}>
      <p role={failed ? "alert" : "status"} className={"text-base " + (failed ? "text-rose-light" : "text-bone")}>
        {failed ? t.contact.failedWhatsapp : t.contact.readyWhatsapp}
      </p>
      <a
        href={waLink(message)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-14 w-full items-center justify-center gap-3 bg-white px-8 text-base font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-rose-light sm:w-auto sm:justify-self-start"
      >
        <BrandIcon name="whatsapp" className="size-5 shrink-0" /> {t.contact.sendWhatsapp}
      </a>
    </div>
  );
}
