"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { navItems } from "@/lib/navigation";

/**
 * Shared navigation links used by both the desktop sidebar and the
 * mobile sheet. Highlights the active route based on the current
 * pathname.
 */
export function NavLinks({
  onNavigate,
  permissions = {},
}: {
  onNavigate?: () => void;
  permissions?: Record<string, boolean>;
}) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) => {
    if (!item.permission) return true;
    return permissions[item.permission] === true;
  });

  return (
    <nav className="flex flex-col gap-1">
      {visibleItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-out",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-xs"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}