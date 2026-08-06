import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { PaymentClient } from "@/components/payments/payment-client";
import { PaymentsMobile } from "@/components/staff/payments-mobile";

export default async function PaymentsPage() {
  const ctx = await requireCompanyUser();
  const supabase = await createSupabaseServerClient();
  const { data: payments, error } = await supabase
  .from("payments")
  .select(
    "*, order:orders(*, marketplace:marketplaces(*), seller_account:seller_accounts(*))"
  )
  .eq("company_id", ctx.companyId)
  .order("expected_payment_date", { ascending: true });
  if (error) throw new Error(error.message);
  if (ctx.role === "staff") {
    return (
      <>
        <div className="hidden lg:block"><PaymentClient payments={payments ?? []} /></div>
        <div className="lg:hidden"><PaymentsMobile payments={payments ?? []} /></div>
      </>
    );
  }
  return <PaymentClient payments={payments ?? []} />;
}
