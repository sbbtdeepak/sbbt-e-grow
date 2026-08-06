import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Root entry point.
 *
 * Redirects authenticated users to `/dashboard` and unauthenticated
 * users to `/login`. The proxy handles this optimistically for most
 * routes, but the root path needs an explicit server-side check.
 */
export default async function RootPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}