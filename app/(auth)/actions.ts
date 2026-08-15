"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { getSiteUrl } from "@/lib/site";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  type ForgotPasswordState,
  type LoginState,
  type ResetPasswordState,
} from "@/lib/validations/auth";

/**
 * Sign in a user with email + password via Supabase Auth.
 *
 * Returns a `LoginState` with field errors on validation failure,
 * or a generic message on auth failure. Redirects to `/dashboard`
 * on success.
 */
export async function signInAction(
  _prevState: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const validated = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: "Please fix the errors below.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  });

  if (error) {
    // Generic message — never leak Supabase auth internals to visitors.
    return { message: "Unable to sign in. Please check your email and password." };
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