import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/layout/user-menu";

/**
 * Desktop top header for the content column of the (app) shell.
 *
 * Renders only the user menu on the right — the sidebar (and its mobile
 * top bar) is rendered by the layout via `<Sidebar />`, so this header
 * never contains the sidebar and can never overlap page content.
 */
export async function TopNavbar() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? "Unknown user";

  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center gap-3 border-b border-border/80 bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 lg:flex">
      <div className="flex-1" />
      <UserMenu email={email} fullName={user?.user_metadata?.full_name} />
    </header>
  );
}
