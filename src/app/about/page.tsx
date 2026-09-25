import type { Metadata } from "next";
import Link from "@/components/Link";
import { SITE } from "@/lib/site";
import { getI18n } from "@/lib/i18n/server";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return pageMeta({
    locale,
    path: "/about",
    title: t("درباره و شیوه‌ی کار"),
    description: t("{name} چگونه کار می‌کند: موارد چالشی با پاسخ پنهان، موارد آموزشی، بحث تخصصی پاتولوژیست‌ها و حفاظت از حریم خصوصی بیماران.", { name: t(SITE.name) }),
  });
}

export default async function About() {
  const { locale, t } = await getI18n();
  return (
    <div className="wrap wrap-narrow">
      <div className="page-head">
        <div className="eyebrow">{t(SITE.lab)}</div>
        <h1 style={{ marginTop: 6 }}>{t("درباره‌ی {name}", { name: t(SITE.name) })}</h1>
      </div>
      {locale === "en" ? <AboutEn /> : (
      <div className="article">
        <p>
          {SITE.name} سامانه‌ای آموزشی است برای اینکه موارد دشوار و آموزنده‌ی پاتولوژی، که معمولاً فقط در یک بخش یا یک جلسه‌ی
          آموزشی دیده می‌شوند، در دسترس همه‌ی همکاران قرار بگیرند. هر مورد را پاتولوژیستی ثبت می‌کند که خود تشخیص آن را انجام داده است؛
          با شرح حال، تصاویر میکروسکوپی با کیفیت کامل، نتایج ایمونوهیستوشیمی و بحث.
        </p>

        <h2>شیوه‌ی کار</h2>
        <ul>
          <li><b>موارد چالشی:</b> تشخیص نهایی، تشخیص‌های افتراقی و بحث تا پیش از ثبت پاسخ شما پنهان است. این اطلاعات حتی به مرورگر شما فرستاده نمی‌شود، پس با مشاهده‌ی کد صفحه هم دیده نمی‌شود.</li>
          <li><b>پاسخ و آمار:</b> پس از ثبت تشخیص، پاسخ صحیح و توزیع پاسخ‌های همکاران را مشاهده می‌کنید. نام شما کنار پاسخ نمایش داده نمی‌شود.</li>
          <li><b>نظرات همکاران:</b> پزشکان تأییدشده می‌توانند نظر بنویسند؛ ارائه‌دهنده‌ی مورد می‌تواند نظرهای ارزشمند را به‌عنوان «نکته‌ی آموزشی» سنجاق کند.</li>
          <li><b>موارد آموزشی:</b> برخی موارد برای مرور یک موجودیت ثبت شده‌اند و تشخیص از ابتدا نمایش داده می‌شود.</li>
        </ul>

        <h2 id="contribute">عضویت و ارائه‌ی مورد</h2>
        <p>
          پس از ایجاد حساب کاربری و ثبت مشخصات و شماره‌ی نظام پزشکی، مدیر سامانه حساب شما را تأیید می‌کند.
          مرور موارد برای همه آزاد است؛ ثبت پاسخ و شرکت در بحث برای پزشکان تأییدشده است. اگر مایلید موارد خود را ارائه کنید،
          با مدیر سامانه تماس بگیرید تا دسترسی «ارائه‌دهنده» برای شما فعال شود.
        </p>

        <h2 id="privacy">حریم خصوصی بیماران</h2>
        <ul>
          <li>ارائه‌دهنده پیش از ارسال هر مورد، حذف اطلاعات هویتی بیمار را در یک فهرست بازبینی تأیید می‌کند.</li>
          <li>متادیتای همه‌ی تصاویر (EXIF، مشخصات دستگاه، موقعیت) هنگام بارگذاری حذف می‌شود و فایل خام نگه‌داری نمی‌شود.</li>
          <li>در اسلایدهای دیجیتال کامل، تصویر «برچسب» و «ماکرو»ی لام که ممکن است نام بیمار را داشته باشد، هرگز استخراج نمی‌شود.</li>
          <li>نام اصلی فایل‌ها ذخیره نمی‌شود؛ سن بالای ۸۹ سال به‌صورت «۹۰+» نمایش داده می‌شود.</li>
          <li>هر مورد پیش از انتشار توسط مدیر بازبینی می‌شود.</li>
        </ul>

        <h2>سلب مسئولیت</h2>
        <p>محتوای این سایت صرفاً آموزشی است و جایگزین ارزیابی تخصصی نمونه‌ی بیمار، گزارش رسمی پاتولوژی یا مشاوره‌ی پزشکی نیست.</p>

        <p style={{ marginTop: 32 }}>
          <Link href="/cases" className="btn btn-primary">مرور موارد</Link>
        </p>
      </div>
      )}
    </div>
  );
}

function AboutEn() {
  return (
    <div className="article">
      <p>
        Viora Pathology Academy is an educational platform that makes challenging and instructive pathology cases — usually seen only within a single
        department or teaching session — available to colleagues everywhere. Each case is submitted by the pathologist who made the diagnosis,
        together with the clinical history, full-resolution microscopic images, immunohistochemistry results and discussion.
      </p>

      <h2>How it works</h2>
      <ul>
        <li><b>Challenge cases:</b> the final diagnosis, differential diagnoses and discussion stay hidden until you submit your answer. They are not even sent to your browser, so they cannot be found in the page source.</li>
        <li><b>Answers and statistics:</b> after you submit, you see the correct answer and how colleagues answered. Your name is never shown next to your answer.</li>
        <li><b>Peer discussion:</b> approved physicians can comment; the case contributor can pin valuable comments as a “teaching point”.</li>
        <li><b>Teaching cases:</b> some cases are published to review an entity, and the diagnosis is shown from the start.</li>
      </ul>

      <h2 id="contribute">Membership and contributing cases</h2>
      <p>
        After you create an account and enter your professional details and medical council number, the administrator approves your account.
        Browsing cases is open to everyone; submitting answers and joining discussions is reserved for approved physicians. If you would like
        to contribute your own cases, contact the administrator to have contributor access enabled.
      </p>

      <h2 id="privacy">Patient privacy</h2>
      <ul>
        <li>Before submitting a case, the contributor confirms the removal of patient identifiers against a checklist.</li>
        <li>Metadata of every image (EXIF, device details, location) is stripped on upload, and the original file is not retained.</li>
        <li>For whole-slide images, the “label” and “macro” images, which may show the patient’s name, are never extracted.</li>
        <li>Original file names are not stored; ages above 89 are shown as “90+”.</li>
        <li>Every case is reviewed by the administrator before publication.</li>
      </ul>

      <h2>Disclaimer</h2>
      <p>The content of this site is for education only and is not a substitute for expert examination of a patient specimen, a formal pathology report or medical advice.</p>
      <p>Case content is shown in the language in which each contributor wrote it.</p>

      <p style={{ marginTop: 32 }}>
        <Link href="/cases" className="btn btn-primary">Browse cases</Link>
      </p>
    </div>
  );
}
