/*
 * The text of a piece (its story), written as paragraphs separated by a blank line. Two marks, at the start of a
 * paragraph, give it a shape on its page (the official text of Yoni for the Dragon Ball pendant, 22/11/2026):
 *   "## The Vision Behind the Creation"   a title of a part of the text
 *   "> Not power taken, but power entrusted."   its closing words, set apart as a quote
 * The marks stay out of the translations (each paragraph is translated without them, src/i18n/content.ts) and out of the
 * plain text (the description of the page for search engines, the home page).
 */
export type StoryBlock = { kind: "title" | "paragraph" | "quote"; text: string };

const MARKS: [string, StoryBlock["kind"]][] = [
  ["## ", "title"],
  ["> ", "quote"],
];

/** The mark at the start of a paragraph ("## ", "> "), or "". */
export function storyMark(paragraph: string): string {
  return MARKS.find(([m]) => paragraph.startsWith(m))?.[0] ?? "";
}

/** The paragraphs of a story, each with its shape. */
export function storyBlocks(story: string): StoryBlock[] {
  return story
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const mark = MARKS.find(([m]) => p.startsWith(m));
      return mark ? { kind: mark[1], text: p.slice(mark[0].length).trim() } : { kind: "paragraph", text: p };
    });
}

/** The story as plain text (its paragraphs only, without the titles), for a description. */
export function plainStory(story: string): string {
  return storyBlocks(story)
    .filter((b) => b.kind !== "title")
    .map((b) => b.text)
    .join(" ");
}
