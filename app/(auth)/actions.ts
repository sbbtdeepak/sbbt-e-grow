"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema, type LoginState } from "@/lib/validations/auth";

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