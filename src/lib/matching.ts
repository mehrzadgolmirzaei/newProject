// تطبیق خودکار پاسخ کاربر با تشخیص نهایی.
//
// هدف: «Invasive lobular carcinoma» و «ILC, classic type» و «lobular carcinoma, invasive»
// همه درست شناخته شوند؛ ولی «ductal carcinoma» نه.
// روش: یکسان‌سازی ← حذف واژه‌های کم‌اهمیت ← مقایسه‌ی مجموعه‌ی واژه‌ها.
// این فقط پیشنهاد اولیه است؛ ارائه‌دهنده‌ی مورد می‌تواند درست/نادرست را دستی تعیین کند.

import { normalizeFa, toLatinDigits } from "./text";

// واژه‌هایی که در تشخیص پاتولوژی معنای تمایزدهنده ندارند
const STOP = new Set([
  "a", "an", "the", "of", "with", "and", "in", "on", "for", "to", "type", "nos", "not", "otherwise", "specified",
  "consistent", "compatible", "suggestive", "favor", "favour", "likely", "probable", "classic", "classical",
  "conventional", "usual", "variant", "grade", "g1", "g2", "g3", "i", "ii", "iii", "who", "cns",
  "و", "با", "از", "در", "به", "نوع", "درجه", "احتمالا", "احتمالاً", "مطرح", "مطابق",
]);

// مخفف‌های رایج ← عبارت کامل (سمت پاسخ و تشخیص هر دو باز می‌شوند)
const ABBR: Record<string, string> = {
  idc: "invasive ductal carcinoma",
  ilc: "invasive lobular carcinoma",
  dcis: "ductal carcinoma in situ",
  lcis: "lobular carcinoma in situ",
  scc: "squamous cell carcinoma",
  bcc: "basal cell carcinoma",
  hcc: "hepatocellular carcinoma",
  rcc: "renal cell carcinoma",
  ccrcc: "clear cell renal cell carcinoma",
  gist: "gastrointestinal stromal tumor",
  dlbcl: "diffuse large b cell lymphoma",
  cll: "chronic lymphocytic leukemia",
  sll: "small lymphocytic lymphoma",
  aml: "acute myeloid leukemia",
  gbm: "glioblastoma",
  ptc: "papillary thyroid carcinoma",
  mtc: "medullary thyroid carcinoma",
  nsclc: "non small cell lung carcinoma",
  sclc: "small cell lung carcinoma",
  mfh: "undifferentiated pleomorphic sarcoma",
  ups: "undifferentiated pleomorphic sarcoma",
  dfsp: "dermatofibrosarcoma protuberans",
  cin: "cervical intraepithelial neoplasia",
  hsil: "high grade squamous intraepithelial lesion",
  lsil: "low grade squamous intraepithelial lesion",
  tb: "tuberculosis",
};

// هم‌ارزی واژه‌ها
const SYN: Record<string, string> = {
  tumour: "tumor",
  oesophageal: "esophageal",
  oesophagus: "esophagus",
  haemangioma: "hemangioma",
  haematoma: "hematoma",
  leukaemia: "leukemia",
  anaemia: "anemia",
  carcinomas: "carcinoma",
  tumors: "tumor",
  cancer: "carcinoma",
  malignancy: "carcinoma",
  "b-cell": "b cell",
  "t-cell": "t cell",
  "non-small": "non small",
};

export function tokens(input: string): string[] {
  let s = toLatinDigits(normalizeFa(input)).toLowerCase();
  for (const [a, b] of Object.entries(SYN)) s = s.replaceAll(a, b);
  s = s.replace(/[^\p{L}\p{N}\s]/gu, " ");
  const out: string[] = [];
  for (const w of s.split(/\s+/).filter(Boolean)) {
    const expanded = ABBR[w];
    if (expanded) out.push(...expanded.split(" "));
    else out.push(SYN[w] ?? w);
  }
  return [...new Set(out.filter((w) => !STOP.has(w) && w.length > 1))];
}

/** کلید یکسان برای گروه‌بندی پاسخ‌ها در آمار */
export function answerKey(input: string): string {
  return tokens(input).sort().join(" ");
}

/**
 * آیا پاسخ با یکی از تشخیص‌های قابل‌قبول مطابقت دارد؟
 * شرط: همه‌ی واژه‌های کلیدیِ یکی از تشخیص‌ها در پاسخ باشد، و پاسخ بیش از حد
 * واژه‌ی اضافه‌ی متناقض نداشته باشد (مثلاً «ductal» به‌جای «lobular»).
 */
export function isMatch(answer: string, accepted: string[]): boolean {
  const a = new Set(tokens(answer));
  if (a.size === 0) return false;
  for (const target of accepted) {
    const t = tokens(target);
    if (t.length === 0) continue;
    const hits = t.filter((w) => a.has(w)).length;
    const recall = hits / t.length;
    const precision = hits / a.size;
    if (recall === 1 && precision >= 0.5) return true;
    // تشخیص‌های چندواژه‌ای: یک واژه‌ی کم‌اهمیت جا افتاده باشد
    if (t.length >= 4 && recall >= 0.75 && precision >= 0.75) return true;
  }
  return false;
}
