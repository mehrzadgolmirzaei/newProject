// ابزارهای متن فارسی — بدون وابستگی به سرور (در کلاینت هم قابل استفاده است)

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** تبدیل ارقام فارسی/عربی به لاتین */
export function toLatinDigits(s: string): string {
  return s.replace(/[۰-۹٠-٩]/g, (d) => {
    const i = FA_DIGITS.indexOf(d);
    return String(i >= 0 ? i : AR_DIGITS.indexOf(d));
  });
}

/** تبدیل ارقام لاتین به فارسی برای نمایش */
export function faDigits(v: string | number): string {
  return String(v).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

/**
 * یکسان‌سازی متن فارسی برای ذخیره و جست‌وجو:
 * «ي/ك» عربی ← «ی/ک» فارسی، حذف اعراب و کشیده، فاصله‌های اضافه.
 * بدون این کار «كبد» (با ک عربی) در جست‌وجوی «کبد» پیدا نمی‌شود.
 */
export function normalizeFa(s: string): string {
  return s
    .replace(/ي/g, "ی")
    .replace(/ى/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ۀ/g, "هٔ")
    .replace(/[ً-ٰٟ]/g, "") // اعراب
    .replace(/ـ/g, "") // کشیده
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

/** شماره‌ی موبایل ایران به قالب 09xxxxxxxxx — یا null اگر نامعتبر باشد */
export function normalizePhone(input: string): string | null {
  let s = toLatinDigits(input).replace(/[\s\-()]/g, "");
  if (s.startsWith("+98")) s = "0" + s.slice(3);
  else if (s.startsWith("0098")) s = "0" + s.slice(4);
  else if (s.startsWith("98") && s.length === 12) s = "0" + s.slice(2);
  else if (s.startsWith("9") && s.length === 10) s = "0" + s;
  return /^09\d{9}$/.test(s) ? s : null;
}

/** نمایش شماره با پوشاندن وسط: ۰۹۱۲•••۴۵۶۷ */
export function maskPhone(phone: string): string {
  return faDigits(phone.slice(0, 4) + "•••" + phone.slice(7));
}

/** فهرست چندخطی ← آرایه (خطوط خالی حذف) */
export function lines(s: string): string[] {
  return s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function initials(name?: string | null): string {
  const n = (name || "").replace(/^(دکتر|دکتـر|Dr\.?)\s+/i, "").trim();
  return n ? n.charAt(0) : "؟";
}
