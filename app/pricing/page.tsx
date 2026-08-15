import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicPricingCard } from "@/components/public/pricing-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for live-commerce brands. Start free and scale as you grow.",
};

export default async function PricingPage() {
  const supabase = await createSupabaseServerClient();

  const { data: products } = await supabase
    .from("saas_products")
    .select(
      `
      id, name, slug, tagline,
      product_pricing (
        id, tier_name, description, price_monthly, price_yearly,
        currency, is_popular, features, limits, sort_order
      )
    `,
    )
    .eq("is_active", true)
    .eq("product_pricing.is_active", true)
    .order("sort_order", { ascending: true });

  const productCount = products?.length ?? 0;
  const singleProduct = productCount === 1;

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <main className="flex-1">
        <section className="border-b border-border/60 bg-muted/20 py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
                Simple, transparent pricing
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">
                Start free. Upgrade when you are ready.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            {products && products.length > 0 ? (
              <div
                className={cn(
                  "mx-auto grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none",
                  !singleProduct && "sm:grid-cols-2",
                )}
              >
                {products.map((product) => {
                  const pricing = product.product_pricing?.sort(
                    (a: { sort_order: number }, b: { sort_order: number }) =>
                      a.sort_order - b.sort_order,
                  );

                  return (
                    <div
                      key={product.id}
                      className={cn(
                        "col-span-full",
                        !singleProduct && "sm:col-span-1",
                      )}
                    >
                      <div className="mb-5">
                        <p className="font-heading text-xl font-semibold">{product.name}</p>
                        <p className="text-base text-muted-foreground">{product.tagline}</p>
                      </div>
                      {/* Single product: tiers flow across the full width.
                          Multiple products: tiers stack within each half. */}
                      <div
                        className={cn(
                          "grid grid-cols-1 gap-4",
                          singleProduct && "sm:grid-cols-2 lg:grid-cols-3",
                        )}
                      >
                        {pricing?.map((tier) => (
                          <PublicPricingCard
                            key={tier.id}
                            tier={tier}
                            ctaHref={`/catalogue/${product.slug}`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-muted-foreground">No pricing available yet.</p>
                <Button asChild className="mt-4">
                  <Link href="/catalogue">Browse products</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="border-t border-border/60 bg-muted/20 py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
            <p className="text-lg text-muted-foreground">
              Not sure which product fits your business?
            </p>
            <Button asChild className="mt-4">
              <Link href="/catalogue">Browse products</Link>
            </Button>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
