/* Shared by the admin pages: styles, calls to the API, small pieces. */
import BrandIcon from "@/components/BrandIcon";
import type { PublicModel } from "@/data/models";

export const inputCls = "mt-2 block min-h-12 w-full border border-white/30 bg-ink px-4 text-base text-white focus:border-rose-light focus:outline-none";
export const btn = "inline-flex min-h-12 items-center justify-center gap-2 border border-white/30 px-5 text-base font-semibold text-white hover:border-rose-light hover:text-rose-light disabled:opacity-50";
export const btnMain = "inline-flex min-h-12 items-center justify-center gap-2 bg-white px-6 text-base font-semibold text-ink hover:bg-rose-light disabled:opacity-60";
export const iconBtn = "inline-flex size-12 shrink-0 items-center justify-center border border-white/30 text-white hover:border-rose-light hover:text-rose-light";

/** A model as the admin lists it (server/routes/models.ts, adminView). */
export type ModelSummary = { id: string; name: string; sourceName: string; status: string; preview: PublicModel | null };

/** A call to the admin API; "expired" when the session ended. */
export async function adminCall(token: string, method: string, url: string, body?: unknown): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { Authorization: "Bearer " + token, Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401) throw new Error("expired");
  if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Une erreur est survenue, réessayez.");
  return json;
}

export function BrandIconLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={btn}>
      <BrandIcon name="whatsapp" className="size-4" /> {label}
    </a>
  );
}
