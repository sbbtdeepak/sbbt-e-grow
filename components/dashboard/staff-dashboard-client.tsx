"use client";

import { Card } from "@/components/ui/card";
import Link from "next/link";
import type { DashboardWidget } from "@/app/(app)/dashboard/actions";

type StaffDashboardClientProps = {
  data: {
    widgets: DashboardWidget[];
    pendingDeliveries: { id: string; order_date: string; stage: string; notes: string | null }[];
    recentActivities: { id: string; order_date: string; stage: string; notes: string | null }[];
    role: string;
  };
};

export function StaffDashboardClient({ data }: StaffDashboardClientProps) {
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card size="default" className="p-5">
          <h3 className="text-sm font-medium text-muted-foreground">Pending Deliveries</h3>
          <div className="mt-4 flex flex-col gap-2.5">
            {data.pendingDeliveries.map((order) => (
              <Link
                key={order.id}
                href={`/orders`}
                className="rounded-xl bg-muted/40 p-3.5 text-sm transition-colors hover:bg-muted/70"
              >
                <p className="font-medium">Order {order.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">{order.order_date} · {order.stage}</p>
                {order.notes ? <p className="text-xs text-muted-foreground">{order.notes}</p> : null}
              </Link>
            ))}
            {data.pendingDeliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending deliveries.</p>
            ) : null}
          </div>
        </Card>

        <Card size="default" className="p-5">
          <h3 className="text-sm font-medium text-muted-foreground">Recent Activities</h3>
          <div className="mt-4 flex flex-col gap-2.5">
            {data.recentActivities.map((order) => (
              <Link
                key={order.id}
                href={`/orders`}
                className="rounded-xl bg-muted/40 p-3.5 text-sm transition-colors hover:bg-muted/70"
              >
                <p className="font-medium">Order {order.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">{order.order_date} · {order.stage}</p>
                {order.notes ? <p className="text-xs text-muted-foreground">{order.notes}</p> : null}
              </Link>
            ))}
            {data.recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}