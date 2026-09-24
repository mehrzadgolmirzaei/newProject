import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { caseCode, faDate, num } from "@/lib/format";
import { CASE_STATUS, subspecialtyFa } from "@/lib/taxonomy";
import { normalizeFa } from "@/lib/text";
import { Icon } from "@/components/Icon";
import { Pager } from "@/components/Pager";

export const metadata: Metadata = { title: "همه‌ی موارد", robots: { index: false } };
export const dynamic = "force-dynamic";

const PER = 30;

export default async function AdminCases({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const sp = await searchParams;
  const status = (["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"] as const).find((s) => s === sp.status);
  const q = sp.q ? normalizeFa(sp.q) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.CaseWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { finalDiagnosis: { contains: q, mode: "insensitive" } }, { author: { name: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    db.case.count({ where }),
    db.case.findMany({
      where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PER, take: PER,
      include: { author: { select: { name: true } }, _count: { select: { attempts: true, comments: true } } },
    }),
  ]);
  const href = (p: number) => `/admin/cases?${new URLSearchParams({ ...(status ? { status } : {}), ...(sp.q ? { q: sp.q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <>
      <div className="dash-head"><div><h1>همه‌ی موارد</h1><p>{num(total)} مورد</p></div></div>
      <div className="toolbar">
        <div className="seg">
          <Link href="/admin/cases" aria-current={!status}>همه</Link>
          {(["PUBLISHED", "IN_REVIEW", "DRAFT", "ARCHIVED"] as const).map((s) => (
            <Link key={s} href={`/admin/cases?status=${s}`} aria-current={status === s}>{CASE_STATUS[s]}</Link>
          ))}
        </div>
        <span className="spacer" />
        <form className="header-search" style={{ display: "flex" }}>
          <Icon name="search" size={16} />
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={sp.q} placeholder="عنوان، تشخیص یا نویسنده" />
        </form>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>مورد</th><th>نویسنده</th><th>وضعیت</th><th>پاسخ / نظر</th><th>بازدید</th><th>به‌روزرسانی</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/cases/${c.number}`} className="cell-title">{c.title || "بدون عنوان"}</Link>
                  <div className="cell-sub">{caseCode(c.number)} · {subspecialtyFa(c.subspecialty)} {c.featuredAt && "· ★ مورد هفته"} {c.isDemo && "· نمایشی"}</div>
                </td>
                <td>{c.author.name}</td>
                <td><span className="badge">{CASE_STATUS[c.status]}</span></td>
                <td className="muted">{num(c._count.attempts)} / {num(c._count.comments)}</td>
                <td className="muted">{num(c.viewCount)}</td>
                <td className="muted" style={{ whiteSpace: "nowrap" }}>{faDate(c.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={Math.ceil(total / PER)} href={href} />
    </>
  );
}
