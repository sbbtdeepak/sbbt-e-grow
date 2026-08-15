"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { mapDbError } from "@/lib/saas/db-errors";

export type OnboardingState = {
  currentStep: number; // 1-6
  completed: boolean;
  completedAt: string | null;
  skippedMarketplaces?: boolean;
  skippedSellers?: boolean;
  skippedProducts?: boolean;
};

const ONBOARDING_KEY = "onboarding_state";

/**
 * Load onboarding state for the current company.
 * Uses server-side session context — never trusts client company_id.
 */
export async function getOnboardingState(): Promise<{
  ok: boolean;
  data?: OnboardingState | null;
  error?: string;
}> {
  const ctx = await getSessionContext();
  if (!ctx?.companyId) {
    return { ok: false, error: "No company session." };
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("company_settings")
    .select("value")
    .eq("company_id", ctx.companyId)
    .eq("key", ONBOARDING_KEY)
    .maybeSingle();

  if (error) {
    return { ok: false, error: mapDbError(error) };
  }

  if (!data) {
    // No onboarding state — treat as not started (step 1)
    return { ok: true, data: { currentStep: 1, completed: false, completedAt: null } };
  }

  const value = data.value as Partial<OnboardingState> | null;
  if (!value || typeof value.currentStep !== "number") {
    return { ok: true, data: { currentStep: 1, completed: false, completedAt: null } };
  }

  return {
    ok: true,
    data: {
      currentStep: value.currentStep,
      completed: value.completed ?? false,
      completedAt: value.completedAt ?? null,
      skippedMarketplaces: value.skippedMarketplaces ?? false,
      skippedSellers: value.skippedSellers ?? false,
      skippedProducts: value.skippedProducts ?? false,
    },
  };
}

/**
 * Save onboarding state. Only valid for the authenticated user's own company.
 */
export async function saveOnboardingState(step: number, completed = false) {
  "use server";

  const ctx = await getSessionContext();
  if (!ctx?.companyId) {
    return { ok: false, error: "No company assigned." };
  }

  const supabase = await createSupabaseServerClient();

  const state: OnboardingState = {
    currentStep: Math.max(1, Math.min(6, step)),
    completed,
    completedAt: completed ? new Date().toISOString() : null,
  };

  const { error } = await supabase
    .from("company_settings")
    .upsert(
      {
        company_id: ctx.companyId,
        key: ONBOARDING_KEY,
        value: state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id,key" },
    );

  if (error) {
    return { ok: false, error: mapDbError(error) };
  }

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Mark a step as skipped (marketplace, seller, or products).
 */
export async function skipOnboardingStep(skipKey: "skippedMarketplaces" | "skippedSellers" | "skippedProducts") {
  "use server";

  const ctx = await getSessionContext();
  if (!ctx?.companyId) {
    return { ok: false, error: "No company assigned." };
  }

  const current = await getOnboardingState();
  if (!current.ok || !current.data) {
    return { ok: false, error: current.error ?? "No onboarding state." };
  }

  const nextStep = Math.min(6, current.data.currentStep + 1);
  const supabase = await createSupabaseServerClient();

  const updatedState: OnboardingState = {
    ...current.data,
    [skipKey]: true,
    currentStep: nextStep,
  };

  const { error } = await supabase
    .from("company_settings")
    .upsert(
      {
        company_id: ctx.companyId,
        key: ONBOARDING_KEY,
        value: updatedState,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id,key" },
    );

  if (error) {
    return { ok: false, error: mapDbError(error) };
  }

  revalidatePath("/onboarding");
  return { ok: true };
}

/**
 * Mark onboarding as completed — sets completed=true so user goes to dashboard.
 */
export async function completeOnboarding() {
  "use server";

  const result = await saveOnboardingState(6, true);
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  return result;
}