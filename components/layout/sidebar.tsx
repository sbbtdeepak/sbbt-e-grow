"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavLinks } from "@/components/layout/nav-links";
import { SidebarBrand } from "@/components/layout/sidebar-brand";
import { UserMenu } from "@/components/layout/user-menu";

type SidebarProps = {
  permissions?: Record<string, boolean>;
  /** Email for the mobile user menu (desktop menu lives in TopNavbar). */
  email?: string;
  /**
   * When false, the mobile top bar (hamburger + brand + user menu) is
   * skipped — used for staff, whose mobile chrome owns the mobile header.
   */
  mobileHeader?: boolean;
};

/**
 * Application sidebar.
 *
 * Desktop (lg+): a sticky, full-height column in its own layout slot, so
 * main content starts after the sidebar instead of underneath it.
 *
 * Mobile: a sticky top bar (hamburger + brand + user menu) that opens a
 * slide-over sheet. Navigation content is shared via `<NavLinks />`.
 */
export function Sidebar({
  permissions = {},
  email,
  mobileHeader = true,
}: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar — own sticky column */}
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border/70 bg-sidebar/95 shadow-sm lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col">
        <SidebarBrand />
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <NavLinks permissions={permissions} />
        </div>
      </aside>

      {/* Mobile top bar + slide-over sheet */}
      {mobileHeader ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border/80 bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 lg:hidden">
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <span className="text-sm font-semibold">SBBT E-Grow</span>
            <div className="flex-1" />
            <UserMenu email={email ?? "Unknown user"} />
          </header>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b border-sidebar-border/70 px-5 py-4">
              <SheetTitle className="text-left text-base font-semibold">
                SBBT E-Grow
              </SheetTitle>
              <SheetDescription className="text-left">
                Live Plant E-commerce ERP
              </SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto px-3 py-3">
              <NavLinks permissions={permissions} onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}
