import Link from "@/components/Link";
import { db } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { privateMeta } from "@/lib/seo";
import { AUDIT_LABEL } from "@/lib/audit";
import { Icon } from "@/components/Icon";

export const generateMetadata = () => privateMeta("مدیریت");
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const { t, f } = await getI18n();
  const { num, percent } = f;
  const week = new Date(Date.now() - 7 * 864e5);
  const [pendingUsers, inReview, published, members, attemptsWeek, attemptsAll, correctAll, commentsWeek, recent, processing, failed] = await Promise.all([
    db.user.count({ where: { status: "PENDING", profileComplete: true } }),
    db.case.count({ where: { status: "IN_REVIEW" } }),
    db.case.count({ where: { status: "PUBLISHED" } }),
    db.user.count({ where: { status: "ACTIVE" } }),
    db.attempt.count({ where: { createdAt: { gte: week } } }),
    db.attempt.count({ where: { gaveUp: false } }),
    db.attempt.count({ where: { gaveUp: false, OR: [{ gradedCorrect: true }, { gradedCorrect: null, autoCorrect: true }] } }),
    db.comment.count({ where: { createdAt: { gte: week }, status: "VISIBLE" } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { name: true } } } }),
    db.mediaAsset.count({ where: { status: { in: ["PROCESSING", "UPLOADING"] } } }),
    db.mediaAsset.count({ where: { status: "FAILED" } }),
  ]);

  return (
    <>
      <div className="dash-head"><div><h1>{t("نمای کلی")}</h1><p>{t("وضعیت سامانه و کارهای در انتظار")}</p></div></div>

      {(pendingUsers > 0 || inReview > 0) && (
        <div className="stack gap-8" style={{ marginBottom: 20 }}>
          {pendingUsers > 0 && (
            <Link href="/admin/users?status=PENDING" className="alert alert-warn"><Icon name="users" /><span style={{ flex: 1 }}><b>{t("{n} کاربر", { n: num(pendingUsers) })}</b> {t("منتظر تأیید شماره‌ی نظام پزشکی‌اند.")}</span><Icon name="chevronLeft" /></Link>
          )}
          {inReview > 0 && (
            <Link href="/admin/review" className="alert alert-info"><Icon name="inbox" /><span style={{ flex: 1 }}><b>{t("{n} مورد", { n: num(inReview) })}</b> {t("در صف بازبینی است.")}</span><Icon name="chevronLeft" /></Link>
          )}
        </div>
      )}

      <div className="kpis">
        <div className="kpi"><span>{t("موارد منتشرشده")}</span><b>{num(published)}</b></div>
        <div className="kpi"><span>{t("اعضای فعال")}</span><b>{num(members)}</b></div>
        <div className="kpi"><span>{t("پاسخ‌ها در ۷ روز")}</span><b>{num(attemptsWeek)}</b><small>{t("{n} نظر", { n: num(commentsWeek) })}</small></div>
        <div className="kpi hl"><span>{t("میانگین پاسخ صحیح")}</span><b>{percent(correctAll, attemptsAll)}</b><small>{t("از {n} پاسخ", { n: num(attemptsAll) })}</small></div>
      </div>

      {(processing > 0 || failed > 0) && (
        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          <Icon name="image" />
          <span>{processing > 0 && <>{t("{n} تصویر در حال پردازش. ", { n: num(processing) })}</>}{failed > 0 && <>{t("{n} تصویر با خطا مواجه شده (از ویرایشگر همان مورد «تلاش دوباره» را بزنید).", { n: num(failed) })}</>}</span>
        </div>
      )}

      <div className="panel">
        <div className="panel-head"><h2>{t("آخرین رویدادها")}</h2><span className="spacer" /><Link href="/admin/audit" className="link" style={{ fontSize: 13.5 }}>{t("همه")}</Link></div>
        <div className="panel-body stack gap-8">
          {recent.length === 0 && <p className="muted">{t("رویدادی ثبت نشده است.")}</p>}
          {recent.map((r) => (
            <div key={r.id} className="row" style={{ fontSize: 14 }}>
              <span className="avatar avatar-sm">{(r.actor?.name ?? "?").charAt(0)}</span>
              <span><b>{r.actor?.name ?? t("سامانه")}</b> · {AUDIT_LABEL[r.action] ? t(AUDIT_LABEL[r.action]) : r.action}</span>
              <span className="spacer" />
              <span className="muted" style={{ fontSize: 12.5 }}>{f.ago(r.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
