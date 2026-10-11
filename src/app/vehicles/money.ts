/** `12,50` / `12.5` / `12` euros → integer cents; null if not a non-negative amount. */
export function eurosToCents(input: string): number | null {
  const match = /^(\d{1,9})(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

const euro = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export const formatCents = (cents: number) => euro.format(cents / 100);

/** Integer cents → `12,50`, the inverse of `eurosToCents` (form fields). */
export const centsToEuros = (cents: number) =>
  (cents / 100).toFixed(2).replace(".", ",");
