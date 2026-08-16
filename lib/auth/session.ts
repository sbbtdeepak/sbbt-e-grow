import { cache } from "react";
import { forbidden, redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export type SessionContext = {
  userId: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  isActive: boolean;
  /** False when the user's company is archived (is_active = false). */
  companyActive: boolean;
  /** True only for a Supabase recovery session (password-reset flow). */
  isRecovery: boolean;
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

    // A password-recovery session is established by the auth callback after
    // the user follows the emailed link. GoTrue records it as an "amr"
    // claim (method "recovery") inside the access token — it is not exposed
    // on the user object — so decode the JWT payload to detect it. Any
    // decode failure (malformed token) is treated as "not a recovery
    // session", which only makes the reset form stricter, never looser.
    let isRecovery = false;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const payload = JSON.parse(
          Buffer.from(session.access_token.split(".")[1], "base64url").toString("utf-8"),
        );
        const amr: unknown = payload?.amr;
        isRecovery =
          Array.isArray(amr) &&
          amr.some((entry) =>
            typeof entry === "string"
              ? entry === "recovery"
              : (entry as { method?: string })?.method === "recovery",
          );
      }
    } catch {
      isRecovery = false;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, company_id, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) return null;

    // Company archive check — an archived company must not be usable by its
    // users. Master admins have no company (null) and are never affected.
    let companyActive = true;
    if (profile.company_id) {
      const { data: company } = await supabase
        .from("companies")
        .select("is_active")
        .eq("id", profile.company_id)
        .maybeSingle();
      companyActive = company?.is_active ?? false;
    }

    return {
      userId: user.id,
      email: user.email ?? "",
      role: profile.role,
      companyId: profile.company_id,
      isActive: profile.is_active ?? true,
      companyActive,
      isRecovery,
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
    // Authenticated user with no company on a company-scoped page/action.
    forbidden(); // renders app/forbidden.tsx (HTTP 403)
  }
  if (!ctx.companyActive) {
    // The company has been archived by a Master Admin — block ERP access
    // the same way a deactivated account is blocked.
    redirect("/suspended");
  }
  return { ...ctx, companyId: ctx.companyId };
}

/**
 * Requires user to hold one of given roles.
 * Uses requireUser() (not requireCompanyUser()) so master_admin
 * (who has companyId = null) can access master-only endpoints.
 *
 * Authenticated-but-wrong-role requests are denied via forbidden()
 * (HTTP 403 + app/forbidden.tsx) — never a generic error boundary and
 * never a client-side check. Unauthenticated users still redirect to
 * /login via requireUser().
 */
export async function requireRole(allowed: UserRole | UserRole[]) {
  const roles = Array.isArray(allowed) ? allowed : [allowed];
  const ctx = await requireUser();
  if (!roles.includes(ctx.role)) {
    forbidden(); // renders app/forbidden.tsx (HTTP 403)
  }
  return ctx;
}

/** True for roles that can mutate master data (products, marketplaces, sellers). */
export const canMutateMasterData = (role: UserRole) =>
  role === "master_admin" || role === "company_admin";