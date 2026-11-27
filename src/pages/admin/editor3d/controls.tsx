/*
 * Small controls of the 3D editor (26/11/2026), in simple French: a slider with its value, a switch, a list, a colour,
 * three numbers, a folding section. Every control is at least 48 px high (the rule of the site), labelled for screen
 * readers, and applies at once. Each carries a stable `data` key (data-control in the page): its help (./help.ts), a
 * sentence and two small images made by our engine, opens with « ? » beside it (27/11/2026), closed by default so that
 * the panel stays calm.
 */
import { useId, useState, type ReactNode } from "react";
import { ChevronDown, CircleHelp } from "lucide-react";
import type { Vec3 } from "@/data/scene3d";
import { helpImage, helpOf, type Help } from "./help";

const label = "text-base text-bone";

function format(value: number, step: number): string {
  const digits = step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : step >= 0.001 ? 3 : 4;
  return value.toFixed(digits).replace(".", ",").replace("-", "−");
}

/** The help of a control: `help` names another key (a repeated control), false: none. */
function useHelp(data: string | undefined, help: string | false | undefined) {
  const [open, setOpen] = useState(false);
  const found = help === false ? null : helpOf(help ?? data);
  return { found, open, toggle: () => setOpen((o) => !o) };
}

/** « ? » beside a setting: 48 px to touch, drawn small, the row keeps its height. */
function HelpButton({ name, help, open, onToggle }: { name: string; help: Help & { key: string }; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={(open ? "Fermer l'aide : " : "Aide : ") + name}
      title="Aide"
      className={"-my-3 inline-flex size-12 shrink-0 items-center justify-center " + (open ? "text-rose-light" : "text-mist hover:text-rose-light")}
      data-help-toggle={help.key}
    >
      <CircleHelp className="size-4" aria-hidden="true" />
    </button>
  );
}

/** The help opened: its sentence, and the low and high values seen on the ring (images made by our engine). */
function HelpPanel({ help }: { help: Help & { key: string } }) {
  const [missing, setMissing] = useState(false);
  return (
    <div className="grid gap-2 border-s border-rose-light/50 ps-3" data-help={help.key}>
      <p className="text-sm text-bone">{help.text}</p>
      {help.pair && !missing ? (
        <div className="grid max-w-[22rem] grid-cols-2 gap-2">
          {(["a", "b"] as const).map((side, i) => (
            <figure key={side} className="grid gap-1">
              <img src={helpImage(help.key, side)} alt={"Aperçu : " + help.pair![i]} width={160} height={160} loading="lazy" decoding="async" className="aspect-square w-full bg-ink-soft object-cover" onError={() => setMissing(true)} />
              <figcaption className="text-sm text-mist">{help.pair![i]}</figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type Common = { data?: string; /** Another key for the help (a repeated control), or false: none. */ help?: string | false };

export function Range({ name, value, min, max, step = 0.01, unit = "", hint, onChange, data, help }: Common & { name: string; value: number; min: number; max: number; step?: number; unit?: string; hint?: string; onChange: (v: number) => void }) {
  const id = useId();
  const h = useHelp(data, help);
  return (
    <div className="grid gap-1" data-control={data}>
      <div className={"flex items-baseline justify-between gap-2 " + label}>
        <label htmlFor={id} className="min-w-0">
          {name}
        </label>
        <span className="flex shrink-0 items-baseline">
          <span className="tabular-nums text-white">
            {format(value, step)}
            {unit}
          </span>
          {h.found ? <HelpButton name={name} help={h.found} open={h.open} onToggle={h.toggle} /> : null}
        </span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, value))} onChange={(e) => onChange(Number(e.target.value))} className="block h-12 w-full cursor-pointer accent-[#e8b4a0]" />
      {hint ? <p className="text-sm text-mist">{hint}</p> : null}
      {h.open && h.found ? <HelpPanel help={h.found} /> : null}
    </div>
  );
}

export function Toggle({ name, checked, hint, onChange, data, help }: Common & { name: string; checked: boolean; hint?: string; onChange: (v: boolean) => void }) {
  const h = useHelp(data, help);
  return (
    <div className="grid gap-1" data-control={data}>
      <div className="flex items-start gap-1">
        <label className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-start gap-3 py-2">
          <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[#e8b4a0]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
          <span className="grid gap-0.5">
            <span className="text-base text-white">{name}</span>
            {hint ? <span className="text-sm text-mist">{hint}</span> : null}
          </span>
        </label>
        {h.found ? <span className="pt-2"><HelpButton name={name} help={h.found} open={h.open} onToggle={h.toggle} /></span> : null}
      </div>
      {h.open && h.found ? <HelpPanel help={h.found} /> : null}
    </div>
  );
}

export function Choice<T extends string>({ name, value, options, onChange, hint, data, help }: Common & { name: string; value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void; hint?: string }) {
  const id = useId();
  const h = useHelp(data, help);
  return (
    <div className="grid gap-1" data-control={data}>
      <div className={"flex items-baseline justify-between gap-2 " + label}>
        <label htmlFor={id}>{name}</label>
        {h.found ? <HelpButton name={name} help={h.found} open={h.open} onToggle={h.toggle} /> : null}
      </div>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className="block min-h-12 w-full border border-white/30 bg-ink px-3 text-base text-white focus:border-rose-light focus:outline-none">
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
      {hint ? <p className="text-sm text-mist">{hint}</p> : null}
      {h.open && h.found ? <HelpPanel help={h.found} /> : null}
    </div>
  );
}

export function ColorField({ name, value, onChange, data, help, children }: Common & { name: string; value: string; onChange: (v: string) => void; /** A small action beside the colour (« Couleur de l'alliage »). */ children?: ReactNode }) {
  const id = useId();
  const h = useHelp(data, help);
  return (
    <div className="grid gap-1" data-control={data}>
      <div className="flex min-h-12 items-center justify-between gap-2">
        <label htmlFor={id} className={label + " min-w-0 flex-1"}>
          {name}
        </label>
        {children}
        <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-12 w-20 shrink-0 cursor-pointer border border-white/30 bg-ink px-1" />
        {h.found ? <HelpButton name={name} help={h.found} open={h.open} onToggle={h.toggle} /> : null}
      </div>
      {h.open && h.found ? <HelpPanel help={h.found} /> : null}
    </div>
  );
}

/** Three numbers side by side (rotations, offsets, gains), each a small slider; one help for the three. */
export function Vec3Field({ name, value, min, max, step = 1, unit = "", axes = ["X", "Y", "Z"], onChange, data, help }: Common & { name: string; value: Vec3; min: number; max: number; step?: number; unit?: string; axes?: [string, string, string]; onChange: (v: Vec3) => void }) {
  const h = useHelp(data, help);
  return (
    <fieldset className="grid gap-1" data-control={data}>
      <legend className={"flex w-full items-baseline justify-between gap-2 " + label}>
        <span>{name}</span>
        {h.found ? <HelpButton name={name} help={h.found} open={h.open} onToggle={h.toggle} /> : null}
      </legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {[0, 1, 2].map((k) => (
          <Range key={k} name={axes[k]!} value={value[k]!} min={min} max={max} step={step} unit={unit} data={data ? data + "-" + "xyz"[k] : undefined} help={false} onChange={(v) => onChange(value.map((x, i) => (i === k ? v : x)) as Vec3)} />
        ))}
      </div>
      {h.open && h.found ? <HelpPanel help={h.found} /> : null}
    </fieldset>
  );
}

/** A folding group of settings. */
export function Section({ title, children, open = false, data }: { title: string; children: ReactNode; open?: boolean; data?: string }) {
  return (
    <details className="group border-b border-white/10" open={open} data-section={data}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 text-base font-medium text-white hover:text-rose-light">
        {title}
        <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="grid gap-3 pb-5">{children}</div>
    </details>
  );
}

/** A picture choice (a lighting, a stand, a material...): its image, its name; the image falls back to a swatch. */
export function Tile({ name, image, swatch, active, onClick, hint, data }: { name: string; image?: string; swatch?: string; active: boolean; onClick: () => void; hint?: string; data?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={hint ?? name}
      data-tile={data}
      className={"group grid min-h-12 content-start gap-1.5 border p-1.5 text-start transition-colors " + (active ? "border-rose-light" : "border-white/15 hover:border-white/40")}
    >
      <span className="relative block aspect-square w-full overflow-hidden bg-ink-soft" style={swatch ? { background: swatch } : undefined}>
        {image ? <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} /> : null}
      </span>
      <span className={"text-sm leading-tight " + (active ? "text-white" : "text-bone")}>{name}</span>
    </button>
  );
}
