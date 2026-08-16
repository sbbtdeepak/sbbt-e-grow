import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { getCompanies, getPlans } from "@/app/master/companies/actions";
import { CreateCompanyDialog } from "./create-company-dialog";

export const dynamic = "force-dynamic";

export default async function MasterCompaniesPage() {
  await requireRole("master_admin");
  const result = await getCompanies();
  const plans = await getPlans();
  const companies = result.ok ? result.data : [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Companies"
        description="Manage companies, subscriptions, and plans."
        actions={<CreateCompanyDialog plans={plans.ok ? plans.data : []} />}
      />

      {companies.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No companies found.
        </Card>
      ) : (
        <div className="space-y-3">
          {companies.map((item) => {
            const { company, subscription, plan } = item;
            const statusVariant = {
              active: "default",
              trialing: "secondary",
              past_due: "outline",
              cancelled: "destructive",
              expired: "destructive",
            }[subscription?.status ?? "cancelled"] as
              | "default"
              | "secondary"
              | "outline"
              | "destructive"
              | null;

            return (
              <Link
                key={company.id}
                href={`/master/companies/${company.id}`}
                className="block"
              >
                <Card className="p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{company.name}</h3>
                        <Badge variant={statusVariant} className="text-xs capitalize">
                          {subscription?.status ?? "No subscription"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Plan: {plan?.name ?? "—"} ·
                        Joined {new Date(company.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <div className="pt-4">
        <Link href="/master/plans" className="text-sm text-primary hover:underline flex items-center gap-1">
          <ExternalLink className="size-4" />
          Manage Plans
        </Link>
      </div>
    </div>
  );
}
