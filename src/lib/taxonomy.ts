// واژگان ثابت سامانه — برچسب‌های فارسی مقادیر ذخیره‌شده در دیتابیس.
// دیتابیس فقط کلید انگلیسی را نگه می‌دارد تا تغییر نام نمایشی، داده را خراب نکند.

import type { Difficulty, SpecimenType, Sex, IhcOutcome, CaseStatus, CaseMode, Role, UserStatus, Confidence, AnnotationShape } from "@prisma/client";

export type Subspecialty = { key: string; fa: string; en: string };

export const SUBSPECIALTIES: Subspecialty[] = [
  { key: "breast", fa: "پستان", en: "Breast" },
  { key: "gi", fa: "دستگاه گوارش", en: "Gastrointestinal" },
  { key: "liver", fa: "کبد و مجاری صفراوی", en: "Liver & Biliary" },
  { key: "pancreas", fa: "پانکراس", en: "Pancreas" },
  { key: "lung", fa: "ریه و پلور", en: "Thoracic" },
  { key: "gu", fa: "کلیه و مجاری ادراری–تناسلی", en: "Genitourinary" },
  { key: "renal", fa: "پاتولوژی کلیه (مدیکال)", en: "Medical Renal" },
  { key: "gyn", fa: "زنان", en: "Gynecologic" },
  { key: "skin", fa: "پوست", en: "Dermatopathology" },
  { key: "bone-soft", fa: "استخوان و بافت نرم", en: "Bone & Soft Tissue" },
  { key: "head-neck", fa: "سر و گردن", en: "Head & Neck" },
  { key: "endocrine", fa: "غدد درون‌ریز", en: "Endocrine" },
  { key: "neuro", fa: "مغز و اعصاب", en: "Neuropathology" },
  { key: "heme", fa: "هماتوپاتولوژی", en: "Hematopathology" },
  { key: "pediatric", fa: "کودکان", en: "Pediatric" },
  { key: "cyto", fa: "سیتوپاتولوژی", en: "Cytopathology" },
  { key: "infectious", fa: "عفونی و انگل‌شناسی", en: "Infectious" },
];

export const subspecialty = (key: string) => SUBSPECIALTIES.find((s) => s.key === key);
export const subspecialtyFa = (key: string) => subspecialty(key)?.fa ?? "—";

export const DIFFICULTY: Record<Difficulty, string> = {
  BASIC: "پایه",
  INTERMEDIATE: "متوسط",
  ADVANCED: "پیشرفته",
};

export const SPECIMEN: Record<SpecimenType, string> = {
  BIOPSY: "بیوپسی",
  EXCISION: "اکسیزیون",
  RESECTION: "رزکسیون",
  FNA: "آسپیراسیون سوزنی (FNA)",
  FLUID_CYTOLOGY: "سیتولوژی مایعات",
  GYN_CYTOLOGY: "سیتولوژی زنان",
  BONE_MARROW: "مغز استخوان",
  FROZEN_SECTION: "فروزن سکشن",
  CONSULTATION: "مشاوره (لام ارجاعی)",
  OTHER: "سایر",
};

export const SEX: Record<Sex, string> = { FEMALE: "زن", MALE: "مرد", UNSPECIFIED: "—" };

export const IHC_OUTCOME: Record<IhcOutcome, { fa: string; sym: string; tone: "pos" | "neg" | "mid" }> = {
  POSITIVE: { fa: "مثبت", sym: "+", tone: "pos" },
  NEGATIVE: { fa: "منفی", sym: "−", tone: "neg" },
  FOCAL: { fa: "کانونی", sym: "+ کانونی", tone: "mid" },
  WEAK: { fa: "ضعیف", sym: "+ ضعیف", tone: "mid" },
  EQUIVOCAL: { fa: "مبهم", sym: "±", tone: "mid" },
  LOST: { fa: "از دست رفته", sym: "فقدان", tone: "neg" },
  RETAINED: { fa: "حفظ‌شده", sym: "حفظ", tone: "pos" },
};

export const CASE_STATUS: Record<CaseStatus, string> = {
  DRAFT: "پیش‌نویس",
  IN_REVIEW: "در انتظار بازبینی",
  PUBLISHED: "منتشرشده",
  ARCHIVED: "بایگانی",
};

export const CASE_MODE: Record<CaseMode, { fa: string; hint: string }> = {
  UNKNOWN: { fa: "مورد ناشناس", hint: "تشخیص تا پیش از ثبت پاسخ مخفی است" },
  TEACHING: { fa: "مورد آموزشی", hint: "تشخیص از ابتدا نمایش داده می‌شود" },
};

export const ROLE: Record<Role, string> = { ADMIN: "مدیر", CONTRIBUTOR: "ارائه‌دهنده", MEMBER: "عضو" };
export const USER_STATUS: Record<UserStatus, string> = { PENDING: "در انتظار تأیید", ACTIVE: "فعال", SUSPENDED: "معلق" };
export const CONFIDENCE: Record<Confidence, string> = { LOW: "کم", MEDIUM: "متوسط", HIGH: "زیاد" };
export const SHAPE: Record<AnnotationShape, string> = { ARROW: "پیکان", ELLIPSE: "بیضی", RECT: "کادر" };

// پیشنهادهای ورودی (قابل تایپ آزاد)
export const STAIN_SUGGESTIONS = [
  "H&E", "PAS", "PAS-D", "Masson trichrome", "Reticulin", "Congo red", "Ziehl–Neelsen", "GMS",
  "Giemsa", "Alcian blue", "Mucicarmine", "Perls (iron)", "Elastic (EVG)", "Papanicolaou", "Diff-Quik", "Wright–Giemsa",
];

export const MAGNIFICATION_SUGGESTIONS = ["×2", "×4", "×10", "×20", "×40", "×60", "×100 (روغنی)"];

export const SPECIALTY_SUGGESTIONS = [
  "پاتولوژیست", "دستیار پاتولوژی", "فلوشیپ پاتولوژی", "انکولوژیست", "جراح", "متخصص داخلی", "دانشجوی پزشکی", "سایر",
];

export const DEFAULT_QUESTION = "تشخیص شما چیست؟";
