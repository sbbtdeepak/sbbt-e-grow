import { requireRole } from "@/lib/auth/session";
import { MasterShell } from "@/components/master/master-shell";

/**
 * Master Admin layout — dedicated SaaS control-plane shell.
 *
 * All /master/* routes are protected here (requireRole("master_admin")),
 * and each page re-checks independently. The shell renders its own
 * sidebar/navigation (Dashboard, Companies, Plans, Products, Settings) —
 * never the company-scoped ERP sidebar.
 */
export default async function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireRole("master_admin");

  return <MasterShell email={ctx.email}>{children}</MasterShell>;
}
