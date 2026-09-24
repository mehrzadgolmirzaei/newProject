import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = env.SITE_URL.replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/studio", "/account", "/login", "/onboarding", "/api"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
