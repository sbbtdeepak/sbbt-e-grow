import { requireUser } from "@/lib/auth/session";
import { getUserPermissions } from "@/lib/auth/permissions.server";
import { TopNavbar } from "@/components/layout/top-navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { StaffMobileChrome } from "@/components/staff/staff-mobile-chrome";
import { redirect } from "next/navigation";

/**
 * Layout for the authenticated app shell.
 *
 * Desktop shell (lg+):
 *   ┌──────────────┬──────────────────────────────┐
 *   │ Sidebar      │ Top Header                   │
 *   │ (sticky col) ├──────────────────────────────┤
 *   │              │ Main Content                 │
 *   └──────────────┴──────────────────────────────┘
 *
 * The sidebar occupies its own sticky full-height column; the content
 * column (header + main) starts after it — never underneath it. On mobile
 * the sidebar collapses into a slide-over sheet driven by a sticky top bar.
 *
 * Staff role gets the dedicated Staff Mobile UI on small screens; the
 * desktop admin shell is preserved on lg+ viewports.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireUser();
  const isStaff = ctx.role === "staff";

  // Sticky "set your password" gate for accounts created via invitation:
  // the invite code exchange authenticates the user before any password
  // exists, so the ERP shell stays locked behind the /set-password step
  // until a password is actually created (flag cleared server-side).
  if (ctx.pendingPasswordSet) {
    redirect("/set-password");
  }

  const isMaster = ctx.role === "master_admin";
  let perms: Record<string, boolean> = {};
  if (!isMaster) {
    perms = await getUserPermissions();
  }

  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      <Sidebar
        permissions={perms}
        email={ctx.email}
        mobileHeader={!isStaff}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {isStaff ? (
          <>
            <div className="hidden lg:block">
              <TopNavbar />
            </div>
            <StaffMobileChrome email={ctx.email} fullName={null} permissions={perms} />
          </>
        ) : (
          <TopNavbar />
        )}
        <main className="flex-1 bg-muted/30">{children}</main>
      </div>
    </div>
  );
}
