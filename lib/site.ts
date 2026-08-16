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

/**
 * Canonical invitation redirect target used by every auth invitation
 * (staff invites, resends, company-admin invites, create-company invites).
 *
 * Single source of truth — never hardcode the origin or the callback path
 * in invitation logic. Resolves through getSiteUrl(), so production emits
 * `https://sbbt-e-grow.vercel.app/auth/callback` while local development
 * emits `http://localhost:3000/auth/callback`.
 */
export function getInviteRedirectUrl(): string {
  return `${getSiteUrl()}/auth/callback`;
}
