import Link from "next/link";
import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * 403 page rendered by `forbidden()` (requireRole/requireCompanyUser).
 * Authenticated users without the required role land here — never a
 * generic error boundary, never a stack trace.
 */
export default function ForbiddenPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <ShieldX className="size-10 text-muted-foreground" />
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">403 — Access denied</h1>
        <p className="text-muted-foreground">
          You don&apos;t have permission to access this page. If you believe
          this is a mistake, contact your administrator.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
        <Button asChild>
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
