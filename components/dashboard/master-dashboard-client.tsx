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
          <Card key={widget.title} className="p-4">
            <p className="text-xs text-muted-foreground">{widget.title}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{widget.value}</p>
            {widget.href ? (
              <Link href={widget.href} className="text-xs text-primary">
                View details →
              </Link>
            ) : null}
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold">Master Admin Overview</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You have full access across all companies. Use Reports for deeper insights.
        </p>
      </Card>
    </div>
  );
}