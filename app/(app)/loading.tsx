import { Loader2 } from "lucide-react";

/**
 * Loading state for every route under `/(app)`.
 * Shown automatically by Next.js while a route's page.tsx
 * is rendering server-side (Suspense boundary per route).
 */
export default function AppLoading() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm">Loading…</p>
      </div>
    </div>
  );
}