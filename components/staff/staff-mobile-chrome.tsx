"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Store,
  BarChart3,
  Settings,
  LogOut,
  Command,
  MoreHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { marketplaceTabs, staffNavItems, type MarketplaceTabKey } from "@/lib/staff-navigation";
import { useStaffStore } from "@/lib/staff-store";
import { signOutAction } from "@/app/(auth)/actions";
import type { StaffNavItem } from "@/lib/staff-navigation";

const extraMenuItems: StaffNavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Products", href: "/products", icon: Package },
  { title: "Marketplaces", href: "/marketplaces", icon: Store },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Settings", href: "/settings", icon: Settings },
];

type StaffMobileChromeProps = {
  email: string;
  fullName?: string | null;
};

function initialsFrom(value: string): string {
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function StaffMobileChrome({ email, fullName }: StaffMobileChromeProps) {
  const pathname = usePathname();
  const marketplaceFilter = useStaffStore((s) => s.marketplaceFilter);
  const setMarketplaceFilter = useStaffStore((s) => s.setMarketplaceFilter);
  const [moreOpen, setMoreOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const displayName = fullName || email;
  const fallback = initialsFrom(displayName) || "U";

  const handleTab = (key: MarketplaceTabKey) => {
    setMarketplaceFilter(key);
  };

  const isActive = (href: string) => {
    if (href === "#more") return false;
    return pathname.startsWith(href);
  };

  // First six bottom items are fixed modules; "More" opens sheet.
  const bottomItems = staffNavItems.slice(0, 6);
  const moreItem = staffNavItems[6];

  return (
    <div className="lg:hidden">
      {/* ── Top fixed marketplace bar ─────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-12 items-center gap-2 px-3">
          <Command className="size-5 shrink-0 text-primary" />
          <span className="text-sm font-semibold tracking-tight">
            SBBT Staff
          </span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {marketplaceTabs.map((tab) => {
            const active = marketplaceFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTab(tab.key)}
                className={`flex h-9 min-w-max shrink-0 items-center rounded-full px-4 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
                aria-pressed={active}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Bottom fixed navigation ───────────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        aria-label="Staff modules"
      >
        <div className="grid grid-cols-7">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.title}
                href={item.href}
                className="flex min-h-14 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors active:bg-muted/50"
                aria-current={active ? "page" : undefined}
              >
                <Icon className={`size-5 ${active ? "text-primary" : ""}`} />
                <span
                  className={`text-[10px] font-medium ${
                    active ? "text-primary" : ""
                  }`}
                >
                  {item.title}
                </span>
              </Link>
            );
          })}

          {/* More trigger */}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex min-h-14 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors active:bg-muted/50"
                aria-label="More options"
              >
                {moreItem ? (
                  <MoreHorizontal className="size-5" />
                ) : null}
                <span className="text-[10px] font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-8">
              <SheetHeader className="text-left">
                <SheetTitle className="text-base">More</SheetTitle>
                <SheetDescription className="text-left">
                  All company modules and account actions.
                </SheetDescription>
              </SheetHeader>

              <div className="mb-4 flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                <Avatar className="size-9">
                  <AvatarFallback>{fallback}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {email}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {extraMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SheetClose asChild key={item.title}>
                      <Link
                        href={item.href}
                        className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center text-xs font-medium text-foreground transition-colors active:bg-muted/50"
                      >
                        <Icon className="size-5 text-primary" />
                        {item.title}
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>

              <Separator className="my-4" />

              <Button
                type="button"
                variant="destructive"
                className="w-full"
                disabled={pending}
                onClick={() => startTransition(() => signOutAction())}
              >
                <LogOut className="size-4" />
                {pending ? "Signing out…" : "Sign out"}
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}