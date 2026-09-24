import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { SideNav } from "@/components/SideNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["ADMIN"], "/admin");
  const [pendingUsers, inReview] = await Promise.all([
    db.user.count({ where: { status: "PENDING", profileComplete: true } }),
    db.case.count({ where: { status: "IN_REVIEW" } }),
  ]);
  return (
    <div className="wrap dash">
      <SideNav
        title="مدیریت"
        links={[
          { href: "/admin", label: "نمای کلی", icon: "grid", exact: true },
          { href: "/admin/users", label: "کاربران", icon: "users", badge: pendingUsers },
          { href: "/admin/review", label: "صف بازبینی", icon: "inbox", badge: inReview },
          { href: "/admin/cases", label: "همه‌ی موارد", icon: "microscope" },
          { href: "/admin/audit", label: "گزارش رویدادها", icon: "history" },
        ]}
      />
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}
