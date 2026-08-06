import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { PaymentClient } from "@/components/payments/payment-client";
import { PaymentsMobile } from "@/components/staff/payments-mobile";
import type { PaymentsOrder } from "@/components/payments/payment-client";

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

  const typedPayments = (payments ?? []) as unknown as PaymentsOrder[];

  if (ctx.role === "staff") {
    return (
      <>
        <div className="hidden lg:block">
          <PaymentClient payments={typedPayments} />
        </div>
        <div className="lg:hidden">
          <PaymentsMobile payments={typedPayments} />
        </div>
      </>
    );
  }

  return <PaymentClient payments={typedPayments} />;
}