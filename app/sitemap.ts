import type { MetadataRoute } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();

/**
 * Public sitemap. Includes only public, active pages — never ERP, master,
 * auth, or inactive product URLs.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createSupabaseServerClient();

  const { data: products } = await supabase
    .from("saas_products")
    .select("slug, updated_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: new Date() },
    { url: `${siteUrl}/catalogue`, lastModified: new Date() },
    { url: `${siteUrl}/pricing`, lastModified: new Date() },
  ];

  const productRoutes: MetadataRoute.Sitemap = (products ?? []).map(
    (product) => ({
      url: `${siteUrl}/catalogue/${product.slug}`,
      lastModified: product.updated_at
        ? new Date(product.updated_at)
        : new Date(),
    }),
  );

  return [...staticRoutes, ...productRoutes];
}
