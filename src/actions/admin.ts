"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getUser, isAdmin, revokeAllSessions } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { faDigits, normalizeFa } from "@/lib/text";
import { hashPassword, normalizeUsername, PASSWORD_MIN } from "@/lib/password";
import { fail, done, type ActionResult } from "@/lib/result";

const DENIED = "این کار به دسترسی مدیر نیاز دارد.";

async function admin() {
  const u = await getUser();
  return isAdmin(u) ? u! : null;
}

// ─── کاربران ───────────────────────────────────────────────────────────────

export async function setUserStatus(userId: string, status: "ACTIVE" | "SUSPENDED"): Promise<ActionResult> {
  const me = await admin();
  if (!me) return fail(DENIED);
  if (userId === me.id) return fail("وضعیت حساب خودتان را نمی‌توانید تغییر دهید.");
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u) return fail("کاربر پیدا نشد.");
  if (status === "ACTIVE" && !u.profileComplete) return fail("این کاربر هنوز پروفایل خود را تکمیل نکرده است.");

  await db.user.update({
    where: { id: userId },
    data: status === "ACTIVE" && !u.approvedAt ? { status, approvedAt: new Date(), approvedById: me.id } : { status },
  });
  if (status === "SUSPENDED") await revokeAllSessions(userId); // خروج فوری از همه‌ی دستگاه‌ها
  const action = status === "SUSPENDED" ? "user.suspend" : u.approvedAt ? "user.reactivate" : "user.approve";
  await audit(me.id, action, "User", userId);
  revalidatePath("/admin/users");
  return done();
}

export async function setUserRole(userId: string, role: "ADMIN" | "CONTRIBUTOR" | "MEMBER"): Promise<ActionResult> {
  const me = await admin();
  if (!me) return fail(DENIED);
  if (userId === me.id) return fail("نقش خودتان را نمی‌توانید تغییر دهید.");
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u) return fail("کاربر پیدا نشد.");
  if (role !== "MEMBER" && u.status !== "ACTIVE") return fail("ابتدا حساب را تأیید کنید.");
  await db.user.update({ where: { id: userId }, data: { role, ...(role === "MEMBER" ? { trusted: false } : {}) } });
  await audit(me.id, "user.role", "User", userId, { from: u.role, to: role });
  revalidatePath("/admin/users");
  return done();
}

/** ساخت حساب توسط مدیر — حساب بلافاصله فعال است؛ کاربر در نخستین ورود مشخصات پزشکی را تکمیل می‌کند */
export async function createUser(input: { username: string; password: string; role: "ADMIN" | "CONTRIBUTOR" | "MEMBER" }): Promise<ActionResult> {
  const me = await admin();
  if (!me) return fail(DENIED);
  const username = normalizeUsername(input.username ?? "");
  if (!username) return fail("نام کاربری باید با حرف لاتین شروع شود و فقط شامل حروف لاتین کوچک، عدد، نقطه یا زیرخط باشد.", "username");
  const password = String(input.password ?? "");
  if (password.length < PASSWORD_MIN) return fail(`رمز عبور باید دست‌کم ${faDigits(PASSWORD_MIN)} نویسه باشد.`, "password");
  if (!["ADMIN", "CONTRIBUTOR", "MEMBER"].includes(input.role)) return fail("نقش نامعتبر است.");
  if (await db.user.findUnique({ where: { username }, select: { id: true } })) return fail("این نام کاربری قبلاً ثبت شده است.", "username");

  const u = await db.user.create({
    data: { username, passwordHash: await hashPassword(password), role: input.role, status: "ACTIVE", approvedAt: new Date(), approvedById: me.id },
  });
  await audit(me.id, "user.create", "User", u.id, { username, role: input.role });
  revalidatePath("/admin/users");
  return done();
}

/** تعیین رمز عبور جدید برای کاربر (مثلاً وقتی رمز را فراموش کرده است) — همه‌ی نشست‌های او باطل می‌شود */
export async function resetPassword(userId: string, password: string): Promise<ActionResult> {
  const me = await admin();
  if (!me) return fail(DENIED);
  if (String(password ?? "").length < PASSWORD_MIN) return fail(`رمز عبور باید دست‌کم ${faDigits(PASSWORD_MIN)} نویسه باشد.`);
  const u = await db.user.findUnique({ where: { id: userId }, select: { id: true, username: true } });
  if (!u?.username) return fail("این کاربر نام کاربری ندارد.");
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } });
  if (userId !== me.id) await revokeAllSessions(userId);
  await audit(me.id, "user.password.reset", "User", userId);
  return done();
}

export async function setTrusted(userId: string, trusted: boolean): Promise<ActionResult> {
  const me = await admin();
  if (!me) return fail(DENIED);
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u || u.role === "MEMBER") return fail("فقط ارائه‌دهنده‌ها می‌توانند انتشار مستقیم داشته باشند.");
  await db.user.update({ where: { id: userId }, data: { trusted } });
  await audit(me.id, "user.trust", "User", userId, { trusted });
  revalidatePath("/admin/users");
  return done();
}

// ─── بازبینی و انتشار ────────────────────────────────────────────────────

export async function publishCase(caseId: string): Promise<ActionResult> {
  const me = await admin();
  if (!me) return fail(DENIED);
  const c = await db.case.findUnique({ where: { id: caseId }, select: { id: true, number: true, status: true, publishedAt: true } });
  if (!c) return fail("مورد پیدا نشد.");
  if (c.status === "PUBLISHED") return fail("این مورد قبلاً منتشر شده است.");
  await db.case.update({
    where: { id: c.id },
    data: { status: "PUBLISHED", publishedAt: c.publishedAt ?? new Date(), reviewerId: me.id, reviewNote: null },
  });
  await audit(me.id, "case.publish", "Case", c.id);
  revalidatePath("/admin/review");
  revalidatePath(`/cases/${c.number}`);
  revalidatePath("/");
  return done();
}

export async function returnCase(caseId: string, note: string): Promise<ActionResult> {
  const me = await admin();
  if (!me) return fail(DENIED);
  const msg = normalizeFa(note ?? "");
  if (msg.length < 5) return fail("برای نویسنده توضیح بنویسید چه چیزی باید اصلاح شود.", "note");
  const c = await db.case.findUnique({ where: { id: caseId }, select: { id: true, number: true } });
  if (!c) return fail("مورد پیدا نشد.");
  await db.case.update({ where: { id: c.id }, data: { status: "DRAFT", reviewNote: msg, reviewerId: me.id } });
  await audit(me.id, "case.return", "Case", c.id, { note: msg });
  revalidatePath("/admin/review");
  return done();
}

export async function archiveCase(caseId: string, archived: boolean): Promise<ActionResult> {
  const me = await admin();
  if (!me) return fail(DENIED);
  const c = await db.case.findUnique({ where: { id: caseId }, select: { id: true, number: true, publishedAt: true } });
  if (!c) return fail("مورد پیدا نشد.");
  await db.case.update({
    where: { id: c.id },
    data: archived ? { status: "ARCHIVED", featuredAt: null } : { status: c.publishedAt ? "PUBLISHED" : "DRAFT" },
  });
  await audit(me.id, "case.archive", "Case", c.id, { archived });
  revalidatePath(`/cases/${c.number}`);
  revalidatePath("/");
  return done();
}

export async function featureCase(caseId: string): Promise<ActionResult> {
  const me = await admin();
  if (!me) return fail(DENIED);
  const c = await db.case.findUnique({ where: { id: caseId }, select: { id: true, number: true, status: true } });
  if (!c || c.status !== "PUBLISHED") return fail("فقط موارد منتشرشده می‌توانند مورد هفته باشند.");
  await db.case.update({ where: { id: c.id }, data: { featuredAt: new Date() } });
  await audit(me.id, "case.feature", "Case", c.id);
  revalidatePath("/");
  revalidatePath(`/cases/${c.number}`);
  return done();
}
