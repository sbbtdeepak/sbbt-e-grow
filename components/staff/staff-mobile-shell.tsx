"use client";

import type { ReactNode } from "react";

import { StaffMobileChrome } from "@/components/staff/staff-mobile-chrome";

type StaffMobileShellProps = {
  children: ReactNode;
  email: string;
  fullName?: string | null;
};

/**
 * Mobile-first Staff shell.
 *
 * Hidden on desktop (lg+): desktop keeps the existing admin layout.
 * On mobile/tablet this shell renders:
 *  - sticky top bar with scrollable marketplace tabs
 *  - fixed bottom navigation (Order, Purchase, Packing, Dispatch, Delivery, Payment, More)
 *  - centered module content with safe-area padding
 */
export function StaffMobileShell({
  children,
  email,
  fullName,
}: StaffMobileShellProps) {
  return (
    <div className="min-h-dvh bg-background lg:hidden">
      <StaffMobileChrome email={email} fullName={fullName} />
      <main className="mx-auto w-full max-w-lg px-3 pb-28 pt-4 sm:px-4">
        {children}
      </main>
    </div>
  );
}
