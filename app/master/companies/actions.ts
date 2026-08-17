"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import { getInviteRedirectUrl, getSiteUrl } from "@/lib/site";
import { sendAccountCredentialsEmail } from "@/lib/email/credentials-email";
import {
  findUserByEmail,
  mapInviteError,
  fetchAssignedUsernames,
  createUserWithTemporaryPassword,
  resetUserPassword,
} from "@/lib/supabase/admin-users";
import {
  inviteUserData,
  resolveCompanyAdminState,
  resolveAccountStatus,
  type AccountStatus,
  type CompanyAdminState,
} from "@/lib/auth/invite-state";
import { generateUsername } from "@/lib/auth/usernames";
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
  hasAdmin: boolean;
  adminEmail: string | null;
};

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Phone validation — permissive but sensible. Allows digits, spaces, and
 * the common international characters (+ - ( ) . /) up to 30 characters.
 * Empty strings normalize to null.
 */
const phoneSchema = z
  .string()
  .trim()
  .max(30, "Phone number is too long.")
  .regex(
    /^[0-9+\-().\s/]*$/,
    "Phone may only contain digits, spaces, and + - ( ) . / characters.",
  )
  .transform((v) => (v ? v : null));

/**
 * True when the connected database has the additive `companies.phone`
 * column (migration 0020). Keeps inserts/updates working before the
 * migration is applied to the connected project.
 *
 * Probes the column directly through PostgREST (information_schema is not
 * exposed by the API schema cache): selecting a missing column returns an
 * error, a present column succeeds even on an empty table.
 */
async function companiesPhoneColumnExists(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<boolean> {
  const client = supabase as unknown as SupabaseClient;
  const { error } = await client.from("companies").select("phone").limit(1);
  return !error;
}

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
  phone: phoneSchema.optional().nullable(),
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
  phone?: string | null;
}): Promise<
  ActionResult<{
    companyId: string;
    companyName: string;
    slug: string;
    subscriptionId: string | null;
    adminInvited: boolean;
    inviteStatus?: "sent" | "already_registered" | "rate_limited" | "failed";
    adminInviteError?: string;
    /** Generated User ID of the admin (e.g. acme.admin) when created. */
    adminUsername?: string;
    /** Plaintext temporary password — shown ONCE to the creator. */
    temporaryPassword?: string;
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
  const phone = parsed.data.phone ?? null;

  const supabase = await createSupabaseServerClient();

  // companies.phone ships via additive migration 0020. Until it is applied
  // to the connected database, never reference the column (a missing column
  // would fail the whole insert).
  const phoneSupported = await companiesPhoneColumnExists(supabase);

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
  const insertData: {
    name: string;
    slug: string;
    is_active: boolean;
    phone?: string | null;
  } = { name, slug, is_active: true };
  if (phoneSupported && phone) insertData.phone = phone;

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert(insertData)
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

  // Optional company-admin account creation — separate, non-fatal
  // operation. Never reassigns an existing auth user into the new company.
  // New accounts are created with a server-generated temporary password
  // (immediately usable — no dependency on invitation email delivery); the
  // plaintext is returned once and the first login forces a password change.
  let adminInvited = false;
  let adminInviteError: string | undefined;
  let inviteStatus: "sent" | "already_registered" | "rate_limited" | "failed" | undefined;
  let adminUsername: string | undefined;
  let temporaryPassword: string | undefined;
  if (adminEmail) {
    const admin = await createSupabaseAdminClient();

    // Resolve whether the email already has an auth identity. If it does,
    // do NOT attach/reassign that user — surface it so the Master Admin
    // can recover with a different email via the company detail page.
    const lookup = await findUserByEmail(admin, adminEmail);
    if (!lookup.ok) {
      inviteStatus = "failed";
      adminInviteError = lookup.error;
    } else if (lookup.user) {
      inviteStatus = "already_registered";
      adminInviteError =
        "This email is already registered. The company was created, but no admin account was created. No user was reassigned.";
    } else {
      // Create the account server-side with a temporary password. The User
      // ID is generated from the company slug — never accepted from the
      // client. The durable pending-password gate (inviteUserData) forces
      // the first login through /set-password.
      const created = await createUserWithTemporaryPassword(
        admin,
        adminEmail,
        { full_name: null, ...inviteUserData("company_admin") },
      );

      if (!created.ok) {
        inviteStatus = "failed";
        adminInviteError = created.error;
      } else {
        const existingUsernames = await fetchAssignedUsernames(admin);
        const username = generateUsername(
          company.slug,
          "company_admin",
          existingUsernames,
        );
        const { error: profileError } = await admin.from("profiles").upsert({
          id: created.userId,
          company_id: company.id,
          role: "company_admin",
          full_name: null,
          is_active: true,
          username,
        });

        if (profileError) {
          inviteStatus = "failed";
          adminInviteError = mapDbError(
            profileError,
            "Company created, but the admin profile could not be assigned.",
          );
        } else {
          adminInvited = true;
          inviteStatus = "sent";
          adminUsername = username;
          temporaryPassword = created.temporaryPassword;
          // Optional delivery channel — never the source of truth (the
          // credentials are shown once in the UI regardless). Non-fatal:
          // skips silently when RESEND_API_KEY is not configured, and never
          // sends a permanent password.
          void sendAccountCredentialsEmail({
            to: adminEmail,
            companyName: name,
            roleLabel: "Company Administrator",
            username,
            temporaryPassword: created.temporaryPassword,
            loginUrl: `${getSiteUrl()}/login`,
          });
        }
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
      inviteStatus,
      ...(adminInviteError ? { adminInviteError } : {}),
      ...(adminUsername ? { adminUsername } : {}),
      ...(temporaryPassword ? { temporaryPassword } : {}),
    },
  };
}

/**
 * Create the company-admin account for an existing company.
 *
 * Master Admin only. The company context is derived server-side from the
 * company record — never from client-supplied company data. Existing auth
 * users are NEVER reassigned into the company; an email that already has
 * an identity returns a safe, actionable error instead.
 *
 * The account is created with a server-generated temporary password (no
 * invitation email needed) and the first login forces a password change.
 * The plaintext password is returned ONCE for display and never stored.
 *
 * Refuses when the company already has a company_admin profile assigned
 * (including a pending, not-yet-confirmed invite) — use
 * resetCompanyAdminPassword() to recover credentials for an existing admin.
 */
export async function inviteCompanyAdmin(
  companyId: string,
  email: string,
): Promise<
  ActionResult<{
    invited: boolean;
    email: string;
    username: string | null;
    temporaryPassword: string;
  }>
> {
  await requireRole("master_admin");

  const parsed = z
    .object({
      companyId: z.string().uuid("Invalid company ID."),
      email: z.string().trim().email("A valid email is required."),
    })
    .safeParse({ companyId, email });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const adminEmail = parsed.data.email.trim().toLowerCase();
  const supabase = await createSupabaseServerClient();

  // Verify the target company exists — context comes from the DB row.
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, slug, name")
    .eq("id", parsed.data.companyId)
    .maybeSingle();

  if (companyError || !company) {
    return { ok: false, error: companyError?.message ?? "Company not found." };
  }

  // Refuse when a company_admin is already assigned to this company.
  const { data: existingAdmin } = await supabase
    .from("profiles")
    .select("id")
    .eq("company_id", company.id)
    .eq("role", "company_admin")
    .maybeSingle();

  if (existingAdmin) {
    return {
      ok: false,
      error: "This company already has a company admin assigned.",
    };
  }

  const admin = await createSupabaseAdminClient();

  // Never reassign an existing auth user into this company.
  const lookup = await findUserByEmail(admin, adminEmail);
  if (!lookup.ok) {
    return { ok: false, error: lookup.error };
  }
  if (lookup.user) {
    return {
      ok: false,
      error:
        "This email is already registered. No user was reassigned. Use an email that does not yet have an account.",
    };
  }

  // Create the account server-side with a temporary password. The User ID
  // is generated from the company slug — never accepted from the client.
  const created = await createUserWithTemporaryPassword(
    admin,
    adminEmail,
    { full_name: null, ...inviteUserData("company_admin") },
  );
  if (!created.ok) {
    return { ok: false, error: created.error };
  }

  const existingUsernames = await fetchAssignedUsernames(admin);
  const username = generateUsername(
    company.slug,
    "company_admin",
    existingUsernames,
  );
  const { error: profileError } = await admin.from("profiles").upsert({
    id: created.userId,
    company_id: company.id,
    role: "company_admin",
    full_name: null,
    is_active: true,
    username,
  });

  if (profileError) {
    return {
      ok: false,
      error: mapDbError(
        profileError,
        "The admin account was created, but the profile could not be assigned.",
      ),
    };
  }

  revalidatePath(`/master/companies/${company.id}`);
  revalidatePath("/master/companies");

  // Optional delivery channel — non-fatal, skips when unconfigured.
  void sendAccountCredentialsEmail({
    to: adminEmail,
    companyName: company.name,
    roleLabel: "Company Administrator",
    username,
    temporaryPassword: created.temporaryPassword,
    loginUrl: `${getSiteUrl()}/login`,
  });

  return {
    ok: true,
    data: {
      invited: true,
      email: adminEmail,
      username,
      temporaryPassword: created.temporaryPassword,
    },
  };
}

/**
 * Reset the company-admin's password to a new temporary password.
 *
 * Master Admin only. Works for any existing company admin — whether their
 * setup is pending (legacy invite lost / never accepted) or fully active.
 * Generates a new random password server-side, re-arms the mandatory
 * password-change gate, invalidates the previous password immediately, and
 * returns the plaintext ONCE for display. The old password is never shown.
 */
export async function resetCompanyAdminPassword(
  companyId: string,
): Promise<
  ActionResult<{ email: string; username: string | null; temporaryPassword: string }>
> {
  await requireRole("master_admin");

  const parsed = companyIdSchema.safeParse({ companyId });
  if (!parsed.success) {
    return { ok: false, error: "Invalid company ID." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", parsed.data.companyId)
    .maybeSingle();
  if (!company) {
    return { ok: false, error: "Company not found." };
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("company_id", company.id)
    .eq("role", "company_admin")
    .maybeSingle();

  if (!adminProfile) {
    return {
      ok: false,
      error: "No company admin is assigned to this company. Create one first.",
    };
  }

  const admin = await createSupabaseAdminClient();
  const { data: authUser } = await admin.auth.admin.getUserById(
    adminProfile.id,
  );
  const user = authUser?.user ?? null;

  if (!user?.email) {
    return { ok: false, error: "Unable to resolve the company admin account." };
  }

  const result = await resetUserPassword(admin, adminProfile.id, {
    ...inviteUserData("company_admin"),
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath(`/master/companies/${company.id}`);
  revalidatePath("/master/companies");
  return {
    ok: true,
    data: {
      email: user.email,
      username: adminProfile.username ?? null,
      temporaryPassword: result.temporaryPassword,
    },
  };
}

/**
 * Resend the pending company-admin invitation for a company.
 *
 * Master Admin only. All context (company, existing admin profile, auth
 * user) is derived server-side — never from client-supplied data. Only a
 * genuinely pending invitation (invited_at set, confirmed_at null) can be
 * resent, and only to the same email. Confirmed admins are refused; no
 * user is ever moved between companies or reassigned.
 */
export async function resendCompanyAdminInvite(
  companyId: string,
): Promise<ActionResult<{ email: string }>> {
  await requireRole("master_admin");

  const parsed = companyIdSchema.safeParse({ companyId });
  if (!parsed.success) {
    return { ok: false, error: "Invalid company ID." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, is_active")
    .eq("id", parsed.data.companyId)
    .maybeSingle();

  if (!company) {
    return { ok: false, error: "Company not found." };
  }
  if (!company.is_active) {
    return {
      ok: false,
      error: "This company is archived. Reactivate it before inviting an admin.",
    };
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("company_id", company.id)
    .eq("role", "company_admin")
    .maybeSingle();

  if (!adminProfile) {
    return {
      ok: false,
      error: "No company admin is assigned to this company. Invite one first.",
    };
  }

  const admin = await createSupabaseAdminClient();
  const { data: authUser } = await admin.auth.admin.getUserById(
    adminProfile.id,
  );
  const user = authUser?.user ?? null;

  if (!user?.email) {
    return { ok: false, error: "Unable to resolve the company admin account." };
  }

  // Only resend while the invitation is genuinely pending/unconfirmed.
  if (resolveCompanyAdminState(user) !== "pending") {
    return {
      ok: false,
      error:
        "The company admin is already confirmed and active. A resend is not needed.",
    };
  }

  const { error } = await admin.auth.admin.inviteUserByEmail(user.email, {
    data: { full_name: null, ...inviteUserData("company_admin") },
    redirectTo: getInviteRedirectUrl(),
  });

  if (error) {
    const mapped = mapInviteError(error);
    return { ok: false, error: mapped.message };
  }

  revalidatePath(`/master/companies/${company.id}`);
  revalidatePath("/master/companies");
  return { ok: true, data: { email: user.email } };
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

  // Deterministic selection: order by created_at DESC and take the FIRST
  // row per company, so with multiple historical/duplicate subscription
  // rows the list always shows the latest intended subscription.
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*")
    .in("company_id", companyIds)
    .order("created_at", { ascending: false });

  const subByCompany = new Map<
    string,
    Database["public"]["Tables"]["subscriptions"]["Row"]
  >();
  for (const s of subscriptions ?? []) {
    if (!subByCompany.has(s.company_id)) subByCompany.set(s.company_id, s);
  }

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

  // Which companies already have a company_admin assigned, plus the admin's
  // email (used for the list's admin column and client-side search).
  const { data: adminProfiles } = await supabase
    .from("profiles")
    .select("id, company_id")
    .eq("role", "company_admin")
    .in("company_id", companyIds);
  const adminCompanyIds = new Set(
    (adminProfiles ?? []).map((p) => p.company_id),
  );
  const adminEmailByCompany = new Map<string, string | null>();
  if ((adminProfiles ?? []).length > 0) {
    const admin = await createSupabaseAdminClient();
    await Promise.all(
      (adminProfiles ?? []).map(async (p) => {
        if (!p.company_id) return;
        const { data: user } = await admin.auth.admin.getUserById(p.id);
        adminEmailByCompany.set(p.company_id, user?.user?.email ?? null);
      }),
    );
  }

  const planMap = new Map(plans.map((p) => [p.id, p]));

  const result: CompanyWithSub[] = (companies ?? []).map((company) => ({
    company,
    subscription: subByCompany.get(company.id) ?? null,
    plan: planMap.get(subByCompany.get(company.id)?.plan_id ?? "") ?? null,
    hasAdmin: adminCompanyIds.has(company.id),
    adminEmail: adminEmailByCompany.get(company.id) ?? null,
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
  hasCompanyAdmin: boolean;
  companyAdminEmail: string | null;
  /** Application User ID of the company admin (e.g. acme.admin). */
  companyAdminUsername: string | null;
  /** Auth-derived: "none" | "pending" | "confirmed" (never profiles.is_active). */
  adminState: CompanyAdminState;
  /**
   * Honest account status (Phase 24.8): none | setup_pending | active |
   * suspended | invited. Derived from real Auth state + profiles.is_active
   * — never "active" merely because a profile exists.
   */
  adminSetupState: AccountStatus;
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

  // Whether the company already has a company_admin assigned (drives the
  // "Invite Company Admin" recovery UI on the detail page). Resolve the
  // admin's email via auth so the detail page can show it.
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id, username, is_active")
    .eq("company_id", company.id)
    .eq("role", "company_admin")
    .maybeSingle();

  let companyAdminEmail: string | null = null;
  let companyAdminUsername: string | null = null;
  let adminState: CompanyAdminState = "none";
  let adminSetupState: AccountStatus = "none";
  if (adminProfile) {
    const admin = await createSupabaseAdminClient();
    const { data: adminUser } = await admin.auth.admin.getUserById(
      adminProfile.id,
    );
    const authUser = adminUser?.user ?? null;
    companyAdminEmail = authUser?.email ?? null;
    companyAdminUsername = adminProfile.username ?? null;
    // Pending vs confirmed comes from the real Auth invitation state
    // (invited_at / confirmed_at), not from profiles.is_active.
    adminState = resolveCompanyAdminState(authUser);
    // Honest status: durable pending-password gate first, then legacy
    // invite state, then suspended, then active.
    adminSetupState = resolveAccountStatus(
      authUser,
      adminProfile.is_active ?? true,
    );
  }

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
      hasCompanyAdmin: Boolean(adminProfile),
      companyAdminEmail,
      companyAdminUsername,
      adminState,
      adminSetupState,
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

// ─── Company Information management ───────────────────────────────────────

/**
 * Update a company's business information (Master Admin only).
 *
 * Company identity comes from the validated companyId input; the
 * authorization boundary is the master_admin role (server-verified). The
 * UPDATE is scoped to exactly that row. All fields map to existing
 * companies columns — no new schema.
 */
const companyUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Company name is required.")
    .max(200, "Company name must be at most 200 characters."),
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug may only contain lowercase letters, numbers, and single hyphens.",
    )
    .min(3, "Slug must be at least 3 characters.")
    .max(60, "Slug is too long."),
  legalName: z.string().trim().max(200).optional().nullable(),
  gst: z.string().trim().max(50).optional().nullable(),
  phone: phoneSchema.optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  pincode: z.string().trim().max(20).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
});

export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;

export async function updateCompany(
  companyId: string,
  input: CompanyUpdateInput,
): Promise<
  ActionResult<Database["public"]["Tables"]["companies"]["Row"]>
> {
  await requireRole("master_admin");

  const parsed = companyUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const updates: Database["public"]["Tables"]["companies"]["Update"] = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    legal_name: parsed.data.legalName ?? null,
    gst: parsed.data.gst ?? null,
    address: parsed.data.address ?? null,
    city: parsed.data.city ?? null,
    state: parsed.data.state ?? null,
    pincode: parsed.data.pincode ?? null,
    country: parsed.data.country ?? null,
    updated_at: new Date().toISOString(),
  };

  // Only touch phone when the additive migration (0020) is applied.
  const phoneSupported = await companiesPhoneColumnExists(supabase);
  if (phoneSupported) updates.phone = parsed.data.phone ?? null;

  const { data, error } = await supabase
    .from("companies")
    .update(updates)
    .eq("id", companyId)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "A company with this slug already exists. Choose a different slug.",
      };
    }
    return { ok: false, error: mapDbError(error) };
  }

  revalidatePath(`/master/companies/${companyId}`);
  revalidatePath("/master/companies");
  return { ok: true, data };
}

/**
 * Archive (deactivate) or reactivate a company. Master Admin only.
 *
 * Reversible by design — the audit found every ERP table cascades on
 * company delete, so hard deletion is intentionally not offered. Archived
 * companies are blocked from the ERP via requireCompanyUser().
 */
export async function setCompanyActive(
  companyId: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireRole("master_admin");

  const parsed = z
    .object({
      companyId: z.string().uuid("Invalid company ID."),
      isActive: z.boolean(),
    })
    .safeParse({ companyId, isActive });
  if (!parsed.success) {
    return { ok: false, error: "Invalid company ID or state." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: existing, error: fetchError } = await supabase
    .from("companies")
    .select("id, is_active")
    .eq("id", parsed.data.companyId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { ok: false, error: fetchError?.message ?? "Company not found." };
  }
  if (existing.is_active === parsed.data.isActive) {
    return { ok: true, data: undefined }; // idempotent
  }

  const { error } = await supabase
    .from("companies")
    .update({
      is_active: parsed.data.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.companyId);

  if (error) return { ok: false, error: mapDbError(error) };

  revalidatePath(`/master/companies/${parsed.data.companyId}`);
  revalidatePath("/master/companies");
  return { ok: true, data: undefined };
}

/**
 * Permanently delete an EMPTY company. Master Admin only.
 *
 * Safety contract (server-side enforced, never UI-only):
 *  - SBBT Demo is PROTECTED: the server rejects any deletion attempt by
 *    stable slug — the UI is never the enforcement boundary.
 *  - Refuses when ANY ERP business data exists (products, marketplaces,
 *    seller accounts, orders, order items, payments, company settings,
 *    usage). Companies with business data may only be archived.
 *  - Requires the master admin to type the company name exactly.
 *  - User accounts are NOT orphaned: profiles of the company are resolved
 *    first, their Supabase Auth users are deleted through the admin API
 *    (profiles cascade via FK), and ONLY then is the company row deleted
 *    (subscriptions / settings / usage / permissions cascade). The order
 *    is deliberate — a failure before the final delete leaves the company
 *    intact and returns an honest error; profiles can never be left with
 *    company_id = NULL (that FK is SET NULL on company delete).
 *
 * Purchase/packing/dispatch/delivery are order stages — they are covered
 * by the orders / order_items checks.
 */
const DELETE_BLOCKING_TABLES = [
  "products",
  "marketplaces",
  "seller_accounts",
  "orders",
  "order_items",
  "payments",
  "company_settings",
  "company_usage",
] as const;

/** Stable server-side protection rule for the seeded demo tenant. */
const PROTECTED_COMPANY_SLUGS = new Set(["sbbt-demo"]);

export async function deleteCompany(
  companyId: string,
  confirmation: string,
): Promise<ActionResult> {
  await requireRole("master_admin");

  const parsed = z
    .object({ companyId: z.string().uuid("Invalid company ID.") })
    .safeParse({ companyId });
  if (!parsed.success) {
    return { ok: false, error: "Invalid company ID." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug, is_active")
    .eq("id", parsed.data.companyId)
    .maybeSingle();

  if (companyError || !company) {
    return { ok: false, error: companyError?.message ?? "Company not found." };
  }

  // Server-side protection — enforced even if the UI is bypassed.
  if (PROTECTED_COMPANY_SLUGS.has(company.slug)) {
    return {
      ok: false,
      error: `${company.name} is protected and cannot be permanently deleted.`,
    };
  }

  // Strong confirmation: the exact company name must be typed.
  if (confirmation.trim() !== company.name) {
    return {
      ok: false,
      error: `Type "${company.name}" exactly to confirm permanent deletion.`,
    };
  }

  // Refuse when any ERP business data exists.
  const present: string[] = [];
  for (const table of DELETE_BLOCKING_TABLES) {
    const { count } = await supabase
      .from(table as "products")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);
    if (count && count > 0) present.push(table);
  }

  if (present.length > 0) {
    return {
      ok: false,
      error:
        "This company contains business data and cannot be permanently deleted (" +
        present.join(", ") +
        "). Archive the company instead.",
    };
  }

  // Resolve the company's profiles → Auth user ids BEFORE any deletion, so
  // we know exactly which Auth users belong to this company only.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("company_id", company.id);
  const userIds = (profiles ?? []).map((p) => p.id);

  // Delete the Auth users first (profiles cascade via profiles.id →
  // auth.users ON DELETE CASCADE). If this fails, abort with the company
  // fully intact — no partial state.
  const admin = await createSupabaseAdminClient();
  for (const userId of userIds) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      return {
        ok: false,
        error:
          "The company's user accounts could not be removed. No data was deleted — please try again.",
      };
    }
  }

  // Company row last: subscriptions / settings / usage / permissions
  // cascade; profiles were already removed with their Auth users, so the
  // SET NULL company FK can never leave orphans.
  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", company.id);

  if (error) return { ok: false, error: mapDbError(error) };

  // Verify no profiles remain for the deleted company.
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("company_id", company.id);
  if (count && count > 0) {
    return {
      ok: false,
      error:
        "Company deleted, but some profile records could not be removed. Contact support to clean up the remaining rows.",
    };
  }

  revalidatePath("/master/companies");
  return { ok: true, data: undefined };
}

// ─── Invitation diagnostics (dry-run — never sends email) ────────────────

export type InviteDiagnosticStatus =
  | "READY_TO_INVITE"
  | "ALREADY_REGISTERED"
  | "ALREADY_COMPANY_ADMIN"
  | "EXISTING_OTHER_COMPANY"
  | "INVALID_EMAIL"
  | "INVALID_COMPANY";

export type InviteDiagnosticResult = {
  status: InviteDiagnosticStatus;
  companyName: string;
  companyActive: boolean;
  email: string;
  /** The exact redirect URL an invitation would carry. */
  redirectUrl: string;
  /** Rate limits cannot be observed without actually sending. */
  rateLimitCheckable: false;
  details: string[];
};

/**
 * Dry-run validation of the invitation pipeline. Master Admin only.
 *
 * Validates every preparable step of an admin invitation WITHOUT sending
 * an email, creating an auth user, or touching any production data. The
 * redirect URL is produced by the same helper used by real invitations.
 */
export async function inviteAdminDiagnostics(
  companyId: string,
  email: string,
): Promise<ActionResult<InviteDiagnosticResult>> {
  await requireRole("master_admin");

  const trimmedEmail = email.trim().toLowerCase();

  const companyCheck = z
    .object({ companyId: z.string().uuid("Invalid company ID.") })
    .safeParse({ companyId });
  if (!companyCheck.success) {
    return { ok: false, error: "Invalid company ID." };
  }

  const emailCheck = z.string().trim().email("A valid email is required.");
  if (!emailCheck.safeParse(trimmedEmail).success) {
    return {
      ok: true,
      data: {
        status: "INVALID_EMAIL",
        companyName: "",
        companyActive: false,
        email: trimmedEmail,
        redirectUrl: getInviteRedirectUrl(),
        rateLimitCheckable: false,
        details: ["The email address is not valid."],
      },
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, is_active")
    .eq("id", companyId)
    .maybeSingle();

  if (!company) {
    return {
      ok: true,
      data: {
        status: "INVALID_COMPANY",
        companyName: "",
        companyActive: false,
        email: trimmedEmail,
        redirectUrl: getInviteRedirectUrl(),
        rateLimitCheckable: false,
        details: ["The company does not exist."],
      },
    };
  }

  const details: string[] = [];
  if (!company.is_active) {
    details.push("The company is archived. Reactivate it before inviting an admin.");
  }

  // Whether the email already has an auth identity (paginated lookup).
  const admin = await createSupabaseAdminClient();
  const lookup = await findUserByEmail(admin, trimmedEmail);
  if (!lookup.ok) {
    return { ok: false, error: lookup.error };
  }

  if (lookup.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, role")
      .eq("id", lookup.user.id)
      .maybeSingle();

    if (profile?.company_id && profile.company_id !== company.id) {
      return {
        ok: true,
        data: {
          status: "EXISTING_OTHER_COMPANY",
          companyName: company.name,
          companyActive: company.is_active,
          email: trimmedEmail,
          redirectUrl: getInviteRedirectUrl(),
          rateLimitCheckable: false,
          details: [
            "This email already belongs to another company. Users are never moved between companies automatically.",
          ],
        },
      };
    }

    if (profile?.company_id === company.id && profile.role === "company_admin") {
      return {
        ok: true,
        data: {
          status: "ALREADY_COMPANY_ADMIN",
          companyName: company.name,
          companyActive: company.is_active,
          email: trimmedEmail,
          redirectUrl: getInviteRedirectUrl(),
          rateLimitCheckable: false,
          details: ["This account is already the company admin for this company."],
        },
      };
    }

    return {
      ok: true,
      data: {
        status: "ALREADY_REGISTERED",
        companyName: company.name,
        companyActive: company.is_active,
        email: trimmedEmail,
        redirectUrl: getInviteRedirectUrl(),
        rateLimitCheckable: false,
        details: [
          "This email already has an account and will not be reassigned. Use an email without an account, or an intentional account-transfer workflow.",
        ],
      },
    };
  }

  details.push(
    "No auth account exists for this email — an account can be created with a temporary password (no invitation email required).",
  );
  details.push(
    "Email sending is subject to Supabase rate limits, which cannot be checked without actually sending.",
  );

  return {
    ok: true,
    data: {
      status: "READY_TO_INVITE",
      companyName: company.name,
      companyActive: company.is_active,
      email: trimmedEmail,
      redirectUrl: getInviteRedirectUrl(),
      rateLimitCheckable: false,
      details,
    },
  };
}
