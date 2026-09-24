import "server-only";
import { z } from "zod";
import { db } from "./db";
import { SUBSPECIALTIES } from "./taxonomy";
import { normalizeFa } from "./text";

// ─── مدل فرم ویرایشگر ─────────────────────────────────────────────────────

const text = (max: number) => z.string().max(max).default("").transform(normalizeFa);
const list = (maxItems: number, maxLen: number) =>
  z.array(z.string().max(maxLen)).max(maxItems).default([]).transform((a) => a.map(normalizeFa).filter(Boolean));

export const caseFormSchema = z.object({
  title: text(160),
  subspecialty: z.string().default("").refine((s) => s === "" || SUBSPECIALTIES.some((x) => x.key === s), "زیرتخصص نامعتبر"),
  organ: text(80),
  specimenType: z
    .enum(["BIOPSY", "EXCISION", "RESECTION", "FNA", "FLUID_CYTOLOGY", "GYN_CYTOLOGY", "BONE_MARROW", "FROZEN_SECTION", "CONSULTATION", "OTHER"])
    .nullable()
    .default(null),
  difficulty: z.enum(["BASIC", "INTERMEDIATE", "ADVANCED"]).default("INTERMEDIATE"),
  mode: z.enum(["UNKNOWN", "TEACHING"]).default("UNKNOWN"),
  patientAge: z.number().int().min(0).max(120).nullable().default(null),
  patientSex: z.enum(["FEMALE", "MALE", "UNSPECIFIED"]).default("UNSPECIFIED"),
  keywords: list(20, 40).transform((a) => a.map((k) => k.toLowerCase())),

  clinicalHistory: text(6000),
  imaging: text(3000),
  gross: text(4000),
  microscopic: text(8000),
  molecular: text(3000),

  question: text(200),
  finalDiagnosis: text(300),
  diagnosisAliases: list(12, 200),
  showIhcBeforeAnswer: z.boolean().default(true),
  commentsEnabled: z.boolean().default(true),

  discussion: text(20000),
  teachingPoints: list(12, 400),
  references: list(20, 500),

  ihc: z
    .array(
      z.object({
        marker: text(40),
        outcome: z.enum(["POSITIVE", "NEGATIVE", "FOCAL", "WEAK", "EQUIVOCAL", "LOST", "RETAINED"]),
        pattern: text(80),
        note: text(200),
      }),
    )
    .max(60)
    .default([]),
  differentials: z.array(z.object({ name: text(200), note: text(1000) })).max(15).default([]),

  deidConfirmed: z.boolean().default(false),
});

export type CaseForm = z.input<typeof caseFormSchema>;

/** بررسی کامل‌بودن مورد پیش از ارسال — فهرست کمبودها را برمی‌گرداند */
export async function readiness(caseId: string) {
  const c = await db.case.findUnique({
    where: { id: caseId },
    include: { media: { select: { status: true } } },
  });
  if (!c) return ["مورد پیدا نشد."];
  const missing: string[] = [];
  if (c.title.length < 8) missing.push("عنوان مورد (نحوه‌ی مراجعه)");
  if (!c.subspecialty) missing.push("زیرتخصص");
  if (c.clinicalHistory.length < 20) missing.push("شرح حال بالینی");
  if (c.microscopic.length < 20) missing.push("یافته‌های میکروسکوپی");
  if (!c.finalDiagnosis) missing.push("تشخیص نهایی");
  if (!c.media.some((m) => m.status === "READY")) missing.push("دست‌کم یک تصویر پردازش‌شده");
  if (c.media.some((m) => m.status === "PROCESSING" || m.status === "UPLOADING")) missing.push("پایان پردازش همه‌ی تصاویر");
  if (!c.deidConfirmedAt) missing.push("تأیید حذف اطلاعات هویتی بیمار");
  if (c.finalDiagnosis && c.mode === "UNKNOWN" && normalizeFa(c.title).toLowerCase().includes(c.finalDiagnosis.toLowerCase()))
    missing.push("عنوان نباید تشخیص را آشکار کند");
  return missing;
}

