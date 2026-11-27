import type { en } from "./en";

type Widen<T> = T extends string ? string : T extends (...args: infer A) => infer R ? (...args: A) => Widen<R> : T extends readonly (infer U)[] ? Widen<U>[] : { [K in keyof T]: Widen<T[K]> };
/** The words of the AI Creation Studio every language gives (src/i18n/studio/en.ts is the source). */
export type StudioWords = Widen<typeof en>;
