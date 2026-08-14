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

/**
 * Application sidebar.
 *
 * Renders a fixed desktop sidebar (lg+) and a slide-over sheet for
 * mobile. Navigation content is shared via `<NavLinks />`.
 */
export function Sidebar({
  permissions = {},
}: {
  permissions?: Record<string, boolean>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border/70 bg-sidebar/95 lg:flex lg:flex-col shadow-sm">
        <SidebarBrand />
        <div className="flex-1 overflow-y-auto px-3 py-3">
         <NavLinks permissions={permissions} />
         </div>
       </aside>

      {/* Mobile sidebar (sheet) */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
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
    </>
  );
}