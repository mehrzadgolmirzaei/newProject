import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { SideNav } from "@/components/SideNav";
import { getI18n } from "@/lib/i18n/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["ADMIN"], "/admin");
  const { t } = await getI18n();
  const [pendingUsers, inReview] = await Promise.all([
    db.user.count({ where: { status: "PENDING", profileComplete: true } }),
    db.case.count({ where: { status: "IN_REVIEW" } }),
  ]);
  return (
    <div className="wrap dash">
      <SideNav
        title={t("مدیریت")}
        links={[
          { href: "/admin", label: t("نمای کلی"), icon: "grid", exact: true },
          { href: "/admin/users", label: t("کاربران"), icon: "users", badge: pendingUsers },
          { href: "/admin/review", label: t("صف بازبینی"), icon: "inbox", badge: inReview },
          { href: "/admin/cases", label: t("همه‌ی موارد"), icon: "microscope" },
          { href: "/admin/audit", label: t("گزارش رویدادها"), icon: "history" },
        ]}
      />
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}
