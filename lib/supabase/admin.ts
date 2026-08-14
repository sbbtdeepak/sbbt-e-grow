import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Supabase admin client (service_role key).
 *
 * Use this ONLY inside Server Actions — never in client components.
 * Bypases RLS so privileged operations (inviting users, creating
 * profiles on behalf of others, bulk management) can be performed
 * after explicit application-level authorization checks.
 *
 * All callers MUST still enforce company scoping / role checks
 * before using this client.
 */
export async function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY — required for admin operations.",
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
