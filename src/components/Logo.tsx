/*
 * The owner's logo (scripts/import-media.mjs writes /media/brand/), used as a mask
 * over the metallic rose gold, with its slow sheen: sharp at every size.
 * "full": diamond, BRT and the name. "mark": the diamond and BRT only.
 */
const FILES = { full: "/media/brand/logo.svg", mark: "/media/brand/logo-mark.svg" } as const;

type LogoProps = { variant?: keyof typeof FILES; className?: string; position?: "left" | "center" };

export default function Logo({ variant = "full", className = "", position = "left" }: LogoProps) {
  const url = "url(" + FILES[variant] + ")";
  const place = position === "center" ? "center" : "left center";
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
