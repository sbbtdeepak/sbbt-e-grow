import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions.server";
import { ProductsClient } from "@/components/products/products-client";
import { getUsageStat } from "@/lib/saas/usage";

export default async function ProductsPage() {
  const ctx = await requireCompanyUser();
  await requirePermission("products");
  const supabase = await createSupabaseServerClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", ctx.companyId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const usage = await getUsageStat("products_limit");

  return <ProductsClient products={products ?? []} usage={usage} />;
}
