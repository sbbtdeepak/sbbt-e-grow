"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { getSiteUrl } from "@/lib/site";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  type ForgotPasswordState,
  type LoginState,
  type ResetPasswordState,
} from "@/lib/validations/auth";
import {
  clearPendingPasswordMeta,
  INVITE_PENDING_META_KEY,
} from "@/lib/auth/invite-state";
import { isEmailIdentifier } from "@/lib/auth/usernames";

/**
 * Sign in a user with User ID (or email) + password via Supabase Auth.
 *
 * Resolver:
 *  - identifiers containing "@" are treated as the Auth email (master
 *    admin and legacy accounts), passed straight to Supabase;
 *  - anything else is a User ID: profile lookup by username → resolve the
 *    associated Auth email via the admin client → sign in with it.
 *
 * Anti-enumeration: an unknown User ID falls through to a failing
 * signInWithPassword attempt with the same identifier, so both timing and
 * the returned message are identical to a wrong password. No user-facing
 * message ever reveals whether an identifier exists.
 */
export async function signInAction(
  _prevState: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const validated = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: "Please fix the errors below.",
    };
  }

  const identifier = validated.data.identifier;
  const password = validated.data.password;

  const supabase = await createSupabaseServerClient();

  // User ID path: username → profile → Auth email. Usernames never
  // contain "@", so the email path is unambiguous. The lookup MUST use
  // the admin client: profiles RLS only exposes own/master/same-company
  // rows, so the anonymous SSR client could never read another user's
  // username row (verified live — this is why a User ID login failed).
  // The admin client is used exactly like findUserByEmail/listStaff and
  // never returns anything to the browser.
  let email = identifier;
  if (!isEmailIdentifier(identifier)) {
    const admin = await createSupabaseAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("username", identifier)
      .maybeSingle();

    if (profile) {
      const { data: authUser } = await admin.auth.admin.getUserById(
        profile.id,
      );
      if (authUser?.user?.email) email = authUser.user.email;
    }
    // When no profile/email resolves, `email` stays the raw identifier and
    // the sign-in attempt below fails with the same generic message — no
    // username enumeration, uniform timing.
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Generic message — never leak Supabase auth internals to visitors and
    // never reveal whether the User ID / email exists.
    return { message: "Unable to sign in. Please check your User ID and password." };
  }

  // First login with a temporary password: the durable pending-password
  // gate (set at account creation / reset) is still armed, so route the
  // user straight to the mandatory /set-password step before the ERP. The
  // app shell also enforces this (layout redirect), this just avoids a
  // double hop. Reading user_metadata from the sign-in response keeps the
  // redirect decision independent of cookie freshness.
  if (data.user?.user_metadata?.[INVITE_PENDING_META_KEY] === true) {
    revalidatePath("/", "layout");
    redirect("/set-password");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Sign out the current user and clear the session.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Request a password-reset email.
 *
 * Always returns the same generic message whether the email exists or not
 * (no user enumeration). The recovery link points at the existing auth
 * callback with `next=/reset-password`, which exchanges the code and
 * establishes the recovery session before the user lands on the reset page.
 */
export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState | undefined,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const validated = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  const genericMessage =
    "If an account exists for this email, you'll receive a password reset link.";

  if (!validated.success) {
    // Same generic message — do not reveal whether the email is valid/known.
    return { message: genericMessage };
  }

  const supabase = await createSupabaseServerClient();

  // Ignore the result: the response is identical either way (anti-enumeration).
  await supabase.auth.resetPasswordForEmail(validated.data.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });

  return { message: genericMessage };
}

/**
 * Set a new password for the authenticated (recovery) session.
 *
 * The recovery session is established by the auth callback after the user
 * follows the emailed link — this action refuses to run without it.
 * On success the session is signed out (invalidating the recovery session)
 * and the user is sent to `/login?reset=success`. Passwords are never
 * logged or placed in URLs.
 */
export async function updatePasswordAction(
  _prevState: ResetPasswordState | undefined,
  formData: FormData,
): Promise<ResetPasswordState> {
  const ctx = await getSessionContext();
  // Only a Supabase recovery session may change the password. A normal
  // session (or none) is refused here — GoTrue enforces the same rule on
  // updateUser(), so this is defense-in-depth plus a clean error message.
  if (!ctx || !ctx.isRecovery) {
    return {
      message:
        "Your password reset link has expired or is invalid. Please request a new one.",
    };
  }

  const validated = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: "Please fix the errors below.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.updateUser({
    password: validated.data.password,
  });

  if (error) {
    // Generic — never leak Supabase auth internals.
    return {
      message:
        "Unable to update your password. The reset link may have expired — please request a new one.",
    };
  }

  // Invalidate the recovery session and send the user to login.
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login?reset=success");
}

/**
 * Create the first password for an invited user who just accepted their
 * invitation.
 *
 * The invite code exchange establishes a normal authenticated session
 * BEFORE any password exists. This action:
 * - requires an authenticated session whose durable pending-password gate
 *   is armed (set at invite time, cleared here on success) — never a
 *   recovery session, which belongs to the reset-password flow;
 * - validates with the same password rules as the reset flow;
 * - sets the password via Supabase Auth `updateUser` (user-scoped session,
 *   never service-role, never written to our database);
 * - clears the gate and sends the user to /dashboard so the existing
 *   onboarding logic continues.
 */
export async function setPasswordAction(
  _prevState: ResetPasswordState | undefined,
  formData: FormData,
): Promise<ResetPasswordState> {
  const ctx = await getSessionContext();
  if (!ctx) {
    redirect("/login");
  }
  // Recovery sessions belong to /reset-password — never accept a password
  // here for them (defense in depth; the page also redirects).
  if (ctx.isRecovery) {
    redirect("/reset-password");
  }
  if (!ctx.pendingPasswordSet) {
    return {
      message:
        "This invitation link is no longer valid. Please contact your administrator for a new invitation.",
    };
  }

  const validated = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: "Please fix the errors below.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.updateUser({
    password: validated.data.password,
    data: clearPendingPasswordMeta(),
  });

  if (error) {
    // Generic — never leak Supabase auth internals.
    return {
      message: "Unable to set your password. Please try again.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}