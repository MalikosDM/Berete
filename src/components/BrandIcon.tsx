import { siInstagram, siWhatsapp } from "simple-icons";

type BrandIconProps = {
  name: "whatsapp" | "instagram";
  className?: string;
};

const ICONS = {
  whatsapp: siWhatsapp,
  instagram: siInstagram,
} as const;

export default function BrandIcon({ name, className = "size-5" }: BrandIconProps) {
  const icon = ICONS[name];
  return (
    <svg viewBox="0 0 24 24" className={"shrink-0 fill-current " + className} aria-hidden="true" focusable="false" data-brand={icon.title}>
      <path d={icon.path} />
    </svg>
  );
}
