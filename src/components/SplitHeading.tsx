import { createElement } from "react";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "p";

type SplitHeadingProps = {
  as?: HeadingTag;
  children: string;
  className?: string;
  /** Kept for the pages that pass it; the title no longer moves. */
  delay?: number;
  eyebrow?: string;
  id?: string;
};

/**
 * A title in the capitals of the house, with its small line above it. Still, as it is written (Yoni, call of 24/11/2026: no
 * more words or letters that appear one after another, "tac, tac, j'aime pas ça", anywhere on the site).
 */
export default function SplitHeading({ as = "h2", children, className = "", eyebrow, id }: SplitHeadingProps) {
  return (
    <>
      {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
      {createElement(as, { id, className: "title-caps break-words text-white " + className }, children)}
    </>
  );
}
