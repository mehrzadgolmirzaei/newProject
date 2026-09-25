import "server-only";
import type { Metadata } from "next";
import { env } from "./env";
import { localePath, ogLocale, type Locale } from "./i18n/config";
import { makeT } from "./i18n/translate";
import { SITE } from "./site";
import { getI18n } from "./i18n/server";

export const siteUrl = () => env.SITE_URL.replace(/\/$/, "");
export const absUrl = (path: string) => siteUrl() + (path === "/" ? "" : path);

/** نشانی‌های هر دو زبان یک صفحه — برای canonical و hreflang */
export function languageAlternates(path: string) {
  return {
    fa: absUrl(localePath("fa", path)),
    en: absUrl(localePath("en", path)),
    "x-default": absUrl(localePath("fa", path)),
  };
}

type PageSeo = {
  locale: Locale;
  /** مسیر بدون پیشوند زبان، مثلاً /cases/12 */
  path: string;
  title?: string;
  /** عنوان بدون پسوند نام سایت (برای صفحه‌ی اصلی) */
  absoluteTitle?: boolean;
  description?: string;
  image?: string | null;
  noindex?: boolean;
  type?: "website" | "article";
};

/** متادیتای کامل یک صفحه: عنوان، توضیح، canonical، hreflang، Open Graph و Twitter */
export function pageMeta({ locale, path, title, absoluteTitle, description, image, noindex, type = "website" }: PageSeo): Metadata {
  const t = makeT(locale);
  const desc = description ?? t(SITE.description);
  const url = absUrl(localePath(locale, path));
  const images = [{ url: image ? (image.startsWith("http") ? image : absUrl(image)) : absUrl("/og.jpg"), width: image ? undefined : 1200, height: image ? undefined : 630 }];
  return {
    ...(title ? { title: absoluteTitle ? { absolute: title } : title } : {}),
    description: desc,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type,
      url,
      siteName: t(SITE.name),
      locale: ogLocale(locale),
      alternateLocale: [ogLocale(locale === "fa" ? "en" : "fa")],
      ...(title ? { title } : {}),
      description: desc,
      images,
    },
    twitter: { card: "summary_large_image", ...(title ? { title } : {}), description: desc, images: images.map((i) => i.url) },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** خلاصه‌ی کوتاه برای description (حداکثر ~۱۶۰ نویسه) */
export function snippet(text: string, max = 160) {
  const s = text.replace(/\s+/g, " ").replace(/^[-•]\s*/, "").trim();
  return s.length > max ? s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : s;
}

/** صفحه‌های خصوصی (حساب، مدیریت، استودیو، ورود): فقط عنوان ترجمه‌شده، بدون ایندکس */
export async function privateMeta(title: string): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t(title), robots: { index: false, follow: false } };
}
