import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { clientIp } from "./request";

/** ثبت یک رویداد مهم (تأیید کاربر، انتشار مورد، پنهان‌کردن نظر…) */
export async function audit(
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string | null,
  meta?: Prisma.InputJsonValue,
) {
  try {
    await db.auditLog.create({ data: { actorId, action, entity, entityId: entityId ?? null, meta, ip: await clientIp() } });
  } catch (e) {
    // ثبت رویداد نباید عملیات اصلی را از کار بیندازد
    console.error("[audit]", e);
  }
}

export const AUDIT_LABEL: Record<string, string> = {
  "auth.login": "ورود",
  "auth.register": "ثبت‌نام",
  "user.create": "ایجاد حساب",
  "user.password": "تغییر رمز عبور",
  "user.password.reset": "تعیین رمز جدید",
  "user.onboard": "تکمیل پروفایل",
  "user.approve": "تأیید حساب",
  "user.suspend": "تعلیق حساب",
  "user.reactivate": "فعال‌سازی دوباره",
  "user.role": "تغییر نقش",
  "user.trust": "تغییر اعتماد انتشار",
  "case.create": "ایجاد پیش‌نویس",
  "case.update": "ویرایش مورد",
  "case.submit": "ارسال برای بازبینی",
  "case.publish": "انتشار مورد",
  "case.return": "بازگرداندن به نویسنده",
  "case.archive": "بایگانی مورد",
  "case.feature": "انتخاب مورد هفته",
  "case.delete": "حذف پیش‌نویس",
  "media.delete": "حذف تصویر",
  "comment.hide": "پنهان‌کردن نظر",
  "comment.restore": "بازگرداندن نظر",
  "comment.pin": "سنجاق نکته‌ی آموزشی",
  "attempt.grade": "تصحیح پاسخ",
};
