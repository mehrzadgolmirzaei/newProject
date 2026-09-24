// داده‌ی نمایشی برای توسعه و آزمایش — در production اجرا نکنید.
// همه‌ی موارد با isDemo=true ساخته می‌شوند و با «npm run demo:clear» یک‌جا پاک می‌شوند.
// تصاویر، عکس‌های میکروسکوپی نمونه‌اند و متن‌ها برای نمایش ساختار نوشته شده‌اند.

import fsp from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { processAsset, incomingPath } from "@/lib/media";
import { INCOMING_DIR } from "@/lib/storage";
import { answerKey, isMatch } from "@/lib/matching";
import { hashPassword } from "@/lib/password";
import type { Prisma, Role, UserStatus } from "@prisma/client";

if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
  console.error("seed در production اجرا نمی‌شود (برای اجبار: --force).");
  process.exit(1);
}

const DEMO = path.join(process.cwd(), "prisma", "demo");

type DemoUser = {
  name: string; medicalNumber: string; specialty: string; institution?: string; city?: string;
  role: Role; status: UserStatus; trusted?: boolean; profileComplete: boolean; approvedAt?: Date;
};

// رمز عبور همه‌ی حساب‌های نمایشی
const DEMO_PASSWORD = "viora1234";

async function user(phone: string, username: string, data: DemoUser) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  return db.user.upsert({ where: { phone }, update: { ...data, username, passwordHash }, create: { phone, username, passwordHash, ...data } });
}

type Seed = {
  img: string[];
  author: string;
  data: Omit<Prisma.CaseUncheckedCreateInput, "authorId">;
  ihc?: Omit<Prisma.IhcResultCreateManyInput, "caseId">[];
  ddx?: { name: string; note: string }[];
  annotations?: { img: number; shape: "ARROW" | "ELLIPSE" | "RECT"; x1: number; y1: number; x2: number; y2: number; label: string; spoiler?: boolean }[];
  stains?: string[];
};

async function main() {
  console.log("→ کاربران نمایشی");
  const now = new Date();
  const admin = await user("09120000000", "admin", { name: "مدیر سامانه", medicalNumber: "100000", specialty: "پاتولوژیست", role: "ADMIN", status: "ACTIVE", profileComplete: true, approvedAt: now });
  const drA = await user("09121111111", "dr.kazemi", { name: "دکتر سارا کاظمی", medicalNumber: "123456", specialty: "پاتولوژیست — پستان و زنان", institution: "آزمایشگاه پاتوبیولوژی ویورا", role: "CONTRIBUTOR", status: "ACTIVE", trusted: true, profileComplete: true, approvedAt: now });
  const drB = await user("09122222222", "dr.razavi", { name: "دکتر امیر رضوی", medicalNumber: "654321", specialty: "پاتولوژیست — بافت نرم و سر و گردن", institution: "بیمارستان آموزشی", role: "CONTRIBUTOR", status: "ACTIVE", profileComplete: true, approvedAt: now });
  const m1 = await user("09123333333", "dr.ahmadi", { name: "دکتر نگار احمدی", medicalNumber: "200001", specialty: "دستیار پاتولوژی", institution: "دانشگاه علوم پزشکی", role: "MEMBER", status: "ACTIVE", profileComplete: true, approvedAt: now });
  const m2 = await user("09124444444", "dr.mousavi", { name: "دکتر رضا موسوی", medicalNumber: "200002", specialty: "دستیار پاتولوژی", role: "MEMBER", status: "ACTIVE", profileComplete: true, approvedAt: now });
  await user("09125555555", "dr.sadeghi", { name: "دکتر مریم صادقی", medicalNumber: "200003", specialty: "پاتولوژیست", city: "شیراز", role: "MEMBER", status: "PENDING", profileComplete: true });
  const authors: Record<string, string> = { A: drA.id, B: drB.id };

  const seeds: Seed[] = [
    {
      img: ["case2.jpg"],
      author: "B",
      stains: ["H&E"],
      data: {
        mode: "UNKNOWN", difficulty: "BASIC", subspecialty: "head-neck", organ: "لبه‌ی طرفی زبان", specimenType: "BIOPSY",
        patientAge: 63, patientSex: "MALE", keywords: ["ulcer", "tongue", "زخم زبان"],
        title: "زخم سفت و بدون بهبود لبه‌ی زبان در مرد ۶۳ ساله",
        clinicalHistory: "مرد ۶۳ ساله با سابقه‌ی ۴۰ پاکت‌سال مصرف سیگار، با زخم دردناک لبه‌ی طرفی چپ زبان از حدود ۳ ماه پیش مراجعه کرده است.\n- زخم با حاشیه‌ی برجسته و قاعده‌ی سفت\n- لنفادنوپاتی سفت سطح II در همان سمت\n- پاسخ نداده به درمان ضدقارچ و ضدالتهاب",
        imaging: "MRI: ضایعه‌ی ۲٫۴ سانتی‌متری با تهاجم به عضلات داخلی زبان؛ عمق تهاجم حدود ۷ میلی‌متر.",
        microscopic: "آشیانه‌ها و طناب‌های نامنظم سلول‌های اپی‌تلیال با سیتوپلاسم فراوان ائوزینوفیلیک و پل‌های بین‌سلولی، به‌صورت ارتشاحی در استرومای دسموپلاستیک دیده می‌شوند. در مرکز برخی آشیانه‌ها کراتینیزاسیون لایه‌لایه وجود دارد. هسته‌ها پلئومورف با هستک‌های واضح و میتوز غیرطبیعی هستند. ارتشاح لنفوپلاسماسیتی در استروما دیده می‌شود.",
        finalDiagnosis: "Keratinizing squamous cell carcinoma, moderately differentiated",
        diagnosisAliases: ["Squamous cell carcinoma", "SCC", "کارسینوم سلول سنگفرشی"],
        discussion: "کارسینوم سلول سنگفرشی شایع‌ترین بدخیمی حفره‌ی دهان است و لبه‌ی طرفی زبان از محل‌های پرخطر آن است. تشخیص در این نمونه با تهاجم آشیانه‌های اپی‌تلیال آتیپیک به استروما و وجود کراتینیزاسیون قطعی است.\n\nدر گزارش، عمق تهاجم (DOI)، تهاجم دور عصبی و الگوی تهاجم (worst pattern of invasion) اهمیت پیش‌آگهی دارند و در مرحله‌بندی AJCC لحاظ می‌شوند.",
        teachingPoints: [
          "مروارید کراتینی و پل‌های بین‌سلولی نشانه‌ی تمایز سنگفرشی است.",
          "عمق تهاجم در سرطان حفره‌ی دهان جزء مرحله‌بندی T است، نه فقط ضخامت تومور.",
          "برخلاف اوروفارنکس، p16 در سرطان حفره‌ی دهان جانشین مناسبی برای HPV نیست.",
        ],
        references: ["WHO Classification of Tumours Editorial Board. Head and Neck Tumours. 5th ed. Lyon: IARC; 2022."],
      },
      ddx: [
        { name: "Pseudoepitheliomatous hyperplasia", note: "حاشیه‌ی صاف، فقدان آتیپی شدید؛ کنار تومور سلول گرانولار یا عفونت قارچی دیده می‌شود." },
        { name: "Necrotizing sialometaplasia", note: "حفظ ساختار لوبولار غدد بزاقی و فقدان پلئومورفیسم قابل‌توجه." },
      ],
      annotations: [
        { img: 0, shape: "ELLIPSE", x1: 240, y1: 400, x2: 680, y2: 840, label: "آشیانه‌ی مهاجم با کراتینیزاسیون مرکزی", spoiler: true },
        { img: 0, shape: "ARROW", x1: 900, y1: 180, x2: 700, y2: 330, label: "استرومای دسموپلاستیک" },
      ],
    },
    {
      img: ["case4.jpg"],
      author: "A",
      stains: ["H&E"],
      data: {
        mode: "UNKNOWN", difficulty: "INTERMEDIATE", subspecialty: "breast", organ: "پستان راست", specimenType: "BIOPSY",
        patientAge: 44, patientSex: "FEMALE", keywords: ["microcalcification", "کلسیفیکاسیون", "core biopsy"],
        title: "کلسیفیکاسیون‌های خوشه‌ای در ماموگرافی غربالگری زن ۴۴ ساله",
        clinicalHistory: "زن ۴۴ ساله، بدون علامت. در ماموگرافی غربالگری، خوشه‌ی میکروکلسیفیکاسیون‌های گرد و هم‌شکل در ربع فوقانی خارجی پستان راست دیده شده (BI-RADS 4A). بیوپسی سوزنی با راهنمای استریوتاکسی انجام شده است.",
        microscopic: "تکثیر لوبولوسنتریک غدد و توبول‌های کوچک فشرده در زمینه‌ی استرومای اسکلروتیک. توبول‌ها در مرکز لوبول فشرده و در محیط گشادتر هستند و الگوی گردبادی دارند. برخی ساختارها به‌دلیل فشردگی، نمای ارتشاحی پیدا کرده‌اند. کلسیفیکاسیون‌های کوچک در مجرای برخی غدد دیده می‌شود. آتیپی هسته‌ای قابل‌توجه یا میتوز دیده نمی‌شود.",
        finalDiagnosis: "Sclerosing adenosis",
        diagnosisAliases: ["Adenosis, sclerosing", "آدنوز اسکلروزان"],
        showIhcBeforeAnswer: false,
        discussion: "آدنوز اسکلروزان ضایعه‌ی خوش‌خیم تکثیری است که به‌دلیل الگوی به‌ظاهر ارتشاحی، به‌ویژه در بیوپسی سوزنی، می‌تواند با کارسینوم مهاجم (به‌خصوص کارسینوم توبولار) اشتباه شود.\n\nمهم‌ترین کلید تشخیص، معماری لوبولوسنتریک در بزرگ‌نمایی کم و وجود لایه‌ی میواپی‌تلیال در اطراف همه‌ی ساختارهاست که با p63 و SMMHC یا Calponin تأیید می‌شود.",
        teachingPoints: [
          "در بزرگ‌نمایی کم شروع کنید: الگوی لوبولوسنتریک به نفع ضایعه‌ی خوش‌خیم است.",
          "کارسینوم توبولار لایه‌ی میواپی‌تلیال ندارد و توبول‌های زاویه‌دار با استرومای دسموپلاستیک دارد.",
          "آدنوز اسکلروزان ممکن است میزبان LCIS یا DCIS باشد؛ درگیری آن را با کارسینوم مهاجم اشتباه نگیرید.",
        ],
        references: ["WHO Classification of Tumours Editorial Board. Breast Tumours. 5th ed. Lyon: IARC; 2019."],
      },
      ihc: [
        { marker: "p63", outcome: "POSITIVE", pattern: "هسته‌ای، پیوسته در اطراف توبول‌ها", note: "لایه‌ی میواپی‌تلیال حفظ‌شده", order: 0 },
        { marker: "SMMHC", outcome: "POSITIVE", pattern: "سیتوپلاسمی، محیطی", note: "", order: 1 },
        { marker: "CK5/6", outcome: "POSITIVE", pattern: "موزاییکی", note: "", order: 2 },
      ],
      ddx: [
        { name: "Tubular carcinoma", note: "توبول‌های زاویه‌دار با یک لایه سلول، فقدان میواپی‌تلیوم، استرومای دسموپلاستیک." },
        { name: "Microglandular adenosis", note: "غدد گرد پراکنده بدون الگوی لوبولوسنتریک و بدون میواپی‌تلیوم؛ S100 مثبت." },
        { name: "Radial scar / complex sclerosing lesion", note: "مرکز الاستوتیک با پرتوهای مجاری در اطراف." },
      ],
    },
    {
      img: ["case1.jpg"],
      author: "B",
      stains: ["H&E"],
      data: {
        mode: "UNKNOWN", difficulty: "ADVANCED", subspecialty: "bone-soft", organ: "رتروپریتوئن", specimenType: "RESECTION",
        patientAge: 58, patientSex: "MALE", keywords: ["retroperitoneum", "adipocytic", "چربی"],
        title: "توده‌ی بزرگ و بدون درد رتروپریتوئن با تراکم چربی در مرد ۵۸ ساله",
        clinicalHistory: "مرد ۵۸ ساله با احساس پری شکم از یک سال پیش. در CT توده‌ی ۱۸ سانتی‌متری با تراکم عمدتاً چربی و سپتاهای ضخیم نامنظم در رتروپریتوئن چپ، کلیه را به جلو رانده است. بدون ندول جامد با تقویت شدید.",
        gross: "توده‌ی کپسول‌دار زردرنگ به وزن ۲۴۰۰ گرم با سپتاهای سفید فیبروزی. نواحی سفت‌تر در برش دیده می‌شود.",
        microscopic: "بافت چربی بالغ با تفاوت آشکار در اندازه‌ی سلول‌های چربی. در سپتاهای فیبروزی، سلول‌های دوکی و ستاره‌ای پراکنده با هسته‌های بزرگ و پررنگ (هیپرکروم) دیده می‌شوند. چند سلول با واکوئل‌های چندگانه‌ی سیتوپلاسمی که هسته را دندانه‌دار کرده‌اند نیز حضور دارند. ناحیه‌ی غیرچربی سلولار با گرید بالا دیده نشد.",
        molecular: "FISH: تکثیر ژن MDM2 (نسبت MDM2/CEP12 بیش از ۱۰).",
        showIhcBeforeAnswer: false,
        finalDiagnosis: "Well-differentiated liposarcoma",
        diagnosisAliases: ["Atypical lipomatous tumor", "Atypical lipomatous tumour / well-differentiated liposarcoma", "ALT/WDLPS", "لیپوسارکوم خوب تمایزیافته"],
        discussion: "در رتروپریتوئن، هر توده‌ی چربی بزرگ تا خلاف آن ثابت نشده، لیپوسارکوم خوب تمایزیافته تلقی می‌شود؛ لیپوم واقعی در این محل بسیار نادر است.\n\nکلید تشخیص، یافتن سلول‌های آتیپیک هیپرکروم در سپتاهای فیبروزی است، نه لزوماً لیپوبلاست. لیپوبلاست نه لازم است و نه به‌تنهایی کافی. تأیید با تکثیر MDM2 (FISH) انجام می‌شود که استاندارد طلایی است.\n\nنام «تومور لیپوماتوز آتیپیک» برای ضایعات قابل‌برداشت کامل در اندام‌ها ترجیح داده می‌شود؛ در رتروپریتوئن به‌دلیل عود و احتمال دِدیفرانسیاسیون، نام لیپوسارکوم خوب تمایزیافته به کار می‌رود.",
        teachingPoints: [
          "سپتاهای فیبروزی را برای سلول‌های آتیپیک هیپرکروم با دقت بررسی کنید.",
          "تکثیر MDM2 با FISH دقیق‌تر از IHC برای MDM2 است.",
          "نمونه‌برداری کافی از نواحی سفت برای رد دِدیفرانسیاسیون ضروری است.",
        ],
        references: ["WHO Classification of Tumours Editorial Board. Soft Tissue and Bone Tumours. 5th ed. Lyon: IARC; 2020."],
      },
      ihc: [
        { marker: "MDM2", outcome: "POSITIVE", pattern: "هسته‌ای، در سلول‌های آتیپیک", note: "", order: 0 },
        { marker: "CDK4", outcome: "POSITIVE", pattern: "هسته‌ای", note: "", order: 1 },
        { marker: "p16", outcome: "POSITIVE", pattern: "منتشر", note: "", order: 2 },
      ],
      ddx: [
        { name: "Lipoma", note: "فقدان سلول‌های آتیپیک در سپتاها و فقدان تکثیر MDM2؛ در رتروپریتوئن بسیار نادر." },
        { name: "Dedifferentiated liposarcoma", note: "وجود ناحیه‌ی غیرچربی سلولار؛ در این نمونه دیده نشد." },
        { name: "Myxoid liposarcoma", note: "زمینه‌ی میکسوئید با عروق شاخه‌ای ظریف و بازآرایی DDIT3." },
      ],
    },
    {
      img: ["case7.jpg"],
      author: "B",
      stains: ["H&E"],
      data: {
        mode: "UNKNOWN", difficulty: "INTERMEDIATE", subspecialty: "skin", organ: "پوست ساعد", specimenType: "EXCISION",
        patientAge: 37, patientSex: "FEMALE", keywords: ["nodule", "ندول زیرجلدی", "eosinophilic cells"],
        title: "ندول سفت و کوچک زیرپوستی ساعد در زن ۳۷ ساله",
        clinicalHistory: "زن ۳۷ ساله با ندول سفت، بدون درد و آهسته‌رشد ۱٫۲ سانتی‌متری در ساعد چپ از حدود یک سال پیش. پوست روی ضایعه سالم است.",
        microscopic: "آشیانه‌ها و صفحات سلول‌های چندضلعی بزرگ با سیتوپلاسم فراوان، گرانولار و ائوزینوفیلیک و هسته‌های کوچک، گرد و مرکزی در درم. حدود ضایعه نامشخص است و سلول‌ها بین دسته‌های کلاژن نفوذ کرده‌اند. در برخی سلول‌ها گلبول‌های درشت ائوزینوفیلیک با هاله‌ی روشن دیده می‌شود. میتوز و نکروز دیده نمی‌شود.",
        finalDiagnosis: "Granular cell tumor",
        diagnosisAliases: ["Granular cell tumour", "Abrikossoff tumor", "تومور سلول گرانولار"],
        discussion: "تومور سلول گرانولار نئوپلاسمی با منشأ سلول شوان است. گرانول‌های سیتوپلاسمی در واقع لیزوزوم‌های انباشته‌اند و با PAS-D مثبت می‌شوند. گلبول‌های درشت ائوزینوفیلیک با هاله (pustulo-ovoid bodies of Milian) و سلول‌های زاویه‌دار (angulate body cells) از یافته‌های کمکی هستند.\n\nاین تومور می‌تواند هیپرپلازی شبه‌اپی‌تلیوماتوز شدید در اپیدرم یا مخاط رویی ایجاد کند که در بیوپسی سطحی با کارسینوم سلول سنگفرشی اشتباه می‌شود.",
        teachingPoints: [
          "S100 و SOX10 مثبت: منشأ شوان؛ CD68 و inhibin هم معمولاً مثبت‌اند.",
          "هیپرپلازی شبه‌اپی‌تلیوماتوز رویی در بیوپسی سطحی می‌تواند SCC را تقلید کند.",
          "نکروز، میتوز زیاد، هستک درشت و پلئومورفیسم معیارهای بدخیمی (Fanburg-Smith) هستند.",
        ],
      },
      ihc: [
        { marker: "S100", outcome: "POSITIVE", pattern: "هسته‌ای و سیتوپلاسمی، منتشر", note: "", order: 0 },
        { marker: "SOX10", outcome: "POSITIVE", pattern: "هسته‌ای", note: "", order: 1 },
        { marker: "CD68", outcome: "POSITIVE", pattern: "گرانولار سیتوپلاسمی", note: "", order: 2 },
        { marker: "Pan-CK", outcome: "NEGATIVE", pattern: "", note: "", order: 3 },
      ],
      ddx: [
        { name: "Xanthoma / histiocytic lesion", note: "سیتوپلاسم کف‌آلود به‌جای گرانولار؛ S100 و SOX10 منفی." },
        { name: "Rhabdomyoma", note: "دسمین و میوژنین مثبت؛ کراس‌استریشن." },
        { name: "Alveolar soft part sarcoma", note: "الگوی آلوئولار، کریستال‌های PAS-D مثبت، TFE3 هسته‌ای." },
      ],
    },
    {
      img: ["case6.jpg"],
      author: "A",
      stains: ["H&E"],
      data: {
        mode: "TEACHING", difficulty: "BASIC", subspecialty: "breast", organ: "پستان چپ", specimenType: "EXCISION",
        patientAge: 23, patientSex: "FEMALE", keywords: ["fibroepithelial", "فیبروادنوم", "mobile mass"],
        title: "توده‌ی متحرک و خوش‌حدود پستان در زن ۲۳ ساله",
        clinicalHistory: "زن ۲۳ ساله با توده‌ی لاستیکی، متحرک و بدون درد ۲ سانتی‌متری در پستان چپ. سونوگرافی: توده‌ی بیضی، خوش‌حدود و هیپواکو (BI-RADS 3). به درخواست بیمار برداشته شده است.",
        gross: "توده‌ی کپسول‌دار سفید-خاکستری، لبوله با سطح برش براق و شکاف‌مانند.",
        microscopic: "ضایعه‌ی فیبرواپی‌تلیال خوش‌حدود با تکثیر هم‌زمان استروما و مجاری. مجاری با دو لایه‌ی اپی‌تلیال و میواپی‌تلیال، در اطراف خود استرومای کم‌سلول و یکنواخت دارند (الگوی پری‌کانالیکولار). آتیپی استرومایی، میتوز و تراکم استرومای اطراف مجاری دیده نمی‌شود.",
        finalDiagnosis: "Fibroadenoma, pericanalicular pattern",
        diagnosisAliases: ["Fibroadenoma", "فیبروادنوم"],
        discussion: "فیبروادنوم شایع‌ترین تومور خوش‌خیم پستان در زنان جوان است. الگوهای پری‌کانالیکولار و اینتراکانالیکولار اهمیت بالینی ندارند و اغلب با هم دیده می‌شوند.\n\nمهم‌ترین تمایز با تومور فیلودس است: سلولاریتی استرومایی بیشتر، تراکم استروما در زیر اپی‌تلیوم (periductal condensation)، ساختارهای برگ‌مانند واضح و میتوز استرومایی به نفع فیلودس هستند.",
        teachingPoints: [
          "استرومای کم‌سلول و یکنواخت بدون تراکم اطراف مجاری به نفع فیبروادنوم است.",
          "در بیوپسی سوزنی، افتراق فیبروادنوم سلولار از فیلودس گاه ممکن نیست؛ «ضایعه‌ی فیبرواپی‌تلیال» گزارش کنید.",
        ],
      },
      ddx: [
        { name: "Benign phyllodes tumor", note: "استرومای سلولارتر، تراکم اطراف مجاری، ساختار برگ‌مانند." },
        { name: "Tubular adenoma", note: "غدد فشرده‌ی فراوان با استرومای بسیار کم." },
      ],
    },
    {
      img: ["case5.jpg"],
      author: "A",
      stains: ["H&E"],
      data: {
        mode: "UNKNOWN", difficulty: "ADVANCED", subspecialty: "lung", organ: "مدیاستن قدامی", specimenType: "RESECTION",
        patientAge: 46, patientSex: "FEMALE", keywords: ["mediastinum", "مدیاستن", "lymphocyte-rich"],
        title: "توده‌ی مدیاستن قدامی در زن ۴۶ ساله با ضعف عضلانی نوسان‌دار",
        clinicalHistory: "زن ۴۶ ساله با افتادگی پلک و دوبینی که در طول روز بدتر می‌شود، و ضعف عضلات پروگزیمال از ۶ ماه پیش. آنتی‌بادی ضد گیرنده‌ی استیل‌کولین مثبت است. CT: توده‌ی ۵ سانتی‌متری خوش‌حدود در مدیاستن قدامی.",
        gross: "توده‌ی کپسول‌دار ۵٫۲ سانتی‌متری، لبوله با سپتاهای فیبروزی سفید. تهاجم ماکروسکوپی به چربی اطراف دیده نمی‌شود.",
        microscopic: "ضایعه‌ی لبوله با سپتاهای فیبروزی که عمدتاً از لنفوسیت‌های نابالغ کوچک تشکیل شده و نمای شبیه به قشر تیموس طبیعی دارد. سلول‌های اپی‌تلیال پراکنده با هسته‌ی بیضی، کروماتین ظریف و هستک کوچک در لابه‌لای لنفوسیت‌ها دیده می‌شوند و خوشه تشکیل نمی‌دهند. نواحی روشن‌تر شبیه مدولا با ساختارهای لایه‌لایه‌ی اپی‌تلیال ائوزینوفیلیک حضور دارند.",
        showIhcBeforeAnswer: true,
        finalDiagnosis: "Thymoma, type B1",
        diagnosisAliases: ["Type B1 thymoma", "B1 thymoma", "تیموما نوع B1"],
        discussion: "تیموما شایع‌ترین تومور مدیاستن قدامی در بزرگسالان است و حدود یک‌سوم بیماران میاستنی گراویس دارند. نوع B1 شبیه‌ترین نوع به تیموس طبیعی است: غلبه‌ی لنفوسیت‌های نابالغ (TdT مثبت) و سلول‌های اپی‌تلیال منفرد که خوشه تشکیل نمی‌دهند، همراه با «جزایر مدولاری» که گاه اجسام هاسال دارند.\n\nافتراق از B2 بر اساس تعداد و تجمع سلول‌های اپی‌تلیال است (در B2 خوشه‌های سه یا بیشتر سلول اپی‌تلیال). افتراق مهم دیگر، لنفوم لنفوبلاستیک T است که شبکه‌ی سلول‌های اپی‌تلیال کراتین‌مثبت ندارد و تهاجم مخرب دارد.",
        teachingPoints: [
          "لنفوسیت‌های TdT مثبت در تیموما طبیعی‌اند؛ به‌تنهایی دلیل بر لنفوم لنفوبلاستیک نیستند.",
          "رنگ‌آمیزی کراتین شبکه‌ی ظریف سلول‌های اپی‌تلیال را در تیموما نشان می‌دهد.",
          "جزایر مدولاری با اجسام هاسال از ویژگی‌های تیموما نوع AB و B1 است.",
        ],
        references: ["WHO Classification of Tumours Editorial Board. Thoracic Tumours. 5th ed. Lyon: IARC; 2021."],
      },
      ihc: [
        { marker: "AE1/AE3", outcome: "POSITIVE", pattern: "شبکه‌ی ظریف سلول‌های اپی‌تلیال", note: "", order: 0 },
        { marker: "p40", outcome: "POSITIVE", pattern: "هسته‌ای، سلول‌های اپی‌تلیال", note: "", order: 1 },
        { marker: "TdT", outcome: "POSITIVE", pattern: "هسته‌ای، اکثر لنفوسیت‌ها", note: "لنفوسیت‌های نابالغ", order: 2 },
        { marker: "CD5", outcome: "NEGATIVE", pattern: "در سلول‌های اپی‌تلیال", note: "", order: 3 },
      ],
      ddx: [
        { name: "Thymoma, type B2", note: "خوشه‌های سلول‌های اپی‌تلیال (سه سلول یا بیشتر)، هستک واضح‌تر." },
        { name: "T-lymphoblastic lymphoma", note: "فقدان شبکه‌ی اپی‌تلیال کراتین‌مثبت، تهاجم مخرب، میتوز فراوان." },
        { name: "Thymic hyperplasia", note: "حفظ معماری طبیعی و مراکز زایا، بدون توده‌ی کپسول‌دار." },
      ],
      annotations: [{ img: 0, shape: "ARROW", x1: 820, y1: 200, x2: 520, y2: 500, label: "جسم هاسال در جزیره‌ی مدولاری", spoiler: true }],
    },
  ];

  console.log("→ پاک‌سازی موارد نمایشی قبلی");
  await db.case.deleteMany({ where: { isDemo: true } });

  let i = 0;
  const createdIds: string[] = [];
  for (const s of seeds) {
    i++;
    const published = new Date(Date.now() - (seeds.length - i) * 3 * 864e5);
    const c = await db.case.create({
      data: {
        ...s.data,
        isDemo: true,
        status: "PUBLISHED",
        authorId: authors[s.author],
        reviewerId: admin.id,
        submittedAt: published,
        publishedAt: published,
        deidConfirmedAt: published,
        featuredAt: i === 3 ? new Date() : null,
        ihc: s.ihc ? { createMany: { data: s.ihc } } : undefined,
        differentials: s.ddx ? { createMany: { data: s.ddx.map((d, k) => ({ ...d, order: k })) } } : undefined,
      },
    });
    createdIds.push(c.id);

    for (const [k, file] of s.img.entries()) {
      const asset = await db.mediaAsset.create({
        data: { caseId: c.id, kind: "IMAGE", status: "PROCESSING", order: k, sourceExt: ".jpg", stain: s.stains?.[k] ?? "H&E", magnification: "×40", uploadedById: authors[s.author] },
      });
      await fsp.mkdir(INCOMING_DIR, { recursive: true });
      await fsp.copyFile(path.join(DEMO, file), incomingPath(asset.id, ".jpg"));
      await processAsset(asset.id);
      for (const a of s.annotations?.filter((x) => x.img === k) ?? []) {
        await db.annotation.create({ data: { mediaId: asset.id, authorId: authors[s.author], shape: a.shape, x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, label: a.label, spoiler: !!a.spoiler } });
      }
    }
    console.log(`  ✓ VP-${String(c.number).padStart(4, "0")}  ${s.data.title}`);
  }

  console.log("→ پاسخ‌ها و بحث نمونه");
  const answers: [number, string, string][] = [
    [0, m1.id, "Squamous cell carcinoma, keratinizing"],
    [0, m2.id, "Pseudoepitheliomatous hyperplasia"],
    [1, m1.id, "Tubular carcinoma"],
    [1, m2.id, "Sclerosing adenosis"],
    [2, m1.id, "Lipoma"],
    [5, m2.id, "Thymoma B2"],
  ];
  for (const [ci, uid, ans] of answers) {
    const c = await db.case.findUniqueOrThrow({ where: { id: createdIds[ci] } });
    await db.attempt.create({
      data: { caseId: c.id, userId: uid, answer: ans, normalized: answerKey(ans), autoCorrect: isMatch(ans, [c.finalDiagnosis, ...c.diagnosisAliases]), confidence: "MEDIUM" },
    });
  }
  const root = await db.comment.create({
    data: { caseId: createdIds[1], authorId: m1.id, body: "در بزرگ‌نمایی زیاد واقعاً شبیه کارسینوم توبولار بود. p63 کلید تشخیص بود؛ ممنون که نتیجه‌ی IHC را بعد از پاسخ گذاشتید." },
  });
  await db.comment.create({
    data: { caseId: createdIds[1], authorId: drA.id, parentId: root.id, body: "دقیقاً. همیشه اول با بزرگ‌نمایی ×۴ الگوی لوبولوسنتریک را ببینید؛ نیمی از تشخیص همان‌جاست." },
  });
  await db.comment.create({
    data: { caseId: createdIds[2], authorId: drB.id, pinned: true, body: "نکته: در رتروپریتوئن هر توده‌ی چربی بزرگ را تا خلافش ثابت نشده WDLPS در نظر بگیرید و حتماً MDM2 FISH درخواست کنید." },
  });

  console.log(`\n✓ داده‌ی نمایشی ساخته شد. نام‌های کاربری (رمز عبور همه: ${DEMO_PASSWORD}):`);
  console.log("  مدیر:            admin");
  console.log("  ارائه‌دهنده:      dr.kazemi (انتشار مستقیم) · dr.razavi");
  console.log("  عضو فعال:        dr.ahmadi · dr.mousavi");
  console.log("  عضو در انتظار:   dr.sadeghi");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
