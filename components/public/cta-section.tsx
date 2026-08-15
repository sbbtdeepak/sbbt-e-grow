import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/public/section-heading";

type CTASectionProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryLabel?: string;
  primaryHref?: string;
  /** When true the primary CTA launches primaryHref in a new tab (external application). */
  primaryExternal?: boolean;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export function CTASection({
  eyebrow,
  title,
  description,
  primaryLabel = "Explore Products",
  primaryHref = "/catalogue",
  primaryExternal = false,
  secondaryLabel = "Get Started",
  secondaryHref = "/catalogue",
}: CTASectionProps) {
  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-muted/30">
      <div className="absolute inset-0 -z-10 bg-gradient-brand-subtle" />
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 md:py-32">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          align="center"
          className="mb-12"
        />
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            {primaryExternal ? (
              <a href={primaryHref} target="_blank" rel="noopener noreferrer">
                {primaryLabel}
                <ArrowRight className="ml-2 size-4" />
              </a>
            ) : (
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight className="ml-2 size-4" />
              </Link>
            )}
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
