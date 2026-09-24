// قالب یکسان پاسخ server action ها
export type Fail = { ok: false; error: string; field?: string };
export type ActionResult<T = null> = { ok: true; data: T } | Fail;

export const fail = (error: string, field?: string): Fail => ({ ok: false, error, field });
export const done = <T = null>(data: T = null as T): { ok: true; data: T } => ({ ok: true, data });
