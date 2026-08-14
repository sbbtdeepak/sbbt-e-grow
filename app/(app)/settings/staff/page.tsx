import { requireCompanyUser } from "@/lib/auth/session";
import { listStaff } from "@/app/(app)/settings/staff/actions";
import { StaffClient } from "@/components/settings/staff/staff-client";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const ctx = await requireCompanyUser();

  if (ctx.role !== "company_admin") {
    return (
      <div className="p-6">
        <p className="text-destructive">Not authorized to view staff management.</p>
      </div>
    );
  }

  const result = await listStaff();
  const staff = result.ok ? result.data : [];

  return (
      <StaffClient staff={staff} />
  );
}
