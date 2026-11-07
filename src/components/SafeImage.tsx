import { useState, type ImgHTMLAttributes } from "react";
import Logo from "@/components/Logo";

type SafeImageProps = ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string };

/** An image that never shows its alt text: a missing file becomes black with the logo as a watermark. */
export default function SafeImage({ src, alt, className = "", ...rest }: SafeImageProps) {
  const [failed, setFailed] = useState(!src);
  const [prev, setPrev] = useState(src);
  if (prev !== src) {
    setPrev(src);
    setFailed(!src);
  }
  if (failed) {
    const a11y = alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true };
    return (
      <span {...a11y} className={"flex items-center justify-center overflow-hidden bg-black " + className}>
        <Logo position="center" className="h-1/4 w-2/3 opacity-15" />
      </span>
    );
  }
  return <img {...rest} src={src} alt={alt} onError={() => setFailed(true)} className={className} />;
}
