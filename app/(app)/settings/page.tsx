import { requireCompanyUser } from "@/lib/auth/session";
import { getCompanyProfile } from "@/app/(app)/settings/actions";
import { SettingsClient } from "@/components/settings/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireCompanyUser();
  const profileResult = await getCompanyProfile();

  const initialProfile = profileResult.ok ? profileResult.data : null;

  return (
    <SettingsClient initialProfile={initialProfile} />
  );
}