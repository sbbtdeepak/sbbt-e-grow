import { Suspense } from "react";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { getMasterDashboard, getCompanyDashboard, getStaffDashboard } from "@/app/(app)/dashboard/actions";
import { getOnboardingState } from "@/app/(app)/onboarding/actions";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { MasterDashboardClient } from "@/components/dashboard/master-dashboard-client";
import { CompanyDashboardClient } from "@/components/dashboard/company-dashboard-client";
import { StaffDashboardClient } from "@/components/dashboard/staff-dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Dashboard"
        description="Role-based operational overview powered by Reports Engine."
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardRouter />
      </Suspense>
    </div>
  );
}

async function DashboardRouter() {
  const ctx = await requireUser();

  // Company admins who have not completed onboarding go to the onboarding wizard.
  if (ctx.role === "company_admin") {
    const onboardingState = await getOnboardingState();
    if (onboardingState.ok && onboardingState.data && !onboardingState.data.completed) {
      redirect("/onboarding");
    }
  }

  if (ctx.role === "master_admin") {
    const result = await getMasterDashboard();
    if (!result.ok) throw new Error("Failed to load master dashboard.");
    return <MasterDashboardClient data={result.data} />;
  }

  if (ctx.role === "company_admin") {
    const result = await getCompanyDashboard();
    if (!result.ok) throw new Error("Failed to load company dashboard.");
    return <CompanyDashboardClient data={result.data} />;
  }

  const result = await getStaffDashboard();
  if (!result.ok) throw new Error("Failed to load staff dashboard.");
  return <StaffDashboardClient data={result.data} />;
}
