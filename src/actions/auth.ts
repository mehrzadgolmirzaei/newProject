"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { env, isProduction } from "@/lib/env";
import { createSession, destroySession, generateOtp, getUser, hashOtp, safeEqual } from "@/lib/auth";
import { hit } from "@/lib/rate-limit";
import { sendOtpSms } from "@/lib/sms";
import { clientIp } from "@/lib/request";
import { audit } from "@/lib/audit";
import { faDigits, normalizeFa, normalizePhone, maskPhone, toLatinDigits } from "@/lib/text";
import { fail, done, type ActionResult } from "@/lib/result";

const OTP_TTL_SEC = 120;
const OTP_MAX_TRIES = 5;

const wait = (sec: number) => `لطفاً ${faDigits(sec)} ثانیه‌ی دیگر دوباره تلاش کنید.`;

export async function requestOtp(input: { phone: string }): Promise<ActionResult<{ masked: string; ttl: number; devCode?: string }>> {
  const phone = normalizePhone(input.phone ?? "");
  if (!phone) return fail("شماره‌ی موبایل معتبر نیست. نمونه: ۰۹۱۲۳۴۵۶۷۸۹", "phone");

  const ip = await clientIp();
  for (const [key, limit, win] of [
    [`otp:phone:${phone}:1m`, 1, 60],
    [`otp:phone:${phone}:1h`, 5, 3600],
    [`otp:ip:${ip}:1h`, 20, 3600],
  ] as const) {
    const r = await hit(key, limit, win);
    if (!r.ok) return fail(wait(r.retryAfter));
  }

  const code = generateOtp();
  await db.otpCode.create({
    data: { phone, codeHash: hashOtp(phone, code), expiresAt: new Date(Date.now() + OTP_TTL_SEC * 1000), ip },
  });
  try {
    await sendOtpSms(phone, code);
  } catch (e) {
    console.error("[sms]", e);
    return fail("ارسال پیامک ناموفق بود. چند دقیقه‌ی دیگر دوباره تلاش کنید.");
  }
  // فقط در توسعه و با درایور console، کد برای راحتی آزمایش نمایش داده می‌شود
  const devCode = !isProduction && env.SMS_DRIVER === "console" ? code : undefined;
  return done({ masked: maskPhone(phone), ttl: OTP_TTL_SEC, devCode });
}

export async function verifyOtp(input: { phone: string; code: string; next?: string }): Promise<ActionResult<{ to: string }>> {
  const phone = normalizePhone(input.phone ?? "");
  const code = toLatinDigits(String(input.code ?? "")).replace(/\D/g, "");
  if (!phone || code.length !== 6) return fail("کد ۶ رقمی را کامل وارد کنید.", "code");

  const ip = await clientIp();
  const r = await hit(`verify:ip:${ip}`, 30, 600);
  if (!r.ok) return fail(wait(r.retryAfter));

  const otp = await db.otpCode.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return fail("اعتبار کد به پایان رسیده است. لطفاً کد جدید درخواست کنید.", "code");
  if (otp.attempts >= OTP_MAX_TRIES) return fail("تعداد تلاش‌ها از حد مجاز گذشت. لطفاً کد جدید درخواست کنید.", "code");

  if (!safeEqual(otp.codeHash, hashOtp(phone, code))) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    const left = OTP_MAX_TRIES - otp.attempts - 1;
    return fail(left > 0 ? `کد واردشده صحیح نیست. ${faDigits(left)} تلاش دیگر باقی است.` : "کد واردشده صحیح نیست. لطفاً کد جدید درخواست کنید.", "code");
  }

  // مصرف اتمیک: اگر درخواست هم‌زمان دیگری زودتر مصرفش کرده باشد، این یکی رد می‌شود
  const consumed = await db.otpCode.updateMany({ where: { id: otp.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (consumed.count !== 1) return fail("کد قبلاً استفاده شده است.", "code");

  const user = await db.user.upsert({ where: { phone }, update: {}, create: { phone } });
  if (user.status === "SUSPENDED") return fail("این حساب معلق شده است. با مدیر سامانه تماس بگیرید.");

  await createSession(user.id);
  await audit(user.id, "auth.login", "User", user.id);

  const next = input.next && input.next.startsWith("/") && !input.next.startsWith("//") ? input.next : "/";
  return done({ to: user.profileComplete ? next : `/onboarding?next=${encodeURIComponent(next)}` });
}

export async function logout() {
  await destroySession();
  redirect("/");
}

// ─── تکمیل پروفایل ──────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().trim().min(3, "نام و نام خانوادگی را کامل بنویسید").max(80),
  medicalNumber: z
    .string()
    .transform((s) => toLatinDigits(s).replace(/\D/g, ""))
    .refine((s) => s.length >= 4 && s.length <= 10, "شماره‌ی نظام پزشکی معتبر نیست"),
  specialty: z.string().trim().min(2, "رشته یا جایگاه را مشخص کنید").max(60),
  institution: z.string().trim().max(120).default(""),
  city: z.string().trim().max(40).default(""),
});

export async function saveProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return fail("نشست شما منقضی شده است. دوباره وارد شوید.");
  const p = profileSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0].message, String(p.error.issues[0].path[0] ?? ""));

  const clash = await db.user.findFirst({ where: { medicalNumber: p.data.medicalNumber, id: { not: user.id } }, select: { id: true } });
  if (clash) return fail("این شماره‌ی نظام پزشکی با حساب دیگری ثبت شده است. اگر این حساب متعلق به شماست، با مدیر سامانه تماس بگیرید.", "medicalNumber");

  const first = !user.profileComplete;
  await db.user.update({
    where: { id: user.id },
    data: {
      name: normalizeFa(p.data.name),
      medicalNumber: p.data.medicalNumber,
      specialty: normalizeFa(p.data.specialty),
      institution: normalizeFa(p.data.institution),
      city: normalizeFa(p.data.city),
      profileComplete: true,
    },
  });
  if (first) await audit(user.id, "user.onboard", "User", user.id);
  return done();
}
