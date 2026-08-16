"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sprout } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UserMenu } from "@/components/layout/user-menu";
import { masterNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/navigation";

/**
 * Master Admin shell.
 *
 * Desktop: sticky full-height sidebar in its own column + content column
 * (sticky top header + main). Mobile: sticky top bar with slide-over sheet.
 * Mirrors the (app) shell layout so content never sits under the sidebar.
 */

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  { label: "Overview", items: masterNavItems.filter((i) => i.href === "/master") },
  {
    label: "Management",
    items: masterNavItems.filter((i) =>
      ["/master/companies", "/master/products", "/master/plans"].includes(i.href),
    ),
  },
  {
    label: "System",
    items: masterNavItems.filter((i) => i.href === "/master/settings"),
  },
];

const TITLES: Record<string, string> = {
  "/master": "Dashboard",
  "/master/companies": "Companies",
  "/master/plans": "Plans",
  "/master/products": "Products",
  "/master/settings": "Settings",
};

export function MasterShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const pageTitle =
    Object.entries(TITLES).find(([href]) =>
      pathname === href || pathname.startsWith(`${href}/`),
    )?.[1] ?? "SBBT SaaS Platform";

  const renderLink = (item: NavItem, onNavigate?: () => void) => {
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
          "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ease-out",
          isActive
            ? "bg-brand/10 text-brand"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
        )}
      >
        {isActive ? (
          <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-brand" />
        ) : null}
        <Icon
          className={cn(
            "size-4 shrink-0 transition-colors",
            isActive ? "text-brand" : "text-sidebar-foreground/50",
          )}
        />
        <span>{item.title}</span>
      </Link>
    );
  };

  const sections = NAV_SECTIONS.filter((s) => s.items.length > 0);

  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      {/* Mobile top bar + slide-over sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/80 bg-background/85 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 lg:hidden">
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open master navigation menu"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <span className="text-sm font-semibold">SBBT SaaS Platform</span>
          <div className="flex-1" />
          <UserMenu email={email} />
        </header>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-sidebar-border/70 px-5 py-4">
            <SheetTitle className="flex items-center gap-2 text-left text-base font-semibold">
              <span className="flex size-7 items-center justify-center rounded-md bg-brand text-brand-foreground">
                <Sprout className="size-4" />
              </span>
              SBBT SaaS Platform
            </SheetTitle>
            <SheetDescription className="text-left">
              Master Admin
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto px-3 py-3">
            {sections.map((section) => (
              <div key={section.label} className="mb-5 last:mb-0">
                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {section.label}
                </p>
                <nav className="flex flex-col gap-0.5">
                  {section.items.map((item) => renderLink(item, () => setOpen(false)))}
                </nav>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar — own sticky column */}
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border/70 bg-sidebar/95 shadow-sm lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col">
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-sm">
            <Sprout className="size-4" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-sidebar-foreground">
              SBBT SaaS Platform
            </span>
            <span className="text-xs text-sidebar-foreground/55">
              Master Admin
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section.label} className="mb-5 last:mb-0">
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {section.label}
              </p>
              <nav className="flex flex-col gap-0.5">
                {section.items.map((item) => renderLink(item))}
              </nav>
            </div>
          ))}
        </div>
        <div className="border-t border-sidebar-border px-5 py-3">
          <p className="text-[11px] text-sidebar-foreground/40">
            SBBT Software Platform
          </p>
        </div>
      </aside>

      {/* Content column — starts after the sidebar on desktop */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 hidden h-14 items-center gap-3 border-b border-border/80 bg-background/85 px-6 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 lg:flex">
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-sm font-semibold tracking-tight">{pageTitle}</h1>
            <span className="hidden rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand sm:inline">
              Master Admin
            </span>
          </div>
          <div className="flex-1" />
          <UserMenu email={email} />
        </header>
        <main className="flex-1 bg-muted/30">{children}</main>
      </div>
    </div>
  );
}
