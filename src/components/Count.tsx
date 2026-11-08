/** A count written in the language of the page ("26 pieces", "قطعتان"), its number set apart for the rose gold. */
export default function Count({ text, numberClassName = "", wordClassName = "" }: { text: string; numberClassName?: string; wordClassName?: string }) {
  return (
    <>
      {text.split(/(\d+)/).map((part, i) =>
        part === "" ? null : /^\d+$/.test(part) ? (
          <span key={i} className={numberClassName}>
            {part}
          </span>
        ) : (
          <span key={i} className={wordClassName}>
            {part}
          </span>
        ),
      )}
    </>
  );
}
