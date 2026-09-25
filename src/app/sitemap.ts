import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { mediaUrl } from "@/lib/storage";
import { SUBSPECIALTIES } from "@/lib/taxonomy";
import { absUrl, languageAlternates } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Entry = MetadataRoute.Sitemap[number];

/** هر صفحه با هر دو نسخه‌ی زبانی و پیوند hreflang متقابل */
function both(path: string, extra: Omit<Entry, "url" | "alternates"> = {}): Entry[] {
  const languages = languageAlternates(path);
  return [
    { url: languages.fa, alternates: { languages }, ...extra },
    { url: languages.en, alternates: { languages }, ...extra },
  ];
}

const abs = (u: string | null) => (u ? (/^https?:/.test(u) ? u : absUrl(u)) : null);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pub = env.ATLAS_VISIBILITY === "public";
  const statics: Entry[] = [
    ...both("/", { changeFrequency: "daily", priority: 1 }),
    ...both("/about", { changeFrequency: "monthly", priority: 0.5 }),
    ...both("/contributors", { changeFrequency: "weekly", priority: 0.5 }),
    ...both("/subspecialties", { changeFrequency: "weekly", priority: 0.6 }),
  ];
  if (!pub) return statics;

  const [cases, subs] = await Promise.all([
    db.case.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { number: "desc" },
      select: {
        number: true,
        updatedAt: true,
        media: { where: { status: "READY" }, orderBy: { order: "asc" }, take: 3, select: { previewKey: true } },
      },
    }),
    db.case.groupBy({ by: ["subspecialty"], where: { status: "PUBLISHED" }, _count: { _all: true }, _max: { updatedAt: true } }),
  ]);
  const lastCase = cases.reduce<Date | undefined>((m, c) => (!m || c.updatedAt > m ? c.updatedAt : m), undefined);

  return [
    ...statics,
    ...both("/cases", { changeFrequency: "daily", priority: 0.9, lastModified: lastCase }),
    ...SUBSPECIALTIES.filter((s) => subs.some((g) => g.subspecialty === s.key)).flatMap((s) =>
      both(`/cases?sub=${s.key}`, {
        changeFrequency: "weekly",
        priority: 0.7,
        lastModified: subs.find((g) => g.subspecialty === s.key)?._max.updatedAt ?? undefined,
      }),
    ),
    ...cases.flatMap((c) =>
      both(`/cases/${c.number}`, {
        lastModified: c.updatedAt,
        changeFrequency: "monthly",
        priority: 0.8,
        images: c.media.map((m) => abs(mediaUrl(m.previewKey))).filter((u): u is string => !!u),
      }),
    ),
  ];
}
