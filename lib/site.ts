/**
 * Central site-origin helper.
 *
 * Single source of truth for the public origin used by:
 *   - metadataBase / canonical / Open Graph URLs (app/layout.tsx)
 *   - sitemap.ts and robots.ts
 *   - staff invitation redirect URLs (auth callback)
 *
 * Behavior:
 *   - NEXT_PUBLIC_APP_URL set  → used as-is (trailing slashes trimmed).
 *   - Missing in development   → http://localhost:3000 (dev keeps working).
 *   - Missing in production    → falls back to localhost but logs a clear
 *     one-time warning so canonical/OG/sitemap/invite URLs are never
 *     silently wrong in a deployed environment.
 */
let warned = false;

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");

  if (configured) return configured;

  if (process.env.NODE_ENV === "production" && !warned) {
    warned = true;
    console.warn(
      "[sbbt] NEXT_PUBLIC_APP_URL is not set. Canonical, Open Graph, sitemap, and invite URLs will fall back to http://localhost:3000. Set NEXT_PUBLIC_APP_URL in the production environment.",
    );
  }

  return "http://localhost:3000";
}
