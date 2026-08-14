import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Json } from "@/types/database";

type SaasProduct = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  short_description: string;
  features: Json;
  target_audience: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  image_url?: string | null;
  accent_color?: string | null;
  external_app_url?: string | null;
  cta_label?: string | null;
  cta_type?: string | null;
};

const ACCENT_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function resolveCta(product: SaasProduct) {
  if (product.external_app_url) {
    return {
      label: product.cta_label || `Launch ${product.name}`,
      href: product.external_app_url,
      external: true,
    };
  }

  const type = product.cta_type ?? "learn_more";
  const label =
    product.cta_label ||
    (type === "contact"
      ? "Contact sales"
      : type === "login"
        ? "Login"
        : type === "launch"
          ? "Launch"
          : "View Product");

  const href =
    type === "contact" ? "/pricing" : type === "login" ? "/login" : `/catalogue/${product.slug}`;

  return { label, href, external: false };
}

type PublicProductCardProps = {
  product: SaasProduct;
};

export function PublicProductCard({ product }: PublicProductCardProps) {
  const initials = product.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  const accent =
    product.accent_color && ACCENT_RE.test(product.accent_color)
      ? product.accent_color
      : null;

  const cta = resolveCta(product);
  const dotStyle = accent ? { backgroundColor: accent } : undefined;

  const ctaEl = cta.external ? (
    <a href={cta.href} target="_blank" rel="noopener noreferrer">
      {cta.label}
      <ArrowRight className="ml-2 size-4" />
    </a>
  ) : (
    <Link href={cta.href}>
      {cta.label}
      <ArrowRight className="ml-2 size-4" />
    </Link>
  );

  return (
    <Card className="group flex flex-col overflow-hidden border-border/60 bg-card/60 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/5 hover:border-brand/30">
      {accent && (
        <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />
      )}
      <div className="flex flex-1 flex-col p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={product.name}
                className="size-11 rounded-xl object-cover"
              />
            ) : (
              <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-foreground">
                <span className="font-heading text-sm font-bold">
                  {initials}
                </span>
              </div>
            )}
            <div>
              <h3 className="font-heading text-lg font-semibold">
                {product.name}
              </h3>
              <p className="text-sm text-muted-foreground">{product.tagline}</p>
            </div>
          </div>
          {product.is_featured && (
            <Badge
              variant="outline"
              className="border-brand/40 text-brand text-[10px] uppercase tracking-wide"
            >
              Featured
            </Badge>
          )}
        </div>

        <p className="mt-4 flex-1 text-base leading-relaxed text-muted-foreground">
          {product.short_description}
        </p>

        {product.features &&
          Array.isArray(product.features) &&
          product.features.length > 0 && (
            <ul className="mt-6 space-y-2.5">
              {(product.features as string[]).slice(0, 4).map((feature: string) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 text-sm text-muted-foreground"
                >
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand"
                    style={dotStyle}
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          )}

        <div className="mt-8 flex items-center gap-2">
          <Button asChild size="default" className="flex-1">
            {ctaEl}
          </Button>
        </div>
      </div>
    </Card>
  );
}
