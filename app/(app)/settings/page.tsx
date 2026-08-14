import { requireCompanyUser } from "@/lib/auth/session";
import {
  getCompanyProfile,
  getAccountInfo,
  getSubscriptionData,
  getSettingsUsage,
  getStaffCount,
} from "@/app/(app)/settings/actions";
import { SettingsClient } from "@/components/settings/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireCompanyUser();

  const [profileRes, accountRes, subRes, usageRes, staffRes] = await Promise.all([
    getCompanyProfile(),
    getAccountInfo(),
    getSubscriptionData(),
    getSettingsUsage(),
    getStaffCount(),
  ]);

  return (
    <SettingsClient
      initialProfile={profileRes.ok ? profileRes.data ?? null : null}
      account={accountRes.ok ? accountRes.data : null}
      subscription={subRes.ok ? subRes.data : null}
      usage={usageRes.ok ? usageRes.data : []}
      staffCount={staffRes}
    />
  );
}
