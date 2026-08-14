import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { MasterProductsClient } from "./products-client";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export const dynamic = "force-dynamic";

export default async function MasterProductsPage() {
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
