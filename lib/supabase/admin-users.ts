import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { mapDbError } from "@/lib/saas/db-errors";
import { generateTemporaryPassword } from "@/lib/auth/passwords";

export type AdminClient = SupabaseClient<Database>;

export type AuthUserLookup =
  | { ok: true; user: { id: string; email: string } | null }
  | { ok: false; error: string };

/**
 * Find an auth user by email via paginated admin lookup.
 *
 * `admin.auth.admin.listUsers()` returns only the first page
 * (default 50 users), so a direct call misses users beyond page 1
 * and can produce false "user not found" results or duplicate
 * invites. This walks pages of up to 1000 users until the email
 * matches or the list is exhausted. Emails are unique in Supabase
 * Auth, so the first match is authoritative.
 */
export async function findUserByEmail(
  admin: AdminClient,
  email: string,
): Promise<AuthUserLookup> {
  const target = email.trim().toLowerCase();
  const perPage = 1000;
  let page = 1;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      return { ok: false, error: mapDbError(error, "Unable to look up users.") };
    }

    const users = data?.users ?? [];
    const match = users.find((u) => u.email?.toLowerCase() === target);
    if (match) {
      return { ok: true, user: { id: match.id, email: match.email ?? "" } };
    }
    if (users.length < perPage) {
      return { ok: true, user: null };
    }
    page += 1;
  }
}

/**
 * Every username currently assigned in the platform (global, unique).
 * Drives collision-safe User ID generation — the generator never reuses
 * one. Master admin (username NULL) is naturally excluded. Uses the admin
 * client so it works regardless of the caller's RLS role.
 */
export async function fetchAssignedUsernames(
  admin: AdminClient,
): Promise<string[]> {
  const { data } = await admin
    .from("profiles")
    .select("username")
    .not("username", "is", null);
  return (data ?? []).map((p) => p.username as string);
}

export type InviteErrorKind = "already_registered" | "rate_limited" | "generic";
/**
 * Map a GoTrue admin-invite error to a safe, actionable message plus a
 * machine-readable kind.
 *
 * GoTrue errors carry string codes (e.g. "user_already_exists",
 * "over_email_send_rate_limit") that Postgres-only mapDbError() would
 * collapse into a generic fallback — this preserves the useful signal
 * without ever leaking GoTrue internals to the user.
 */
export function mapInviteError(
  error: { code?: string | null; message?: string | null } | null | undefined,
): { kind: InviteErrorKind; message: string } {
  if (!error) {
    return {
      kind: "generic",
      message: "The invitation could not be sent. Please try again later.",
    };
  }

  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();

  if (
    /already.*regist|user_already_exists|email_exists|already_invited|signup_disabled/.test(
      text,
    )
  ) {
    return {
      kind: "already_registered",
      message: "This email is already registered. No user was reassigned.",
    };
  }

  if (/rate|limit|too many/.test(text)) {
    return {
      kind: "rate_limited",
      message: "Invitation limit reached. Please try again later.",
    };
  }

  return {
    kind: "generic",
    message: "The invitation could not be sent. Please try again later.",
  };
}

export type CreateUserWithPasswordResult =
  | {
      ok: true;
      userId: string;
      email: string;
      /** Plaintext temporary password — shown ONCE to the creator. */
      temporaryPassword: string;
    }
  | { ok: false; error: string };

/**
 * Create an Auth user with a server-generated temporary password.
 *
 * Uses the admin create-user API with `email_confirm: true` — the account
 * is immediately usable (no invitation email, no dependency on Supabase's
 * email quota). The caller must already have verified the email is NOT
 * registered (findUserByEmail) and holds the right application role.
 *
 * `userMetadata` should carry the durable pending-password gate (e.g.
 * inviteUserData(role)) so the first login is forced through /set-password.
 * The plaintext password is returned once and never persisted anywhere.
 */
export async function createUserWithTemporaryPassword(
  admin: AdminClient,
  email: string,
  userMetadata: Record<string, unknown>,
): Promise<CreateUserWithPasswordResult> {
  const normalized = email.trim().toLowerCase();
  const temporaryPassword = generateTemporaryPassword();

  const { data, error } = await admin.auth.admin.createUser({
    email: normalized,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (error || !data?.user?.id) {
    const mapped = mapInviteError(error);
    return {
      ok: false,
      error:
        mapped.kind === "already_registered"
          ? "This email is already registered. No user was reassigned."
          : mapped.message,
    };
  }

  return {
    ok: true,
    userId: data.user.id,
    email: normalized,
    temporaryPassword,
  };
}

export type ResetUserPasswordResult =
  | { ok: true; temporaryPassword: string }
  | { ok: false; error: string };

/**
 * Reset an existing user's password to a new random temporary password and
 * re-arm the durable "must change password" gate (user_metadata).
 *
 * The previous password stops working immediately (GoTrue replaces it). The
 * plaintext is returned once and never persisted. `userMetadata` should be
 * the full intended metadata (role + gate) — GoTrue's admin update replaces
 * user_metadata, so include anything that must survive.
 */
export async function resetUserPassword(
  admin: AdminClient,
  userId: string,
  userMetadata: Record<string, unknown>,
): Promise<ResetUserPasswordResult> {
  const temporaryPassword = generateTemporaryPassword();

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: temporaryPassword,
    user_metadata: userMetadata,
  });

  if (error) {
    return { ok: false, error: mapInviteError(error).message };
  }

  return { ok: true, temporaryPassword };
}
