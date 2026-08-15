import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Supabase Auth callback.
 *
 * Handles the auth code exchange when a user follows an invitation /
 * password-setup link sent by Supabase Auth. Supabase redirects to this URL
 * with `?code=...` (and optionally `?error=...` on failure).
 *
 * - Exchanges the code for a session using the existing SSR server client.
 * - Redirects to the internal `next` destination (default `/dashboard`).
 * - Never redirects to external URLs (open-redirect safe).
 * - On failure, redirects to `/login` with a generic, encoded error message.
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
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Generic message — do not leak Supabase internals.
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      "Authentication failed. Please try again.",
    )}`,
  );
}
