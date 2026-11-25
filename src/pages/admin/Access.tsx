import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { adminCall, btnMain, inputCls } from "./ui";

/*
 * Admin "Accès au site" (Yoni, 25/11/2026): the site under construction (server/access.ts). While it is, the public sees
 * « Coming soon » everywhere and only the devices that typed the private password see the site (180 days each). Only the
 * fingerprint of the password is kept, in the base. Unchecking « Site en construction » opens the site to everyone; the
 * search engines stay a separate setting (npm run vps -- launch, refused while the site is under construction).
 */

type State = { construction: boolean; hasPassword: boolean };
const MIN = 6;

export default function Access({ token, onExpired, onState }: { token: string; onExpired: () => void; onState?: (s: State) => void }) {
  const [state, setState] = useState<State | null>(null);
  const [first, setFirst] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");

  const call = useCallback(
    async (method: string, body?: unknown) => {
      try {
        const next = (await adminCall(token, method, "/api/admin/access", body)) as unknown as State;
        setState(next);
        onState?.(next);
        return true;
      } catch (x) {
        if (x instanceof Error && x.message === "expired") onExpired();
        else setErr(x instanceof Error ? x.message : "Une erreur est survenue, réessayez.");
        return false;
      }
    },
    [token, onExpired, onState],
  );

  useEffect(() => {
    let alive = true;
    adminCall(token, "GET", "/api/admin/access").then(
      (json) => {
        if (!alive) return;
        const next = json as unknown as State;
        setState(next);
        onState?.(next);
      },
      (x: unknown) => {
        if (!alive) return;
        if (x instanceof Error && x.message === "expired") onExpired();
        else setErr(x instanceof Error ? x.message : "Une erreur est survenue, réessayez.");
      },
    );
    return () => {
      alive = false;
    };
  }, [token, onExpired, onState]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setDone("");
    if (first.trim().length < MIN) return setErr("Le mot de passe doit avoir au moins " + MIN + " caractères.");
    if (first !== again) return setErr("Les deux mots de passe ne sont pas identiques.");
    setBusy(true);
    if (await call("PUT", { password: first })) {
      setFirst("");
      setAgain("");
      setDone(state?.hasPassword ? "Nouveau mot de passe enregistré : les appareils déjà entrés devront le retaper." : "Mot de passe enregistré : il ouvre le site sur chaque appareil où il est tapé.");
    }
    setBusy(false);
  };

  const toggle = async (construction: boolean) => {
    setErr("");
    setDone("");
    if (!construction && !window.confirm("Ouvrir le site à tous ? Tout le monde verra le vrai site, sans mot de passe.")) return;
    setBusy(true);
    await call("PUT", { construction });
    setBusy(false);
  };

  if (!state) {
    return (
      <div className="flex justify-center py-16" aria-busy="true">
        {err ? <p role="alert" className="text-base text-rose-light">{err}</p> : <LoaderCircle className="size-6 animate-spin text-bone" aria-label="Chargement" />}
      </div>
    );
  }

  const status = !state.construction ? "Site ouvert à tous" : state.hasPassword ? "Site en construction — accès privé actif" : "Choisissez le mot de passe d'accès privé";

  return (
    <section className="mx-auto grid max-w-2xl gap-8 border border-white/15 p-6 sm:p-8" data-admin-access>
      <div>
        <h2 className="title-caps text-2xl tracking-[0.12em]">Accès au site</h2>
        <p className={"mt-4 text-lg " + (state.construction && !state.hasPassword ? "text-rose-light" : "text-white")} data-access-status>
          {status}
        </p>
        <p className="mt-2 text-base text-bone">
          {!state.construction
            ? "Tout le monde voit le site. Recochez « Site en construction » pour le refermer."
            : state.hasPassword
              ? "Le public voit « Coming soon ». Le site s'ouvre pendant 180 jours sur chaque appareil où le mot de passe est tapé (lien « Accès privé » en bas de la page)."
              : "Le public voit « Coming soon » et personne ne peut entrer tant que le mot de passe n'est pas choisi."}
        </p>
      </div>

      <label className="flex min-h-12 cursor-pointer items-center justify-between gap-6 border-t border-white/10 pt-6 text-base text-white">
        <span>Site en construction</span>
        <span className="relative inline-flex shrink-0 items-center">
          <input
            type="checkbox"
            role="switch"
            className="peer sr-only"
            checked={state.construction}
            disabled={busy}
            onChange={(e) => void toggle(e.target.checked)}
            data-access-construction
          />
          <span className="h-7 w-12 rounded-full border border-white/30 bg-ink transition-colors peer-checked:border-rose-light peer-checked:bg-rose-deep/40 peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-rose-light" />
          <span className="absolute left-1 size-5 rounded-full bg-bone transition-transform peer-checked:translate-x-5 peer-checked:bg-rose-light" />
        </span>
      </label>

      <form onSubmit={save} className="grid gap-5 border-t border-white/10 pt-6" data-access-password>
        <p className="text-base text-white">{state.hasPassword ? "Changer le mot de passe d'accès privé" : "Mot de passe d'accès privé"}</p>
        <label className="block text-base text-bone">
          Mot de passe
          <input type="password" autoComplete="new-password" value={first} onChange={(e) => setFirst(e.target.value)} className={inputCls} />
        </label>
        <label className="block text-base text-bone">
          Encore une fois
          <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} className={inputCls} />
        </label>
        {err ? <p role="alert" className="text-base text-rose-light">{err}</p> : null}
        {done ? <p role="status" className="text-base text-white">{done}</p> : null}
        <button type="submit" disabled={busy || !first || !again} className={btnMain + " justify-self-start"}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null} Enregistrer
        </button>
      </form>
    </section>
  );
}
