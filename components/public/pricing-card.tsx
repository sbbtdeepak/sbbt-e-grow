import Link from "next/link";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currencySymbol } from "@/lib/saas/catalogue";
import type { Json } from "@/types/database";

type PricingTier = {
  id: string;
  tier_name: string;
  description?: string | null;
  price_monthly: number;
  price_yearly: number;
  currency?: string;
  is_popular: boolean;
  features: Json;
  limits: Json;
};

/**
 * Per-tier "what's included" list. Supports the two JSONB shapes stored by
 * Master Admin:
 *  - object of key → truthy/falsy flags: render only enabled keys
 *  - array of strings: render as a plain bullet list
 */
function includedFeatures(features: Json): string[] {
  if (Array.isArray(features)) {
    return features.filter((f): f is string => typeof f === "string");
  }
  if (features && typeof features === "object") {
    return Object.entries(features as Record<string, unknown>)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key.replace(/_/g, " "));
  }
  return [];
}

/**
 * Actual annual saving when paying yearly instead of 12× monthly.
 * Returns null when there is no meaningful saving (yearly >= monthly × 12).
 */
function savingsPercent(monthly: number, yearly: number): number | null {
  if (monthly <= 0 || yearly <= 0) return null;
  const annualEquivalent = monthly * 12;
  if (annualEquivalent <= yearly) return null;
  const pct = Math.round(((annualEquivalent - yearly) / annualEquivalent) * 100);
  return pct >= 5 ? pct : null;
}

type PublicPricingCardProps = {
  tier: PricingTier;
  ctaHref?: string;
  /** When true the CTA launches ctaHref in a new tab (external application). */
  ctaExternal?: boolean;
};

export function PublicPricingCard({
  tier,
  ctaHref = "/catalogue",
  ctaExternal = false,
}: PublicPricingCardProps) {
  const symbol = currencySymbol(tier.currency);
  const savings = savingsPercent(tier.price_monthly, tier.price_yearly);
  const included = includedFeatures(tier.features);

  return (
    <Card
      className={cn(
        "relative flex flex-col border-border/60 bg-card/60 p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand/5 hover:border-brand/30",
        tier.is_popular && "border-brand/40 shadow-md shadow-brand/5",
      )}
    >
      {tier.is_popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-brand text-brand-foreground text-[11px] uppercase tracking-wide">
            Recommended
          </Badge>
        </div>
      )}

      <div className="mb-5">
        <h3 className="font-heading text-xl font-semibold">{tier.tier_name}</h3>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="font-heading text-4xl font-bold">
            {symbol}
            {tier.price_monthly}
          </span>
          <span className="text-base text-muted-foreground">/mo</span>
        </div>
        {tier.price_yearly > 0 && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            {symbol}
            {tier.price_yearly}/year
            {savings !== null && (
              <span className="text-emerald-600 dark:text-emerald-400">
                {" "}
                · save {savings}%
              </span>
            )}
          </p>
        )}
        {tier.description && (
          <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
        )}
      </div>

      <Button
        asChild
        className="w-full"
        variant={tier.is_popular ? "default" : "outline"}
      >
        {ctaExternal ? (
          <a href={ctaHref} target="_blank" rel="noopener noreferrer">
            Get started
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        ) : (
          <Link href={ctaHref}>Get started</Link>
        )}
      </Button>

      {included.length > 0 && (
        <div className="mt-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            What&apos;s included
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {included.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                <span className="capitalize">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {Object.keys(tier.limits ?? {}).length > 0 && (
        <div className="mt-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Limits
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {Object.entries(tier.limits as Record<string, unknown>).map(([key, value]) => (
              <li key={key} className="flex items-center justify-between">
                <span className="capitalize">{key.replace(/_/g, " ")}</span>
                <span className="font-semibold text-foreground">{String(value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
