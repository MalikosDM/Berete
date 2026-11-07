const LOGO_URL = "/images/fournies/berete-jewellers-cropped.svg";

type LogoProps = { className?: string; position?: "left" | "center"; crop?: boolean };

/** The owner's SVG logo, used as a mask over the rose-gold gradient: sharp at every size. */
export default function Logo({ className = "", position = "left", crop = false }: LogoProps) {
  return (
    <span
      aria-hidden="true"
      className={
        "bg-rose-gold block [mask-image:url(/images/fournies/berete-jewellers-cropped.svg)] [-webkit-mask-image:url(/images/fournies/berete-jewellers-cropped.svg)] [mask-repeat:no-repeat] [-webkit-mask-repeat:no-repeat] " +
        (crop ? "[mask-size:auto_100%] [-webkit-mask-size:auto_100%] " : "[mask-size:contain] [-webkit-mask-size:contain] ") +
        (position === "center" ? "[mask-position:center] [-webkit-mask-position:center] " : "[mask-position:left_center] [-webkit-mask-position:left_center] ") +
        className
      }
      data-src={LOGO_URL}
    />
  );
}
