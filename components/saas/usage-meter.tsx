"use client";

import { Badge } from "@/components/ui/badge";
import type { UsageStat } from "@/lib/saas/usage";

type UsageMeterProps = {
  stat: UsageStat;
  label?: string;
};

/**
 * Minimal SaaS usage indicator.
 * Shows e.g. "Products: 8 / 10 used" with a near-limit warning.
 */
export function UsageMeter({ stat, label }: UsageMeterProps) {
  const { usage, limit } = stat;
  const displayLabel = label ?? prettyLabel(stat.key);

  if (limit === null || limit === Infinity) {
    return (
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{displayLabel}</span>
        <span className="font-medium">{usage} used</span>
      </div>
    );
  }

  const percent = Math.min(100, Math.round((usage / limit) * 100));
  const nearLimit = percent >= 80;
  const atLimit = usage >= limit;

  let statusText = "";
  let badgeVariant:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | null
    | undefined = "secondary";

  if (atLimit) {
    badgeVariant = "destructive";
    statusText = "Limit reached";
  } else if (nearLimit) {
    badgeVariant = "default";
    statusText = "Near limit";
  } else {
    statusText = "OK";
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground">{displayLabel}</span>
        <span className="font-medium">
          {usage} / {limit} used
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${
            atLimit
              ? "w-full bg-destructive"
              : nearLimit
                ? "bg-amber-500"
                : "bg-green-500"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {statusText ? (
        <Badge variant={badgeVariant} className="self-start text-xs">
          {statusText}
        </Badge>
      ) : null}
    </div>
  );
}

function prettyLabel(key: string): string {
  const map: Record<string, string> = {
    products_limit: "Products",
    marketplaces_limit: "Marketplaces",
    seller_accounts_limit: "Seller Accounts",
    monthly_orders_limit: "Monthly Orders",
  };
  return map[key] ?? key;
}
