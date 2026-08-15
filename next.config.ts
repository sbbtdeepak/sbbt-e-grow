import type { NextConfig } from "next";

// Fail loudly at build/startup (not silently) when the production origin is
// missing: canonical/OG/sitemap/invite URLs would otherwise fall back to
// http://localhost:3000. Runs under Node directly (next.config is evaluated
// at build and at `next start`), so the warning is always visible in deploy
// logs. lib/site.ts keeps the same guard as defense-in-depth.
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_APP_URL) {
  console.warn(
    "[sbbt] NEXT_PUBLIC_APP_URL is not set. Canonical, Open Graph, sitemap, and invite URLs will fall back to http://localhost:3000. Set NEXT_PUBLIC_APP_URL in the production environment.",
  );
}

const nextConfig: NextConfig = {
  // Enable `forbidden()` / `unauthorized()` (auth interrupts). Documented,
  // stable-behavior feature in Next.js 16 — used by requireRole/requireCompanyUser
  // to render app/forbidden.tsx with a real HTTP 403 for wrong-role access.
  experimental: {
    authInterrupts: true,
  },

  // Legacy E-Grow variants were consolidated into one E-Grow product
  // (migration 0018). Permanently redirect old URLs to the canonical page.
  async redirects() {
    return [
      {
        source: "/catalogue/e-grow-standard",
        destination: "/catalogue/e-grow",
        permanent: true,
      },
      {
        source: "/catalogue/e-grow-enterprise",
        destination: "/catalogue/e-grow",
        permanent: true,
      },
      {
        source: "/catalogue/e-grow-startup",
        destination: "/catalogue/e-grow",
        permanent: true,
      },
    ];
  },

  // Production security headers. HSTS is only emitted for a configured,
  // non-localhost production origin — it must never be forced on local
  // development (browsers ignore HSTS over plain HTTP, but we avoid
  // pinning localhost anyway).
  //
  // CSP is intentionally NOT set here: Next.js App Router inlines the RSC
  // flight payload as inline scripts and the product pages use inline
  // style attributes for accent colors, so a safe CSP requires nonce/hash
  // plumbing across the app. Deferred to a dedicated hardening pass.
  async headers() {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    const isProductionOrigin =
      !!appUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(appUrl);

    return [
      {
        source: "/(.*)",
        headers: [
          ...(isProductionOrigin
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
