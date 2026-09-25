import type { MetadataRoute } from "next";
import { absUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const PRIVATE = ["/admin", "/studio", "/account", "/login", "/onboarding"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/media/"],
        disallow: [...PRIVATE, ...PRIVATE.map((p) => `/en${p}`), "/api/", "/fa/"],
      },
    ],
    sitemap: absUrl("/sitemap.xml"),
  };
}
