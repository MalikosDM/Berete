import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, LoaderCircle, LogOut, Pencil, Plus, Trash2, X } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;
type Media = { src: string; type: "image" | "video"; alt: string };
type Kind = "stories" | "players" | "capsules" | "jewels";

const KEY = "bj-admin-token";
const STEPS = [
  ["idea", "Idée"],
  ["design", "Design"],
  ["casting", "Fonte"],
  ["setting", "Sertissage"],
  ["polish", "Polissage"],
  ["piece", "La pièce finie"],
  ["delivered", "Livraison"],
] as const;
const TYPES = [
  ["chain", "Chaîne"],
  ["pendant", "Pendentif"],
  ["ring", "Bague"],
  ["bracelet", "Bracelet"],
  ["watch", "Montre"],
] as const;
const PLAYER_KINDS = [
  ["player", "Joueur"],
  ["club", "Club"],
  ["personality", "Personnalité"],
] as const;
const TABS: { kind: Kind; label: string }[] = [
  { kind: "stories", label: "Stories" },
  { kind: "players", label: "Joueurs" },
  { kind: "capsules", label: "Capsules" },
  { kind: "jewels", label: "Pièces" },
];

const inputCls = "mt-2 block min-h-12 w-full border border-white/30 bg-ink px-4 text-base text-white focus:border-rose-light focus:outline-none";
const btn = "inline-flex min-h-12 items-center justify-center gap-2 border border-white/30 px-5 text-sm font-semibold uppercase tracking-[0.16em] text-white hover:border-rose-light hover:text-rose-light disabled:opacity-50";
const btnMain = "inline-flex min-h-12 items-center justify-center gap-2 bg-white px-6 text-sm font-semibold uppercase tracking-[0.16em] text-ink hover:bg-rose-light disabled:opacity-60";

async function api(token: string, method: string, url: string, body?: unknown): Promise<Rec> {
  const headers: Record<string, string> = { Authorization: "Bearer " + token, Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as Rec;
  if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Une erreur est survenue, réessayez.");
  return json;
}

async function uploadFile(token: string, file: File): Promise<Media> {
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) },
    body: file,
  });
  const json = (await res.json().catch(() => ({}))) as Rec;
  if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Le fichier n'a pas pu être envoyé.");
  return { src: String(json.url), type: json.type === "video" ? "video" : "image", alt: "" };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm uppercase tracking-[0.14em] text-bone">{label}{children}</label>;
}

function Thumb({ m }: { m: Media }) {
  return m.type === "video" ? (
    <video src={m.src} muted playsInline preload="metadata" className="h-full w-full object-cover" />
  ) : (
    <img src={m.src} alt={m.alt || "Aperçu"} className="h-full w-full object-cover" />
  );
}

function MediaList({ token, label, value, onChange, single = false }: { token: string; label: string; value: Media[]; onChange: (v: Media[]) => void; single?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    setErr("");
    try {
      const added: Media[] = [];
      for (const f of single ? files.slice(0, 1) : files) added.push(await uploadFile(token, f));
      onChange(single ? added : [...value, ...added]);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="border border-white/15 p-4">
      <p className="text-sm uppercase tracking-[0.14em] text-bone">{label}</p>
      {value.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-3">
          {value.map((m, i) => (
            <li key={m.src + i} className="relative size-24 overflow-hidden bg-ink-soft">
              <Thumb m={m} />
              <button type="button" aria-label="Retirer ce média" onClick={() => onChange(value.filter((_, j) => j !== i))} className="absolute right-1 top-1 inline-flex size-8 items-center justify-center bg-ink/80 text-white hover:text-rose-light">
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <label className={btn + " mt-3 cursor-pointer"}>
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
        {single ? "Choisir une photo" : "Ajouter photos ou vidéos"}
        <input type="file" accept={single ? "image/*" : "image/*,video/*"} multiple={!single} onChange={onFiles} className="sr-only" disabled={busy} />
      </label>
      {err ? <p role="alert" className="mt-2 text-base text-rose-light">{err}</p> : null}
    </div>
  );
}

const toMedia = (v: unknown): Media[] => (Array.isArray(v) ? (v as Media[]).filter((m) => m && typeof m.src === "string") : []);
const one = (src: unknown): Media[] => (typeof src === "string" && src ? [{ src, type: "image", alt: "" }] : []);

function emptyItem(kind: Kind): Rec {
  if (kind === "stories") return { slug: "", title: "", club: "", pieceName: "", jewelSlug: "", articleUrl: "", ownerSlug: "", coverImage: "", media: [] };
  if (kind === "players") return { slug: "", name: "", number: "", club: "", kind: "player", portrait: "", bio: "" };
  if (kind === "capsules") return { slug: "", title: "", tagline: "", intro: "", coverImage: "" };
  return { slug: "", title: "", type: "ring", line: "", client: "", clientPublic: false, coverImage: "", customBox: false, capsuleId: "", playerSlugs: "", press: [], specs: [], steps: {} };
}

function toBody(kind: Kind, f: Rec): Rec {
  if (kind === "stories") return { slug: f.slug, title: f.title, club: f.club ?? "", pieceName: f.pieceName ?? "", jewelSlug: f.jewelSlug ?? "", articleUrl: f.articleUrl ?? "", ownerSlug: f.ownerSlug ?? "", coverImage: f.coverImage ?? "", media: toMedia(f.media) };
  if (kind === "players") {
    const n = String(f.number ?? "").trim();
    return { slug: f.slug, name: f.name, number: n === "" || Number.isNaN(Number(n)) ? null : Math.round(Number(n)), club: f.club ?? "", kind: f.kind || "player", portrait: f.portrait ?? "", bio: f.bio ?? "" };
  }
  if (kind === "capsules") return { slug: f.slug, title: f.title, tagline: f.tagline ?? "", intro: f.intro ?? "", coverImage: f.coverImage ?? "" };
  const steps: Rec = {};
  for (const [k] of STEPS) steps[k] = toMedia((f.steps ?? {})[k]);
  const specs = String(f.specsText ?? "")
    .split("\n")
    .map((l) => l.split(":"))
    .filter((p) => p.length > 1 && p[0].trim())
    .map((p) => ({ label: p[0].trim(), value: p.slice(1).join(":").trim() }));
  return { slug: f.slug, title: f.title, type: f.type, line: f.line ?? "", client: f.client ?? "", clientPublic: Boolean(f.clientPublic), coverImage: f.coverImage ?? "", customBox: Boolean(f.customBox), capsuleId: f.capsuleId, playerSlugs: String(f.playerSlugs ?? ""), press: Array.isArray(f.press) ? f.press : [], specs, steps };
}

function Editor({ kind, token, initial, capsules, onDone }: { kind: Kind; token: string; initial: Rec; capsules: Rec[]; onDone: (saved: boolean) => void }) {
  const [f, setF] = useState<Rec>(() => ({
    ...initial,
    specsText: Array.isArray(initial.specs) ? (initial.specs as Rec[]).map((s) => s.label + ": " + s.value).join("\n") : "",
    capsuleId: initial.capsuleId || capsules[0]?.id || "",
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  const text = (k: string, label: string, area = false) => (
    <Field label={label}>
      {area ? (
        <textarea rows={4} value={String(f[k] ?? "")} onChange={(e) => set(k, e.target.value)} className={inputCls + " py-3"} />
      ) : (
        <input value={String(f[k] ?? "")} onChange={(e) => set(k, e.target.value)} className={inputCls} />
      )}
    </Field>
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const body = toBody(kind, f);
      if (initial.id) await api(token, "PUT", "/api/admin/" + kind + "/" + initial.id, body);
      else await api(token, "POST", "/api/admin/" + kind, body);
      onDone(true);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Enregistrement impossible.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-8 grid gap-6 border border-rose-light/40 p-5 sm:p-8">
      <h2 className="title-caps text-2xl tracking-[0.12em]">{initial.id ? "Modifier" : "Ajouter"}</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {kind === "players" ? text("name", "Nom") : text("title", "Titre")}
        {text("slug", "Adresse (minuscules et tirets)")}
      </div>
      {kind === "stories" ? (
        <>
          <div className="grid gap-6 sm:grid-cols-3">
            {text("club", "Club")}
            {text("pieceName", "Nom de la pièce")}
            {text("jewelSlug", "Adresse de la pièce liée")}
          </div>
          {text("ownerSlug", "Joueur, club ou rubrique lié (adresse, ex. marcus-thuram)")}
          {text("articleUrl", "Lien de l'article (externe, remplace « View the piece » par « Read the article »)")}
          <MediaList token={token} single label="Photo de couverture" value={one(f.coverImage)} onChange={(v) => set("coverImage", v[0]?.src ?? "")} />
          <MediaList token={token} label="Photos et vidéos de la story" value={toMedia(f.media)} onChange={(v) => set("media", v)} />
        </>
      ) : null}
      {kind === "players" ? (
        <>
          <div className="grid gap-6 sm:grid-cols-3">
            <Field label="Type">
              <select value={String(f.kind || "player")} onChange={(e) => set("kind", e.target.value)} className={inputCls}>
                {PLAYER_KINDS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            {text("number", "Numéro")}
            {text("club", "Club")}
          </div>
          {text("bio", "Texte", true)}
          <MediaList token={token} single label="Portrait" value={one(f.portrait)} onChange={(v) => set("portrait", v[0]?.src ?? "")} />
        </>
      ) : null}
      {kind === "capsules" ? (
        <>
          {text("tagline", "Accroche")}
          {text("intro", "Texte", true)}
          <MediaList token={token} single label="Image" value={one(f.coverImage)} onChange={(v) => set("coverImage", v[0]?.src ?? "")} />
        </>
      ) : null}
      {kind === "jewels" ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Capsule">
              <select value={String(f.capsuleId)} onChange={(e) => set("capsuleId", e.target.value)} className={inputCls}>
                {capsules.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </Field>
            <Field label="Type">
              <select value={String(f.type)} onChange={(e) => set("type", e.target.value)} className={inputCls}>
                {TYPES.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
          </div>
          {text("line", "Phrase d'accroche")}
          {text("playerSlugs", "Joueurs et clubs liés (adresses séparées par des virgules)")}
          <div className="grid gap-6 sm:grid-cols-2">
            {text("client", "Client")}
            <div className="flex flex-col justify-end gap-3">
              <label className="flex min-h-12 items-center gap-3 text-base text-bone"><input type="checkbox" checked={Boolean(f.clientPublic)} onChange={(e) => set("clientPublic", e.target.checked)} className="size-5" /> Afficher le client</label>
              <label className="flex min-h-12 items-center gap-3 text-base text-bone"><input type="checkbox" checked={Boolean(f.customBox)} onChange={(e) => set("customBox", e.target.checked)} className="size-5" /> Coffret sur mesure</label>
            </div>
          </div>
          <MediaList token={token} single label="Photo principale" value={one(f.coverImage)} onChange={(v) => set("coverImage", v[0]?.src ?? "")} />
          {STEPS.map(([k, l]) => (
            <MediaList key={k} token={token} label={"Étape : " + l} value={toMedia((f.steps ?? {})[k])} onChange={(v) => set("steps", { ...(f.steps ?? {}), [k]: v })} />
          ))}
          <Field label="Fiche technique (une ligne par info, ex. Or : 18 carats)">
            <textarea rows={5} value={String(f.specsText ?? "")} onChange={(e) => set("specsText", e.target.value)} className={inputCls + " py-3"} />
          </Field>
        </>
      ) : null}
      {err ? <p role="alert" className="text-base text-rose-light">{err}</p> : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="submit" disabled={busy} className={btnMain}>{busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null} Enregistrer</button>
        <button type="button" onClick={() => onDone(false)} className={btn}>Annuler</button>
      </div>
    </form>
  );
}

function Section({ kind, token, onExpired }: { kind: Kind; token: string; onExpired: () => void }) {
  const [items, setItems] = useState<Rec[] | null>(null);
  const [capsules, setCapsules] = useState<Rec[]>([]);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<Rec | null>(null);

  const load = useCallback(async () => {
    setErr("");
    try {
      const res = await api(token, "GET", "/api/admin/" + kind);
      setItems(Array.isArray(res.items) ? res.items : []);
      if (kind === "jewels") {
        const c = await api(token, "GET", "/api/admin/capsules");
        setCapsules(Array.isArray(c.items) ? c.items : []);
      }
    } catch (x) {
      const msg = x instanceof Error ? x.message : "Chargement impossible.";
      if (msg.includes("reconnectez")) onExpired();
      setErr(msg);
    }
  }, [kind, token, onExpired]);

  useEffect(() => {
    setItems(null);
    setEditing(null);
    void load();
  }, [load]);

  const move = async (i: number, d: number) => {
    if (!items) return;
    const list = [...items];
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setItems(list);
    try {
      await api(token, "POST", "/api/admin/" + kind + "/reorder", { ids: list.map((x) => x.id) });
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Réordonnancement impossible.");
      void load();
    }
  };

  const remove = async (item: Rec) => {
    if (!window.confirm("Supprimer « " + (item.title ?? item.name) + " » ? Cette action est définitive.")) return;
    try {
      await api(token, "DELETE", "/api/admin/" + kind + "/" + item.id);
      void load();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Suppression impossible.");
    }
  };

  if (editing) {
    return <Editor kind={kind} token={token} initial={editing} capsules={capsules} onDone={(saved) => { setEditing(null); if (saved) void load(); }} />;
  }

  return (
    <div className="mt-8">
      <button type="button" onClick={() => setEditing(emptyItem(kind))} disabled={kind === "jewels" && capsules.length === 0} className={btnMain}>
        <Plus className="size-4" aria-hidden="true" /> Ajouter
      </button>
      {err ? <p role="alert" className="mt-4 text-base text-rose-light">{err}</p> : null}
      {items === null ? (
        <p className="mt-8 flex items-center gap-3 text-bone"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Chargement</p>
      ) : items.length === 0 ? (
        <p className="mt-8 border border-white/15 p-8 text-center text-bone">Rien pour l'instant.</p>
      ) : (
        <ul className="mt-8 border-t border-white/15">
          {items.map((item, i) => (
            <li key={item.id} className="flex flex-wrap items-center gap-4 border-b border-white/15 py-4">
              <span className="size-14 shrink-0 overflow-hidden bg-ink-soft">{item.coverImage || item.portrait ? <img src={item.coverImage || item.portrait} alt="" className="h-full w-full object-cover" /> : null}</span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-lg text-white">{item.title ?? item.name}</span>
                <span className="block text-sm text-mist">/{item.slug}{item.capsule?.title ? " · " + item.capsule.title : ""}</span>
              </span>
              <span className="flex gap-2">
                <button type="button" aria-label="Monter" onClick={() => void move(i, -1)} className={btn + " px-3"}><ArrowUp className="size-4" aria-hidden="true" /></button>
                <button type="button" aria-label="Descendre" onClick={() => void move(i, 1)} className={btn + " px-3"}><ArrowDown className="size-4" aria-hidden="true" /></button>
                <button type="button" aria-label="Modifier" onClick={() => setEditing(item)} className={btn + " px-3"}><Pencil className="size-4" aria-hidden="true" /></button>
                <button type="button" aria-label="Supprimer" onClick={() => void remove(item)} className={btn + " px-3"}><Trash2 className="size-4" aria-hidden="true" /></button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState("");
  const [tab, setTab] = useState<Kind>("stories");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setToken(sessionStorage.getItem(KEY) ?? "");
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(KEY);
    setToken("");
  }, []);

  const login = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const json = (await res.json().catch(() => ({}))) as Rec;
      if (!res.ok || typeof json.token !== "string") throw new Error(typeof json.error === "string" ? json.error : "Connexion impossible.");
      sessionStorage.setItem(KEY, json.token);
      setToken(json.token);
      setPassword("");
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-5xl px-5 pt-36 pb-28 sm:px-8 lg:pt-44">
      <p className="eyebrow">Back-office</p>
      <h1 className="title-caps mt-5 text-[clamp(2.25rem,6vw,4.5rem)] tracking-[0.12em]">Administration</h1>
      {!token ? (
        <form onSubmit={login} className="mt-10 grid max-w-md gap-5">
          <Field label="Mot de passe">
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          </Field>
          {err ? <p role="alert" className="text-base text-rose-light">{err}</p> : null}
          <button type="submit" disabled={busy || !password} className={btnMain}>{busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null} Se connecter</button>
        </form>
      ) : (
        <>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <div role="tablist" aria-label="Contenus" className="flex flex-wrap gap-3">
              {TABS.map((t) => (
                <button key={t.kind} type="button" role="tab" aria-selected={tab === t.kind} onClick={() => setTab(t.kind)} className={btn + (tab === t.kind ? " border-rose-light text-rose-light" : "")}>
                  {t.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={logout} className={btn}><LogOut className="size-4" aria-hidden="true" /> Déconnexion</button>
          </div>
          <Section kind={tab} token={token} onExpired={logout} />
        </>
      )}
    </section>
  );
}
