"use client";

import { Card } from "@/components/ui/card";
import Link from "next/link";
import type { DashboardWidget } from "@/app/(app)/dashboard/actions";

type CompanyDashboardClientProps = {
  data: {
    widgets: DashboardWidget[];
    highlights: { label: string; value: string; sub?: string }[];
    monthlyTrend: { report_date: string; total_sales: number; total_profit: number }[];
    role: string;
  };
};

export function CompanyDashboardClient({ data }: CompanyDashboardClientProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.widgets.map((widget) => (
          <Card key={widget.title} size="default" className="group p-5 transition-all duration-150 ease-out hover:shadow-soft">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{widget.title}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{widget.value}</p>
            {widget.href ? (
              <Link href={widget.href} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-foreground/70 transition-colors hover:text-foreground">
                View details
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            ) : null}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card size="default" className="p-5 lg:col-span-1">
          <h3 className="text-sm font-medium text-muted-foreground">Highlights</h3>
          <div className="mt-4 flex flex-col gap-2.5">
            {data.highlights.map((item) => (
              <div key={item.label} className="rounded-xl bg-muted/40 p-3.5 transition-colors hover:bg-muted/70">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-sm font-medium">{item.value}</p>
                {item.sub ? (
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        <Card size="default" className="p-5 lg:col-span-2">
          <h3 className="text-sm font-medium text-muted-foreground">Monthly Trend</h3>
          <div className="mt-4 h-64 w-full">
            <div className="flex h-full items-end gap-1.5">
              {data.monthlyTrend.map((row) => (
                <div key={row.report_date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-lg bg-foreground/85 transition-all duration-150 hover:bg-foreground" style={{ height: `${Math.min(100, Math.max(4, row.total_sales / 1000))}%` }} />
                  <span className="text-[10px] text-muted-foreground">{new Date(row.report_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}