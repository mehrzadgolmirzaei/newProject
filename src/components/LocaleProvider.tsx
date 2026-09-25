"use client";

import { createContext, useContext, useMemo } from "react";
import { localePath, type Locale } from "@/lib/i18n/config";
import { makeT } from "@/lib/i18n/translate";
import { fmt } from "@/lib/format";

const Ctx = createContext<Locale>("fa");

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

/** ترجمه و قالب‌بندی در کامپوننت‌های کلاینت */
export function useI18n() {
  const locale = useContext(Ctx);
  return useMemo(() => ({ locale, t: makeT(locale), lp: (p: string) => localePath(locale, p), f: fmt(locale) }), [locale]);
}
