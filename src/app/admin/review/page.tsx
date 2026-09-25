import Link from "@/components/Link";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/storage";
import { caseCode } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { privateMeta } from "@/lib/seo";
import { CASE_MODE, subspecialtyLabel } from "@/lib/taxonomy";
import { ReviewActions } from "@/components/admin/ReviewActions";
import { Empty } from "@/components/Empty";
import { Icon } from "@/components/Icon";

export const generateMetadata = () => privateMeta("صف بازبینی");
export const dynamic = "force-dynamic";

export default async function Review() {
  const { t, f, locale } = await getI18n();
  const rows = await db.case.findMany({
    where: { status: "IN_REVIEW" },
    orderBy: { submittedAt: "asc" },
    include: {
      author: { select: { name: true, specialty: true } },
      media: { where: { status: "READY" }, orderBy: { order: "asc" }, select: { thumbKey: true } },
      _count: { select: { ihc: true, differentials: true } },
    },
  });

  return (
    <>
      <div className="dash-head">
        <div>
          <h1>{t("صف بازبینی")}</h1>
          <p>{t("پیش از انتشار، پیش‌نمایش را باز کنید و تصاویر را از نظر اطلاعات هویتی (برچسب لام، نام، تاریخ) بررسی کنید.")}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <Empty icon="inbox" title={t("صف بازبینی خالی است")} text={t("موارد ارسالی ارائه‌دهندگان اینجا نمایش داده می‌شوند.")} />
      ) : (
        <div className="stack gap-16">
          {rows.map((c) => (
            <div key={c.id} className="panel">
              <div className="panel-body stack gap-12">
                <div className="row gap-12" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="case-meta">
                      <span className="case-code">{caseCode(c.number)}</span>
                      <span className="sep" /><span>{subspecialtyLabel(c.subspecialty, locale)}</span>
                      <span className="sep" /><span>{t(CASE_MODE[c.mode].fa)}</span>
                      <span className="sep" /><span>{t("ارسال {ago}", { ago: c.submittedAt ? f.ago(c.submittedAt) : "—" })}</span>
                    </div>
                    <h3 style={{ fontSize: 17, marginTop: 4 }}>{c.title}</h3>
                    <div className="muted" style={{ fontSize: 13.5 }}>
                      {c.author.name} · {c.author.specialty} — {t("{m} تصویر · {i} مارکر · {d} افتراقی", { m: f.digits(c.media.length), i: f.digits(c._count.ihc), d: f.digits(c._count.differentials) })}
                    </div>
                    <div style={{ fontSize: 14, marginTop: 6 }}>
                      <span className="muted">{t("تشخیص: ")}</span><span className="en" dir="auto">{c.finalDiagnosis}</span>
                    </div>
                  </div>
                  <Link href={`/cases/${c.number}`} target="_blank" className="btn btn-secondary btn-sm"><Icon name="eye" /> {t("پیش‌نمایش کامل")}</Link>
                </div>
                {c.media.length > 0 && (
                  <div className="row gap-8" style={{ overflowX: "auto" }}>
                    {c.media.map((m, i) =>
                      m.thumbKey ? <img key={i} src={mediaUrl(m.thumbKey)!} alt="" style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} /> : null, // eslint-disable-line @next/next/no-img-element
                    )}
                  </div>
                )}
                <ReviewActions caseId={c.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
