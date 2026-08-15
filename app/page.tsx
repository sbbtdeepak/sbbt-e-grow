import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { PublicNavbar } from "@/components/public/public-navbar";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicProductCard } from "@/components/public/product-card";
import { SectionHeading } from "@/components/public/section-heading";
import { CTASection } from "@/components/public/cta-section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Boxes,
  LineChart,
  ShieldCheck,
  Users,
  ArrowRight,
  CheckCircle2,
  Package,
  ShoppingCart,
  Truck,
  ClipboardList,
  BarChart3,
  CreditCard,
} from "lucide-react";

export const metadata = {
  title: "SBBT SaaS Platform — Purpose-Built Business Software",
  description:
    "SBBT builds practical business software for modern operations. Explore E-Grow and future SaaS products.",
};

const trustMetrics = [
  {
    label: "Multi-marketplace",
    description: "Amazon, Meesho, Flipkart and more.",
  },
  {
    label: "Workflow automation",
    description: "Order to delivery in one place.",
  },
  {
    label: "Team permissions",
    description: "Role-based access control.",
  },
  {
    label: "Business intelligence",
    description: "P&L, seller, and product reports.",
  },
];

const egrowWorkflow = [
  { icon: ShoppingCart, label: "Order", description: "Multi-channel entry" },
  { icon: Package, label: "Purchase", description: "Vendor procurement" },
  { icon: ClipboardList, label: "Packing", description: "Quality & prep" },
  { icon: Truck, label: "Dispatch", description: "Logistics handoff" },
  { icon: CheckCircle2, label: "Delivery", description: "Last-mile tracking" },
  { icon: CreditCard, label: "Payment", description: "Auto-reconciliation" },
  { icon: BarChart3, label: "Reports", description: "P&L insights" },
];

const features = [
  {
    icon: Boxes,
    label: "Channels",
    headline: "Multi-marketplace management",
    description:
      "Sync orders, inventory, and pricing across Amazon, Meesho, Flipkart, and your own website from one dashboard.",
  },
  {
    icon: Users,
    label: "Teams",
    headline: "Seller account tracking",
    description:
      "Organize seller accounts by marketplace, assign ownership, and track performance in real time.",
  },
  {
    icon: ShieldCheck,
    label: "Control",
    headline: "Staff permissions",
    description:
      "Granular role-based access for admins, managers, and warehouse staff. Secure by default.",
  },
  {
    icon: LineChart,
    label: "Insights",
    headline: "Reports & analytics",
    description:
      "Daily P&L, marketplace breakdowns, top sellers, and pending payments — all auto-computed.",
  },
  {
    icon: CreditCard,
    label: "Finance",
    headline: "Payment tracking",
    description:
      "Expected vs received payments, pending amounts, and reconciliation across marketplaces.",
  },
  {
    icon: Package,
    label: "Operations",
    headline: "Order workflow",
    description:
      "Entry → purchase → packing → dispatch → delivery. Every stage tracked with quantities and notes.",
  },
];

const howItWorks = [
  {
    number: "01",
    title: "Choose your software",
    description:
      "Browse the SBBT product catalogue and select the right solution for your business.",
  },
  {
    number: "02",
    title: "Configure your business",
    description:
      "Set up marketplaces, seller accounts, team members, and workflows in minutes.",
  },
  {
    number: "03",
    title: "Start operating",
    description:
      "Go live with orders, inventory, payments, and reports running on autopilot.",
  },
];

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  const { data: allProducts } = await supabase
    .from("saas_products")
    .select("id, name, slug, tagline, short_description, features, target_audience, is_featured, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // Pricing preview is driven by the featured product (deterministic tiebreak:
  // lowest sort_order), never by array position — adding E-Inventory or other
  // future products must not replace E-Grow on the homepage.
  const featuredProduct =
    allProducts
      ?.filter((p) => p.is_featured)
      .sort((a, b) => a.sort_order - b.sort_order)[0] ?? allProducts?.[0];

  const { data: pricingTiers } = await supabase
    .from("product_pricing")
    .select("id, tier_name, price_monthly, price_yearly, is_popular, features, limits, sort_order, saas_product_id")
    .eq("saas_product_id", featuredProduct?.id ?? "")
    .order("sort_order", { ascending: true });

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-muted/40 via-background to-background" />
          <div className="absolute inset-x-0 top-0 -z-10 h-[700px] bg-gradient-brand-subtle" />
          <div className="absolute inset-0 -z-10 bg-grid opacity-[0.6]" />

          <div className="mx-auto max-w-7xl px-6 lg:px-8 pt-20 pb-16 md:pt-28 md:pb-24">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="outline" className="text-[11px] uppercase tracking-widest border-brand/30 text-brand">
                SBBT Software Platform
              </Badge>
              <h1 className="mt-6 font-heading text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
                Powering smarter businesses with purpose-built software.
              </h1>
              <p className="mt-6 text-xl leading-relaxed text-muted-foreground">
                SBBT builds practical business software — from E-Grow, the live-commerce operating system, to future products designed for specific workflows.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/catalogue">
                    Explore Products
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/pricing">View Pricing</Link>
                </Button>
              </div>
            </div>

            {/* Hero visual */}
            <div className="mx-auto mt-16 max-w-5xl">
              <div className="relative rounded-2xl border border-border/60 bg-card/60 p-4 shadow-2xl shadow-brand/5 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-muted/40 p-5">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-brand/10">
                        <BarChart3 className="size-5 text-brand" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                        <p className="font-heading text-xl font-semibold">$128,430</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl border border-border/60 bg-muted/40 p-5">
                        <p className="text-sm text-muted-foreground">Orders</p>
                        <p className="font-heading text-2xl font-semibold">1,284</p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/40 p-5">
                        <p className="text-sm text-muted-foreground">Fulfillment</p>
                        <p className="font-heading text-2xl font-semibold">98.2%</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border/60 bg-muted/40 p-5">
                      <p className="text-sm text-muted-foreground">Channels</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {["Amazon", "Meesho", "Website"].map((ch) => (
                          <Badge key={ch} variant="secondary" className="text-[11px]">
                            {ch}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/40 p-5">
                      <p className="text-sm text-muted-foreground">Stage</p>
                      <p className="mt-1 font-heading text-base font-semibold">Dispatch</p>
                      <div className="mt-3 h-2 w-full rounded-full bg-muted">
                        <div className="h-2 w-3/4 rounded-full bg-brand" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust metrics */}
        <section className="border-y border-border/60 bg-muted/20 py-10 md:py-14">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {trustMetrics.map((item, idx) => (
                <div key={item.label} className="relative text-center">
                  {idx < trustMetrics.length - 1 && (
                    <div className="hidden md:block absolute right-0 top-1/2 h-8 w-px -translate-y-1/2 bg-border/60" />
                  )}
                  <p className="font-heading text-base font-semibold">{item.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="py-20 md:py-24" id="products">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <SectionHeading
              eyebrow="Products"
              title="One platform. Multiple business solutions."
              description="Purpose-built software for every stage of your business."
            />
            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2 lg:mx-0 lg:max-w-none">
              {allProducts?.map((product) => (
                <PublicProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* E-Grow flagship */}
        <section className="border-y border-border/60 bg-muted/20 py-20 md:py-28" id="features">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="flex flex-col justify-center">
                <Badge variant="outline" className="w-fit text-[11px] uppercase tracking-widest border-brand/30 text-brand">
                  Flagship Product
                </Badge>
                <h2 className="mt-4 font-heading text-4xl font-bold tracking-tight sm:text-5xl">
                  E-Grow
                </h2>
                <p className="mt-4 text-xl text-muted-foreground">
                  Run your marketplace business from one place.
                </p>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  From order entry to payment reconciliation, every step is designed for speed and accuracy. E-Grow is the complete live-commerce operating system trusted by growing brands.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Button size="lg" asChild>
                    <Link href="/catalogue/e-grow">
                      Explore E-Grow
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/pricing">View Pricing</Link>
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-xl shadow-brand/5">
                  <div className="grid grid-cols-2 gap-3">
                    {egrowWorkflow.map((step, idx) => (
                      <div key={step.label} className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                          <step.icon className="size-4 text-brand" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-brand">{String(idx + 1).padStart(2, "0")}</p>
                          <p className="text-sm font-semibold">{step.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid - Bento style */}
        <section className="py-20 md:py-24" id="how-it-works">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <SectionHeading
              eyebrow="Features"
              title="Everything you need to operate."
              description="Built for live-commerce teams that need speed, accuracy, and control."
            />
            <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-12">
              {features.map((feature, idx) => (
                <Card
                  key={feature.headline}
                  className={cn(
                    "flex flex-col gap-3 border-border/60 bg-card/60 p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand/5 hover:border-brand/30",
                    idx === 0 && "lg:col-span-6",
                    idx === 1 && "lg:col-span-6",
                    idx === 2 && "lg:col-span-4",
                    idx === 3 && "lg:col-span-4",
                    idx === 4 && "lg:col-span-4",
                    idx === 5 && "lg:col-span-12",
                  )}
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                    <feature.icon className="size-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                      {feature.label}
                    </p>
                    <h3 className="mt-1 font-heading text-lg font-semibold">
                      {feature.headline}
                    </h3>
                    <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-border/60 bg-muted/20 py-20 md:py-24" id="about">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <SectionHeading
              eyebrow="Process"
              title="Simple to start. Powerful to scale."
              description="Get up and running in minutes, not weeks."
            />
            <div className="mx-auto mt-16 max-w-4xl">
              <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
                {howItWorks.map((step, idx) => (
                  <div key={step.number} className="relative text-center">
                    {idx < howItWorks.length - 1 && (
                      <div className="hidden sm:block absolute left-[60%] top-6 h-px w-[80%] -translate-y-1/2 border-t border-dashed border-border/60" />
                    )}
                    <p className="font-heading text-5xl font-bold text-brand/20">{step.number}</p>
                    <h3 className="mt-3 font-heading text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-base text-muted-foreground">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing preview */}
        {pricingTiers && pricingTiers.length > 0 && (
          <section className="py-20 md:py-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <SectionHeading
                eyebrow="Pricing"
                title="Transparent pricing for every stage."
                description="Start free. Upgrade when you are ready."
              />
              <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2 lg:mx-0 lg:max-w-none">
                {pricingTiers.slice(0, 3).map((tier) => (
                  <Card
                    key={tier.id}
                    className={`flex flex-col border-border/60 bg-card/60 p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand/5 hover:border-brand/30 ${
                      tier.is_popular ? "border-brand/40 shadow-md shadow-brand/5" : ""
                    }`}
                  >
                    {tier.is_popular && (
                      <Badge className="mb-4 w-fit bg-brand text-brand-foreground text-[11px] uppercase tracking-wide">
                        Recommended
                      </Badge>
                    )}
                    <div>
                      <h3 className="font-heading text-xl font-semibold">{tier.tier_name}</h3>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="font-heading text-4xl font-bold">${tier.price_monthly}</span>
                        <span className="text-base text-muted-foreground">/mo</span>
                      </div>
                      {tier.price_yearly > 0 && (
                        <p className="mt-1.5 text-sm text-muted-foreground">${tier.price_yearly}/year</p>
                      )}
                    </div>
                    <Button
                      asChild
                      className="mt-6 w-full"
                      variant={tier.is_popular ? "default" : "outline"}
                    >
                      <Link href="/catalogue">Get started</Link>
                    </Button>
                  </Card>
                ))}
              </div>
              <div className="mt-10 text-center">
                <Button variant="ghost" size="default" asChild>
                  <Link href="/pricing">
                    View all pricing
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <CTASection
          eyebrow="Get started"
          title="Build your next business workflow with SBBT."
          description="Explore products designed for real operational needs."
          primaryLabel="Explore Products"
          primaryHref="/catalogue"
          secondaryLabel="Get Started"
          secondaryHref="/catalogue"
        />
      </main>

      <PublicFooter />
    </div>
  );
}
