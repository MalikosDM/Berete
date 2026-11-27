import { useEffect, useState, type FormEvent } from "react";
import { Archive, ArchiveRestore, Check, LoaderCircle } from "lucide-react";
import { adminCall, btn, btnMain, inputCls } from "../ui";
import type { Section } from "./ProjectPage";
import { Block, centsToText, ErrorLine, FEE_METHODS, labelCls, METAL_CHOICES, money, Saved, STONE_CHOICES, toCents, useFail, useFlash } from "./shared";

/*
 * The settings of a project: its title, the design fee paid at the start (amount, day, means: it counts towards the
 * deposit), the metals and stones the client may try on his 3D (none ticked: the model as it was set), the delivery window
 * the client sees (from … to …), and archiving it (it leaves the dashboard; nothing is deleted).
 */

type Draft = { title: string; designFee: string; paidAt: string; method: string; metals: string[]; stones: string[]; from: string; to: string };

function draftOf(p: Section["project"]): Draft {
  return {
    title: p.title,
    designFee: centsToText(p.designFee.cents),
    paidAt: p.designFee.paidAt ?? "",
    method: p.designFee.method,
    metals: p.allowedMetals,
    stones: p.allowedStones,
    from: p.delivery?.from ?? "",
    to: p.delivery?.to ?? "",
  };
}

export default function ProjectSettings({ token, project: p, reload, onExpired }: Section) {
  const [d, setD] = useState<Draft>(() => draftOf(p));
  const [busy, setBusy] = useState(false);
  const [err, fail, setErr] = useFail(onExpired);
  const [saved, flash] = useFlash();
  // Archived or not: said by the list of the projects (the view of a project does not carry it).
  const [archived, setArchived] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    adminCall(token, "GET", "/api/admin/atelier/projects?clientId=" + encodeURIComponent(p.client.id)).then(
      (r) => alive && setArchived(Boolean(((r.items as { id: string; archived: boolean }[]) ?? []).find((x) => x.id === p.id)?.archived)),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [token, p.id, p.client.id]);

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    const cents = toCents(d.designFee);
    if (!d.title.trim()) return setErr("Le projet a besoin d'un titre.");
    if (cents === null) return setErr("Le montant des frais de design n'est pas un nombre (exemple : 1000 ou 1000,50).");
    if (d.from && d.to && d.to < d.from) return setErr("La fin de la fenêtre de livraison est avant son début.");
    const body: Record<string, unknown> = {
      title: d.title.trim(),
      designFeeCents: cents,
      designFeePaidAt: d.paidAt || null,
      designFeeMethod: d.method.trim(),
      allowedMetals: d.metals,
      allowedStones: d.stones,
    };
    // The delivery window only when it changed (each change is shown to the client in his history).
    if (d.from !== (p.delivery?.from ?? "") || d.to !== (p.delivery?.to ?? "")) {
      body.deliveryFrom = d.from || null;
      body.deliveryTo = d.to || null;
    }
    setBusy(true);
    try {
      await adminCall(token, "PUT", "/api/admin/atelier/projects/" + p.id, body);
      await reload();
      flash("settings");
    } catch (x) {
      fail(x);
    } finally {
      setBusy(false);
    }
  };

  const archive = async (value: boolean) => {
    if (value && !window.confirm("Archiver ce projet ? Il quitte le tableau de bord ; rien n'est supprimé et le client garde son espace.")) return;
    try {
      await adminCall(token, "PUT", "/api/admin/atelier/projects/" + p.id, { archived: value });
      setArchived(value);
      await reload();
      flash(value ? "archived" : "restored");
    } catch (x) {
      fail(x);
    }
  };

  return (
    <Block id="reglages" title="Réglages du projet" data-project-settings>
      <form onSubmit={save} className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelCls + " md:col-span-2"}>
            Titre du projet (le client le voit)
            <input name="projectTitle" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} className={inputCls} required maxLength={160} />
          </label>
          <label className={labelCls}>
            Frais de design déjà payés ({p.currency})
            <input name="designFee" inputMode="decimal" value={d.designFee} onChange={(e) => setD({ ...d, designFee: e.target.value })} className={inputCls} />
            <span className="mt-1 block text-base text-mist">Aujourd'hui : {money(p.designFee.cents, p.currency)}. Ils comptent dans l'acompte.</span>
          </label>
          <label className={labelCls}>
            Payés le
            <input type="date" value={d.paidAt} onChange={(e) => setD({ ...d, paidAt: e.target.value })} className={inputCls + " [color-scheme:dark]"} />
          </label>
          <label className={labelCls}>
            Moyen de paiement
            <input list="atelier-fee-methods-2" value={d.method} onChange={(e) => setD({ ...d, method: e.target.value })} className={inputCls} />
            <datalist id="atelier-fee-methods-2">
              {FEE_METHODS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>
        </div>

        <fieldset className="grid gap-3">
          <legend className="text-base text-white">Métaux que le client peut essayer sur sa 3D</legend>
          <p className="text-base text-mist">Aucun coché : la pièce reste dans le métal choisi pour le modèle 3D.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {METAL_CHOICES.map((m) => (
              <label key={m.id} className="flex min-h-12 cursor-pointer items-center gap-3 border border-white/10 px-3 text-base text-bone has-[:checked]:border-rose-light has-[:checked]:text-white">
                <input type="checkbox" checked={d.metals.includes(m.id)} onChange={() => setD({ ...d, metals: toggle(d.metals, m.id) })} className="size-5 accent-[#e8b4a0]" data-allowed-metal={m.id} />
                {m.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-3">
          <legend className="text-base text-white">Couleurs de pierres que le client peut essayer</legend>
          <p className="text-base text-mist">Les pierres sont nommées par leur couleur. Aucune cochée : les pierres restent comme sur le modèle 3D.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {STONE_CHOICES.map((s) => (
              <label key={s.id} className="flex min-h-12 cursor-pointer items-center gap-3 border border-white/10 px-3 text-base text-bone has-[:checked]:border-rose-light has-[:checked]:text-white">
                <input type="checkbox" checked={d.stones.includes(s.id)} onChange={() => setD({ ...d, stones: toggle(d.stones, s.id) })} className="size-5 accent-[#e8b4a0]" data-allowed-stone={s.id} />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-3">
          <legend className="text-base text-white">Fenêtre de livraison (le client la voit)</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelCls}>
              Du
              <input name="deliveryFrom" type="date" value={d.from} onChange={(e) => setD({ ...d, from: e.target.value })} className={inputCls + " [color-scheme:dark]"} />
            </label>
            <label className={labelCls}>
              Au
              <input name="deliveryTo" type="date" value={d.to} onChange={(e) => setD({ ...d, to: e.target.value })} className={inputCls + " [color-scheme:dark]"} />
            </label>
          </div>
        </fieldset>

        <ErrorLine text={err} />
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className={btnMain} disabled={busy} data-save-project>
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />} Enregistrer les réglages
          </button>
          <Saved show={saved === "settings"} />
          <Saved show={saved === "archived"} text="Projet archivé" />
          <Saved show={saved === "restored"} text="Projet de nouveau en cours" />
        </div>
      </form>
      <div className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
        {archived === null ? null : archived ? (
          <>
            <p className="w-full text-base text-mist">Projet archivé : il n'apparaît plus dans le tableau de bord.</p>
            <button type="button" className={btn} onClick={() => void archive(false)}>
              <ArchiveRestore className="size-4" aria-hidden="true" /> Remettre en cours
            </button>
          </>
        ) : (
          <button type="button" className={btn} onClick={() => void archive(true)}>
            <Archive className="size-4" aria-hidden="true" /> Archiver le projet
          </button>
        )}
      </div>
    </Block>
  );
}
