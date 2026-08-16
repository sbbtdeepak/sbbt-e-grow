import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { mapDbError } from "@/lib/saas/db-errors";

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
