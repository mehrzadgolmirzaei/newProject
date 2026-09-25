import Link from "@/components/Link";
import { SITE } from "@/lib/site";
import { getI18n } from "@/lib/i18n/server";

export async function SiteFooter() {
  const { t, locale } = await getI18n();
  const year = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fa-IR-u-ca-persian", { year: "numeric" }).format(new Date());
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.png" alt={t(SITE.name)} height={30} width={107} className="logo-light" style={{ height: 30, width: "auto" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" height={30} width={107} className="logo-dark" style={{ height: 30, width: "auto" }} />
          <p className="footer-note">
            {t("{name}، سامانه‌ای آموزشی بر پایه‌ی موارد دشوار پاتولوژی است که به کوشش {lab} و با مشارکت پاتولوژیست‌های تأییدشده تهیه می‌شود.", { name: t(SITE.name), lab: t(SITE.lab) })}{" "}
            {t("محتوای این سایت برای آموزش است و جایگزین مشاوره یا گزارش پاتولوژی نیست.")}
          </p>
        </div>
        <div>
          <h4>{t("کتابخانه")}</h4>
          <Link href="/cases">{t("همه‌ی موارد")}</Link>
          <Link href="/cases?mode=UNKNOWN&status=unsolved">{t("موارد حل‌نشده")}</Link>
          <Link href="/subspecialties">{t("زیرتخصص‌ها")}</Link>
          <Link href="/contributors">{t("ارائه‌دهندگان")}</Link>
        </div>
        <div>
          <h4>{t("سامانه")}</h4>
          <Link href="/about">{t("درباره و شیوه‌ی کار")}</Link>
          <Link href="/about#privacy">{t("حریم خصوصی بیماران")}</Link>
          <Link href="/about#contribute">{t("ارائه‌ی مورد")}</Link>
          <Link href="/login">{t("ورود پزشکان")}</Link>
        </div>
      </div>
      <div className="footer-base">
        <div className="wrap footer-base-in">
          <span>© {year} {t(SITE.lab)}</span>
          <span className="spacer" />
          <span>{t("همه‌ی تصاویر بدون اطلاعات هویتی بیمار منتشر می‌شوند.")}</span>
        </div>
      </div>
    </footer>
  );
}
