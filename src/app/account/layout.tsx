import { requireUser, isContributor } from "@/lib/auth";
import { SideNav } from "@/components/SideNav";
import { getI18n } from "@/lib/i18n/server";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser("/account");
  const { t } = await getI18n();
  return (
    <div className="wrap dash">
      <SideNav
        title={t("حساب من")}
        links={[
          { href: "/account", label: t("پیشرفت من"), icon: "checkCircle", exact: true },
          { href: "/account/saved", label: t("نشان‌شده‌ها"), icon: "bookmark" },
          { href: "/onboarding", label: t("ویرایش پروفایل"), icon: "user" },
          ...(isContributor(u) ? [{ href: "/studio", label: t("استودیوی موارد"), icon: "microscope" as const }] : []),
        ]}
      />
      <div>{children}</div>
    </div>
  );
}
