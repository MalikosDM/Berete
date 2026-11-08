/* Plurals and lists, written the way each language writes them (Intl). */

export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

const rules = new Map<string, Intl.PluralRules>();

/** The form of `forms` for `n` in this language; "#" is the number. */
export function plural(locale: string, n: number, forms: PluralForms): string {
  let rule = rules.get(locale);
  if (!rule) {
    rule = new Intl.PluralRules(locale);
    rules.set(locale, rule);
  }
  return (forms[rule.select(n)] ?? forms.other).replace("#", String(n));
}

/** "A, B and C" in this language. */
export function listOf(locale: string, items: string[]): string {
  if (items.length < 2) return items[0] ?? "";
  try {
    return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items);
  } catch {
    return items.join(", ");
  }
}
