import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireCompanyUser } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions.server";
import { OrderEntryClient } from "@/components/orders/order-entry";

export default async function OrdersPage() {
  const ctx = await requireCompanyUser();
  await requirePermission("orders");
  const supabase = await createSupabaseServerClient();

  const [marketplacesRes, sellersRes, productsRes] = await Promise.all([
    supabase
      .from("marketplaces")
      .select("*")
      .eq("company_id", ctx.companyId)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("seller_accounts")
      .select("*")
      .eq("company_id", ctx.companyId)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("products")
      .select("*")
      .eq("company_id", ctx.companyId)
      .eq("status", "active")
      .order("name", { ascending: true }),
  ]);

  if (marketplacesRes.error) throw new Error(marketplacesRes.error.message);
  if (sellersRes.error) throw new Error(sellersRes.error.message);
  if (productsRes.error) throw new Error(productsRes.error.message);

  const sellerAccountsByMarketplace: Record<string, typeof sellersRes.data> =
    {};
  for (const seller of sellersRes.data ?? []) {
    const key = seller.marketplace_id;
    if (!sellerAccountsByMarketplace[key]) {
      sellerAccountsByMarketplace[key] = [];
    }
    sellerAccountsByMarketplace[key].push(seller);
  }

  const products = (productsRes.data ?? []).map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    buyingPrice: Number(p.buying_price),
    sellingPrice: p.selling_price != null ? Number(p.selling_price) : null,
  }));

  return (
    <OrderEntryClient
      marketplaces={marketplacesRes.data ?? []}
      sellerAccountsByMarketplace={sellerAccountsByMarketplace}
      products={products}
    />
  );
}