import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import Link from "@/components/Link";
import { subspecialtyCounts } from "@/lib/cases";
import { SUBSPECIALTIES } from "@/lib/taxonomy";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return pageMeta({ locale, path: "/subspecialties", title: t("زیرتخصص‌ها"), description: t("موارد کتابخانه بر اساس زیرتخصص‌های پاتولوژی جراحی، سیتوپاتولوژی و هماتوپاتولوژی دسته‌بندی شده‌اند.") });
}
export const dynamic = "force-dynamic";

export default async function Subspecialties() {
  const counts = await subspecialtyCounts();
  const { t, f, locale } = await getI18n();
  const sorted = [...SUBSPECIALTIES].sort((a, b) => (counts[b.key] ?? 0) - (counts[a.key] ?? 0));
  return (
    <div className="wrap">
      <div className="page-head">
        <h1>{t("زیرتخصص‌ها")}</h1>
        <p>{t("موارد کتابخانه بر اساس زیرتخصص‌های پاتولوژی جراحی، سیتوپاتولوژی و هماتوپاتولوژی دسته‌بندی شده‌اند.")}</p>
      </div>
      <div className="sub-grid">
        {sorted.map((s) => (
          <Link key={s.key} href={`/cases?sub=${s.key}`} className={`sub-item${counts[s.key] ? "" : " empty"}`}>
            <span>{locale === "en" ? s.en : s.fa}{locale !== "en" && <small className="en">{s.en}</small>}</span>
            <span className="count">{counts[s.key] ? f.num(counts[s.key]) : "—"}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
