import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export const dynamic = "force-dynamic";

export default async function MasterAdminPage() {
  // Guard at the top of the page component — not inside the Suspense
  // child, where the 403 would be swallowed by the boundary.
  await requireRole("master_admin");

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="SaaS Control Center"
        description="Master Admin — Company and plan management"
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <MasterRouter />
      </Suspense>
    </div>
  );
}

async function MasterRouter() {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/master/companies" className="group block p-4 border rounded hover:bg-primary/10 transition-colors">
        Companies
      </Link>
      <Link href="/master/plans" className="group block p-4 border rounded hover:bg-primary/10 transition-colors">
        Plans
      </Link>
      <Link href="/master/products" className="group block p-4 border rounded hover:bg-primary/10 transition-colors">
        Products
      </Link>
    </div>
  );
}
