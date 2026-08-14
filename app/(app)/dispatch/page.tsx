import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions.server";
import { DispatchClient } from "@/components/dispatch/dispatch-client";
import { DispatchMobile } from "@/components/staff/staff-mobile-wrappers";

export default async function DispatchPage() {
  const ctx = await requireCompanyUser();
  await requirePermission("dispatch");
  const supabase = await createSupabaseServerClient();
  const { data: orders, error } = await supabase.from("orders").select("*, marketplace:marketplaces(*), seller_account:seller_accounts(*), order_items(*, product:products(*))").eq("company_id", ctx.companyId).eq("stage", "dispatch").order("order_date", { ascending: false });
  if (error) throw new Error(error.message);
  if (ctx.role === "staff") {
    return (
      <>
        <div className="hidden lg:block"><DispatchClient orders={orders ?? []} /></div>
        <div className="lg:hidden"><DispatchMobile orders={orders ?? []} /></div>
      </>
    );
  }
  return <DispatchClient orders={orders ?? []} />;
}
