import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicProductCard } from "@/components/public/product-card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "SBBT Software Products — Purpose-Built Business Software",
  description:
    "Explore the SBBT product suite. Purpose-built software for live-commerce, marketplace, and business operations.",
};

export default async function CataloguePage() {
  const supabase = await createSupabaseServerClient();

  const { data: products } = await supabase
    .from("saas_products")
    .select(
      "id, name, slug, tagline, short_description, features, target_audience, is_featured, is_active, sort_order, image_url, accent_color, external_app_url, cta_label, cta_type",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <main className="flex-1">
        <section className="border-b border-border/60 bg-muted/20 py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
                Software built for real business workflows.
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">
                Explore purpose-built products designed for specific business needs.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            {products && products.length > 0 ? (
              <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2 lg:mx-0 lg:max-w-none">
                {products.map((product) => (
                  <PublicProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-muted-foreground">No products available yet.</p>
                <Button asChild className="mt-4">
                  <Link href="/">Back to home</Link>
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
