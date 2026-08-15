import Link from "next/link";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

function currencySymbol(currency?: string): string {
  if (currency && CURRENCY_SYMBOLS[currency]) return CURRENCY_SYMBOLS[currency];
  return "$";
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
            {tier.price_yearly}/year · save ~17%
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
          </a>
        ) : (
          <Link href={ctaHref}>Get started</Link>
        )}
      </Button>

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
