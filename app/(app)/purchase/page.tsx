import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions.server";
import { PurchaseClient } from "@/components/purchase/purchase-client";
import { PurchaseMobile } from "@/components/staff/staff-mobile-wrappers";

export default async function PurchasePage() {
  const ctx = await requireCompanyUser();
  await requirePermission("purchase");
  const supabase = await createSupabaseServerClient();
  const { data: orders, error } = await supabase.from("orders").select("*, marketplace:marketplaces(*), seller_account:seller_accounts(*), order_items(*, product:products(*))").eq("company_id", ctx.companyId).eq("stage", "purchase").order("order_date", { ascending: false });
  if (error) throw new Error(error.message);
  if (ctx.role === "staff") {
    return (
      <>
        <div className="hidden lg:block"><PurchaseClient orders={orders ?? []} /></div>
        <div className="lg:hidden"><PurchaseMobile orders={orders ?? []} /></div>
      </>
    );
  }
  return <PurchaseClient orders={orders ?? []} />;
}
