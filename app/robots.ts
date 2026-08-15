import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();

/**
 * robots.txt — public marketing site only. ERP, auth, onboarding, and master
 * admin routes are excluded from crawling.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/suspended",
        "/auth/",
        "/dashboard",
        "/products",
        "/marketplaces",
        "/orders",
        "/purchase",
        "/packing",
        "/dispatch",
        "/delivery",
        "/payments",
        "/reports",
        "/settings",
        "/onboarding",
        "/master",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
