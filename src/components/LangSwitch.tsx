"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { localePath, splitLocale } from "@/lib/i18n/config";
import { useI18n } from "./LocaleProvider";

/** تغییر زبان به همان صفحه در زبان دیگر (بارگذاری کامل تا جهت و زبان صفحه عوض شود) */
export function LangSwitch() {
  const { locale } = useI18n();
  const pathname = usePathname();
  const sp = useSearchParams();
  const other = locale === "fa" ? "en" : "fa";
  const qs = sp.toString();
  const href = localePath(other, splitLocale(pathname).path) + (qs ? `?${qs}` : "");
  return (
    <a href={href} className="lang-switch" hrefLang={other} lang={other} title={other === "en" ? "English" : "فارسی"}>
      {other === "en" ? "EN" : "فا"}
    </a>
  );
}
