import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/storage";
import { caseCode, timeAgo } from "@/lib/format";
import { CASE_MODE, subspecialtyFa } from "@/lib/taxonomy";
import { faDigits } from "@/lib/text";
import { ReviewActions } from "@/components/admin/ReviewActions";
import { Empty } from "@/components/Empty";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "صف بازبینی", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Review() {
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
          <h1>صف بازبینی</h1>
          <p>پیش از انتشار، پیش‌نمایش را باز کنید و تصاویر را از نظر اطلاعات هویتی (برچسب لام، نام، تاریخ) بررسی کنید.</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <Empty icon="inbox" title="صف بازبینی خالی است" text="موارد ارسالی ارائه‌دهندگان اینجا نمایش داده می‌شوند." />
      ) : (
        <div className="stack gap-16">
          {rows.map((c) => (
            <div key={c.id} className="panel">
              <div className="panel-body stack gap-12">
                <div className="row gap-12" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="case-meta">
                      <span className="case-code">{caseCode(c.number)}</span>
                      <span className="sep" /><span>{subspecialtyFa(c.subspecialty)}</span>
                      <span className="sep" /><span>{CASE_MODE[c.mode].fa}</span>
                      <span className="sep" /><span>ارسال {c.submittedAt ? timeAgo(c.submittedAt) : "—"}</span>
                    </div>
                    <h3 style={{ fontSize: 17, marginTop: 4 }}>{c.title}</h3>
                    <div className="muted" style={{ fontSize: 13.5 }}>
                      {c.author.name} · {c.author.specialty} — {faDigits(c.media.length)} تصویر · {faDigits(c._count.ihc)} مارکر · {faDigits(c._count.differentials)} افتراقی
                    </div>
                    <div className="en" style={{ fontSize: 14, marginTop: 6, textAlign: "right" }}>
                      <span className="muted" style={{ direction: "rtl" }}>تشخیص: </span>{c.finalDiagnosis}
                    </div>
                  </div>
                  <Link href={`/cases/${c.number}`} target="_blank" className="btn btn-secondary btn-sm"><Icon name="eye" /> پیش‌نمایش کامل</Link>
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
