import type { ReactNode } from "react";

/**
 * The names of pieces written with capitals on purpose: « AngeL Pendant » (Yoni, 27/11/2026: the A and the L in capitals, the L of
 * his daughter). Where the names are drawn in capitals, their words after « — » keep their own case: « DENIZ UNDAV — AngeL Pendant ».
 */
const OWN_CASE = /\bAngeL\b/;

export function hasOwnCase(title: string): boolean {
  return OWN_CASE.test(title);
}

export function KeepCase({ title, children }: { title: string; children?: (text: string) => ReactNode }) {
  const draw = children ?? ((text: string) => text);
  if (!hasOwnCase(title)) return <>{draw(title)}</>;
  const i = title.indexOf(" — ");
  if (i < 0) return <span data-own-case className="normal-case">{draw(title)}</span>;
  return (
    <>
      {/* The name of the one it was made for in capitals, even in a universe whose letters are small capitals (Marcellus SC). */}
      <span className="uppercase">{draw(title.slice(0, i + 3))}</span>
      <span data-own-case className="normal-case">{draw(title.slice(i + 3))}</span>
    </>
  );
}
