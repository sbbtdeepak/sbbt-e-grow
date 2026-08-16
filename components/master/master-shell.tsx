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

/**
 * Master Admin shell.
 *
 * Desktop: sticky full-height sidebar in its own column + content column
 * (sticky top header + main). Mobile: sticky top bar with slide-over sheet.
 * Mirrors the (app) shell layout so content never sits under the sidebar.
 */
export function MasterShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const links = masterNavItems.map((item) => {
    const isActive =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-out",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-xs"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span>{item.title}</span>
      </Link>
    );
  });

  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      {/* Mobile top bar + slide-over sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border/80 bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 lg:hidden">
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
            <SheetTitle className="text-left text-base font-semibold">
              SBBT SaaS Platform
            </SheetTitle>
            <SheetDescription className="text-left">
              Master Admin
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto px-3 py-3">
            <nav className="flex flex-col gap-1">{links}</nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar — own sticky column */}
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border/70 bg-sidebar/95 shadow-sm lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Sprout className="size-4" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-sidebar-foreground">
              SBBT SaaS Platform
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              Master Admin
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <nav className="flex flex-col gap-1">{links}</nav>
        </div>
      </aside>

      {/* Content column — starts after the sidebar on desktop */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 hidden h-16 items-center gap-3 border-b border-border/80 bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 lg:flex">
          <div className="flex-1" />
          <UserMenu email={email} />
        </header>
        <main className="flex-1 bg-muted/30">{children}</main>
      </div>
    </div>
  );
}
