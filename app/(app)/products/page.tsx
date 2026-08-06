import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { ProductsClient } from "@/components/products/products-client";

export default async function ProductsPage() {
  const ctx = await requireCompanyUser();
  const supabase = await createSupabaseServerClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", ctx.companyId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return <ProductsClient products={products ?? []} />;
}