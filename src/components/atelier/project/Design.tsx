/*
 * The design of a commission (data-project-section="design"): the versions Berete published (« Design v3 — 12 Dec 2026 »,
 * what changed), the 3D of the version chosen (the metals offered limited to those Berete allows for this project), two
 * versions compared side by side (one under the other on a phone), a change asked on a version (a comment, and a spot of the
 * jewel clicked on the 3D if he wants), and « APPROVE FINAL DESIGN » on the latest version only, after a confirmation that
 * names it.
 */
import { useMemo, useState, type FormEvent } from "react";
import { Check, Crosshair, GitCompareArrows, X } from "lucide-react";
import { METALS, type MetalId, type PublicModel } from "@/data/models";
import { useI18n } from "@/i18n";
import { approveDesign, day, requestChange, type Point, type Project, type Version } from "@/lib/atelier";
import { Detail3D, Jewel3D } from "@/viewer";
import { ConfirmDialog, Msg, SectionHead, Spinner, labelClass } from "../ui";

export function DesignSection({ p, onChanged, onOut }: { p: Project; onChanged: () => Promise<void>; onOut: () => void }) {
  const { t, intl } = useI18n();
  const w = t.privateAtelier.design;
  const versions = p.versions;
  const [chosen, setChosen] = useState<string | null>(null);
  const selected = versions.find((v) => v.id === chosen) ?? versions.find((v) => v.id === p.latestVersionId) ?? versions[0] ?? null;
  const [comparing, setComparing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const label = (v: Pick<Version, "number" | "publishedAt">) => w.versionLabel(v.number, day(v.publishedAt, intl, "short"));
  const approvedVersion = p.approval ? versions.find((v) => v.id === p.approval!.versionId) : null;
  const canApprove = Boolean(selected && selected.id === p.latestVersionId && !selected.approved);

  const approve = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    const a = await approveDesign(p.id, selected.id);
    setBusy(false);
    if (a.state === "out") return onOut();
    setConfirm(false);
    if (a.state !== "ok") setError(t.privateAtelier.error);
    await onChanged();
  };

  return (
    <section id="design" data-project-section="design" className="scroll-mt-28 border-t border-white/10 py-16 lg:py-20" aria-labelledby="design-title">
      <SectionHead id="design-title" eyebrow="01" title={w.title} />

      {versions.length === 0 || !selected ? (
        <p className="piece-text mt-8 max-w-2xl">{w.none}</p>
      ) : (
        <>
          {p.approval ? (
            <p className="mt-8 flex items-start gap-3 border border-rose-light/40 px-5 py-4 text-base text-white" data-design-approved data-version-approved={p.approval.number ?? undefined}>
              <Check className="mt-0.5 size-5 shrink-0 text-rose-light" aria-hidden="true" />
              {w.approved(approvedVersion ? label(approvedVersion) : w.versionLabel(p.approval.number ?? 0, ""), day(p.approval.at, intl))}
            </p>
          ) : null}

          {/* The versions, newest first */}
          <div className="mt-10">
            <h3 className="text-xs font-medium uppercase tracking-[0.22em] text-mist">{w.versions}</h3>
            <ul className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]" role="list">
              {versions.map((v) => {
                const on = v.id === selected.id;
                return (
                  <li key={v.id} className="snap-start">
                    <button
                      type="button"
                      onClick={() => {
                        setChosen(v.id);
                        setComparing(false);
                      }}
                      aria-pressed={on}
                      data-version={v.number}
                      data-approved={v.approved ? "true" : undefined}
                      data-latest={v.id === p.latestVersionId ? "true" : undefined}
                      className={"flex min-h-16 min-w-56 flex-col items-start justify-center gap-1 border px-5 py-3 text-start transition-colors " + (on ? "border-rose-light bg-ink-soft text-white" : "border-white/15 text-bone hover:border-rose-light/60")}
                    >
                      <span className="text-base whitespace-nowrap">{label(v)}</span>
                      <span className="flex gap-3 text-xs font-medium uppercase tracking-[0.18em]">
                        {v.id === p.latestVersionId ? <span className="text-rose-light">{w.latest}</span> : null}
                        {v.approved ? (
                          <span className="inline-flex items-center gap-1 text-white">
                            <Check className="size-3" aria-hidden="true" /> {w.approvedTag}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* The 3D of the version, or two versions side by side */}
          <div className="mt-8">
            {versions.length > 1 ? (
              <div className="mb-5 flex justify-end">
                <button type="button" onClick={() => setComparing((c) => !c)} aria-pressed={comparing} data-compare className="btn-secondary">
                  {comparing ? <X className="size-4" aria-hidden="true" /> : <GitCompareArrows className="size-4" aria-hidden="true" />} {comparing ? w.closeCompare : w.compare}
                </button>
              </div>
            ) : null}
            {comparing ? (
              <Compare p={p} first={selected} label={label} />
            ) : selected.model ? (
              <div data-version-viewer={selected.number}>
                <Jewel3D key={selected.id} model={limitMetals(selected.model, p.allowedMetals)} words={t.viewer} />
              </div>
            ) : (
              <Placeholder text={w.preparing} />
            )}
          </div>

          <div className="mt-12 grid gap-14 lg:grid-cols-2 lg:gap-20">
            {/* What changed, and the approval */}
            <div>
              <h3 className="eyebrow">{label(selected)}</h3>
              {selected.changes.trim() ? (
                <>
                  <p className="mt-5 text-xs font-medium uppercase tracking-[0.22em] text-mist">{w.changes}</p>
                  <p className="piece-text mt-3 whitespace-pre-line" dir="auto" data-version-changes>
                    {selected.changes}
                  </p>
                </>
              ) : null}
              {canApprove ? (
                <button type="button" onClick={() => setConfirm(true)} data-approve-design className="btn-primary mt-10 w-full sm:w-auto">
                  {w.approve}
                </button>
              ) : null}
              {error ? <Msg tone="error" className="mt-4">{error}</Msg> : null}
            </div>

            <ChangeRequest p={p} version={selected} versionLabel={label(selected)} onChanged={onChanged} onOut={onOut} />
          </div>

          {p.requests.length > 0 ? (
            <div className="mt-14">
              <h3 className="text-xs font-medium uppercase tracking-[0.22em] text-mist">{w.requests}</h3>
              <ul className="mt-4 grid gap-4" data-change-requests>
                {p.requests.map((r) => (
                  <li key={r.id} className="border-s border-rose-light/40 ps-5" data-request={r.id}>
                    <p className="text-sm text-mist">
                      {w.versionLabel(r.number ?? 0, "")} · {day(r.at, intl)}
                      {r.point ? (
                        <span className="ms-2 inline-flex items-center gap-1 text-rose-light">
                          <Crosshair className="size-3.5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-base whitespace-pre-line text-bone" dir="auto">{r.comment}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      {confirm && selected ? (
        <ConfirmDialog kind="approve-design" title={w.confirmTitle} yes={w.confirmYes} busy={busy} onYes={() => void approve()} onNo={() => setConfirm(false)}>
          <p>{w.confirmBody(label(selected))}</p>
        </ConfirmDialog>
      ) : null}
    </section>
  );
}

/** The model with only the metals Berete allows for this project (when he chose some). */
function limitMetals(model: PublicModel, allowed: string[]): PublicModel {
  const metals = allowed.filter((m): m is MetalId => (METALS as readonly string[]).includes(m));
  if (metals.length === 0) return model;
  return { ...model, settings: { ...model.settings, metals } };
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex aspect-[4/5] w-full items-center justify-center border border-white/10 bg-ink-soft px-6 text-center sm:aspect-[16/9]">
      <p className="text-base text-bone">{text}</p>
    </div>
  );
}

/** Two published versions side by side (one under the other on a phone), each chosen in its list. */
function Compare({ p, first, label }: { p: Project; first: Version; label: (v: Version) => string }) {
  const { t } = useI18n();
  const w = t.privateAtelier.design;
  const others = p.versions.filter((v) => v.id !== first.id);
  const [a, setA] = useState(first.id);
  const [b, setB] = useState(others[0]?.id ?? first.id);
  const panes = [
    { id: a, set: setA, key: "a" },
    { id: b, set: setB, key: "b" },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-2" data-compare-view>
      {panes.map((pane) => {
        const v = p.versions.find((x) => x.id === pane.id) ?? first;
        return (
          <div key={pane.key} className="border border-white/10 bg-ink-soft" data-compare-pane={v.number}>
            <label className={labelClass + " px-4 pt-4"}>
              <span className="text-xs font-medium uppercase tracking-[0.22em] text-mist">{w.compareWith}</span>
              <select
                value={pane.id}
                onChange={(e) => pane.set(e.target.value)}
                className="mt-2 block min-h-12 w-full border border-white/20 bg-ink px-3 text-base text-white focus:border-rose-light focus:outline-none"
                data-compare-select={pane.key}
              >
                {p.versions.map((x) => (
                  <option key={x.id} value={x.id}>
                    {label(x)}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4">
              {v.model ? <Detail3D key={v.id} model={v.model} marks={[]} words={t.viewer} className="aspect-square w-full lg:aspect-[4/3]" /> : <Placeholder text={w.preparing} />}
            </div>
            {v.changes.trim() ? <p className="px-4 py-4 text-base whitespace-pre-line text-bone" dir="auto">{v.changes}</p> : <div className="h-4" />}
          </div>
        );
      })}
    </div>
  );
}

/** A change asked on the version shown: a comment, and a spot of the jewel when he wants (a click on the 3D). */
function ChangeRequest({ p, version, versionLabel, onChanged, onOut }: { p: Project; version: Version; versionLabel: string; onChanged: () => Promise<void>; onOut: () => void }) {
  const { t } = useI18n();
  const w = t.privateAtelier.design;
  const [comment, setComment] = useState("");
  const [picking, setPicking] = useState(false);
  const [point, setPoint] = useState<Point | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const marks = useMemo(() => (point ? [{ n: 1, title: "", at: [point.x, point.y, point.z] as [number, number, number] }] : []), [point]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return setNote({ tone: "error", text: w.empty });
    setBusy(true);
    setNote(null);
    const a = await requestChange(p.id, version.id, comment.trim(), point);
    setBusy(false);
    if (a.state === "out") return onOut();
    if (a.state !== "ok") return setNote({ tone: "error", text: t.privateAtelier.error });
    setComment("");
    setPoint(null);
    setPicking(false);
    setNote({ tone: "ok", text: w.sent });
    await onChanged();
  };

  return (
    <form onSubmit={submit} className="grid gap-5" data-change-request data-version-id={version.id}>
      <div>
        <h3 className="eyebrow">{w.changeTitle}</h3>
        <p className="mt-4 text-base text-bone">{w.changeOn(versionLabel)}</p>
      </div>
      <label className={labelClass}>
        {w.comment}
        <textarea
          name="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={4000}
          dir="auto"
          className="mt-2 block w-full border border-white/30 bg-ink px-4 py-3 text-base text-white placeholder:text-mist/50 focus:border-rose-light focus:outline-none"
        />
      </label>
      {version.model ? (
        <div>
          {picking ? (
            <div className="grid gap-3" data-pick-point>
              <p className="text-sm text-mist">{point ? w.pointPlaced : w.pickHint}</p>
              <Detail3D model={version.model} marks={marks} words={t.viewer} mode="admin" onPick={(at) => setPoint({ x: at[0], y: at[1], z: at[2] })} active={point ? 1 : null} className="aspect-square w-full border border-white/10 sm:aspect-[4/3]" />
              <div className="flex flex-wrap gap-x-6">
                {point ? (
                  <button type="button" onClick={() => setPoint(null)} className="btn-secondary" data-remove-point>
                    <X className="size-4" aria-hidden="true" /> {w.removePoint}
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setPicking(true)} className="btn-secondary" data-place-point>
              <Crosshair className="size-4" aria-hidden="true" /> {w.placePoint}
            </button>
          )}
        </div>
      ) : null}
      <button type="submit" disabled={busy} className="btn-primary w-full sm:w-auto sm:justify-self-start disabled:opacity-60" data-change-send>
        {busy ? <Spinner /> : null} {w.send}
      </button>
      {note ? <Msg tone={note.tone}>{note.text}</Msg> : null}
    </form>
  );
}
