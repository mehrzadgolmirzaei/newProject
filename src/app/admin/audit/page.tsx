import type { Metadata } from "next";
import { db } from "@/lib/db";
import { AUDIT_LABEL } from "@/lib/audit";
import { faDateTime } from "@/lib/format";
import { Pager } from "@/components/Pager";

export const metadata: Metadata = { title: "گزارش رویدادها", robots: { index: false } };
export const dynamic = "force-dynamic";

const PER = 50;

export default async function Audit({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [total, rows] = await Promise.all([
    db.auditLog.count(),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { actor: { select: { name: true, phone: true } } } }),
  ]);
  return (
    <>
      <div className="dash-head"><div><h1>گزارش رویدادها</h1><p>همه‌ی اقدام‌های مدیریتی و تغییرات مهم، با زمان و IP</p></div></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>زمان</th><th>کاربر</th><th>رویداد</th><th>موضوع</th><th>جزئیات</th><th>IP</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="muted" style={{ whiteSpace: "nowrap" }}>{faDateTime(r.createdAt)}</td>
                <td>{r.actor?.name ?? r.actor?.phone ?? "—"}</td>
                <td>{AUDIT_LABEL[r.action] ?? r.action}</td>
                <td className="mono muted" style={{ fontSize: 12 }}>{r.entity}{r.entityId ? ` · ${r.entityId.slice(-8)}` : ""}</td>
                <td className="muted" style={{ fontSize: 12.5, maxWidth: 280 }} dir="auto">{r.meta ? JSON.stringify(r.meta) : ""}</td>
                <td className="mono muted" style={{ fontSize: 12 }}>{r.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={Math.ceil(total / PER)} href={(p) => (p > 1 ? `/admin/audit?page=${p}` : "/admin/audit")} />
    </>
  );
}
