import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { num, percent, timeAgo } from "@/lib/format";
import { AUDIT_LABEL } from "@/lib/audit";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "مدیریت", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
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
      <div className="dash-head"><div><h1>نمای کلی</h1><p>وضعیت سامانه و کارهای در انتظار</p></div></div>

      {(pendingUsers > 0 || inReview > 0) && (
        <div className="stack gap-8" style={{ marginBottom: 20 }}>
          {pendingUsers > 0 && (
            <Link href="/admin/users?status=PENDING" className="alert alert-warn"><Icon name="users" /><span style={{ flex: 1 }}><b>{num(pendingUsers)} کاربر</b> منتظر تأیید شماره‌ی نظام پزشکی‌اند.</span><Icon name="chevronLeft" /></Link>
          )}
          {inReview > 0 && (
            <Link href="/admin/review" className="alert alert-info"><Icon name="inbox" /><span style={{ flex: 1 }}><b>{num(inReview)} مورد</b> در صف بازبینی است.</span><Icon name="chevronLeft" /></Link>
          )}
        </div>
      )}

      <div className="kpis">
        <div className="kpi"><span>موارد منتشرشده</span><b>{num(published)}</b></div>
        <div className="kpi"><span>اعضای فعال</span><b>{num(members)}</b></div>
        <div className="kpi"><span>پاسخ‌ها در ۷ روز</span><b>{num(attemptsWeek)}</b><small>{num(commentsWeek)} نظر</small></div>
        <div className="kpi hl"><span>میانگین پاسخ صحیح</span><b>{percent(correctAll, attemptsAll)}</b><small>از {num(attemptsAll)} پاسخ</small></div>
      </div>

      {(processing > 0 || failed > 0) && (
        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          <Icon name="image" />
          <span>{processing > 0 && <>{num(processing)} تصویر در حال پردازش. </>}{failed > 0 && <>{num(failed)} تصویر با خطا مواجه شده (از ویرایشگر همان مورد «تلاش دوباره» را بزنید).</>}</span>
        </div>
      )}

      <div className="panel">
        <div className="panel-head"><h2>آخرین رویدادها</h2><span className="spacer" /><Link href="/admin/audit" className="link" style={{ fontSize: 13.5 }}>همه</Link></div>
        <div className="panel-body stack gap-8">
          {recent.length === 0 && <p className="muted">رویدادی ثبت نشده است.</p>}
          {recent.map((r) => (
            <div key={r.id} className="row" style={{ fontSize: 14 }}>
              <span className="avatar avatar-sm">{(r.actor?.name ?? "؟").charAt(0)}</span>
              <span><b>{r.actor?.name ?? "سامانه"}</b> · {AUDIT_LABEL[r.action] ?? r.action}</span>
              <span className="spacer" />
              <span className="muted" style={{ fontSize: 12.5 }}>{timeAgo(r.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
