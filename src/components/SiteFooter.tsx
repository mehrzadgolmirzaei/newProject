import Link from "next/link";
import { SITE } from "@/lib/site";
import { faDigits } from "@/lib/text";

export function SiteFooter() {
  const year = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric" }).format(new Date());
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.png" alt={SITE.name} height={30} width={107} className="logo-light" style={{ height: 30, width: "auto" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" height={30} width={107} className="logo-dark" style={{ height: 30, width: "auto" }} />
          <p className="footer-note">
            {SITE.name}، اطلسی آموزشی از موارد دشوار پاتولوژی است که به کوشش {SITE.lab} و با مشارکت پاتولوژیست‌های تأییدشده تهیه می‌شود.
            محتوای این سایت برای آموزش است و جایگزین مشاوره یا گزارش پاتولوژی نیست.
          </p>
        </div>
        <div>
          <h4>اطلس</h4>
          <Link href="/cases">همه‌ی موارد</Link>
          <Link href="/cases?mode=UNKNOWN&status=unsolved">موارد حل‌نشده</Link>
          <Link href="/subspecialties">زیرتخصص‌ها</Link>
          <Link href="/contributors">ارائه‌دهندگان</Link>
        </div>
        <div>
          <h4>سامانه</h4>
          <Link href="/about">درباره و شیوه‌ی کار</Link>
          <Link href="/about#privacy">حریم خصوصی بیماران</Link>
          <Link href="/about#contribute">ارائه‌ی مورد</Link>
          <Link href="/login">ورود پزشکان</Link>
        </div>
      </div>
      <div className="footer-base">
        <div className="wrap footer-base-in">
          <span>© {faDigits(year)} {SITE.lab}</span>
          <span className="spacer" />
          <span>همه‌ی تصاویر بدون اطلاعات هویتی بیمار منتشر می‌شوند.</span>
        </div>
      </div>
    </footer>
  );
}
