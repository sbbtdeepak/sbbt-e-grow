import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
