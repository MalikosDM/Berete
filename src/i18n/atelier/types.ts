import type { en } from "./en";

type Widen<T> = T extends string ? string : T extends (...args: infer A) => infer R ? (...args: A) => Widen<R> : T extends readonly (infer U)[] ? Widen<U>[] : { [K in keyof T]: Widen<T[K]> };
/** The words of The Private Atelier every language gives (src/i18n/atelier/en.ts is the source). */
export type AtelierWords = Widen<typeof en>;
