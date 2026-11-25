import { useLocation } from "react-router";
import Monogram from "@/components/Monogram";
import { stripLocale } from "@/i18n/locales";
import { useBrandWatermark } from "@/lib/brandmark";

/** The pages that show it outside a universe: the home page and the circle (the pages of the pieces have it in their universe). */
const SHOWN = (path: string) => path === "/" || path === "/players" || path.startsWith("/players/");

/**
 * The monogram BRT in the background of the home page and of the circle (24/11/2026, in place of the name BERETE): fixed in
 * the middle of the screen while the page scrolls, drawn just above the background and under everything else (the photo of
 * the home page covers it). The same monogram as in the universes of the pieces. Its setting: BRAND_WATERMARK (src/lib/site.ts).
 */
export default function BrandMark() {
  const { pathname } = useLocation();
  const on = useBrandWatermark();
  if (!on || !SHOWN(stripLocale(pathname))) return null;
  return <Monogram page />;
}
