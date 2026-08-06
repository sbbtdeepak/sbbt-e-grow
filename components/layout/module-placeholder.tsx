import { PageHeader } from "@/components/layout/page-header";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  bulletPoints: string[];
};

/**
 * Placeholder used by module pages in Phase 1.
 *
 * Shows the module intent and planned capabilities so the structure
 * is self-documenting until business logic is implemented.
 */
export function ModulePlaceholder({
  title,
  description,
  bulletPoints,
}: ModulePlaceholderProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title={title} description={description} />
      <div className="rounded-lg border border-dashed border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">
          This module is part of the Phase 1 architecture scaffold. Business
          logic will be implemented in a later phase.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {bulletPoints.map((point) => (
            <li
              key={point}
              className="flex items-start gap-2 text-sm text-foreground/80"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}