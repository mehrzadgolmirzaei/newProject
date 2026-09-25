// زبان‌های سایت: فارسی (پیش‌فرض، بدون پیشوند) و انگلیسی (پیشوند /en)
export const LOCALES = ["fa", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fa";

export const isRtl = (l: Locale) => l === "fa";
export const htmlLang = (l: Locale) => (l === "fa" ? "fa" : "en");
export const ogLocale = (l: Locale) => (l === "fa" ? "fa_IR" : "en_US");

/** مسیر داخلی (بدون پیشوند زبان) ← مسیر نهایی برای زبان داده‌شده */
export function localePath(locale: Locale, path: string): string {
  if (locale === DEFAULT_LOCALE) return path;
  if (!path.startsWith("/")) return path;
  // فایل‌ها و APIها زبان ندارند
  if (/^\/(media|api|_next|images)\b/.test(path)) return path;
  if (path === "/") return `/${locale}`;
  if (path.startsWith("/?") || path.startsWith("/#")) return `/${locale}${path.slice(1)}`;
  return `/${locale}${path}`;
}

/** مسیر مرورگر ← زبان و مسیر بدون پیشوند */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  if (pathname === "/en" || pathname.startsWith("/en/")) return { locale: "en", path: pathname.slice(3) || "/" };
  return { locale: "fa", path: pathname };
}
