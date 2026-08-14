import { Suspense } from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export const dynamic = "force-dynamic";

export default async function MasterAdminPage() {
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
  await requireRole("master_admin");

  return (
    <nav className="space-y-4">
      <Link href="/companies" className="group block p-4 border rounded hover:bg-primary/10 transition-colors">
        Companies
      </Link>
      <Link href="/plans" className="group block p-4 border rounded hover:bg-primary/10 transition-colors">
        Plans
      </Link>
      <Link href="/master/settings" className="group block p-4 border rounded hover:bg-primary/10 transition-colors">
        Settings
      </Link>
    </nav>
  );
}