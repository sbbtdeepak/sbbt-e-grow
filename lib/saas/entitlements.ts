/**
 * SaaS Entitlement Layer
 *
 * Centralized, server-side-only module.
 * Resolves the authenticated user's effective subscription context
 * and enforces features / usage limits.
 *
 * NEVER import this in client components.
 * Master Admin is never blocked by plan limits.
 * Existing companies with no subscription are grandfathered.
 *
 * ---- SOURCE OF TRUTH (audit result, Phase 14.5A) ----
 * Verified existing SaaS tables (migration 0011_saas_foundation.sql):
 *   - public.plans              (id, slug, features jsonb, limits jsonb)
 *   - public.plan_features      (plan_id, feature_key, feature_type, config jsonb)  [declarative]
 *   - public.subscriptions      (company_id, plan_id, status, ...)
 *   - public.company_usage      (company_id, period_start, ..., *_count)
 *   - public.user_company_roles (user_id, company_id, role)
 *
 * Runtime source of truth for enforcement:
 *   public.plans.features (jsonb) for boolean feature flags, read by hasFeature()
 *   public.plans.limits   (jsonb) for numeric limits, read by getFeatureLimit()
 *
 * The public.plan_features table mirrors the same definitions but is NOT
 * consulted at runtime — it is declarative documentation only. To prevent
 * drift, keep plans.limits and plan_features.config in sync when editing plans.
 *
 * Tables that do NOT exist in the schema (and are never queried):
 *   company_subscriptions, feature_access
 */

import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import type { Database } from "@/types/database";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

export type Plan = Database["public"]["Tables"]["plans"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

export class EntitlementError extends Error {
  readonly code:
    | "FEATURE_DISABLED"
    | "LIMIT_REACHED"
    | "SUBSCRIPTION_REQUIRED"
    | "PLAN_NOT_FOUND"
    | "USAGE_ERROR";
  readonly limit?: number;
  readonly usage?: number;
  readonly requested?: number;

  constructor(
    code: EntitlementError["code"],
    message: string,
    details?: { limit?: number; usage?: number; requested?: number },
  ) {
    super(message);
    this.name = "EntitlementError";
    this.code = code;
    if (details) {
      this.limit = details.limit;
      this.usage = details.usage;
      this.requested = details.requested;
    }
  }
}

const ACTIVE_STATUSES: readonly SubscriptionStatus[] = ["trialing", "active"];

/** Master Admin has system-level access - never blocked. */
export const isMasterAdmin = cache(async (): Promise<boolean> => {
  const ctx = await getSessionContext();
  return ctx?.role === "master_admin";
});

/**
 * Resolve the active subscription for the current company.
 * Grandfathered companies (no subscription row) -> returns null.
 */
export const getActiveSubscription = cache(
  async (): Promise<Subscription | null> => {
    const ctx = await getSessionContext();
    if (!ctx?.companyId) return null;

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("company_id", ctx.companyId)
      .in("status", [...ACTIVE_STATUSES])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data;
  },
);

/**
 * Resolve the plan attached to the current subscription.
 * Falls back to the Free ("free" slug) plan if none exists.
 */
export const getCompanyPlan = cache(async (): Promise<Plan | null> => {
  const sub = await getActiveSubscription();
  const supabase = await createSupabaseServerClient();

  if (!sub?.plan_id) {
    const { data: freePlan } = await supabase
      .from("plans")
      .select("*")
      .eq("slug", "free")
      .eq("is_active", true)
      .maybeSingle();
    return freePlan;
  }

  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("id", sub.plan_id)
    .maybeSingle();

  if (!plan) {
    const { data: freePlan } = await supabase
      .from("plans")
      .select("*")
      .eq("slug", "free")
      .eq("is_active", true)
      .maybeSingle();
    return freePlan;
  }
  return plan;
});

/** Read a boolean feature flag. Master Admin: always true. */
export const hasFeature = cache(async (featureKey: string): Promise<boolean> => {
  const master = await isMasterAdmin();
  if (master) return true;

  const plan = await getCompanyPlan();
  if (!plan?.features) return false;

  const features = plan.features as Record<string, unknown>;
  return features[featureKey] === true;
});

/** Read a numeric limit. Master Admin: Infinity (never blocked). */
export const getFeatureLimit = cache(
  async (limitKey: string): Promise<number | null> => {
    const master = await isMasterAdmin();
    if (master) return Infinity;

    const plan = await getCompanyPlan();
    if (!plan?.limits) return null;

    const limits = plan.limits as Record<string, unknown>;
    const raw = limits[limitKey];
    if (raw === undefined || raw === null) return null;
    const num = Number(raw);
    // A limit of 0 is a valid, enforceable limit (e.g. ai_usage_limit on Free).
    // Only NaN (non-numeric config) maps to "no limit configured".
    return Number.isNaN(num) ? null : num;
  },
);

/**
 * Get current company usage for a specific metric.
 * Uses live DB counts for accuracy — never client-supplied values.
 */
export const getUsage = cache(async (limitKey: string): Promise<number> => {
  const ctx = await getSessionContext();
  if (!ctx?.companyId) return 0;

  const supabase = await createSupabaseServerClient();

  switch (limitKey) {
    case "products_limit": {
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("company_id", ctx.companyId);
      return count ?? 0;
    }
    case "marketplaces_limit": {
      const { count } = await supabase
        .from("marketplaces")
        .select("id", { count: "exact", head: true })
        .eq("company_id", ctx.companyId);
      return count ?? 0;
    }
    case "seller_accounts_limit": {
      const { count } = await supabase
        .from("seller_accounts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", ctx.companyId);
      return count ?? 0;
    }
    case "staff_users_limit": {
      // Active staff only — inactive, master_admin, and company_admin
      // profiles are excluded. Uses profiles (the live role source) not
      // the future-proof user_company_roles table (currently empty).
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("company_id", ctx.companyId)
        .eq("role", "staff")
        .eq("is_active", true);
      return count ?? 0;
    }
    case "monthly_orders_limit": {
      // Monthly window over CONFIRMED orders only. Draft orders
      // (stage = 'entry', created by saveOrderDraft) do NOT consume the
      // confirmed-monthly-order limit. Window is calendar month in UTC,
      // derived from the system-managed created_at so it cannot be gamed.
      const now = new Date();
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const end = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
      );
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("company_id", ctx.companyId)
        .neq("stage", "entry")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString());
      return count ?? 0;
    }
    case "ai_usage_limit": {
      const { data: usage } = await supabase
        .from("company_usage")
        .select("ai_usage_count")
        .eq("company_id", ctx.companyId)
        .order("period_start", { ascending: false })
        .limit(1)
        .maybeSingle();
      return usage?.ai_usage_count ?? 0;
    }
    default:
      return 0;
  }
});

/** Assert that the company's subscription grants access to a feature. */
export async function assertFeatureAccess(featureKey: string): Promise<void> {
  const allowed = await hasFeature(featureKey);
  if (!allowed) {
    throw new EntitlementError(
      "FEATURE_DISABLED",
      "This feature is not available on your current plan.",
    );
  }
}

/** Assert that current usage + requested stays within the limit. */
export async function assertWithinLimit(
  limitKey: string,
  requestedAmount = 1,
): Promise<void> {
  const limit = await getFeatureLimit(limitKey);
  const usage = await getUsage(limitKey);

  if (limit !== null && limit !== Infinity) {
    if (usage + requestedAmount > limit) {
      throw new EntitlementError(
        "LIMIT_REACHED",
        `You have reached your plan limit (${limit}). Current usage: ${usage}. Requested: ${requestedAmount}.`,
        { limit, usage, requested: requestedAmount },
      );
    }
  }
}

/**
 * Reserved enforcement point for subscription status.
 *
 * CURRENT BEHAVIOR (intentional): this function does NOT block anyone.
 *  - Master Admin always passes.
 *  - Grandfathered companies (no subscription row) keep working under the
 *    Free plan fallback — a missing subscription is intentionally not treated
 *    as a denial and is never silently created.
 *  - Companies whose subscription is cancelled/expired are also intentionally
 *    not blocked here; feature/limit enforcement happens via
 *    hasFeature()/assertWithinLimit() against the effective plan.
 *
 * The function exists as a future hook for billing-gate enforcement; it is
 * currently a no-op by design and is not called anywhere.
 */
export async function assertSubscriptionActive(): Promise<void> {
  const master = await isMasterAdmin();
  if (master) return;

  const sub = await getActiveSubscription();
  if (!sub) return; // Grandfathered - no subscription row, free access
}
