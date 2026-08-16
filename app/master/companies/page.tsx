import { Building2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getCompanies, getPlans } from "@/app/master/companies/actions";
import { CompanyList } from "@/components/master/company-list";
import { CreateCompanyDialog } from "./create-company-dialog";

export const dynamic = "force-dynamic";

export default async function MasterCompaniesPage() {
  await requireRole("master_admin");
  const result = await getCompanies();
  const plans = await getPlans();
  const companies = result.ok ? result.data : [];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Companies"
        description="Manage tenants, subscriptions, administrators and account status."
        actions={
          companies.length > 0 ? (
            <CreateCompanyDialog plans={plans.ok ? plans.data : []} />
          ) : undefined
        }
      />

      {companies.length === 0 ? (
        <Card className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-inset ring-brand/15">
            <Building2 className="size-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold">No companies yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first SaaS company to start managing subscriptions,
              administrators and ERP access.
            </p>
          </div>
          <CreateCompanyDialog plans={plans.ok ? plans.data : []} />
        </Card>
      ) : (
        <CompanyList companies={companies} />
      )}
    </div>
  );
}
