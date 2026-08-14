import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOnboardingState } from "@/app/(app)/onboarding/actions";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const ctx = await requireRole(["company_admin"]);

  const [state, supabase] = await Promise.all([
    getOnboardingState(),
    createSupabaseServerClient(),
  ]);

  if (!state.ok || !state.data) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">
          {state.error ?? "Unable to load onboarding state."}
        </p>
      </div>
    );
  }

  if (state.data.completed) {
    redirect("/dashboard");
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", ctx.companyId ?? "")
    .single();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_id")
    .eq("company_id", ctx.companyId ?? "")
    .single();

  let planName = "Growth";
  if (subscription?.plan_id) {
    const { data: plan } = await supabase
      .from("plans")
      .select("name")
      .eq("id", subscription.plan_id)
      .single();
    planName = plan?.name ?? "Growth";
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4 sm:p-8">
      <OnboardingWizard
        initialState={state.data}
        companyName={company?.name ?? "Your Company"}
        planName={planName}
      />
    </div>
  );
}