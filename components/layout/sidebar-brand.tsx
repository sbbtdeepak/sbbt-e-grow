import { Sprout } from "lucide-react";

/**
 * Brand block shown at the top of the desktop sidebar.
 * Server Component — no client interactivity needed.
 */
export function SidebarBrand() {
  return (
    <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
      <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <Sprout className="size-4" />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-sidebar-foreground">
          SBBT E-Grow
        </span>
        <span className="text-xs text-sidebar-foreground/60">
          Live Plant ERP
        </span>
      </div>
    </div>
  );
}