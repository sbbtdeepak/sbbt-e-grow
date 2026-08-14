import { cache } from "react";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export type SessionContext = {
  userId: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  isActive: boolean;
};

/**
 * Loads current session + profile context once per request.
 * Wrapped in React `cache()` so multiple Server Actions called in the
 * same render share same result without redundant Supabase calls.
 */
export const getSessionContext = cache(
  async (): Promise<SessionContext | null> => {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, company_id, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) return null;

    return {
      userId: user.id,
      email: user.email ?? "",
      role: profile.role,
      companyId: profile.company_id,
      isActive: profile.is_active ?? true,
    };
  },
);

/**
 * Requires authenticated, active user.
 * Throws redirect to `/login` if no session exists.
 * Throws redirect to `/suspended` if the account is deactivated.
 */
export async function requireUser() {
  const ctx = await getSessionContext();
  if (!ctx) {
    redirect("/login");
  }
  if (!ctx.isActive) {
    redirect("/suspended");
  }
  return ctx;
}

/**
 * Requires company-scoped authenticated user.
 * Returns context with guaranteed non-null `companyId`.
 */
export async function requireCompanyUser() {
  const ctx = await requireUser();
  if (!ctx.companyId) {
    throw new Error("User is not assigned to a company.");
  }
  return { ...ctx, companyId: ctx.companyId };
}

/**
 * Requires user to hold one of given roles.
 * Uses requireUser() (not requireCompanyUser()) so master_admin
 * (who has companyId = null) can access master-only endpoints.
 */
export async function requireRole(allowed: UserRole | UserRole[]) {
  const roles = Array.isArray(allowed) ? allowed : [allowed];
  const ctx = await requireUser();
  if (!roles.includes(ctx.role)) {
    throw new Error("Not authorized.");
  }
  return ctx;
}

/** True for roles that can mutate master data (products, marketplaces, sellers). */
export const canMutateMasterData = (role: UserRole) =>
  role === "master_admin" || role === "company_admin";