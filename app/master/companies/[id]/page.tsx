import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { CompanyDetailClient } from "@/components/master/company-detail-client";
import { getCompanyDetail, getPlans } from "@/app/master/companies/actions";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCompanyDetail(id);
  const plans = await getPlans();

  if (!detail.ok) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title={detail.data.company.name}
        description="Subscription and account management"
        backHref="/master/companies"
      />

      <Suspense fallback={<DashboardSkeleton />}>
        <CompanyDetailClient
          company={detail.data.company}
          subscription={detail.data.subscription}
          plan={detail.data.plan}
          usage={detail.data.usage}
          plans={plans.ok ? plans.data : []}
        />
      </Suspense>
    </div>
  );
}
