import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveInviteCallbackDestination } from "@/lib/auth/invite-state";

/**
 * Supabase Auth callback.
 *
 * Handles the auth code exchange when a user follows an invitation /
 * password-setup link sent by Supabase Auth. Supabase redirects to this URL
 * with `?code=...` (and optionally `?error=...` on failure).
 *
 * - Recovery links carry `?next=/reset-password` and keep their exact
 *   existing behavior.
 * - Invitation acceptances (no `next`) are routed to the mandatory
 *   `/set-password` step when the exchanged user was invited, so a
 *   password is established before the user reaches the app.
 * - On failure, expired/invalid invitations get a clear, generic message
 *   on the login page (recovery failures keep the existing generic text).
 * - Never redirects to external URLs (open-redirect safe).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");

  // Only allow internal, relative redirect destinations.
  // Rejects external URLs and protocol-relative URLs like `//evil.com`.
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (nextParam) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      return NextResponse.redirect(
        `${origin}${resolveInviteCallbackDestination({
          hasNext: false,
          invitedAt: data.session?.user?.invited_at,
        })}`,
      );
    }
  }

  // Generic messages — never leak Supabase/GoTrue internals. Recovery
  // failures keep the existing wording; invitation failures get a message
  // that explains the state and points at the recovery path (a new invite).
  const failedMessage = nextParam
    ? "Authentication failed. Please try again."
    : "This invitation has expired or is no longer valid. Please ask your administrator to send a new invitation.";

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(failedMessage)}`,
  );
}
