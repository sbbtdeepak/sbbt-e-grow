"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireCompanyUser } from "@/lib/auth/session";
import { assertWithinLimit, EntitlementError } from "@/lib/saas/entitlements";
import { mapDbError } from "@/lib/saas/db-errors";
import { getInviteRedirectUrl, getSiteUrl } from "@/lib/site";
import { sendAccountCredentialsEmail } from "@/lib/email/credentials-email";
import {
  findUserByEmail,
  fetchAssignedUsernames,
  createUserWithTemporaryPassword,
  resetUserPassword,
} from "@/lib/supabase/admin-users";
import {
  inviteUserData,
  INVITE_PENDING_META_KEY,
} from "@/lib/auth/invite-state";
import { generateUsername } from "@/lib/auth/usernames";
import {
  MODULE_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
} from "@/lib/auth/permissions";

export type StaffMember = {
  id: string;
  email: string;
  fullName: string | null;
  /** Application User ID, e.g. acme.staff1 (null for legacy accounts). */
  username: string | null;
  role: string;
  isActive: boolean;
  invitationStatus: "invited" | "pending" | "active";
  /**
   * True while the durable "must set a password" gate is armed for this
   * account (temporary password issued, first login not yet completed).
   * Never "active" merely because a profile exists.
   */
  pendingPasswordSetup: boolean;
  permissions: Record<string, boolean>;
};

type StaffListResult =
  | { ok: true; data: StaffMember[] }
  | { ok: false; error: string };

type StaffActionResult =
  | { ok: true; data?: Record<string, unknown> }
  | { ok: false; error: string };

type InviteStaffResult =
  | {
      ok: true;
      data: {
        userId: string;
        email: string;
        /** Generated User ID, e.g. acme.staff1. */
        username?: string;
        /** Plaintext temporary password — shown ONCE to the inviter. */
        temporaryPassword?: string;
      };
    }
  | { ok: false; error: string };

function isCompanyAdmin(role: string): boolean {
  return role === "company_admin";
}

/**
 * Resolve emails + pending-password state for a set of user ids via
 * targeted admin lookups. Bounded by the company's staff count (itself
 * capped by the staff_users_limit), so this stays cheap and is exact
 * regardless of total platform user count.
 */
async function getEmailsForUserIds(
  admin: Awaited<ReturnType<typeof createSupabaseAdminClient>>,
  userIds: string[],
): Promise<Map<string, { email: string; pendingPasswordSetup: boolean }>> {
  const results = await Promise.all(
    userIds.map(async (uid) => {
      const { data, error } = await admin.auth.admin.getUserById(uid);
      if (error) return [uid, { email: "", pendingPasswordSetup: false }] as const;
      return [
        uid,
        {
          email: data?.user?.email ?? "",
          pendingPasswordSetup:
            data?.user?.user_metadata?.[INVITE_PENDING_META_KEY] === true,
        },
      ] as const;
    }),
  );
  return new Map(results);
}

/**
 * List all staff members in the current company with their permissions.
 * Only company_admin can view the list.
 */
export async function listStaff(): Promise<StaffListResult> {
  const ctx = await requireCompanyUser();
  if (!isCompanyAdmin(ctx.role)) {
    return { ok: false, error: "Not authorized to view staff." };
  }

  const supabase = await createSupabaseServerClient();
  const admin = await createSupabaseAdminClient();

  // Fetch staff profiles in the company.
  const { data: profiles, error: profileErr } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, username")
    .eq("company_id", ctx.companyId)
    .eq("role", "staff")
    .order("created_at", { ascending: false });

  if (profileErr) {
    return { ok: false, error: mapDbError(profileErr, "Unable to load staff.") };
  }

  if (!profiles || profiles.length === 0) {
    return { ok: true, data: [] };
  }

  // Resolve auth user emails + pending-password state via targeted
  // per-user lookups (profiles has no email column). Bounded by staff
  // count — never a full platform-wide user scan.
  const userLookups = await getEmailsForUserIds(
    admin,
    profiles.map((p) => p.id),
  );

  // Fetch all permission rows for company staff in one query.
  const userIds = profiles.map((p) => p.id);
  const { data: perms, error: permErr } = await supabase
    .from("user_permissions")
    .select("user_id, permission, is_allowed")
    .in("user_id", userIds);

  const permMap = new Map<string, Record<string, boolean>>();
  for (const p of perms ?? []) {
    if (!permMap.has(p.user_id)) permMap.set(p.user_id, {});
    permMap.get(p.user_id)![p.permission] = p.is_allowed;
  }

  const result: StaffMember[] = profiles.map((p) => {
    const explicit = permMap.get(p.id) ?? {};
    const permissions: Record<string, boolean> = {};
    for (const key of MODULE_PERMISSIONS) {
      permissions[key] = explicit[key] ?? DEFAULT_STAFF_PERMISSIONS[key] ?? false;
    }

    const lookup = userLookups.get(p.id) ?? {
      email: "",
      pendingPasswordSetup: false,
    };
    const email = lookup.email;
    const invitationStatus = email ? "invited" : "pending";

    return {
      id: p.id,
      email,
      fullName: p.full_name,
      username: p.username ?? null,
      role: p.role,
      isActive: p.is_active,
      invitationStatus: invitationStatus === "invited" && p.is_active ? "active" : invitationStatus,
      pendingPasswordSetup: lookup.pendingPasswordSetup,
      permissions,
    };
  });

  void permErr;
  return { ok: true, data: result };
}

/**
 * Invite a new staff member to the company.
 *
 * - Checks staff_users_limit (from entitlement engine).
 * - If the email has no Supabase Auth identity, creates the account
 *   server-side with a temporary password (immediately usable — no
 *   invitation email dependency) and returns the password ONCE.
 * - If the email already has an Auth identity, reuses it (no duplicate)
 *   but NEVER moves a user who belongs to another company.
 * - Creates a profile with role=staff, is_active=true.
 * - Inserts default permission rows.
 */
export async function inviteStaff(
  email: string,
  fullName?: string | null,
): Promise<InviteStaffResult> {
  const ctx = await requireCompanyUser();
  if (!isCompanyAdmin(ctx.role)) {
    return { ok: false, error: "Not authorized to invite staff." };
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return { ok: false, error: "A valid email address is required." };
  }

  // Staff limit check must run BEFORE any Auth user is created/invited,
  // otherwise a failed limit check leaves an orphaned Auth user behind.
  // Every successful invite path below adds a new active staff profile
  // (and thus consumes one staff slot), so the check applies to both
  // the new-user invite and the existing-user association paths.
  try {
    await assertWithinLimit("staff_users_limit", 1);
  } catch (err) {
    if (err instanceof EntitlementError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Unable to verify staff limits." };
  }

  const admin = await createSupabaseAdminClient();

  // Check if an Auth user already exists with this email (paginated
  // lookup — correct even past the first 50 users).
  const lookup = await findUserByEmail(admin, trimmedEmail);
  if (!lookup.ok) {
    return { ok: false, error: lookup.error };
  }

  const matchingUser = lookup.user;
  let userId: string;
  let temporaryPassword: string | undefined;

  if (!matchingUser) {
    // New user — create the account server-side with a temporary password
    // (no invitation email; the account is immediately usable and the
    // durable pending-password gate forces the first login to set one).
    const created = await createUserWithTemporaryPassword(
      admin,
      trimmedEmail,
      { full_name: fullName ?? null, ...inviteUserData("staff") },
    );
    if (!created.ok) {
      return { ok: false, error: created.error };
    }
    userId = created.userId;
    temporaryPassword = created.temporaryPassword;
  } else {
    userId = matchingUser.id;

    // Existing user — check if already a staff member in this company.
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .eq("company_id", ctx.companyId)
      .maybeSingle();

    if (existingProfile) {
      return {
        ok: false,
        error: "This user is already a member of your company.",
      };
    }

    // Tenant-isolation guard: never silently move a user who belongs to
    // ANOTHER company into this one (profile.company_id would be
    // overwritten by the upsert below).
    const { data: otherCompanyProfile } = await admin
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();
    if (
      otherCompanyProfile?.company_id &&
      otherCompanyProfile.company_id !== ctx.companyId
    ) {
      return {
        ok: false,
        error:
          "This email belongs to another company. Users are never moved between companies automatically.",
      };
    }
  }

  // Generate the staff User ID server-side from the company slug — never
  // accepted from the client. Existing usernames are never reused.
  const { data: company } = await admin
    .from("companies")
    .select("slug, name")
    .eq("id", ctx.companyId)
    .maybeSingle();
  const existingUsernames = await fetchAssignedUsernames(admin);
  const username = generateUsername(
    company?.slug ?? "company",
    "staff",
    existingUsernames,
  );

  // Create or update the profile.
  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    company_id: ctx.companyId,
    role: "staff",
    full_name: fullName ?? null,
    is_active: true,
    username,
  });

  if (profileError) {
    return { ok: false, error: mapDbError(profileError, "Unable to create the staff profile.") };
  }

  // Insert default permission rows for the new staff member.
  const permRows = MODULE_PERMISSIONS.map((permission) => ({
    user_id: userId,
    company_id: ctx.companyId,
    permission,
    is_allowed: DEFAULT_STAFF_PERMISSIONS[permission] ?? false,
  }));

  const { error: permError } = await admin
    .from("user_permissions")
    .upsert(permRows);

  if (permError) {
    return { ok: false, error: mapDbError(permError, "Unable to save staff permissions.") };
  }

  // Optional delivery channel — non-fatal, skips when unconfigured. Only
  // for a brand-new account (temporaryPassword present); never for an
  // existing-user association. Never sends a permanent password.
  if (temporaryPassword) {
    void sendAccountCredentialsEmail({
      to: trimmedEmail,
      companyName: company?.name ?? "",
      roleLabel: "Staff",
      username,
      temporaryPassword,
      loginUrl: `${getSiteUrl()}/login`,
    });
  }

  revalidatePath("/settings/staff");
  return {
    ok: true,
    data: {
      userId,
      email: trimmedEmail,
      ...(username ? { username } : {}),
      ...(temporaryPassword ? { temporaryPassword } : {}),
    },
  };
}

/**
 * Activate a deactivated staff member.
 * Checks staff_users_limit before activation.
 */
export async function activateStaff(userId: string): Promise<StaffActionResult> {
  const ctx = await requireCompanyUser();
  if (!isCompanyAdmin(ctx.role)) {
    return { ok: false, error: "Not authorized." };
  }

  const admin = await createSupabaseAdminClient();

  const { data: profile, error: fetchErr } = await admin
    .from("profiles")
    .select("id, is_active")
    .eq("id", userId)
    .eq("company_id", ctx.companyId)
    .eq("role", "staff")
    .maybeSingle();

  if (fetchErr) return { ok: false, error: mapDbError(fetchErr, "Unable to load the staff member.") };
  if (!profile) return { ok: false, error: "Staff member not found." };

  // Only check limit when transitioning from inactive → active.
  if (!profile.is_active) {
    try {
      await assertWithinLimit("staff_users_limit", 1);
    } catch (err) {
      if (err instanceof EntitlementError) {
        return { ok: false, error: err.message };
      }
      return { ok: false, error: "Unable to verify staff limits." };
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("company_id", ctx.companyId)
    .eq("role", "staff");

  if (error) return { ok: false, error: mapDbError(error, "Unable to activate the staff member.") };

  // Ensure default permissions exist.
  const existingPerms = await admin
    .from("user_permissions")
    .select("permission")
    .eq("user_id", userId)
    .eq("company_id", ctx.companyId);

  const existingKeys = new Set(
    (existingPerms.data ?? []).map((p) => p.permission),
  );
  const missingPerms = MODULE_PERMISSIONS.filter(
    (p) => !existingKeys.has(p),
  ).map((permission) => ({
    user_id: userId,
    company_id: ctx.companyId,
    permission,
    is_allowed: DEFAULT_STAFF_PERMISSIONS[permission] ?? false,
  }));

  if (missingPerms.length > 0) {
    await admin.from("user_permissions").insert(missingPerms);
  }

  revalidatePath("/settings/staff");
  return { ok: true };
}

/**
 * Deactivate a staff member. They are no longer counted toward the
 * staff limit and cannot access the ERP (redirected to /suspended).
 */
export async function deactivateStaff(userId: string): Promise<StaffActionResult> {
  const ctx = await requireCompanyUser();
  if (!isCompanyAdmin(ctx.role)) {
    return { ok: false, error: "Not authorized." };
  }

  const admin = await createSupabaseAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("company_id", ctx.companyId)
    .eq("role", "staff")
    .eq("is_active", true);

  if (error) return { ok: false, error: mapDbError(error, "Unable to deactivate the staff member.") };

  revalidatePath("/settings/staff");
  return { ok: true };
}

/**
 * Update a single module permission for a staff member.
 */
export async function updateStaffPermission(
  userId: string,
  permission: string,
  isAllowed: boolean,
): Promise<StaffActionResult> {
  const ctx = await requireCompanyUser();
  if (!isCompanyAdmin(ctx.role)) {
    return { ok: false, error: "Not authorized." };
  }

  if (!MODULE_PERMISSIONS.includes(permission as (typeof MODULE_PERMISSIONS)[number])) {
    return { ok: false, error: "Invalid permission key." };
  }

  const admin = await createSupabaseAdminClient();

  // Verify the target user is a staff member of the current company
  // before writing any permission row. Never trust a client-supplied
  // company id — the row is scoped to ctx.companyId below.
  const { data: target, error: targetErr } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .eq("company_id", ctx.companyId)
    .eq("role", "staff")
    .maybeSingle();

  if (targetErr) {
    return { ok: false, error: mapDbError(targetErr, "Unable to verify staff member.") };
  }
  if (!target) {
    return { ok: false, error: "Staff member not found in your company." };
  }

  // onConflict: the row identity is (user_id, company_id, permission) —
  // without it PostgREST upserts on the surrogate id primary key, which
  // makes re-toggling an existing permission fail with a unique violation.
  const { error } = await admin.from("user_permissions").upsert(
    {
      user_id: userId,
      company_id: ctx.companyId,
      permission,
      is_allowed: isAllowed,
    },
    { onConflict: "user_id,company_id,permission" },
  );

  if (error) return { ok: false, error: mapDbError(error, "Unable to update the permission.") };

  revalidatePath("/settings/staff");
  return { ok: true };
}

/**
 * Remove a staff member from the company.
 * Deletes the profile row (auth user is retained — they may be
 * re-invited later). Permission rows cascade via FK.
 */
export async function removeStaff(userId: string): Promise<StaffActionResult> {
  const ctx = await requireCompanyUser();
  if (!isCompanyAdmin(ctx.role)) {
    return { ok: false, error: "Not authorized." };
  }

  const admin = await createSupabaseAdminClient();

  const { error } = await admin
    .from("profiles")
    .delete()
    .eq("id", userId)
    .eq("company_id", ctx.companyId)
    .eq("role", "staff");

  if (error) return { ok: false, error: mapDbError(error, "Unable to remove the staff member.") };

  revalidatePath("/settings/staff");
  return { ok: true };
}

/**
 * Resend an invitation email to a staff member who hasn't accepted yet.
 */
export async function resendInvite(email: string): Promise<StaffActionResult> {
  const ctx = await requireCompanyUser();
  if (!isCompanyAdmin(ctx.role)) {
    return { ok: false, error: "Not authorized." };
  }

  const trimmedEmail = email.trim().toLowerCase();
  const admin = await createSupabaseAdminClient();

  const lookup = await findUserByEmail(admin, trimmedEmail);
  if (!lookup.ok) {
    return { ok: false, error: lookup.error };
  }

  const matchingUser = lookup.user;
  if (!matchingUser) {
    return { ok: false, error: "User not found. Invite them first." };
  }

  // Check the user belongs to this company.
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", matchingUser.id)
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  if (!profile) {
    return { ok: false, error: "This user is not a member of your company." };
  }

  // Re-send invite with the same redirect URL (getInviteRedirectUrl()
  // keeps the origin consistent with inviteStaff — never a raw env read
  // that could produce "undefined/auth/callback" or a localhost fallback).
  const { error } = await admin.auth.admin.inviteUserByEmail(trimmedEmail, {
    data: inviteUserData("staff"),
    redirectTo: getInviteRedirectUrl(),
  });

  if (error) return { ok: false, error: mapDbError(error, "Unable to resend the invitation.") };

  revalidatePath("/settings/staff");
  return { ok: true, data: { email: trimmedEmail } };
}

/**
 * Reset a staff member's password to a new temporary password.
 *
 * Company Admin only. The target must be a staff member of the CURRENT
 * company (server-verified — never a client-supplied company). Generates a
 * new random password, re-arms the mandatory password-change gate (so the
 * next login is forced through /set-password), invalidates the previous
 * password immediately, and returns the plaintext ONCE for display. The
 * old password is never shown.
 */
export async function resetStaffPassword(
  userId: string,
): Promise<
  | {
      ok: true;
      data: {
        email: string;
        username: string | null;
        temporaryPassword: string;
      };
    }
  | { ok: false; error: string }
> {
  const ctx = await requireCompanyUser();
  if (!isCompanyAdmin(ctx.role)) {
    return { ok: false, error: "Not authorized." };
  }

  const admin = await createSupabaseAdminClient();

  // Verify the target is a staff member of THIS company.
  const { data: profile, error: fetchErr } = await admin
    .from("profiles")
    .select("id, username, is_active")
    .eq("id", userId)
    .eq("company_id", ctx.companyId)
    .eq("role", "staff")
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, error: mapDbError(fetchErr, "Unable to load the staff member.") };
  }
  if (!profile) {
    return { ok: false, error: "Staff member not found in your company." };
  }

  const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
  const user = authUser?.user ?? null;
  if (!user?.email) {
    return { ok: false, error: "Unable to resolve the staff account." };
  }

  const result = await resetUserPassword(admin, profile.id, {
    ...inviteUserData("staff"),
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/settings/staff");
  return {
    ok: true,
    data: {
      email: user.email,
      username: profile.username ?? null,
      temporaryPassword: result.temporaryPassword,
    },
  };
}
