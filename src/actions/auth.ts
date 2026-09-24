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
import { hashPassword, verifyPassword, normalizeUsername, PASSWORD_MIN } from "@/lib/password";

const OTP_TTL_SEC = 120;
const OTP_MAX_TRIES = 5;

const wait = (sec: number) => `لطفاً ${faDigits(sec)} ثانیه‌ی دیگر دوباره تلاش کنید.`;

const safeNext = (next?: string) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/");

export async function requestOtp(input: { phone: string }): Promise<ActionResult<{ masked: string; ttl: number; devCode?: string }>> {
  if (env.AUTH_METHOD !== "otp") return fail("ورود با کد پیامکی فعال نیست.");
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
  if (env.AUTH_METHOD !== "otp") return fail("ورود با کد پیامکی فعال نیست.");
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

  const next = safeNext(input.next);
  return done({ to: user.profileComplete ? next : `/onboarding?next=${encodeURIComponent(next)}` });
}

// ─── ورود با نام کاربری و رمز عبور ───────────────────────────────────────

const BAD_LOGIN = "نام کاربری یا رمز عبور صحیح نیست.";

export async function loginWithPassword(input: { username: string; password: string; next?: string }): Promise<ActionResult<{ to: string }>> {
  if (env.AUTH_METHOD !== "password") return fail("ورود با رمز عبور فعال نیست.");
  const username = normalizeUsername(input.username ?? "");
  const password = String(input.password ?? "");
  if (!username || !password) return fail(BAD_LOGIN);

  const ip = await clientIp();
  for (const [key, limit, win] of [
    [`login:user:${username}`, 8, 900],
    [`login:ip:${ip}`, 40, 900],
  ] as const) {
    const r = await hit(key, limit, win);
    if (!r.ok) return fail(`تعداد تلاش‌های ناموفق بیش از حد مجاز است. ${wait(r.retryAfter)}`);
  }

  const user = await db.user.findUnique({ where: { username }, select: { id: true, passwordHash: true, status: true, profileComplete: true } });
  const ok = await verifyPassword(password, user?.passwordHash);
  if (!user || !ok) return fail(BAD_LOGIN);
  if (user.status === "SUSPENDED") return fail("این حساب معلق شده است. با مدیر سامانه تماس بگیرید.");

  await createSession(user.id);
  await audit(user.id, "auth.login", "User", user.id);
  const next = safeNext(input.next);
  return done({ to: user.profileComplete ? next : `/onboarding?next=${encodeURIComponent(next)}` });
}

const registerSchema = z.object({
  username: z.string().transform((s) => normalizeUsername(s) ?? "").refine(Boolean, "نام کاربری باید با حرف لاتین شروع شود و فقط شامل حروف لاتین کوچک، عدد، نقطه یا زیرخط باشد (۳ تا ۳۲ نویسه)."),
  password: z.string().min(PASSWORD_MIN, `رمز عبور باید دست‌کم ${faDigits(PASSWORD_MIN)} نویسه باشد.`).max(128),
});

export async function register(input: { username: string; password: string; next?: string }): Promise<ActionResult<{ to: string }>> {
  if (env.AUTH_METHOD !== "password") return fail("ثبت‌نام با رمز عبور فعال نیست.");
  const p = registerSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0].message, String(p.error.issues[0].path[0] ?? ""));

  const ip = await clientIp();
  const r = await hit(`register:ip:${ip}`, 10, 3600);
  if (!r.ok) return fail(wait(r.retryAfter));

  const exists = await db.user.findUnique({ where: { username: p.data.username }, select: { id: true } });
  if (exists) return fail("این نام کاربری قبلاً ثبت شده است.", "username");

  const user = await db.user.create({ data: { username: p.data.username, passwordHash: await hashPassword(p.data.password) } });
  await createSession(user.id);
  await audit(user.id, "auth.register", "User", user.id);
  return done({ to: `/onboarding?next=${encodeURIComponent(safeNext(input.next))}` });
}

export async function changePassword(input: { current: string; next: string }): Promise<ActionResult> {
  const me = await getUser();
  if (!me) return fail("نشست شما منقضی شده است. دوباره وارد شوید.");
  const r = await hit(`pwchange:user:${me.id}`, 10, 900);
  if (!r.ok) return fail(wait(r.retryAfter));
  const row = await db.user.findUnique({ where: { id: me.id }, select: { passwordHash: true } });
  if (row?.passwordHash && !(await verifyPassword(String(input.current ?? ""), row.passwordHash))) return fail("رمز عبور فعلی صحیح نیست.", "current");
  const next = String(input.next ?? "");
  if (next.length < PASSWORD_MIN || next.length > 128) return fail(`رمز عبور جدید باید دست‌کم ${faDigits(PASSWORD_MIN)} نویسه باشد.`, "next");
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(next) } });
  await audit(me.id, "user.password", "User", me.id);
  return done();
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
