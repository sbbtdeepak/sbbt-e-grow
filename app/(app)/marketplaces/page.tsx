import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { MarketplacesClient } from "@/components/marketplaces/marketplaces-client";

export default async function MarketplacesPage() {
  const ctx = await requireCompanyUser();
  const supabase = await createSupabaseServerClient();

  const { data: marketplaces, error } = await supabase
    .from("marketplaces")
    .select("*, seller_accounts(*)")
    .eq("company_id", ctx.companyId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return <MarketplacesClient marketplaces={marketplaces ?? []} />;
}