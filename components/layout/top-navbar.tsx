import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";

/**
 * Top navigation bar for the authenticated app shell.
 *
 * Server Component — fetches the current user so the account menu
 * can display the signed-in identity without an extra client round-trip.
 */
export async function TopNavbar() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? "Unknown user";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Sidebar />
      <div className="flex-1" />
      <UserMenu email={email} fullName={user?.user_metadata?.full_name} />
    </header>
  );
}