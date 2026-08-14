import { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type WorkflowStepProps = {
  icon: LucideIcon;
  label: string;
  description?: string;
  index: number;
  className?: string;
};

export function WorkflowStep({
  icon: Icon,
  label,
  description,
  index,
  className,
}: WorkflowStepProps) {
  return (
    <div className={cn("relative flex flex-col items-center text-center", className)}>
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-card/60 shadow-sm">
        <Icon className="size-6 text-foreground" />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand">
        {String(index).padStart(2, "0")}
      </p>
      <h3 className="mt-1 font-heading text-base font-semibold">{label}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
