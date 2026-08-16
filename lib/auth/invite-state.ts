/**
 * Invitation lifecycle helpers — pure functions only (no imports, no I/O)
 * so they can be unit-tested deterministically by Scripts/check-lifecycle.mjs
 * and shared by server actions/pages.
 *
 * State model:
 * - Supabase marks an invited user with `invited_at` (set at invite time,
 *   durable) and `confirmed_at` (NULL until the invite link is accepted).
 * - The invite code exchange creates a persistent authenticated session
 *   BEFORE any password exists, and that session carries no distinguishing
 *   token claim (verified against current GoTrue semantics). To make the
 *   "set your password" gate sticky across tabs/browsers/session refreshes,
 *   we persist our own flag in `user_metadata` at invite time and clear it
 *   the moment the password is set.
 */

/** user_metadata key marking an account whose invitation is still pending. */
export const INVITE_PENDING_META_KEY = "__pending_invite";

export type CompanyAdminState = "none" | "pending" | "confirmed";

/** Minimal shape of a GoTrue user needed for state resolution. */
export type AuthUserLike = {
  invited_at?: string | null;
  confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

/**
 * Resolve the company-admin state from real Auth state, never from
 * profiles.is_active:
 * - no auth user          → "none"
 * - confirmed_at set      → "confirmed" (invite accepted — password flow done)
 * - invited_at set only   → "pending"  (invite sent, not yet accepted)
 */
export function resolveCompanyAdminState(
  user: AuthUserLike | null,
): CompanyAdminState {
  if (!user) return "none";
  if (user.confirmed_at) return "confirmed";
  if (user.invited_at) return "pending";
  return "none";
}

/** True while the invite is genuinely pending (sent, not yet accepted). */
export function isInvitePending(user: AuthUserLike | null): boolean {
  return Boolean(user && !user.confirmed_at && user.invited_at);
}

/**
 * True when the durable "must set a password" gate is armed for this user.
 * This flag is set at invite time and cleared when the password is set, so
 * it survives tab closure, re-clicks of the same link in another browser,
 * and session refreshes.
 */
export function hasPendingPasswordGate(
  user: AuthUserLike | null,
): boolean {
  return Boolean(
    user?.user_metadata?.[INVITE_PENDING_META_KEY] === true,
  );
}

/**
 * user_metadata payload for inviteUserByEmail call sites. Carries the role
 * (existing convention) plus the durable pending-password marker. All four
 * invite paths (company-admin create/invite, staff invite/resend) use this
 * so the set-password gate works uniformly.
 */
export function inviteUserData(role: string): Record<string, unknown> {
  return { role, [INVITE_PENDING_META_KEY]: true };
}

/** Payload that clears the durable gate once a password has been set. */
export function clearPendingPasswordMeta(): Record<string, unknown> {
  return { [INVITE_PENDING_META_KEY]: false };
}

/**
 * Decide where an auth-code exchange should land in the callback.
 *
 * Recovery links carry `?next=/reset-password` (existing flow — untouched).
 * Invitation acceptances carry no `next`; when the exchanged user was
 * invited, route them to the mandatory set-password page. Everything else
 * falls back to the default destination.
 */
export function resolveInviteCallbackDestination(opts: {
  hasNext: boolean;
  invitedAt?: string | null;
}): "/set-password" | "/dashboard" {
  if (!opts.hasNext && opts.invitedAt) return "/set-password";
  return "/dashboard";
}
