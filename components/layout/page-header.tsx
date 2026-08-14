import Link from "next/link";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  backHref?: string;
  backLabel?: string;
};

/**
 * Consistent page header used across all module pages.
 * Keeps title, description and action button alignment uniform.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
  backHref,
  backLabel,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        {backHref ? (
          <Link
            href={backHref}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {backLabel ?? "Back"}
          </Link>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}