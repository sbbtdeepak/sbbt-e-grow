import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { getPlans } from "@/app/(master)/companies/actions";

export const dynamic = "force-dynamic";

export default async function MasterPlansPage() {
  const result = await getPlans();
  const plans = result.ok ? result.data : [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Plans"
        description="All subscription plans and their feature availability."
        backHref="/master/companies"
      />

      {plans.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No plans found.
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="p-6">
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <Badge variant={plan.is_active ? "default" : "secondary"}>
                  {plan.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mt-2">
                {plan.description ?? "No description"}
              </p>

              <div className="mt-4 text-2xl font-bold">
                ${plan.price_monthly}/mo
              </div>

              {plan.features && (
                <div className="mt-4 space-y-1 text-sm">
                  {Object.entries(plan.features as Record<string, unknown>).map(
                    ([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/_/g, " ")}
                        </span>
                        <Badge variant={value ? "default" : "secondary"}>
                          {value ? "Yes" : "No"}
                        </Badge>
                      </div>
                    ),
                  )}
                </div>
              )}

              {plan.limits && (
                <div className="mt-3 space-y-1 text-sm">
                  {Object.entries(plan.limits as Record<string, unknown>).map(
                    ([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/_/g, " ")}
                        </span>
                        <span>{value?.toString() ?? "—"}</span>
                      </div>
                    ),
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
