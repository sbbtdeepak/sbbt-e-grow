import { requireCompanyUser } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions.server";
import { PageHeader } from "@/components/layout/page-header";
import { ReportClient } from "@/components/reports/report-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireCompanyUser();
  await requirePermission("reports");

  const initial = {
    reportType: "daily_sales",
    dateFrom: "",
    dateTo: "",
    marketplaceId: "all",
    sellerAccountId: "all",
    productId: "all",
    status: "",
    search: "",
    page: 1,
    pageSize: 25,
    sortBy: "report_date",
    sortOrder: "desc",
  } as const;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Reports"
        description="Server-side aggregated reports with CSV export."
      />
      <ReportClient initial={initial} />
    </div>
  );
}