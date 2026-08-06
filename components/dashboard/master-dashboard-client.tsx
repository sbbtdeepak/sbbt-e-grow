"use client";

import { Card } from "@/components/ui/card";
import Link from "next/link";
import type { DashboardWidget } from "@/app/(app)/dashboard/actions";

type MasterDashboardClientProps = {
  data: {
    widgets: DashboardWidget[];
    role: string;
  };
};

export function MasterDashboardClient({ data }: MasterDashboardClientProps) {
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

      <Card size="default" className="p-5">
        <h3 className="text-lg font-semibold tracking-tight">Master Admin Overview</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You have full access across all companies. Use Reports for deeper insights.
        </p>
      </Card>
    </div>
  );
}