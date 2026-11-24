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
        className="inline-flex min-h-12 w-full items-center justify-center gap-3 border border-rose-light/55 px-6 text-base font-normal uppercase tracking-[0.12em] text-white transition-colors hover:border-rose-light hover:text-rose-light sm:w-auto sm:justify-self-start lg:min-h-11 lg:text-[0.75rem]"
      >
        <BrandIcon name="whatsapp" className="size-5 shrink-0" /> {t.contact.sendWhatsapp}
      </a>
    </div>
  );
}
