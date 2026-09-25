import { db } from "@/lib/db";
import { AUDIT_LABEL } from "@/lib/audit";
import { privateMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { Pager } from "@/components/Pager";

export const generateMetadata = () => privateMeta("گزارش رویدادها");
export const dynamic = "force-dynamic";

const PER = 50;

export default async function Audit({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { t, f } = await getI18n();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [total, rows] = await Promise.all([
    db.auditLog.count(),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { actor: { select: { name: true, username: true, phone: true } } } }),
  ]);
  return (
    <>
      <div className="dash-head"><div><h1>{t("گزارش رویدادها")}</h1><p>{t("همه‌ی اقدام‌های مدیریتی و تغییرات مهم، با زمان و IP")}</p></div></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>{t("زمان")}</th><th>{t("کاربر")}</th><th>{t("رویداد")}</th><th>{t("موضوع")}</th><th>{t("جزئیات")}</th><th>IP</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="muted" style={{ whiteSpace: "nowrap" }}>{f.dateTime(r.createdAt)}</td>
                <td>{r.actor?.name ?? r.actor?.username ?? r.actor?.phone ?? "—"}</td>
                <td>{AUDIT_LABEL[r.action] ? t(AUDIT_LABEL[r.action]) : r.action}</td>
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
