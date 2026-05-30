import type { MrbdPrice } from "../types.js";

/** Formats a price's minor-unit amount as a localized currency string. */
export function formatAmount(unitAmount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(unitAmount / 100);
  } catch {
    return `${(unitAmount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/** Human-readable price label, including the billing cadence for subscriptions. */
export function formatPrice(price: MrbdPrice): string {
  const amount = formatAmount(price.unitAmount, price.currency);
  if (price.kind !== "recurring" || !price.recurringInterval) return amount;
  const count = price.intervalCount ?? 1;
  const period = count > 1 ? `${count} ${price.recurringInterval}s` : price.recurringInterval;
  return `${amount} / ${period}`;
}
