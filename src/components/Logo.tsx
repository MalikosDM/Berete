/*
 * The owner's logo (scripts/import-media.mjs writes /media/brand/, scripts/brand-media.mjs its sharp copy and the name).
 * "full": diamond, BRT and the name; "wordmark": BERETE JEWELLERS on one line, in the letters of the logo — both drawn as
 * vector images, sharp at every size and on every screen (Yoni, 24/11/2026: the logo of the menu was blurred on black; a
 * mask is drawn at a low resolution by Safari). "mark": the diamond and BRT only, and "berete": BERETE alone (the watermark),
 * as masks over the rose gold.
 */
import brand from "@/data/brand.generated.json" with { type: "json" };
import { useI18n } from "@/i18n";

const IMAGES = { full: brand.sharp.src, wordmark: brand.wordmark.src } as const;
const MASKS = { mark: "/media/brand/logo-mark.svg", berete: brand.berete.src } as const;

/** "start": against the start of the line (the left, the right in Arabic). */
type LogoProps = { variant?: keyof typeof IMAGES | keyof typeof MASKS; className?: string; position?: "start" | "center" };

export default function Logo({ variant = "full", className = "", position = "start" }: LogoProps) {
  const { dir } = useI18n();
  if (variant === "full" || variant === "wordmark") {
    const place = position === "center" ? "object-center" : dir === "rtl" ? "object-right" : "object-left";
    return <img src={IMAGES[variant]} alt="" aria-hidden="true" decoding="async" draggable={false} className={"block object-contain " + place + " " + className} />;
  }
  const url = "url(" + MASKS[variant] + ")";
  const place = position === "center" ? "center" : dir === "rtl" ? "right center" : "left center";
  return (
    <span
      aria-hidden="true"
      className={"bg-rose-gold block " + className}
      style={{
        maskImage: url,
        WebkitMaskImage: url,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskPosition: place,
        WebkitMaskPosition: place,
      }}
    />
  );
}
