import type { Metadata } from "next";
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
import { cn } from "@/lib/utils";

const ACCENT_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

type ProductSummary = {
  name: string;
  slug: string;
  tagline: string | null;
  short_description: string | null;
  description: string | null;
  image_url: string | null;
  hero_image_url: string | null;
  accent_color: string | null;
  external_app_url: string | null;
  cta_label: string | null;
  cta_type: string | null;
  is_active: boolean;
};

/** Safe absolute-image guard for OG/social metadata (never leak arbitrary input). */
function isHttpUrl(value: string | null | undefined): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function truncate(value: string | null | undefined, max = 155): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Dynamic per-product SEO metadata. Only active products resolve; inactive or
 * unknown slugs produce no metadata and the page's notFound() takes over.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const supabase = await createSupabaseServerClient();
  const { slug } = await params;

  const { data: product } = await supabase
    .from("saas_products")
    .select(
      "name, slug, tagline, short_description, description, image_url, hero_image_url, accent_color, is_active",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!product) {
    return {};
  }

  const description = truncate(
    product.short_description || product.tagline || product.description,
  );
  const ogImage = [product.image_url, product.hero_image_url].find(isHttpUrl);

  return {
    title: product.name,
    description,
    alternates: {
      canonical: `/catalogue/${product.slug}`,
    },
    openGraph: {
      title: `${product.name} — SBBT Software Platform`,
      description,
      type: "website",
      url: `/catalogue/${product.slug}`,
      ...(ogImage ? { images: [{ url: ogImage, alt: product.name }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: product.name,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

/**
 * Primary conversion CTA for the product page.
 * Never points back at the same product URL (no self-loop).
 *
 * Priority:
 *  A. external_app_url          → launch the external application (new tab)
 *  B. cta_type === "login"      → /login
 *  C. cta_type === "contact"    → existing contact/pricing destination
 *  D. cta_type === "launch"     → safe internal next step (/login)
 *  E. learn_more (default)      → safe internal next step (/login)
 */
function resolvePrimaryCta(
  product: Pick<
    ProductSummary,
    "name" | "external_app_url" | "cta_label" | "cta_type"
  >,
): { label: string; href: string; external: boolean } {
  if (product.external_app_url) {
    return {
      href: product.external_app_url,
      external: true,
      label: product.cta_label || `Launch ${product.name}`,
    };
  }

  const type = product.cta_type ?? "learn_more";

  if (type === "login") {
    return { href: "/login", external: false, label: product.cta_label || "Login" };
  }

  if (type === "contact") {
    return {
      href: "/pricing",
      external: false,
      label: product.cta_label || "Contact sales",
    };
  }

  // "launch" without an external URL, and "learn_more": land on a safe
  // internal next step rather than looping back to this product page.
  return { href: "/login", external: false, label: product.cta_label || "Get started" };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { slug } = await params;

  const { data: product } = await supabase
    .from("saas_products")
    .select(
      `
      id, name, slug, tagline, description, short_description,
      features, target_audience, hero_image_url,
      image_url, accent_color, external_app_url, cta_label, cta_type,
      product_features (
        id, feature_key, feature_name, feature_description,
        feature_type, is_highlighted, is_active, sort_order
      ),
      product_pricing (
        id, tier_name, description, price_monthly, price_yearly,
        currency, is_popular, is_active, features, limits, sort_order
      )
    `,
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("product_features.is_active", true)
    .eq("product_pricing.is_active", true)
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

  const accent =
    product.accent_color && ACCENT_RE.test(product.accent_color)
      ? product.accent_color
      : null;
  const accentBorder =
    accent && accent.length === 7 ? `${accent}55` : undefined;

  const primaryCta = resolvePrimaryCta(product);

  const logoImage = isHttpUrl(product.image_url) ? product.image_url : null;
  const heroImage = isHttpUrl(product.hero_image_url) ? product.hero_image_url : null;

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <main className="flex-1">
        <section className="border-b border-border/60 bg-muted/20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 md:py-24">
            <div className="mx-auto max-w-6xl">
              <Button asChild variant="ghost" className="-ml-4">
                <Link href="/catalogue">← Back to catalogue</Link>
              </Button>
              <div
                className={cn(
                  "mt-6 grid grid-cols-1 gap-10",
                  heroImage && "lg:grid-cols-2 lg:items-center",
                )}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-4">
                    {logoImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoImage}
                        alt={`${product.name} logo`}
                        className="size-14 rounded-2xl border border-border/60 object-cover shadow-sm"
                      />
                    )}
                    <Badge
                      variant="outline"
                      className="text-[11px] uppercase tracking-widest"
                      style={
                        accent
                          ? { borderColor: accent, color: accent }
                          : undefined
                      }
                    >
                      Product
                    </Badge>
                  </div>
                  <h1 className="mt-3 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
                    {product.name}
                  </h1>
                  <p className="mt-4 text-xl text-muted-foreground">
                    {product.tagline}
                  </p>
                  {product.target_audience ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Built for{" "}
                      <span className="font-medium text-foreground">
                        {product.target_audience}
                      </span>
                    </p>
                  ) : null}
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                    {product.description}
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    {primaryCta.external ? (
                      <Button size="lg" asChild>
                        <a
                          href={primaryCta.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {primaryCta.label}
                          <span className="sr-only"> (opens in new tab)</span>
                          <ArrowRight className="ml-2 size-4" />
                        </a>
                      </Button>
                    ) : (
                      <Button size="lg" asChild>
                        <Link href={primaryCta.href}>
                          {primaryCta.label}
                          <ArrowRight className="ml-2 size-4" />
                        </Link>
                      </Button>
                    )}
                    <Button size="lg" variant="outline" asChild>
                      <Link href="/pricing">View all pricing</Link>
                    </Button>
                  </div>
                </div>

                {heroImage && (
                  <div className="relative">
                    {accent && (
                      <div
                        className="absolute -inset-4 rounded-3xl opacity-20 blur-2xl"
                        style={{ backgroundColor: accent }}
                      />
                    )}
                    <div
                      className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-2 shadow-xl shadow-brand/5"
                      style={
                        accentBorder
                          ? { borderColor: accentBorder }
                          : undefined
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={heroImage}
                        alt={`${product.name} preview`}
                        className="w-full rounded-xl object-cover"
                      />
                    </div>
                  </div>
                )}
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
                    ctaHref={primaryCta.href}
                    ctaExternal={primaryCta.external}
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
          primaryLabel={primaryCta.label}
          primaryHref={primaryCta.href}
          primaryExternal={primaryCta.external}
          secondaryLabel="View all products"
          secondaryHref="/catalogue"
        />
      </main>

      <PublicFooter />
    </div>
  );
}
