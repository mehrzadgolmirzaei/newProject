import { faDigits } from "./text";
import type { Locale } from "./i18n/config";

/** کد نمایشی مورد: VP-0042 */
export function caseCode(n: number): string {
  return "VP-" + String(n).padStart(4, "0");
}

const FA = {
  date: new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "long", day: "numeric" }),
  short: new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }),
  time: new Intl.DateTimeFormat("fa-IR-u-ca-persian", { hour: "2-digit", minute: "2-digit" }),
};
const EN = {
  date: new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "short", day: "numeric" }),
  short: new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }),
  time: new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }),
};

/**
 * قالب‌بندی اعداد و تاریخ برای هر زبان:
 * فارسی ← ارقام فارسی و تقویم شمسی · انگلیسی ← ارقام لاتین و تقویم میلادی
 */
export function fmt(locale: Locale) {
  const en = locale === "en";
  const D = en ? EN : FA;
  const digits = (v: string | number) => (en ? String(v) : faDigits(v));
  const date = (d: Date | string | null | undefined) => (d ? D.date.format(new Date(d)) : "—");
  const dateShort = (d: Date | string | null | undefined) => (d ? D.short.format(new Date(d)) : "—");
  return {
    digits,
    date,
    dateShort,
    dateTime(d: Date | string | null | undefined) {
      if (!d) return "—";
      const x = new Date(d);
      return `${D.short.format(x)} · ${D.time.format(x)}`;
    },
    num(n: number) {
      const s = n.toLocaleString("en-US");
      return en ? s : faDigits(s).replace(/,/g, "٬");
    },
    percent(part: number, total: number) {
      if (!total) return "—";
      const p = Math.round((part / total) * 100);
      return en ? `${p}%` : faDigits(p) + "٪";
    },
    /** زمان نسبی کوتاه: «۳ ساعت پیش» / "3 hours ago" */
    ago(d: Date | string) {
      const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
      if (s < 60) return en ? "just now" : "لحظاتی پیش";
      const m = Math.round(s / 60);
      if (m < 60) return en ? `${m} min ago` : `${faDigits(m)} دقیقه پیش`;
      const h = Math.round(m / 60);
      if (h < 24) return en ? `${h} h ago` : `${faDigits(h)} ساعت پیش`;
      const dd = Math.round(h / 24);
      if (dd < 30) return en ? `${dd} d ago` : `${faDigits(dd)} روز پیش`;
      return date(d);
    },
    /** سن بیمار — بالای ۸۹ سال به‌صورت «۹۰+» تا شناسایی‌پذیر نباشد */
    age(age: number | null | undefined) {
      if (age == null) return "—";
      if (age >= 90) return en ? "90+ y" : "۹۰+ سال";
      if (age < 1) return en ? "under 1 y" : "زیر یک سال";
      return en ? `${age} y` : `${faDigits(age)} سال`;
    },
  };
}
export type Fmt = ReturnType<typeof fmt>;

// ─── توابع قدیمی (فارسی) ─────────────────────────────────────────────────
const fa = fmt("fa");
export const faDate = fa.date;
export const faDateShort = fa.dateShort;
export const faDateTime = fa.dateTime;
export const timeAgo = fa.ago;
export const ageLabel = fa.age;
export const num = fa.num;
export const percent = fa.percent;
