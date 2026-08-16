"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireCompanyUser } from "@/lib/auth/session";
import { assertWithinLimit, EntitlementError } from "@/lib/saas/entitlements";
import { mapDbError } from "@/lib/saas/db-errors";
import { getInviteRedirectUrl } from "@/lib/site";
import { findUserByEmail } from "@/lib/supabase/admin-users";
import {
  MODULE_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
} from "@/lib/auth/permissions";

export type StaffMember = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  isActive: boolean;
  invitationStatus: "invited" | "pending" | "active";
  permissions: Record<string, boolean>;
};

type StaffListResult =
  | { ok: true; data: StaffMember[] }
  | { ok: false; error: string };

type StaffActionResult =
  | { ok: true; data?: Record<string, unknown> }
  | { ok: false; error: string };

function isCompanyAdmin(role: string): boolean {
  return role === "company_admin";
}

/**
 * Resolve emails for a set of user ids via targeted admin lookups.
 * Bounded by the company's staff count (itself capped by the
 * staff_users_limit), so this stays cheap and is exact regardless
 * of total platform user count.
 */
async function getEmailsForUserIds(
  admin: Awaited<ReturnType<typeof createSupabaseAdminClient>>,
  userIds: string[],
): Promise<Map<string, string>> {
  const results = await Promise.all(
    userIds.map(async (uid) => {
      const { data, error } = await admin.auth.admin.getUserById(uid);
      if (error) return [uid, ""] as const;
      return [uid, data?.user?.email ?? ""] as const;
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
    .select("id, full_name, role, is_active")
    .eq("company_id", ctx.companyId)
    .eq("role", "staff")
    .order("created_at", { ascending: false });

  if (profileErr) {
    return { ok: false, error: mapDbError(profileErr, "Unable to load staff.") };
  }

  if (!profiles || profiles.length === 0) {
    return { ok: true, data: [] };
  }

  // Resolve auth user emails via targeted per-user lookups (profiles
  // has no email column). Bounded by staff count — never a full
  // platform-wide user scan.
  const userEmails = await getEmailsForUserIds(
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

    const email = userEmails.get(p.id) ?? "";
    const invitationStatus = email ? "invited" : "pending";

    return {
      id: p.id,
      email,
      fullName: p.full_name,
      role: p.role,
      isActive: p.is_active,
      invitationStatus: invitationStatus === "invited" && p.is_active ? "active" : invitationStatus,
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
 * - If the email has no Supabase Auth identity, sends an invite email.
 * - If the email already has an Auth identity, reuses it (no duplicate).
 * - Creates a profile with role=staff, is_active=true.
 * - Inserts default permission rows.
 */
export async function inviteStaff(
  email: string,
  fullName?: string | null,
): Promise<StaffActionResult> {
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

  if (!matchingUser) {
    // New user — send invitation email via Supabase Auth.
    const { data: inviteData, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(trimmedEmail, {
        data: { full_name: fullName ?? null, role: "staff" },
        redirectTo: getInviteRedirectUrl(),
      });

    if (inviteError) {
      return { ok: false, error: mapDbError(inviteError, "Failed to create the invitation.") };
    }
    if (!inviteData?.user?.id) {
      return { ok: false, error: "Failed to create invitation." };
    }
    userId = inviteData.user.id;
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
  }

  // Create or update the profile.
  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    company_id: ctx.companyId,
    role: "staff",
    full_name: fullName ?? null,
    is_active: true,
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

  revalidatePath("/settings/staff");
  return { ok: true, data: { userId, email: trimmedEmail } };
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
    data: { role: "staff" },
    redirectTo: getInviteRedirectUrl(),
  });

  if (error) return { ok: false, error: mapDbError(error, "Unable to resend the invitation.") };

  revalidatePath("/settings/staff");
  return { ok: true, data: { email: trimmedEmail } };
}
