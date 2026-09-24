import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.SITE_URL.replace(/\/$/, "");
  const statics = ["", "/cases", "/subspecialties", "/contributors", "/about"].map((p) => ({ url: base + p, changeFrequency: "daily" as const }));
  if (env.ATLAS_VISIBILITY !== "public") return statics;
  const cases = await db.case.findMany({ where: { status: "PUBLISHED" }, select: { number: true, updatedAt: true } });
  return [...statics, ...cases.map((c) => ({ url: `${base}/cases/${c.number}`, lastModified: c.updatedAt }))];
}
