import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions.server";
import { MarketplacesClient } from "@/components/marketplaces/marketplaces-client";
import { getUsageStat } from "@/lib/saas/usage";

export default async function MarketplacesPage() {
  const ctx = await requireCompanyUser();
  await requirePermission("marketplaces");
  const supabase = await createSupabaseServerClient();

  const { data: marketplaces, error } = await supabase
    .from("marketplaces")
    .select("*, seller_accounts(*)")
    .eq("company_id", ctx.companyId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const [usage, sellerUsage] = await Promise.all([
    getUsageStat("marketplaces_limit"),
    getUsageStat("seller_accounts_limit"),
  ]);

  return (
    <MarketplacesClient
      marketplaces={marketplaces ?? []}
      usage={usage}
      sellerUsage={sellerUsage}
    />
  );
}