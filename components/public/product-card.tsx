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
};

type PublicProductCardProps = {
  product: SaasProduct;
};

export function PublicProductCard({ product }: PublicProductCardProps) {
  const initials = product.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <Card className="group flex flex-col overflow-hidden border-border/60 bg-card/60 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/5 hover:border-brand/30">
      <div className="flex flex-1 flex-col p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-foreground">
              <span className="font-heading text-sm font-bold">{initials}</span>
            </div>
            <div>
              <h3 className="font-heading text-lg font-semibold">{product.name}</h3>
              <p className="text-sm text-muted-foreground">{product.tagline}</p>
            </div>
          </div>
          {product.is_featured && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide border-brand/40 text-brand">
              Featured
            </Badge>
          )}
        </div>

        <p className="mt-4 flex-1 text-base leading-relaxed text-muted-foreground">
          {product.short_description}
        </p>

        {product.features && Array.isArray(product.features) && product.features.length > 0 && (
          <ul className="mt-6 space-y-2.5">
            {(product.features as string[]).slice(0, 4).map((feature: string) => (
              <li
                key={feature}
                className="flex items-start gap-2.5 text-sm text-muted-foreground"
              >
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex items-center gap-2">
          <Button asChild size="default" className="flex-1">
            <Link href={`/catalogue/${product.slug}`}>
              View Product
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
