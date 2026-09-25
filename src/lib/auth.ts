import "server-only";
import crypto from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { lredirect } from "./i18n/server";
import type { Role, User } from "@prisma/client";
import { db } from "./db";
import { env, isProduction } from "./env";
import { clientIp, userAgent } from "./request";

// ─── نشست‌ها ────────────────────────────────────────────────────────────────
// کوکی فقط یک توکن تصادفی ۲۵۶ بیتی است. در دیتابیس فقط هش آن ذخیره می‌شود،
// پس حتی با نشت دیتابیس هم نمی‌توان نشست ساخت. خروج یا تعلیق کاربر = حذف نشست.

const COOKIE = "vp_session";
const SESSION_DAYS = 30;
const RENEW_AFTER_MS = 1000 * 60 * 60 * 24; // ثبت فعالیت حداکثر روزی یک بار

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.session.create({
    data: { tokenHash: sha256(token), userId, expiresAt, ip: await clientIp(), userAgent: await userAgent() },
  });
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(COOKIE);
}

export type CurrentUser = Pick<
  User,
  "id" | "name" | "phone" | "role" | "status" | "trusted" | "specialty" | "institution" | "medicalNumber" | "profileComplete"
>;

/** کاربر جاری — در هر درخواست فقط یک بار از دیتابیس خوانده می‌شود */
export const getUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        select: {
          id: true, name: true, phone: true, role: true, status: true, trusted: true,
          specialty: true, institution: true, medicalNumber: true, profileComplete: true,
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.status === "SUSPENDED") return null;
  if (Date.now() - session.lastSeenAt.getTime() > RENEW_AFTER_MS) {
    // ثبت آخرین فعالیت (برای فهرست نشست‌ها و پاک‌سازی نشست‌های رهاشده)
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  }
  return session.user;
});

// ─── قوانین دسترسی ─────────────────────────────────────────────────────────
// همه‌ی تصمیم‌های دسترسی از همین توابع می‌گذرد تا یک‌جا قابل بازبینی باشد.

export const isActive = (u: CurrentUser | null): u is CurrentUser => !!u && u.status === "ACTIVE";
export const isAdmin = (u: CurrentUser | null) => isActive(u) && u.role === "ADMIN";
export const isContributor = (u: CurrentUser | null) => isActive(u) && (u.role === "CONTRIBUTOR" || u.role === "ADMIN");

/** پاسخ‌دادن به مورد و شرکت در بحث */
export const canParticipate = (u: CurrentUser | null) => isActive(u) && u.profileComplete;

/** دیدن فهرست و محتوای موارد */
export const canBrowse = (u: CurrentUser | null) => env.ATLAS_VISIBILITY === "public" || isActive(u);

/** ویرایش مورد: نویسنده (تا زمانی که بایگانی نشده) یا مدیر */
export const canEditCase = (u: CurrentUser | null, c: { authorId: string; status: string }) =>
  isAdmin(u) || (isContributor(u) && u!.id === c.authorId && c.status !== "ARCHIVED");

/** مدیریت بحث یک مورد: نویسنده‌ی مورد یا مدیر */
export const canModerateCase = (u: CurrentUser | null, c: { authorId: string }) =>
  isAdmin(u) || (isActive(u) && u.id === c.authorId);

// ─── نگهبان‌ها برای صفحات ─────────────────────────────────────────────────

export async function requireUser(next = "/"): Promise<CurrentUser> {
  const u = await getUser();
  if (!u) return lredirect(`/login?next=${encodeURIComponent(next)}`);
  if (!u.profileComplete) return lredirect("/onboarding");
  return u;
}

export async function requireRole(roles: Role[], next = "/"): Promise<CurrentUser> {
  const u = await requireUser(next);
  if (u.status !== "ACTIVE") return lredirect("/account");
  if (!roles.includes(u.role)) return lredirect("/");
  return u;
}

export async function revokeAllSessions(userId: string) {
  await db.session.deleteMany({ where: { userId } });
}

// ─── کد یک‌بارمصرف ────────────────────────────────────────────────────────

export function hashOtp(phone: string, code: string) {
  return crypto.createHmac("sha256", env.AUTH_SECRET).update(`${phone}:${code}`).digest("hex");
}

export function generateOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
