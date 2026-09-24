import { faDigits } from "./text";

/** کد نمایشی مورد: VP-0042 */
export function caseCode(n: number): string {
  return "VP-" + String(n).padStart(4, "0");
}

const dateFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "long", day: "numeric" });
const shortFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { hour: "2-digit", minute: "2-digit" });

/** تاریخ شمسی: ۲ مهر ۱۴۰۵ */
export function faDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return dateFmt.format(new Date(d));
}
export function faDateShort(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return shortFmt.format(new Date(d));
}
export function faDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const x = new Date(d);
  return `${shortFmt.format(x)} · ${timeFmt.format(x)}`;
}

/** زمان نسبی کوتاه: «۳ ساعت پیش» */
export function timeAgo(d: Date | string): string {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "لحظاتی پیش";
  const m = Math.round(s / 60);
  if (m < 60) return `${faDigits(m)} دقیقه پیش`;
  const h = Math.round(m / 60);
  if (h < 24) return `${faDigits(h)} ساعت پیش`;
  const dd = Math.round(h / 24);
  if (dd < 30) return `${faDigits(dd)} روز پیش`;
  return faDate(d);
}

/** سن بیمار — بالای ۸۹ سال به‌صورت «۹۰+» تا شناسایی‌پذیر نباشد */
export function ageLabel(age: number | null | undefined): string {
  if (age == null) return "—";
  if (age >= 90) return "۹۰+ سال";
  if (age < 1) return "زیر یک سال";
  return `${faDigits(age)} سال`;
}

export function num(n: number): string {
  return faDigits(n.toLocaleString("en-US")).replace(/,/g, "٬");
}

export function percent(part: number, total: number): string {
  if (!total) return "—";
  return faDigits(Math.round((part / total) * 100)) + "٪";
}
