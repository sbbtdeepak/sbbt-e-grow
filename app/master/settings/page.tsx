import type { Metadata } from "next";

import { requireRole } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
  description: "Master Admin account settings.",
};

export default async function MasterSettingsPage() {
  const ctx = await requireRole("master_admin");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Settings"
        description="Master Admin account"
        backHref="/master"
      />

      <Card className="p-6">
        <h2 className="text-lg font-semibold">Account</h2>
        <div className="mt-4 space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Email:</span>{" "}
            {user?.email ?? ctx.email}
          </p>
          <p className="flex items-center gap-2">
            <span className="text-muted-foreground">Role:</span>
            <Badge variant="default">master_admin</Badge>
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold">Platform</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Company and subscription management lives under Companies, plan
          definitions under Plans, and the public product catalogue under
          Products.
        </p>
      </Card>
    </div>
  );
}
