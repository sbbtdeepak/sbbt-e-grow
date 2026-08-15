/**
 * Shared helpers for the public SaaS catalogue.
 * Keeps currency formatting and price derivation in one place so product
 * cards, pricing cards, and the homepage never duplicate the logic.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/** Map an ISO currency code to its display symbol (defaults to $). */
export function currencySymbol(currency?: string | null): string {
  if (currency && CURRENCY_SYMBOLS[currency]) return CURRENCY_SYMBOLS[currency];
  return "$";
}

export type PricePoint = {
  amount: number;
  currency: string;
};

type TierLike = {
  price_monthly: number;
  currency?: string | null;
  is_active?: boolean | null;
};

/**
 * Cheapest active monthly price for a product's tiers, or null when the
 * product has no active pricing. `is_active` is checked defensively (RLS
 * already hides inactive tiers from public queries, but pages render via
 * both public and master paths).
 */
export function cheapestActivePrice(
  tiers?: TierLike[] | null,
): PricePoint | null {
  const active = (tiers ?? []).filter((tier) => tier.is_active !== false);
  if (active.length === 0) return null;

  const cheapest = active.reduce((a, b) =>
    a.price_monthly <= b.price_monthly ? a : b,
  );

  return {
    amount: cheapest.price_monthly,
    currency: cheapest.currency ?? "USD",
  };
}
