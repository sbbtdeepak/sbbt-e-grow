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
export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <SidebarBrand />
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
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
          <SheetHeader className="border-b border-sidebar-border px-5 py-4">
            <SheetTitle className="text-left text-base font-semibold">
              SBBT E-Grow
            </SheetTitle>
            <SheetDescription className="text-left">
              Live Plant E-commerce ERP
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto">
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}