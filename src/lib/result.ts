// قالب یکسان پاسخ server action ها
import { getI18n } from "./i18n/server";
import type { Vars } from "./i18n/translate";

export type Fail = { ok: false; error: string; field?: string };
export type ActionResult<T = null> = { ok: true; data: T } | Fail;

/** پیام خطا به زبان درخواست جاری ترجمه می‌شود (متن فارسی کلید ترجمه است) */
export const fail = async (error: string, field?: string, vars?: Vars): Promise<Fail> => {
  const { t, f } = await getI18n();
  const v = vars && Object.fromEntries(Object.entries(vars).map(([k, x]) => [k, typeof x === "number" ? f.digits(x) : x]));
  return { ok: false, error: t(error, v), field };
};
export const done = <T = null>(data: T = null as T): { ok: true; data: T } => ({ ok: true, data });
