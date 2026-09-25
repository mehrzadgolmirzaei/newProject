import type { Locale } from "./config";
import { EN } from "./en";

export type Vars = Record<string, string | number>;

/**
 * ترجمه بر پایه‌ی متن فارسی: t("ورود پزشکان") ← در انگلیسی «Doctor sign-in».
 * متغیرها با {name} مشخص می‌شوند. اگر ترجمه‌ای نبود، همان متن فارسی برمی‌گردد.
 */
export function translate(locale: Locale, fa: string, vars?: Vars): string {
  // «متن|زمینه»: برای واژه‌های یکسان با معنای متفاوت (مثلاً «متوسط» برای سطح و برای اطمینان)
  const bar = fa.indexOf("|");
  const plain = bar >= 0 ? fa.slice(0, bar) : fa;
  let s = locale === "en" ? (EN[fa] ?? EN[plain] ?? plain) : plain;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export type T = (fa: string, vars?: Vars) => string;
export const makeT = (locale: Locale): T => (fa, vars) => translate(locale, fa, vars);
