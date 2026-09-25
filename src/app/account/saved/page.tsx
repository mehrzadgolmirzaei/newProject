import Link from "@/components/Link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cardsByIds } from "@/lib/cases";
import { CaseCard } from "@/components/CaseCard";
import { Empty } from "@/components/Empty";
import { privateMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";

export const generateMetadata = () => privateMeta("موارد نشان‌شده");
export const dynamic = "force-dynamic";

export default async function Saved() {
  const u = await requireUser("/account/saved");
  const { t } = await getI18n();
  const saved = await db.savedCase.findMany({ where: { userId: u.id, case: { status: "PUBLISHED" } }, orderBy: { createdAt: "desc" }, select: { caseId: true } });
  const cards = await cardsByIds(saved.map((s) => s.caseId), u);
  return (
    <>
      <div className="dash-head"><div><h1>{t("موارد نشان‌شده")}</h1><p>{t("مواردی که برای مرور دوباره نگه داشته‌اید")}</p></div></div>
      {cards.length === 0 ? (
        <Empty icon="bookmark" title={t("موردی نشان نکرده‌اید")} text={t("در صفحه‌ی هر مورد، دکمه‌ی «نشان‌کردن» را بزنید.")}>
          <Link href="/cases" className="btn btn-secondary">{t("مرور موارد")}</Link>
        </Empty>
      ) : (
        <div className="case-grid">{cards.map((c, i) => <div key={c.id} data-reveal style={{ "--i": i % 3 } as React.CSSProperties}><CaseCard c={c} /></div>)}</div>
      )}
    </>
  );
}
