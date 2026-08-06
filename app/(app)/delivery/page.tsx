import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { DeliveryClient } from "@/components/delivery/delivery-client";
import { DeliveryMobile } from "@/components/staff/staff-mobile-wrappers";

export default async function DeliveryPage() {
  const ctx = await requireCompanyUser();
  const supabase = await createSupabaseServerClient();
  const { data: orders, error } = await supabase.from("orders").select("*, marketplace:marketplaces(*), seller_account:seller_accounts(*), order_items(*, product:products(*))").eq("company_id", ctx.companyId).eq("stage", "delivery").order("order_date", { ascending: false });
  if (error) throw new Error(error.message);
  if (ctx.role === "staff") {
    return (
      <>
        <div className="hidden lg:block"><DeliveryClient orders={orders ?? []} /></div>
        <div className="lg:hidden"><DeliveryMobile orders={orders ?? []} /></div>
      </>
    );
  }
  return <DeliveryClient orders={orders ?? []} />;
}
