import type { Metadata } from "next";
import Link from "next/link";
import type { CaseStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createDraft } from "@/actions/studio";
import { mediaUrl } from "@/lib/storage";
import { caseCode, faDate, num } from "@/lib/format";
import { CASE_STATUS, CASE_MODE, subspecialtyFa } from "@/lib/taxonomy";
import { Icon } from "@/components/Icon";
import { Empty } from "@/components/Empty";

export const metadata: Metadata = { title: "استودیوی موارد", robots: { index: false } };
export const dynamic = "force-dynamic";

const TONE: Record<CaseStatus, string> = { DRAFT: "", IN_REVIEW: "badge-warn", PUBLISHED: "badge-ok", ARCHIVED: "badge-outline" };

export default async function Studio({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const u = await requireRole(["CONTRIBUTOR", "ADMIN"], "/studio");
  const { s } = await searchParams;
  const filter = (["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"] as const).find((x) => x === s);
  const [rows, groups] = await Promise.all([
    db.case.findMany({
      where: { authorId: u.id, ...(filter ? { status: filter } : {}) },
      orderBy: { updatedAt: "desc" },
      include: {
        media: { where: { status: "READY" }, orderBy: { order: "asc" }, take: 1, select: { thumbKey: true } },
        _count: { select: { attempts: true, comments: { where: { status: "VISIBLE" } } } },
      },
    }),
    db.case.groupBy({ by: ["status"], where: { authorId: u.id }, _count: { _all: true } }),
  ]);
  const count = Object.fromEntries(groups.map((g) => [g.status, g._count._all])) as Partial<Record<CaseStatus, number>>;
  const total = Object.values(count).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="wrap" style={{ paddingTop: 32 }}>
      <div className="dash-head">
        <div>
          <h1>استودیوی موارد</h1>
          <p>{u.trusted || u.role === "ADMIN" ? "موارد شما پس از ارسال مستقیم منتشر می‌شوند." : "موارد شما پس از ارسال، توسط مدیر بازبینی و منتشر می‌شوند."}</p>
        </div>
        <span className="spacer" />
        <form action={createDraft}><button className="btn btn-primary"><Icon name="plus" /> مورد جدید</button></form>
      </div>

      <div className="seg" style={{ marginBottom: 16 }}>
        <Link href="/studio" aria-current={!filter}>همه ({num(total)})</Link>
        {(["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"] as const).map((st) => (
          <Link key={st} href={`/studio?s=${st}`} aria-current={filter === st}>{CASE_STATUS[st]} ({num(count[st] ?? 0)})</Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty icon="microscope" title={filter ? "موردی در این وضعیت نیست" : "هنوز موردی ثبت نکرده‌اید"} text="هر مورد با شرح حال، تصاویر، یافته‌ها و تشخیص نهایی ثبت می‌شود. پیش‌نویس‌ها خودکار ذخیره می‌شوند." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>مورد</th><th>وضعیت</th><th>نوع</th><th>پاسخ / نظر</th><th>آخرین تغییر</th><th /></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="row gap-12">
                      {c.media[0]?.thumbKey
                        ? <img className="mini-thumb" src={mediaUrl(c.media[0].thumbKey)!} alt="" />  // eslint-disable-line @next/next/no-img-element
                        : <span className="mini-thumb" />}
                      <div>
                        <Link href={`/studio/cases/${c.id}`} className="cell-title">{c.title || "بدون عنوان"}</Link>
                        <div className="cell-sub">{caseCode(c.number)} · {subspecialtyFa(c.subspecialty)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${TONE[c.status]}`}>{CASE_STATUS[c.status]}</span>
                    {c.status === "DRAFT" && c.reviewNote && <div className="cell-sub" style={{ color: "var(--warn)" }}>بازگشت از بازبینی</div>}
                  </td>
                  <td className="muted">{CASE_MODE[c.mode].fa}</td>
                  <td className="muted">{num(c._count.attempts)} / {num(c._count.comments)}</td>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>{faDate(c.updatedAt)}</td>
                  <td>
                    <div className="actions">
                      <Link href={`/studio/cases/${c.id}`} className="btn btn-ghost btn-sm"><Icon name="pencil" /> ویرایش</Link>
                      <Link href={`/cases/${c.number}`} className="btn btn-ghost btn-sm"><Icon name="eye" /> {c.status === "PUBLISHED" ? "مشاهده" : "پیش‌نمایش"}</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
