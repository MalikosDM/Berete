import type { CSSProperties } from "react";
import { useLocation } from "react-router";
import brand from "@/data/brand.generated.json";
import { stripLocale } from "@/i18n/locales";
import { useBrandWatermark } from "@/lib/brandmark";

/** The pages that show it outside a universe: the home page and the circle (the pages of the pieces have it in their universe). */
const SHOWN = (path: string) => path === "/" || path === "/players" || path.startsWith("/players/");

/**
 * The name BERETE in the background (Yoni, 22/11/2026): very discreet, fixed at the bottom of the screen while the page
 * scrolls, drawn just above the background and under everything else (the pieces, their photos, the texts). The same mark
 * as in the universes of the pieces (.u-brand). Its setting: BRAND_WATERMARK (src/lib/site.ts).
 */
export default function BrandMark() {
  const { pathname } = useLocation();
  const on = useBrandWatermark();
  if (!on || !SHOWN(stripLocale(pathname))) return null;
  return <span aria-hidden="true" data-brand-mark className="brand-mark" style={{ "--brand-mark": "url(" + brand.berete.src + ")" } as CSSProperties} />;
}
