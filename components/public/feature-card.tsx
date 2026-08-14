import { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type PublicFeatureCardProps = {
  icon: LucideIcon;
  label?: string;
  headline: string;
  description: string;
  className?: string;
};

export function PublicFeatureCard({
  icon: Icon,
  label,
  headline,
  description,
  className,
}: PublicFeatureCardProps) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-4 border-border/60 bg-card/60 p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand/5 hover:border-brand/30",
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
        <Icon className="size-5 text-foreground" />
      </div>
      <div>
        {label && (
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            {label}
          </p>
        )}
        <h3 className="mt-1.5 font-heading text-lg font-semibold">{headline}</h3>
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </Card>
  );
}
