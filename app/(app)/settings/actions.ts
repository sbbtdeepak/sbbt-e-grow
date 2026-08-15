"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import {
  companyProfileSchema,
  changePasswordSchema,
  type CompanyProfileInput,
  type ChangePasswordInput,
} from "@/lib/validations/settings";
import {
  getActiveSubscription,
  getCompanyPlan,
  getUsage,
  getFeatureLimit,
} from "@/lib/saas/entitlements";
import type { Plan, Subscription } from "@/lib/saas/entitlements";
import { mapDbError } from "@/lib/saas/db-errors";

// ─── Company Profile ──────────────────────────────────────────────────────

export async function getCompanyProfile() {
  const ctx = await requireCompanyUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", ctx.companyId)
    .maybeSingle();

  if (error) return { ok: false, error: mapDbError(error) };
  if (!data) return { ok: false, error: "Company not found." };

  return {
    ok: true,
    data: {
      id: data.id,
      name: data.name,
      legalName: data.legal_name,
      logoUrl: data.logo_url,
      gst: data.gst,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      country: data.country,
      timezone: data.timezone,
      currency: data.currency,
      financialYearStart: data.financial_year_start,
      theme: data.theme,
    } as CompanyProfileInput & { id: string },
  };
}

export async function updateCompanyProfile(input: CompanyProfileInput) {
  const ctx = await requireCompanyUser();

  // Only company_admin can modify company profile.
  if (ctx.role !== "company_admin") {
    return { ok: false, error: "Only company admins can modify company profile." };
  }

  const parsed = companyProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("companies")
    .update({
      name: parsed.data.name,
      legal_name: parsed.data.legalName,
      logo_url: parsed.data.logoUrl,
      gst: parsed.data.gst,
      address: parsed.data.address,
      city: parsed.data.city,
      state: parsed.data.state,
      pincode: parsed.data.pincode,
      country: parsed.data.country,
      timezone: parsed.data.timezone,
      currency: parsed.data.currency,
      financial_year_start: parsed.data.financialYearStart,
      theme: parsed.data.theme,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.companyId);

  if (error) return { ok: false, error: mapDbError(error) };

  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

// ─── Account ──────────────────────────────────────────────────────────────

type AccountInfo = {
  userId: string;
  email: string;
  fullName: string | null;
  role: string;
  companyId: string | null;
  companyName: string | null;
};

export async function getAccountInfo(): Promise<
  | { ok: true; data: AccountInfo }
  | { ok: false; error: string }
> {
  const ctx = await requireCompanyUser();
  const supabase = await createSupabaseServerClient();

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, full_name, role, company_id")
    .eq("id", ctx.userId)
    .maybeSingle();

  if (profileErr || !profile) {
    return { ok: false, error: profileErr?.message ?? "Profile not found." };
  }

  let companyName: string | null = null;
  if (ctx.companyId) {
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", ctx.companyId)
      .maybeSingle();
    companyName = company?.name ?? null;
  }

  return {
    ok: true,
    data: {
      userId: ctx.userId,
      email: ctx.email,
      fullName: profile?.full_name ?? null,
      role: profile.role,
      companyId: profile.company_id,
      companyName,
    },
  };
}

export async function updateAccountProfile(fullName: string | null): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
  const ctx = await requireCompanyUser();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctx.userId);

  if (error) return { ok: false, error: mapDbError(error) };

  revalidatePath("/settings");
  return { ok: true };
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireCompanyUser();

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    const fieldError = parsed.error.flatten().fieldErrors;
    const firstError =
      fieldError.currentPassword?.[0] ??
      fieldError.newPassword?.[0] ??
      fieldError.confirmPassword?.[0] ??
      "Validation failed.";
    return { ok: false, error: firstError };
  }

  const supabase = await createSupabaseServerClient();

  // Verify current password by attempting a sign-in.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: ctx.email,
    password: parsed.data.currentPassword,
  });

  if (verifyError) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (error) return { ok: false, error: mapDbError(error) };

  revalidatePath("/settings");
  return { ok: true };
}

// ─── Subscription ─────────────────────────────────────────────────────────

export type SubscriptionData = {
  plan: Plan | null;
  subscription: Subscription | null;
  features: Record<string, boolean>;
  limits: Record<string, number | null>;
};

export async function getSubscriptionData(): Promise<
  | { ok: true; data: SubscriptionData }
  | { ok: false; error: string }
> {
  const plan = await getCompanyPlan();
  const subscription = await getActiveSubscription();

  const features: Record<string, boolean> = {};
  const limits: Record<string, number | null> = {};

  if (plan) {
    const planFeatures = (plan.features ?? {}) as Record<string, unknown>;
    const planLimits = (plan.limits ?? {}) as Record<string, unknown>;

    for (const [key, value] of Object.entries(planFeatures)) {
      features[key] = value === true;
    }
    for (const [key, value] of Object.entries(planLimits)) {
      limits[key] = value != null ? Number(value) : null;
    }
  }

  return { ok: true, data: { plan, subscription, features, limits } };
}

// ─── Usage ────────────────────────────────────────────────────────────────

export type UsageStat = {
  key: string;
  label: string;
  usage: number;
  limit: number | null;
  percent: number | null;
};

export async function getSettingsUsage(): Promise<
  | { ok: true; data: UsageStat[] }
  | { ok: false; error: string }
> {
  const limitKeys = [
    { key: "products_limit", label: "Products" },
    { key: "marketplaces_limit", label: "Marketplaces" },
    { key: "seller_accounts_limit", label: "Seller Accounts" },
    { key: "staff_users_limit", label: "Staff Users" },
    { key: "monthly_orders_limit", label: "Monthly Orders" },
  ];

  const stats: UsageStat[] = [];

  for (const { key, label } of limitKeys) {
    const [limit, usage] = await Promise.all([
      getFeatureLimit(key),
      getUsage(key),
    ]);

    const percent =
      limit !== null && limit !== Infinity
        ? Math.min(100, Math.round((usage / limit) * 100))
        : null;

    stats.push({ key, label, usage, limit, percent });
  }

  return { ok: true, data: stats };
}

// ─── Staff count ──────────────────────────────────────────────────────────

export async function getStaffCount(): Promise<{
  active: number;
  total: number;
}> {
  const ctx = await requireCompanyUser();
  const supabase = await createSupabaseServerClient();

  const { count: activeCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("company_id", ctx.companyId)
    .eq("role", "staff")
    .eq("is_active", true);

  const { count: totalCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("company_id", ctx.companyId)
    .eq("role", "staff");

  return {
    active: activeCount ?? 0,
    total: totalCount ?? 0,
  };
}
