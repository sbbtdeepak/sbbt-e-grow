/**
 * SaaS Staff Permission Layer — Server Functions
 *
 * Server-only module. Do NOT import from client components.
 *
 * ---- ARCHITECTURE ----
 * Role source   : public.profiles.role  (master_admin | company_admin | staff)
 * Membership    : public.profiles.company_id
 * Permission    : public.user_permissions (per-module, company-scoped)
 *
 * Role-based overrides:
 *   - master_admin  → all permissions granted (system-wide)
 *   - company_admin → all permissions granted (company owner)
 *   - staff         → granular permissions from user_permissions table,
 *                      falling back to DEFAULT_STAFF_PERMISSIONS when
 *                      no explicit row exists.
 *
 * Master-data permissions (products, marketplaces, seller_accounts)
 * are always false for staff — role-gated only, enforced here and
 * in the action files via canMutateMasterData() (defense in depth).
 */

import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import {
  MODULE_PERMISSIONS,
  MASTER_DATA_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
  PermissionError,
} from "@/lib/auth/permissions";

export { PermissionError };

export type { Permission } from "@/lib/auth/permissions";

/**
 * Returns the full permission set for the current user as a flat map.
 * Cached per-request (React `cache`).
 *
 * - master_admin / company_admin → all MODULE_PERMISSIONS granted
 * - staff → explicit rows from user_permissions, merged with defaults
 */
export const getUserPermissions = cache(
  async (): Promise<Record<string, boolean>> => {
    const ctx = await getSessionContext();
    if (!ctx?.companyId) return {};

    // Admin roles bypass the table — they have full access.
    if (ctx.role === "master_admin" || ctx.role === "company_admin") {
      const all: Record<string, boolean> = {};
      for (const p of MODULE_PERMISSIONS) all[p] = true;
      return all;
    }

    const supabase = await createSupabaseServerClient();

    // Scope strictly to the current user — never merge another staff
    // member's rows. RLS is company-scoped, so the user_id filter is
    // required here to prevent cross-user permission inheritance.
    const { data, error } = await supabase
      .from("user_permissions")
      .select("permission, is_allowed")
      .eq("user_id", ctx.userId)
      .eq("company_id", ctx.companyId);

    if (error || !data) {
      return { ...DEFAULT_STAFF_PERMISSIONS };
    }

    const perms: Record<string, boolean> = {};
    for (const p of MODULE_PERMISSIONS) {
      const explicit = data.find((d) => d.permission === p);
      let value = explicit ? explicit.is_allowed : DEFAULT_STAFF_PERMISSIONS[p] ?? false;
      // Master-data permissions are role-gated only — staff can never
      // have them, regardless of what is stored in the table.
      if (MASTER_DATA_PERMISSIONS.includes(p)) value = false;
      perms[p] = value;
    }
    return perms;
  },
);

/** Non-throwing check — returns true if the current user has the permission. */
export const hasPermission = cache(
  async (permission: string): Promise<boolean> => {
    const perms = await getUserPermissions();
    return perms[permission] === true;
  },
);

/**
 * Throwing assertion — use inside Server Actions.
 * Throws PermissionError if the current user lacks the permission.
 */
export async function assertPermission(permission: string): Promise<void> {
  const allowed = await hasPermission(permission);
  if (!allowed) {
    throw new PermissionError(permission);
  }
}

/**
 * Throwing assertion for Server Components — redirects to dashboard
 * if the current user lacks the permission.
 * Call this at the top of a protected page component.
 */
export async function requirePermission(permission: string): Promise<void> {
  const allowed = await hasPermission(permission);
  if (!allowed) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }
}
