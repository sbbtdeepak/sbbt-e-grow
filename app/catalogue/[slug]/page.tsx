import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicPricingCard } from "@/components/public/pricing-card";
import { SectionHeading } from "@/components/public/section-heading";
import { CTASection } from "@/components/public/cta-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Products — SBBT Software Platform",
  description:
    "Explore the SBBT product suite. Choose the right plan for your live-commerce business.",
};

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = await createSupabaseServerClient();

  const { data: product } = await supabase
    .from("saas_products")
    .select(
      `
      id, name, slug, tagline, description, short_description,
      features, target_audience, hero_image_url,
      product_features (
        id, feature_key, feature_name, feature_description,
        feature_type, is_highlighted, sort_order
      ),
      product_pricing (
        id, tier_name, price_monthly, price_yearly,
        is_popular, features, limits, sort_order
      )
    `,
    )
    .eq("slug", params.slug)
    .eq("is_active", true)
    .single();

  if (!product) {
    notFound();
  }

  const features = product.product_features?.sort(
    (a: { sort_order: number }, b: { sort_order: number }) =>
      a.sort_order - b.sort_order,
  );

  const pricing = product.product_pricing?.sort(
    (a: { sort_order: number }, b: { sort_order: number }) =>
      a.sort_order - b.sort_order,
  );

  const highlightedFeatures = features?.filter((f) => f.is_highlighted);
  const otherFeatures = features?.filter((f) => !f.is_highlighted);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <main className="flex-1">
        <section className="border-b border-border/60 bg-muted/20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 md:py-24">
            <div className="mx-auto max-w-3xl">
              <Button asChild variant="ghost" className="-ml-4">
                <Link href="/catalogue">← Back to catalogue</Link>
              </Button>
              <div className="mt-6">
                <Badge variant="outline" className="text-[11px] uppercase tracking-widest">
                  Product
                </Badge>
                <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
                  {product.name}
                </h1>
                <p className="mt-4 text-xl text-muted-foreground">{product.tagline}</p>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Button size="lg" asChild>
                    <Link href="#pricing">
                      Get started
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/pricing">View all pricing</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {highlightedFeatures && highlightedFeatures.length > 0 && (
          <section className="py-20 md:py-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <SectionHeading
                eyebrow="Capabilities"
                title="Key capabilities"
                description="The most important features at a glance."
              />
              <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2 lg:mx-0 lg:max-w-none">
                {highlightedFeatures.map((feature) => (
                  <Card
                    key={feature.id}
                    className="flex flex-col gap-3 border-border/60 bg-card/60 p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand/5 hover:border-brand/30"
                  >
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">
                        {feature.feature_key.replace(/_/g, " ")}
                      </p>
                      <h3 className="mt-1 font-heading text-lg font-semibold">
                        {feature.feature_name}
                      </h3>
                      <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                        {feature.feature_description}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {otherFeatures && otherFeatures.length > 0 && (
          <section className="border-y border-border/60 bg-muted/20 py-20 md:py-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <SectionHeading
                eyebrow="Details"
                title="Everything else"
                description="The full feature breakdown."
              />
              <div className="mx-auto mt-16 max-w-2xl">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {otherFeatures.map((feature) => (
                    <div
                      key={feature.id}
                      className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 p-4"
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                      <div>
                        <span className="text-base font-medium">{feature.feature_name}</span>
                        <span className="text-base text-muted-foreground">
                          {" "}
                          — {feature.feature_description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {pricing && pricing.length > 0 && (
          <section className="py-20 md:py-24" id="pricing">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <SectionHeading
                eyebrow="Pricing"
                title="Simple, transparent pricing"
                description="Start free. Upgrade when you are ready."
              />
              <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2 lg:mx-0 lg:max-w-none">
                {pricing.map((tier) => (
                  <PublicPricingCard
                    key={tier.id}
                    tier={tier}
                    ctaHref={`/catalogue/${product.slug}`}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        <CTASection
          eyebrow="Get started"
          title={`Ready to try ${product.name}?`}
          description="Start with the plan that fits your business."
          primaryLabel="Get started"
          primaryHref={`/catalogue/${product.slug}`}
          secondaryLabel="View all products"
          secondaryHref="/catalogue"
        />
      </main>

      <PublicFooter />
    </div>
  );
}
