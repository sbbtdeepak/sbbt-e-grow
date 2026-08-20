import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions.server";
import { SettlementClient } from "@/components/delivery/settlement-client";

export default async function SettlementPage() {
  const ctx = await requireCompanyUser();
  await requirePermission("delivery");
  const supabase = await createSupabaseServerClient();

  // Fetch completed orders within the 5-day settlement window
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "*, marketplace:marketplaces(*), seller_account:seller_accounts(*), order_items(*, product:products(*))",
    )
    .eq("company_id", ctx.companyId)
    .eq("stage", "completed")
    .not("delivery_confirmed_at", "is", null)
    .gte("delivery_confirmed_at", fiveDaysAgo.toISOString())
    .order("delivery_confirmed_at", { ascending: false });

  if (error) throw new Error(error.message);

  return <SettlementClient orders={orders ?? []} />;
}
