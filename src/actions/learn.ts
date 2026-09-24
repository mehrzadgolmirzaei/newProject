"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { canModerateCase, canParticipate, getUser } from "@/lib/auth";
import { answerKey, isMatch } from "@/lib/matching";
import { hit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { normalizeFa } from "@/lib/text";
import { fail, done, type ActionResult } from "@/lib/result";

const NEED_ACTIVE = "برای این کار باید حساب شما تأیید شده باشد.";

// ─── پاسخ به مورد چالشی ─────────────────────────────────────────────────

const attemptSchema = z.object({
  caseId: z.string().min(1),
  answer: z.string().max(300).default(""),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]).nullable().default(null),
  gaveUp: z.boolean().default(false),
});

export async function submitAttempt(input: z.input<typeof attemptSchema>): Promise<ActionResult<{ correct: boolean }>> {
  const user = await getUser();
  if (!canParticipate(user)) return fail(NEED_ACTIVE);
  const p = attemptSchema.safeParse(input);
  if (!p.success) return fail("درخواست نامعتبر است.");
  const answer = normalizeFa(p.data.answer);
  if (!p.data.gaveUp && answer.length < 3) return fail("تشخیص خود را بنویسید.", "answer");

  const c = await db.case.findUnique({
    where: { id: p.data.caseId },
    select: { id: true, number: true, status: true, finalDiagnosis: true, diagnosisAliases: true },
  });
  if (!c || c.status !== "PUBLISHED") return fail("این مورد در دسترس نیست.");

  const correct = !p.data.gaveUp && isMatch(answer, [c.finalDiagnosis, ...c.diagnosisAliases]);
  try {
    await db.attempt.create({
      data: {
        caseId: c.id,
        userId: user!.id,
        answer: p.data.gaveUp ? "" : answer,
        normalized: p.data.gaveUp ? "" : answerKey(answer),
        confidence: p.data.gaveUp ? null : p.data.confidence,
        gaveUp: p.data.gaveUp,
        autoCorrect: correct,
      },
    });
  } catch {
    // قید یکتا: هر کاربر یک پاسخ برای هر مورد
    return fail("شما قبلاً به این مورد پاسخ داده‌اید.");
  }
  revalidatePath(`/cases/${c.number}`);
  return done({ correct });
}

/** تصحیح دستی پاسخ توسط ارائه‌دهنده‌ی مورد (null ← بازگشت به تطبیق خودکار) */
export async function gradeAttempt(input: { attemptId: string; correct: boolean | null }): Promise<ActionResult> {
  const user = await getUser();
  const a = await db.attempt.findUnique({ where: { id: input.attemptId }, include: { case: { select: { authorId: true, number: true } } } });
  if (!a) return fail("پاسخ پیدا نشد.");
  if (!canModerateCase(user, a.case)) return fail("فقط ارائه‌دهنده‌ی مورد می‌تواند پاسخ‌ها را تصحیح کند.");
  await db.attempt.update({ where: { id: a.id }, data: { gradedCorrect: input.correct } });
  await audit(user!.id, "attempt.grade", "Attempt", a.id, { correct: input.correct });
  revalidatePath(`/cases/${a.case.number}`);
  return done();
}

// ─── بحث ──────────────────────────────────────────────────────────────────

const commentSchema = z.object({
  caseId: z.string().min(1),
  parentId: z.string().nullable().default(null),
  body: z.string().trim().min(2, "متن نظر خیلی کوتاه است.").max(5000, "متن نظر بیش از حد طولانی است."),
});

export async function postComment(input: z.input<typeof commentSchema>): Promise<ActionResult> {
  const user = await getUser();
  if (!canParticipate(user)) return fail(NEED_ACTIVE);
  const p = commentSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0].message, "body");

  const r = await hit(`comment:${user!.id}`, 8, 60);
  if (!r.ok) return fail("تعداد درخواست‌ها بیش از حد مجاز است. لطفاً چند لحظه بعد دوباره تلاش کنید.");

  const c = await db.case.findUnique({ where: { id: p.data.caseId }, select: { id: true, number: true, status: true, mode: true, authorId: true, commentsEnabled: true } });
  if (!c || c.status !== "PUBLISHED") return fail("این مورد در دسترس نیست.");
  if (!c.commentsEnabled && !canModerateCase(user, c)) return fail("گفت‌وگو برای این مورد بسته است.");

  // در مورد چالشی، بحث پس از ثبت پاسخ باز می‌شود تا کسی جواب را لو ندهد
  if (c.mode === "UNKNOWN" && !canModerateCase(user, c)) {
    const attempted = await db.attempt.findUnique({ where: { userId_caseId: { userId: user!.id, caseId: c.id } }, select: { id: true } });
    if (!attempted) return fail("ابتدا تشخیص خود را ثبت کنید؛ سپس بخش نظرات برای شما باز می‌شود.");
  }

  let parentId: string | null = null;
  if (p.data.parentId) {
    const parent = await db.comment.findUnique({ where: { id: p.data.parentId }, select: { id: true, caseId: true, parentId: true } });
    if (!parent || parent.caseId !== c.id) return fail("نظر مرجع پیدا نشد.");
    parentId = parent.parentId ?? parent.id; // رشته‌ها یک سطح عمق دارند
  }

  await db.comment.create({ data: { caseId: c.id, authorId: user!.id, parentId, body: normalizeFa(p.data.body) } });
  revalidatePath(`/cases/${c.number}`);
  return done();
}

export async function editComment(input: { id: string; body: string }): Promise<ActionResult> {
  const user = await getUser();
  if (!canParticipate(user)) return fail(NEED_ACTIVE);
  const body = normalizeFa(input.body ?? "");
  if (body.length < 2 || body.length > 5000) return fail("طول متن مجاز نیست.");
  const cm = await db.comment.findUnique({ where: { id: input.id }, include: { case: { select: { number: true } } } });
  if (!cm || cm.authorId !== user!.id || cm.status !== "VISIBLE") return fail("اجازه‌ی ویرایش این نظر را ندارید.");
  await db.comment.update({ where: { id: cm.id }, data: { body, editedAt: new Date() } });
  revalidatePath(`/cases/${cm.case.number}`);
  return done();
}

export async function deleteComment(id: string): Promise<ActionResult> {
  const user = await getUser();
  const cm = await db.comment.findUnique({ where: { id }, include: { case: { select: { number: true } } } });
  if (!user || !cm || cm.authorId !== user.id) return fail("اجازه‌ی حذف این نظر را ندارید.");
  await db.comment.update({ where: { id }, data: { status: "DELETED", pinned: false } });
  revalidatePath(`/cases/${cm.case.number}`);
  return done();
}

export async function moderateComment(input: { id: string; action: "hide" | "restore" | "pin" | "unpin" }): Promise<ActionResult> {
  const user = await getUser();
  const cm = await db.comment.findUnique({ where: { id: input.id }, include: { case: { select: { number: true, authorId: true } } } });
  if (!cm) return fail("نظر پیدا نشد.");
  if (!canModerateCase(user, cm.case)) return fail("فقط ارائه‌دهنده‌ی مورد یا مدیر می‌تواند بحث را مدیریت کند.");

  const data =
    input.action === "hide" ? { status: "HIDDEN" as const, pinned: false }
    : input.action === "restore" ? { status: "VISIBLE" as const }
    : input.action === "pin" ? { pinned: true }
    : { pinned: false };
  if (input.action === "pin" && (cm.status !== "VISIBLE" || cm.parentId)) return fail("فقط نظرهای اصلیِ قابل‌مشاهده سنجاق می‌شوند.");

  await db.comment.update({ where: { id: cm.id }, data });
  const act = { hide: "comment.hide", restore: "comment.restore", pin: "comment.pin", unpin: "comment.pin" }[input.action];
  await audit(user!.id, act, "Comment", cm.id, { action: input.action });
  revalidatePath(`/cases/${cm.case.number}`);
  return done();
}

// ─── نشان‌کردن ─────────────────────────────────────────────────────────────

export async function toggleSave(caseId: string): Promise<ActionResult<{ saved: boolean }>> {
  const user = await getUser();
  if (!user) return fail("برای نشان‌کردن وارد شوید.");
  const key = { userId_caseId: { userId: user.id, caseId } };
  const existing = await db.savedCase.findUnique({ where: key });
  if (existing) {
    await db.savedCase.delete({ where: key });
    return done({ saved: false });
  }
  const c = await db.case.findUnique({ where: { id: caseId }, select: { id: true } });
  if (!c) return fail("این مورد پیدا نشد.");
  await db.savedCase.create({ data: { userId: user.id, caseId } });
  return done({ saved: true });
}
