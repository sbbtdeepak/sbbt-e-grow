"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { getSiteUrl } from "@/lib/site";
import {
  companyIdSchema,
  planIdSchema,
  subscriptionStatusSchema,
  trialDurationSchema,
  cancelSubscriptionSchema,
  reactivateSchema,
  type SubscriptionStatus,
} from "@/lib/validations/subscription";
import type {
  Plan,
  Subscription,
} from "@/lib/saas/entitlements";
import type { Database } from "@/types/database";
import { mapDbError } from "@/lib/saas/db-errors";

type CompanyWithSub = {
  company: Database["public"]["Tables"]["companies"]["Row"];
  subscription: Database["public"]["Tables"]["subscriptions"]["Row"] | null;
  plan: Plan | null;
};

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const createCompanySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Company name is required.")
    .max(120, "Company name is too long."),
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug may only contain lowercase letters, numbers, and single hyphens.",
    )
    .min(3, "Slug must be at least 3 characters.")
    .max(60, "Slug is too long.")
    .optional()
    .or(z.literal("")),
  planId: z.string().uuid("Invalid plan.").optional().nullable(),
  adminEmail: z
    .string()
    .trim()
    .email("A valid admin email is required.")
    .optional()
    .or(z.literal("")),
});

/**
 * Generate a URL-safe slug from a company name.
 * Lowercases, drops accents, collapses non-alphanumerics to single hyphens.
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Create a new company (SaaS tenant) as Master Admin.
 *
 * - Company row (RLS: master_admin only).
 * - Initializes a subscription when a plan is selected (same shape as
 *   assignPlan's new-subscription branch — no new schema).
 * - Optionally invites a company admin via the existing admin-client
 *   pattern and assigns their profile to the newly created company.
 *
 * The admin invitation is a separate, non-fatal operation: a company is
 * created even if the invitation fails, and the failure is surfaced on the
 * result so the UI can show it clearly (no invented rollback behavior).
 */
export async function createCompany(input: {
  name: string;
  slug?: string | null;
  planId?: string | null;
  adminEmail?: string | null;
}): Promise<
  ActionResult<{
    companyId: string;
    companyName: string;
    slug: string;
    subscriptionId: string | null;
    adminInvited: boolean;
    adminInviteError?: string;
  }>
> {
  await requireRole("master_admin");

  const parsed = createCompanySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid company details.",
    };
  }

  const name = parsed.data.name;
  const requestedSlug = parsed.data.slug?.trim() || null;
  const planId = parsed.data.planId || null;
  const adminEmail = parsed.data.adminEmail?.trim() || null;

  const supabase = await createSupabaseServerClient();

  // Resolve a unique slug. An explicitly provided slug must be unique
  // (clean error otherwise); an auto-generated slug gets a numeric suffix.
  const baseSlug = requestedSlug ?? slugify(name);
  if (!baseSlug) {
    return { ok: false, error: "Unable to generate a slug from the company name." };
  }

  let slug = baseSlug;
  if (requestedSlug) {
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existing) {
      return { ok: false, error: "This slug is already in use. Choose another." };
    }
  } else {
    for (let attempt = 1; attempt <= 20; attempt++) {
      const { data: existing } = await supabase
        .from("companies")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${baseSlug.slice(0, 50)}-${attempt + 1}`;
      if (attempt === 20) {
        return {
          ok: false,
          error: "Unable to generate a unique slug. Please provide one manually.",
        };
      }
    }
  }

  // Create the company. company_id comes from the server-side insert below
  // — never from client input.
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({ name, slug, is_active: true })
    .select("id, name, slug")
    .single();

  if (companyError || !company) {
    return {
      ok: false,
      error: mapDbError(companyError, "Unable to create the company."),
    };
  }

  // Initialize the subscription (optional). Mirrors assignPlan's
  // new-subscription branch exactly.
  let subscriptionId: string | null = null;
  if (planId) {
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("id, is_active")
      .eq("id", planId)
      .maybeSingle();

    if (planError || !plan || !plan.is_active) {
      return {
        ok: false,
        error: planError?.message ?? "Selected plan is not available.",
      };
    }

    const now = new Date().toISOString();
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        company_id: company.id,
        plan_id: planId,
        status: "active" as SubscriptionStatus,
        trial_start: null,
        trial_end: null,
        current_period_start: now,
        current_period_end: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        cancelled_at: null,
      })
      .select("id")
      .single();

    if (subError || !subscription) {
      return {
        ok: false,
        error: mapDbError(
          subError,
          "Company created, but the subscription could not be initialized.",
        ),
      };
    }
    subscriptionId = subscription.id;
  }

  // Optional company-admin invitation — separate, non-fatal operation.
  let adminInvited = false;
  let adminInviteError: string | undefined;
  if (adminEmail) {
    const admin = await createSupabaseAdminClient();

    const { data: inviteData, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(adminEmail, {
        data: { full_name: null, role: "company_admin" },
        redirectTo: `${getSiteUrl()}/auth/callback`,
      });

    if (inviteError || !inviteData?.user?.id) {
      adminInviteError = mapDbError(
        inviteError,
        "Company created, but the admin invitation could not be sent.",
      );
    } else {
      // Assign the invited user's profile to the new company as its admin.
      const { error: profileError } = await admin.from("profiles").upsert({
        id: inviteData.user.id,
        company_id: company.id,
        role: "company_admin",
        full_name: null,
        is_active: true,
      });

      if (profileError) {
        adminInviteError = mapDbError(
          profileError,
          "Company created, but the admin profile could not be assigned.",
        );
      } else {
        adminInvited = true;
      }
    }
  }

  revalidatePath("/master/companies");
  return {
    ok: true,
    data: {
      companyId: company.id,
      companyName: company.name,
      slug: company.slug,
      subscriptionId,
      adminInvited,
      ...(adminInviteError ? { adminInviteError } : {}),
    },
  };
}

/**
 * List all companies with their current subscription and plan info.
 * Master Admin only.
 */
export async function getCompanies(): Promise<ActionResult<CompanyWithSub[]>> {
  await requireRole("master_admin");

  const supabase = await createSupabaseServerClient();

  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (companiesError) return { ok: false, error: mapDbError(companiesError) };

  const companyIds = (companies ?? []).map((c) => c.id);

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*")
    .in("company_id", companyIds);

  const subByCompany = new Map(
    (subscriptions ?? []).map((s) => [s.company_id, s]),
  );

  const planIds = [
    ...new Set(
      (subscriptions ?? []).map((s) => s.plan_id).filter(Boolean),
    ),
  ];

  let plans: Plan[] = [];
  if (planIds.length > 0) {
    const { data: plansData } = await supabase
      .from("plans")
      .select("*")
      .in("id", planIds);
    plans = plansData ?? [];
  }

  const planMap = new Map(plans.map((p) => [p.id, p]));

  const result: CompanyWithSub[] = (companies ?? []).map((company) => ({
    company,
    subscription: subByCompany.get(company.id) ?? null,
    plan: planMap.get(subByCompany.get(company.id)?.plan_id ?? "") ?? null,
  }));

  return { ok: true, data: result };
}

/**
 * Fetch all active plans for the plan selector dropdown.
 * Master Admin only.
 */
export async function getPlans(): Promise<ActionResult<Plan[]>> {
  await requireRole("master_admin");

  const supabase = await createSupabaseServerClient();

  const { data: plans, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return { ok: false, error: mapDbError(error) };

  return { ok: true, data: plans ?? [] };
}

/**
 * Fetch full company detail with subscription, plan, and usage.
 * Master Admin only.
 */
export async function getCompanyDetail(
  companyId: string,
): Promise<ActionResult<{
  company: Database["public"]["Tables"]["companies"]["Row"];
  subscription: Subscription | null;
  plan: Plan | null;
  usage: {
    products: number;
    marketplaces: number;
    sellerAccounts: number;
    staff: number;
    monthlyOrders: number;
  };
}>> {
  await requireRole("master_admin");

  const parsed = companyIdSchema.safeParse({ companyId });
  if (!parsed.success) {
    return { ok: false, error: "Invalid company ID." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", parsed.data.companyId)
    .maybeSingle();

  if (companyError || !company) {
    return { ok: false, error: companyError?.message ?? "Company not found." };
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let plan: Plan | null = null;
  if (subscription?.plan_id) {
    const { data: planData } = await supabase
      .from("plans")
      .select("*")
      .eq("id", subscription.plan_id)
      .maybeSingle();
    plan = planData;
  }

  // Fetch usage counts
  const [
    productsCount,
    marketplacesCount,
    sellerAccountsCount,
    staffCount,
    monthlyOrdersCount,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id),
    supabase
      .from("marketplaces")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id),
    supabase
      .from("seller_accounts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .eq("role", "staff")
      .eq("is_active", true),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .neq("stage", "entry"),
  ]);

  return {
    ok: true,
    data: {
      company,
      subscription,
      plan,
      usage: {
        products: productsCount.count ?? 0,
        marketplaces: marketplacesCount.count ?? 0,
        sellerAccounts: sellerAccountsCount.count ?? 0,
        staff: staffCount.count ?? 0,
        monthlyOrders: monthlyOrdersCount.count ?? 0,
      },
    },
  };
}

/**
 * Assign a plan to a company — creates a new subscription or
 * updates the existing one with the new plan.
 * Preserves usage, ERP data, users, and staff permissions.
 */
export async function assignPlan(
  companyId: string,
  planId: string,
): Promise<ActionResult<Subscription>> {
  await requireRole("master_admin");

  const parsed = planIdSchema
    .merge(companyIdSchema)
    .safeParse({ companyId, planId });
  if (!parsed.success) {
    return { ok: false, error: "Invalid company or plan ID." };
  }

  const supabase = await createSupabaseServerClient();

  // Verify plan exists and is active.
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, is_active")
    .eq("id", parsed.data.planId)
    .maybeSingle();

  if (planError || !plan || !plan.is_active) {
    return { ok: false, error: planError?.message ?? "Plan not found or inactive." };
  }

  const now = new Date().toISOString();

  // Check if a subscription already exists.
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("company_id", parsed.data.companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Update existing subscription with new plan.
    const { data: updated, error } = await supabase
      .from("subscriptions")
      .update({
        plan_id: parsed.data.planId,
        status: "active" as SubscriptionStatus,
        current_period_start: now,
        current_period_end: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        cancelled_at: null,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) return { ok: false, error: mapDbError(error) };
    revalidatePath("/master/companies");
    return { ok: true, data: updated };
  } else {
    // Create new subscription.
    const { data: created, error } = await supabase
      .from("subscriptions")
      .insert({
        company_id: parsed.data.companyId,
        plan_id: parsed.data.planId,
        status: "active" as SubscriptionStatus,
        trial_start: null,
        trial_end: null,
        current_period_start: now,
        current_period_end: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        cancelled_at: null,
      })
      .select("*")
      .single();

    if (error) return { ok: false, error: mapDbError(error) };
    revalidatePath("/master/companies");
    return { ok: true, data: created };
  }
}

/**
 * Change only the plan on an existing subscription (preserves
 * status, period dates, and all other fields).
 */
export async function changePlan(
  companyId: string,
  planId: string,
): Promise<ActionResult<Subscription>> {
  await requireRole("master_admin");

  const parsed = planIdSchema.merge(companyIdSchema).safeParse({ companyId, planId });
  if (!parsed.success) {
    return { ok: false, error: "Invalid company or plan ID." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, is_active")
    .eq("id", parsed.data.planId)
    .maybeSingle();

  if (planError || !plan || !plan.is_active) {
    return { ok: false, error: planError?.message ?? "Plan not found or inactive." };
  }

  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("company_id", parsed.data.companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError || !sub) {
    return { ok: false, error: "No active subscription found for this company." };
  }

  const { data: updated, error } = await supabase
    .from("subscriptions")
    .update({
      plan_id: parsed.data.planId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sub.id)
    .select("*")
    .single();

  if (error) return { ok: false, error: mapDbError(error) };

  revalidatePath(`/master/companies/${parsed.data.companyId}`);
  revalidatePath("/master/companies");
  return { ok: true, data: updated };
}

/**
 * Set subscription status.
 */
export async function setSubscriptionStatus(
  companyId: string,
  status: SubscriptionStatus,
): Promise<ActionResult<Subscription>> {
  await requireRole("master_admin");

  const parsed = subscriptionStatusSchema
    .merge(companyIdSchema)
    .safeParse({ companyId, status });
  if (!parsed.success) {
    return { ok: false, error: "Invalid company ID or status." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("company_id", parsed.data.companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError || !sub) {
    return { ok: false, error: "No subscription found for this company." };
  }

  const updates: Database["public"]["Tables"]["subscriptions"]["Update"] = {
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  };

  // Clear cancelled_at when transitioning back to active
  if (parsed.data.status === "active" || parsed.data.status === "trialing") {
    updates.cancelled_at = null;
  }

  const { data: updated, error } = await supabase
    .from("subscriptions")
    .update(updates)
    .eq("id", sub.id)
    .select("*")
    .single();

  if (error) return { ok: false, error: mapDbError(error) };

  revalidatePath(`/master/companies/${parsed.data.companyId}`);
  revalidatePath("/master/companies");
  return { ok: true, data: updated };
}

/**
 * Start a trial for a company's subscription.
 * Sets trial_start = now, trial_end = now + days.
 */
export async function startTrial(
  companyId: string,
  days: number,
): Promise<ActionResult<Subscription>> {
  await requireRole("master_admin");

  const parsed = trialDurationSchema
    .merge(companyIdSchema)
    .safeParse({ companyId, days });
  if (!parsed.success) {
    return { ok: false, error: "Invalid company ID or trial duration." };
  }

  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const trialEnd = new Date(now.getTime() + parsed.data.days * 24 * 60 * 60 * 1000);

  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("company_id", parsed.data.companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError || !sub) {
    return { ok: false, error: "No subscription found. Assign a plan first." };
  }

  const { data: updated, error } = await supabase
    .from("subscriptions")
    .update({
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
      status: "trialing" as SubscriptionStatus,
      updated_at: now.toISOString(),
    })
    .eq("id", sub.id)
    .select("*")
    .single();

  if (error) return { ok: false, error: mapDbError(error) };

  revalidatePath(`/master/companies/${parsed.data.companyId}`);
  revalidatePath("/master/companies");
  return { ok: true, data: updated };
}

/**
 * Extend an existing trial by N days from the current trial_end.
 * If no trial_end exists, starts a new trial.
 */
export async function extendTrial(
  companyId: string,
  days: number,
): Promise<ActionResult<Subscription>> {
  await requireRole("master_admin");

  const parsed = trialDurationSchema
    .merge(companyIdSchema)
    .safeParse({ companyId, days });
  if (!parsed.success) {
    return { ok: false, error: "Invalid company ID or trial duration." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("company_id", parsed.data.companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError || !sub) {
    return { ok: false, error: "No subscription found. Assign a plan first." };
  }

  const baseDate = sub.trial_end
    ? new Date(sub.trial_end)
    : sub.trial_start
      ? new Date(sub.trial_start)
      : new Date();

  const newTrialEnd = new Date(
    baseDate.getTime() + parsed.data.days * 24 * 60 * 60 * 1000,
  );

  const trialStart = sub.trial_start
    ? sub.trial_start
    : new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("subscriptions")
    .update({
      trial_start: trialStart,
      trial_end: newTrialEnd.toISOString(),
      status: "trialing" as SubscriptionStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sub.id)
    .select("*")
    .single();

  if (error) return { ok: false, error: mapDbError(error) };

  revalidatePath(`/master/companies/${parsed.data.companyId}`);
  revalidatePath("/master/companies");
  return { ok: true, data: updated };
}

/**
 * Set the billing period start and end dates.
 */
export async function setSubscriptionPeriod(
  companyId: string,
  periodStart: string,
  periodEnd: string,
): Promise<ActionResult<Subscription>> {
  await requireRole("master_admin");

  const parsed = z
    .object({
      companyId: z.string().uuid("Invalid company ID."),
      periodStart: z.string().min(1, "Period start is required."),
      periodEnd: z.string().min(1, "Period end is required."),
    })
    .refine(
      (d) => new Date(d.periodEnd) >= new Date(d.periodStart),
      {
        message: "Period end must be after or equal to period start.",
        path: ["periodEnd"],
      },
    )
    .safeParse({ companyId, periodStart, periodEnd });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid period dates.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("company_id", parsed.data.companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError || !sub) {
    return { ok: false, error: "No subscription found." };
  }

  const { data: updated, error } = await supabase
    .from("subscriptions")
    .update({
      current_period_start: parsed.data.periodStart,
      current_period_end: parsed.data.periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sub.id)
    .select("*")
    .single();

  if (error) return { ok: false, error: mapDbError(error) };

  revalidatePath(`/master/companies/${parsed.data.companyId}`);
  revalidatePath("/master/companies");
  return { ok: true, data: updated };
}

/**
 * Cancel a subscription — sets status = 'cancelled' and cancelled_at = now.
 * Does NOT delete the subscription or any ERP data.
 */
export async function cancelSubscription(
  companyId: string,
  reason?: string | null,
): Promise<ActionResult<Subscription>> {
  await requireRole("master_admin");

  const parsed = cancelSubscriptionSchema.safeParse({ companyId, reason });
  if (!parsed.success) {
    return { ok: false, error: "Invalid company ID." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("company_id", parsed.data.companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError || !sub) {
    return { ok: false, error: "No subscription found." };
  }

  const now = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled" as SubscriptionStatus,
      cancelled_at: now,
      updated_at: now,
    })
    .eq("id", sub.id)
    .select("*")
    .single();

  if (error) return { ok: false, error: mapDbError(error) };

  revalidatePath(`/master/companies/${parsed.data.companyId}`);
  revalidatePath("/master/companies");
  return { ok: true, data: updated };
}

/**
 * Reactivate a cancelled or expired subscription.
 * Requires a plan_id to re-establish the billing relationship.
 */
export async function reactivateSubscription(
  companyId: string,
  planId?: string | null,
): Promise<ActionResult<Subscription>> {
  await requireRole("master_admin");

  const parsed = reactivateSchema
    .merge(companyIdSchema)
    .safeParse({ companyId, planId });
  if (!parsed.success || !parsed.data.planId) {
    return { ok: false, error: "A valid plan is required for reactivation." };
  }

  const supabase = await createSupabaseServerClient();

  // Verify plan exists and is active.
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, is_active")
    .eq("id", parsed.data.planId)
    .maybeSingle();

  if (planError || !plan || !plan.is_active) {
    return { ok: false, error: "Selected plan is not available." };
  }

  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("company_id", parsed.data.companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError || !sub) {
    return { ok: false, error: "No subscription record found. Assign a plan instead." };
  }

  const now = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("subscriptions")
    .update({
      plan_id: parsed.data.planId,
      status: "active" as SubscriptionStatus,
      cancelled_at: null,
      current_period_start: now,
      current_period_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      updated_at: now,
    })
    .eq("id", sub.id)
    .select("*")
    .single();

  if (error) return { ok: false, error: mapDbError(error) };

  revalidatePath(`/master/companies/${parsed.data.companyId}`);
  revalidatePath("/master/companies");
  return { ok: true, data: updated };
}
