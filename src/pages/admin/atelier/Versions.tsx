import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, Eye, LoaderCircle, Plus, Send, Trash2, Upload } from "lucide-react";
import { adminCall, btn, btnMain, inputCls, readyModels, type ModelSummary } from "../ui";
import type { Section } from "./ProjectPage";
import { areaCls, Block, deviceOf, ErrorLine, labelCls, Saved, Tag, useFail, useFlash, when, type VersionView } from "./shared";
import { sendModelFile } from "./upload";

/*
 * The versions of the design: a draft is a 3D model ready in the tab « Modèles 3D » (or a Rhino / GLB file sent from here)
 * and a few words on what changed; it can be changed or deleted while it is a draft. « Publier »: the client sees it and is
 * told by e-mail; a published version never changes again (what the client saw, and maybe approved). Under each version:
 * its approvals (day, e-mail, IP address, device) and the changes the client asked, with his comment.
 */

export default function Versions({ token, project: p, reload, onExpired }: Section) {
  const [models, setModels] = useState<ModelSummary[] | null>(null);
  const [err, fail, setErr] = useFail(onExpired);
  const [saved, flash] = useFlash();
  const [busy, setBusy] = useState("");

  const loadModels = useCallback(async () => setModels(await readyModels(token)), [token]);

  useEffect(() => {
    let alive = true;
    readyModels(token).then(
      (m) => alive && setModels(m),
      (x: unknown) => alive && fail(x),
    );
    return () => {
      alive = false;
    };
  }, [token, fail]);

  const act = async (key: string, run: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    setErr("");
    try {
      await run();
      await reload();
      if (done) flash(done);
    } catch (x) {
      fail(x);
    } finally {
      setBusy("");
    }
  };

  // No question asked: the button says what it does, and the line above it that a published version never changes.
  const publish = (v: VersionView) => {
    void act("p" + v.id, () => adminCall(token, "POST", "/api/admin/atelier/projects/" + p.id + "/versions/" + v.id + "/publish"), "published");
  };

  const remove = (v: VersionView) => {
    if (!window.confirm("Supprimer le brouillon de la version " + v.number + " ?")) return;
    void act("d" + v.id, () => adminCall(token, "DELETE", "/api/admin/atelier/projects/" + p.id + "/versions/" + v.id));
  };

  const approvalsOf = (v: VersionView) => (p.approvals ?? []).filter((a) => a.versionId === v.id);
  const requestsOf = (v: VersionView) => p.requests.filter((r) => r.versionId === v.id);

  return (
    <Block id="versions" title="Versions du design" intro="Chaque version est un modèle 3D et quelques mots sur ce qui a changé. Le client ne voit que les versions publiées ; une version publiée ne change plus." data-versions>
      <NewVersion token={token} projectId={p.id} models={models} onModels={loadModels} onCreated={() => act("new", async () => undefined, "created")} fail={fail} />
      <ErrorLine text={err} />
      <Saved show={saved === "created"} text="Brouillon créé" />
      <Saved show={saved === "published"} text="Version publiée : le client est prévenu" />
      {p.versions.length === 0 ? <p className="text-base text-mist">Aucune version pour l'instant.</p> : null}
      <ul className="grid gap-4">
        {p.versions.map((v) => (
          <li key={v.id} className="grid gap-4 border border-white/10 p-4 sm:p-5" data-version={v.number}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base text-white">Version {v.number}</p>
                <p className="mt-1 text-base text-mist">{v.publishedAt ? "Publiée le " + when(v.publishedAt) : "Brouillon : le client ne la voit pas"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {v.publishedAt ? <Tag tone="good">Publiée</Tag> : <Tag>Brouillon</Tag>}
                {v.approved ? <Tag tone="good">Validée par le client</Tag> : v.publishedAt && v.id === p.latestVersionId ? <Tag tone="wait">En attente de validation</Tag> : null}
              </div>
            </div>
            {v.publishedAt ? (
              <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                <ModelThumb v={v} />
                <div className="grid content-start gap-2">
                  <p className="text-base text-bone">Modèle 3D : {v.modelName ?? "aucun"}</p>
                  {v.changes ? <p className="text-base whitespace-pre-line text-white">{v.changes}</p> : <p className="text-base text-mist">Pas de texte sur les changements.</p>}
                </div>
              </div>
            ) : (
              <DraftEditor
                token={token}
                projectId={p.id}
                v={v}
                models={models}
                busy={busy}
                onSaved={() => act("e" + v.id, async () => undefined, "draft-saved")}
                onPublish={() => publish(v)}
                onDelete={() => remove(v)}
                fail={fail}
              />
            )}
            {saved === "draft-saved" && !v.publishedAt ? <Saved show text="Brouillon enregistré" /> : null}

            {approvalsOf(v).length > 0 ? (
              <div className="grid gap-2 border-t border-white/10 pt-3" data-version-approvals>
                <p className="text-base text-white">Validation du client</p>
                {approvalsOf(v).map((a, i) => (
                  <p key={i} className="text-base text-bone">
                    Le {when(a.at)} · {a.email} · adresse IP {a.ip || "inconnue"} · {deviceOf(a.userAgent)}
                  </p>
                ))}
              </div>
            ) : null}

            {requestsOf(v).length > 0 ? (
              <div className="grid gap-2 border-t border-white/10 pt-3" data-version-requests>
                <p className="text-base text-white">Modifications demandées par le client</p>
                {requestsOf(v).map((r) => (
                  <div key={r.id} className="border-l-2 border-rose-light/60 pl-3">
                    <p className="text-base text-mist">
                      Le {when(r.at)}
                      {r.point ? " · avec un point posé sur la 3D" : ""}
                    </p>
                    <p className="text-base whitespace-pre-line text-white">{r.comment}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </Block>
  );
}

function ModelThumb({ v }: { v: VersionView }) {
  if (v.model?.poster) return <img src={v.model.poster} alt={"Modèle 3D " + (v.modelName ?? "")} className="aspect-square w-full max-w-40 border border-white/10 bg-ink-soft object-contain" />;
  return <div className="flex aspect-square w-full max-w-40 items-center justify-center border border-white/10 bg-ink-soft p-3 text-center text-base text-mist">{v.model ? "Modèle 3D prêt" : "Pas de modèle prêt"}</div>;
}

/** The select of the ready models. */
function ModelSelect({ value, models, onChange }: { value: string; models: ModelSummary[] | null; onChange: (id: string) => void }) {
  return (
    <select name="modelId" value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      <option value="">— Choisir un modèle 3D prêt —</option>
      {(models ?? []).map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
          {m.pieceSlug ? " (sur la page d'une pièce)" : ""}
        </option>
      ))}
    </select>
  );
}

/** A Rhino / GLB file sent from here: prepared by the server, then chosen. */
function ModelUpload({ token, onReady, fail }: { token: string; onReady: (id: string) => void; fail: (x: unknown) => void }) {
  const [state, setState] = useState<{ name: string; fraction: number; status: string } | null>(null);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setState({ name: file.name, fraction: 0, status: "sending" });
    try {
      const id = await sendModelFile(token, file, (fraction) => setState({ name: file.name, fraction, status: "sending" }));
      setState({ name: file.name, fraction: 1, status: "processing" });
      // The server prepares the model (a minute or two for a Rhino file).
      for (let i = 0; i < 400; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const m = (await adminCall(token, "GET", "/api/admin/models/" + id)) as { status?: string; error?: string };
        if (m.status === "ready") {
          setState(null);
          onReady(id);
          return;
        }
        if (m.status === "failed") throw new Error("Le fichier 3D n'a pas pu être préparé" + (m.error ? " : " + m.error : ".") + " Voyez l'onglet « Modèles 3D ».");
      }
      throw new Error("Le modèle 3D est encore en préparation : choisissez-le dans la liste dans quelques minutes.");
    } catch (x) {
      setState(null);
      fail(x);
    }
  };

  return (
    <div className="grid gap-2">
      <label className={btn + " cursor-pointer justify-self-start"}>
        <Upload className="size-4" aria-hidden="true" /> Envoyer un fichier 3D (Rhino .3dm, .glb, .stl…)
        <input type="file" accept=".3dm,.glb,.gltf,.obj,.stl,.fbx" className="sr-only" onChange={(e) => void onFile(e)} disabled={state !== null} data-version-model-file />
      </label>
      {state ? (
        <p className="flex items-center gap-2 text-base text-bone" role="status">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {state.status === "sending" ? "Envoi de " + state.name + " : " + Math.round(state.fraction * 100) + " %" : "Préparation du modèle 3D " + state.name + "…"}
        </p>
      ) : null}
    </div>
  );
}

function NewVersion({ token, projectId, models, onModels, onCreated, fail }: { token: string; projectId: string; models: ModelSummary[] | null; onModels: () => Promise<void>; onCreated: () => void; fail: (x: unknown) => void }) {
  const [modelId, setModelId] = useState("");
  const [changes, setChanges] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminCall(token, "POST", "/api/admin/atelier/projects/" + projectId + "/versions", { modelId: modelId || null, changes: changes.trim() });
      setModelId("");
      setChanges("");
      onCreated();
    } catch (x) {
      fail(x);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 border border-rose-light/30 p-4 sm:p-5" data-new-version>
      <p className="text-base text-white">Nouvelle version (brouillon)</p>
      <label className={labelCls}>
        Modèle 3D
        <ModelSelect value={modelId} models={models} onChange={setModelId} />
      </label>
      <ModelUpload
        token={token}
        onReady={(id) =>
          void onModels().then(() => setModelId(id))
        }
        fail={fail}
      />
      <label className={labelCls}>
        Ce qui a changé (le client le lit, en anglais de préférence)
        <textarea name="changes" value={changes} onChange={(e) => setChanges(e.target.value)} rows={3} maxLength={4000} className={inputCls + " " + areaCls} placeholder="Larger centre stone, thinner band." />
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={btnMain} disabled={busy}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />} Créer le brouillon
        </button>
      </div>
    </form>
  );
}

function DraftEditor({ token, projectId, v, models, busy, onSaved, onPublish, onDelete, fail }: { token: string; projectId: string; v: VersionView; models: ModelSummary[] | null; busy: string; onSaved: () => void; onPublish: () => void; onDelete: () => void; fail: (x: unknown) => void }) {
  const [modelId, setModelId] = useState(v.modelId ?? "");
  const [changes, setChanges] = useState(v.changes);
  const [saving, setSaving] = useState(false);
  const dirty = modelId !== (v.modelId ?? "") || changes !== v.changes;
  const ready = Boolean(v.model) && !dirty;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminCall(token, "PUT", "/api/admin/atelier/projects/" + projectId + "/versions/" + v.id, { modelId: modelId || null, changes: changes.trim() });
      onSaved();
    } catch (x) {
      fail(x);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="grid gap-4" data-version-draft={v.number}>
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <ModelThumb v={v} />
        <div className="grid content-start gap-4">
          <label className={labelCls}>
            Modèle 3D
            <ModelSelect value={modelId} models={models} onChange={setModelId} />
          </label>
          <label className={labelCls}>
            Ce qui a changé
            <textarea value={changes} onChange={(e) => setChanges(e.target.value)} rows={3} maxLength={4000} className={inputCls + " " + areaCls} />
          </label>
        </div>
      </div>
      {!v.model ? <p className="text-base text-rose-light">Choisissez un modèle 3D prêt et enregistrez avant de publier.</p> : dirty ? <p className="text-base text-mist">Enregistrez vos changements avant de publier.</p> : <p className="text-base text-mist">« Publier » : le client la voit et reçoit un e-mail. Ensuite, elle ne peut plus être modifiée (faites une nouvelle version).</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={btn} disabled={saving || !dirty}>
          {saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />} Enregistrer le brouillon
        </button>
        <button type="button" className={btnMain} onClick={onPublish} disabled={!ready || busy === "p" + v.id} data-publish-version={v.number}>
          {busy === "p" + v.id ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />} Publier
        </button>
        <button type="button" className={btn} onClick={onDelete} disabled={busy === "d" + v.id}>
          <Trash2 className="size-4" aria-hidden="true" /> Supprimer
        </button>
        {v.model ? (
          <span className="inline-flex items-center gap-2 text-base text-mist">
            <Eye className="size-4" aria-hidden="true" /> Le client verra « {v.label.split(" — ")[0]} »
          </span>
        ) : null}
      </div>
    </form>
  );
}
