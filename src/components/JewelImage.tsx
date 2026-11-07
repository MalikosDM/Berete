import { useState } from "react";
import Logo from "@/components/Logo";

type JewelImageProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
};

/** A jewel shot on black, blended with lighten so it floats on the page, without frame. */
export default function JewelImage({
  src,
  alt,
  className = "",
  priority = false,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  width = 1200,
  height = 1500,
}: JewelImageProps) {
  const [failed, setFailed] = useState(!src);
  if (failed) {
    return (
      <span role="img" aria-label={alt} className={"flex items-center justify-center bg-ink " + className}>
        <Logo position="center" className="h-1/4 w-2/3 opacity-15" />
      </span>
    );
  }
  return (
    <img
      onError={() => setFailed(true)}
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      draggable={false}
      className={"jewel select-none " + className}
    />
  );
}
