import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { PackingClient } from "@/components/packing/packing-client";
import { PackingMobile } from "@/components/staff/staff-mobile-wrappers";

export default async function PackingPage() {
  const ctx = await requireCompanyUser();
  const supabase = await createSupabaseServerClient();
  const { data: orders, error } = await supabase.from("orders").select("*, marketplace:marketplaces(*), seller_account:seller_accounts(*), order_items(*, product:products(*))").eq("company_id", ctx.companyId).eq("stage", "packing").order("order_date", { ascending: false });
  if (error) throw new Error(error.message);
  if (ctx.role === "staff") {
    return (
      <>
        <div className="hidden lg:block"><PackingClient orders={orders ?? []} /></div>
        <div className="lg:hidden"><PackingMobile orders={orders ?? []} /></div>
      </>
    );
  }
  return <PackingClient orders={orders ?? []} />;
}
