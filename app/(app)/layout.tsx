import { requireUser } from "@/lib/auth/session";
import { TopNavbar } from "@/components/layout/top-navbar";
import { StaffMobileChrome } from "@/components/staff/staff-mobile-chrome";

/**
 * Layout for the authenticated app shell.
 *
 * Wraps every route under `/(app)` with the top navbar (which itself
 * contains the desktop sidebar and mobile nav trigger). The proxy
 * already ensures only authenticated users reach these routes.
 *
 * Staff role gets the dedicated Staff Mobile UI on small screens:
 * fixed marketplace tabs on top + fixed bottom navigation, with the
 * desktop admin shell preserved on lg+ viewports.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireUser();
  const isStaff = ctx.role === "staff";

  return (
    <div className="flex min-h-svh flex-col">
      {isStaff ? (
        <>
          <div className="hidden lg:block">
            <TopNavbar />
          </div>
          <StaffMobileChrome email={ctx.email} fullName={null} />
        </>
      ) : (
        <TopNavbar />
      )}
      <main className="flex-1 bg-muted/30">{children}</main>
    </div>
  );
}