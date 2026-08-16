"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Clock,
  Package,
  ShoppingCart,
  Store,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  DashboardWidget,
  DashboardWidgetTone,
} from "@/app/(app)/dashboard/actions";

type MasterDashboardClientProps = {
  data: {
    widgets: DashboardWidget[];
    role: string;
  };
};

const ICONS: Record<string, typeof Building2> = {
  Companies: Building2,
  "Total Orders": ShoppingCart,
  "Total Sales": Wallet,
  "Total Profit": TrendingUp,
  "Pending Payments": Clock,
  Products: Package,
  Marketplaces: Store,
};

const TONE_STYLES: Record<
  DashboardWidgetTone,
  { icon: string; value: string; link: string }
> = {
  neutral: {
    icon: "bg-muted text-muted-foreground",
    value: "",
    link: "text-muted-foreground",
  },
  info: {
    icon: "bg-brand/10 text-brand",
    value: "",
    link: "text-brand",
  },
  success: {
    icon: "bg-emerald-50 text-emerald-600",
    value: "text-emerald-600",
    link: "text-emerald-600",
  },
  warning: {
    icon: "bg-amber-50 text-amber-600",
    value: "text-amber-600",
    link: "text-amber-600",
  },
  danger: {
    icon: "bg-red-50 text-red-600",
    value: "text-red-600",
    link: "text-red-600",
  },
};

export function MasterDashboardClient({ data }: MasterDashboardClientProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.widgets.map((widget) => {
          const Icon = ICONS[widget.title] ?? Building2;
          const tone = widget.tone ?? "neutral";
          const styles = TONE_STYLES[tone];
          const isProfit = widget.title === "Total Profit";

          return (
            <Card
              key={widget.title}
              className="group relative p-5 transition-all duration-150 ease-out hover:border-border/80 hover:shadow-soft"
            >
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg ring-1 ring-inset ring-black/[0.03]",
                    styles.icon,
                  )}
                >
                  <Icon className="size-4" />
                </span>
                {isProfit ? (
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full",
                      tone === "danger"
                        ? "bg-red-50 text-red-600"
                        : "bg-emerald-50 text-emerald-600",
                    )}
                    title={tone === "danger" ? "Negative profit" : "Positive profit"}
                  >
                    {tone === "danger" ? (
                      <TrendingDown className="size-4" />
                    ) : (
                      <TrendingUp className="size-4" />
                    )}
                  </span>
                ) : null}
              </div>

              <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {widget.title}
              </p>
              <p
                className={cn(
                  "mt-1 text-3xl font-semibold tracking-tight tabular-nums",
                  styles.value,
                )}
              >
                {widget.value}
              </p>
              {widget.subtitle ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {widget.subtitle}
                </p>
              ) : null}

              {widget.href ? (
                <Link
                  href={widget.href}
                  className={cn(
                    "mt-3 inline-flex items-center gap-1 text-xs font-medium transition-colors hover:underline",
                    styles.link,
                  )}
                >
                  View details
                  <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
              ) : null}
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <h3 className="text-lg font-semibold tracking-tight">
          Master Admin Overview
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You have full access across all companies. Use Reports for deeper
          insights.
        </p>
      </Card>
    </div>
  );
}
