"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { canEditCase, getUser, isAdmin, isContributor, type CurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { enqueue, removeAssetFiles } from "@/lib/media";
import { mediaUrl } from "@/lib/storage";
import { caseFormSchema, readiness, type CaseForm } from "@/lib/case-form";
import { normalizeFa } from "@/lib/text";
import { fail, done, type ActionResult } from "@/lib/result";

async function loadEditable(user: CurrentUser | null, caseId: string) {
  const c = await db.case.findUnique({ where: { id: caseId }, select: { id: true, number: true, authorId: true, status: true } });
  if (!c || !canEditCase(user, c)) return null;
  return c;
}

// ─── ایجاد و ذخیره ─────────────────────────────────────────────────────────

export async function createDraft() {
  const user = await getUser();
  if (!isContributor(user)) redirect("/");
  const c = await db.case.create({ data: { authorId: user!.id } });
  await audit(user!.id, "case.create", "Case", c.id);
  redirect(`/studio/cases/${c.id}`);
}

export async function saveCase(caseId: string, input: CaseForm): Promise<ActionResult<{ savedAt: string }>> {
  const user = await getUser();
  const c = await loadEditable(user, caseId);
  if (!c) return fail("اجازه‌ی ویرایش این مورد را ندارید.");
  const p = caseFormSchema.safeParse(input);
  if (!p.success) return fail(p.error.issues[0].message, String(p.error.issues[0].path[0] ?? ""));
  const f = p.data;

  await db.$transaction([
    db.case.update({
      where: { id: c.id },
      data: {
        title: f.title, subspecialty: f.subspecialty, organ: f.organ, specimenType: f.specimenType,
        difficulty: f.difficulty, mode: f.mode, patientAge: f.patientAge, patientSex: f.patientSex, keywords: f.keywords,
        clinicalHistory: f.clinicalHistory, imaging: f.imaging, gross: f.gross, microscopic: f.microscopic, molecular: f.molecular,
        question: f.question, finalDiagnosis: f.finalDiagnosis, diagnosisAliases: f.diagnosisAliases,
        showIhcBeforeAnswer: f.showIhcBeforeAnswer, discussion: f.discussion, teachingPoints: f.teachingPoints,
        references: f.references,
        deidConfirmedAt: f.deidConfirmed ? new Date() : null,
      },
    }),
    db.ihcResult.deleteMany({ where: { caseId: c.id } }),
    db.ihcResult.createMany({
      data: f.ihc.filter((r) => r.marker).map((r, i) => ({ ...r, caseId: c.id, order: i })),
    }),
    db.differential.deleteMany({ where: { caseId: c.id } }),
    db.differential.createMany({
      data: f.differentials.filter((d) => d.name).map((d, i) => ({ ...d, caseId: c.id, order: i })),
    }),
  ]);

  // ویرایش مورد منتشرشده ثبت می‌شود تا تاریخچه‌ی تغییرات قابل پیگیری باشد
  if (c.status === "PUBLISHED") await audit(user!.id, "case.update", "Case", c.id);
  revalidatePath(`/cases/${c.number}`);
  return done({ savedAt: new Date().toISOString() });
}

/** کمبودهای مورد پیش از ارسال (برای نمایش در ویرایشگر) */
export async function getReadiness(caseId: string): Promise<string[]> {
  const user = await getUser();
  const c = await loadEditable(user, caseId);
  if (!c) return [];
  return readiness(c.id);
}

export async function submitCase(caseId: string): Promise<ActionResult<{ status: string }>> {
  const user = await getUser();
  const c = await loadEditable(user, caseId);
  if (!c) return fail("اجازه‌ی ویرایش این مورد را ندارید.");
  if (c.status === "PUBLISHED") return fail("این مورد منتشر شده است.");
  const missing = await readiness(c.id);
  if (missing.length) return fail("پیش از ارسال کامل کنید: " + missing.join("، "));

  const direct = isAdmin(user) || !!user!.trusted;
  await db.case.update({
    where: { id: c.id },
    data: direct
      ? { status: "PUBLISHED", publishedAt: new Date(), submittedAt: new Date(), reviewerId: user!.id, reviewNote: null }
      : { status: "IN_REVIEW", submittedAt: new Date(), reviewNote: null },
  });
  await audit(user!.id, direct ? "case.publish" : "case.submit", "Case", c.id);
  revalidatePath("/studio");
  revalidatePath("/");
  return done({ status: direct ? "PUBLISHED" : "IN_REVIEW" });
}

/** برگرداندن مورد ارسال‌شده به پیش‌نویس توسط خود نویسنده */
export async function withdrawCase(caseId: string): Promise<ActionResult> {
  const user = await getUser();
  const c = await loadEditable(user, caseId);
  if (!c || c.status !== "IN_REVIEW") return fail("این مورد در صف بازبینی نیست.");
  await db.case.update({ where: { id: c.id }, data: { status: "DRAFT" } });
  revalidatePath("/studio");
  return done();
}

export async function deleteDraft(caseId: string) {
  const user = await getUser();
  const c = await db.case.findUnique({ where: { id: caseId }, include: { media: true } });
  if (!c || !(isAdmin(user) || (user?.id === c.authorId && c.status === "DRAFT"))) redirect("/studio");
  for (const m of c.media) await removeAssetFiles(m).catch(() => {});
  await db.case.delete({ where: { id: c.id } });
  await audit(user!.id, "case.delete", "Case", c.id, { title: c.title });
  redirect("/studio");
}

// ─── تصاویر ───────────────────────────────────────────────────────────────

export async function listMedia(caseId: string) {
  const user = await getUser();
  const c = await loadEditable(user, caseId);
  if (!c) return [];
  const rows = await db.mediaAsset.findMany({
    where: { caseId: c.id },
    orderBy: { order: "asc" },
    include: { annotations: { orderBy: { createdAt: "asc" } } },
  });
  return rows.map((m) => ({
    id: m.id,
    kind: m.kind,
    status: m.status,
    error: m.error,
    stain: m.stain,
    magnification: m.magnification,
    caption: m.caption,
    width: m.width,
    height: m.height,
    dzi: mediaUrl(m.dziKey),
    thumb: mediaUrl(m.thumbKey),
    video: mediaUrl(m.videoKey),
    annotations: m.annotations.map((a) => ({ id: a.id, shape: a.shape, x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, label: a.label, spoiler: a.spoiler })),
  }));
}
export type StudioMedia = Awaited<ReturnType<typeof listMedia>>[number];

async function editableMedia(mediaId: string) {
  const user = await getUser();
  const m = await db.mediaAsset.findUnique({ where: { id: mediaId }, include: { case: { select: { id: true, number: true, authorId: true, status: true } } } });
  if (!m || !canEditCase(user, m.case)) return null;
  return { user: user!, m };
}

export async function updateMedia(mediaId: string, input: { stain: string; magnification: string; caption: string }): Promise<ActionResult> {
  const x = await editableMedia(mediaId);
  if (!x) return fail("اجازه‌ی ویرایش ندارید.");
  await db.mediaAsset.update({
    where: { id: mediaId },
    data: {
      stain: normalizeFa(input.stain ?? "").slice(0, 60),
      magnification: normalizeFa(input.magnification ?? "").slice(0, 30),
      caption: normalizeFa(input.caption ?? "").slice(0, 400),
    },
  });
  revalidatePath(`/cases/${x.m.case.number}`);
  return done();
}

export async function reorderMedia(caseId: string, ids: string[]): Promise<ActionResult> {
  const user = await getUser();
  const c = await loadEditable(user, caseId);
  if (!c) return fail("اجازه‌ی ویرایش ندارید.");
  await db.$transaction(ids.map((id, i) => db.mediaAsset.updateMany({ where: { id, caseId: c.id }, data: { order: i } })));
  revalidatePath(`/cases/${c.number}`);
  return done();
}

export async function deleteMedia(mediaId: string): Promise<ActionResult> {
  const x = await editableMedia(mediaId);
  if (!x) return fail("اجازه‌ی حذف ندارید.");
  await removeAssetFiles(x.m).catch((e) => console.error("[media.delete]", e));
  await db.mediaAsset.delete({ where: { id: mediaId } });
  await audit(x.user.id, "media.delete", "MediaAsset", mediaId, { caseId: x.m.caseId });
  revalidatePath(`/cases/${x.m.case.number}`);
  return done();
}

export async function retryMedia(mediaId: string): Promise<ActionResult> {
  const x = await editableMedia(mediaId);
  if (!x || x.m.status !== "FAILED") return fail("امکان تلاش دوباره نیست.");
  void enqueue(mediaId);
  return done();
}

const annotationSchema = z
  .array(
    z.object({
      shape: z.enum(["ARROW", "ELLIPSE", "RECT"]),
      x1: z.number().finite(),
      y1: z.number().finite(),
      x2: z.number().finite(),
      y2: z.number().finite(),
      label: z.string().max(120).default("").transform(normalizeFa),
      spoiler: z.boolean().default(false),
    }),
  )
  .max(60);

/** جایگزینی کامل نشانه‌گذاری‌های یک تصویر */
export async function saveAnnotations(mediaId: string, input: z.input<typeof annotationSchema>): Promise<ActionResult> {
  const x = await editableMedia(mediaId);
  if (!x) return fail("اجازه‌ی ویرایش ندارید.");
  const p = annotationSchema.safeParse(input);
  if (!p.success) return fail("داده‌ی نشانه‌گذاری نامعتبر است.");
  await db.$transaction([
    db.annotation.deleteMany({ where: { mediaId } }),
    db.annotation.createMany({ data: p.data.map((a) => ({ ...a, mediaId, authorId: x.user.id })) }),
  ]);
  revalidatePath(`/cases/${x.m.case.number}`);
  return done();
}
