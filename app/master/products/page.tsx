import { Suspense } from "react";

import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { MasterProductsClient } from "./products-client";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export const dynamic = "force-dynamic";

export default async function MasterProductsPage() {
  // Server-side guard — direct URL access is denied for non-master roles.
  await requireRole("master_admin");

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Products"
        description="Manage the public SaaS product catalogue."
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <MasterProductsClient />
      </Suspense>
    </div>
  );
}
