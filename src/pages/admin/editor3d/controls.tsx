/*
 * Small controls of the 3D editor (26/11/2026), in simple French: a slider with its value, a switch, a list, a colour,
 * three numbers, a folding section. Every control is at least 48 px high (the rule of the site), labelled for screen
 * readers, and applies at once.
 */
import { useId, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { Vec3 } from "@/data/scene3d";

const label = "text-base text-bone";

function format(value: number, step: number): string {
  const digits = step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3;
  return value.toFixed(digits).replace(".", ",");
}

export function Range({ name, value, min, max, step = 0.01, unit = "", hint, onChange, data }: { name: string; value: number; min: number; max: number; step?: number; unit?: string; hint?: string; onChange: (v: number) => void; data?: string }) {
  const id = useId();
  return (
    <div className="grid gap-1" data-control={data}>
      <label htmlFor={id} className={"flex items-baseline justify-between gap-3 " + label}>
        <span>{name}</span>
        <span className="tabular-nums text-white">
          {format(value, step)}
          {unit}
        </span>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="block h-12 w-full cursor-pointer accent-[#e8b4a0]" />
      {hint ? <p className="text-sm text-mist">{hint}</p> : null}
    </div>
  );
}

export function Toggle({ name, checked, hint, onChange, data }: { name: string; checked: boolean; hint?: string; onChange: (v: boolean) => void; data?: string }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3 py-2" data-control={data}>
      <input type="checkbox" className="mt-1 size-5 shrink-0 accent-[#e8b4a0]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="grid gap-0.5">
        <span className="text-base text-white">{name}</span>
        {hint ? <span className="text-sm text-mist">{hint}</span> : null}
      </span>
    </label>
  );
}

export function Choice<T extends string>({ name, value, options, onChange, hint, data }: { name: string; value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void; hint?: string; data?: string }) {
  const id = useId();
  return (
    <div className="grid gap-1" data-control={data}>
      <label htmlFor={id} className={label}>
        {name}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className="block min-h-12 w-full border border-white/30 bg-ink px-3 text-base text-white focus:border-rose-light focus:outline-none">
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
      {hint ? <p className="text-sm text-mist">{hint}</p> : null}
    </div>
  );
}

export function ColorField({ name, value, onChange, data }: { name: string; value: string; onChange: (v: string) => void; data?: string }) {
  const id = useId();
  return (
    <div className="flex min-h-12 items-center justify-between gap-3" data-control={data}>
      <label htmlFor={id} className={label}>
        {name}
      </label>
      <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-12 w-20 cursor-pointer border border-white/30 bg-ink px-1" />
    </div>
  );
}

/** Three numbers side by side (rotations, offsets, gains), each a small slider. */
export function Vec3Field({ name, value, min, max, step = 1, unit = "", axes = ["X", "Y", "Z"], onChange }: { name: string; value: Vec3; min: number; max: number; step?: number; unit?: string; axes?: [string, string, string]; onChange: (v: Vec3) => void }) {
  return (
    <fieldset className="grid gap-1">
      <legend className={label}>{name}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {[0, 1, 2].map((k) => (
          <Range key={k} name={axes[k]!} value={value[k]!} min={min} max={max} step={step} unit={unit} onChange={(v) => onChange(value.map((x, i) => (i === k ? v : x)) as Vec3)} />
        ))}
      </div>
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
