import { requireUser, isContributor } from "@/lib/auth";
import { SideNav } from "@/components/SideNav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser("/account");
  return (
    <div className="wrap dash">
      <SideNav
        title="حساب من"
        links={[
          { href: "/account", label: "پیشرفت من", icon: "checkCircle", exact: true },
          { href: "/account/saved", label: "نشان‌شده‌ها", icon: "bookmark" },
          { href: "/onboarding", label: "ویرایش پروفایل", icon: "user" },
          ...(isContributor(u) ? [{ href: "/studio", label: "استودیوی موارد", icon: "microscope" as const }] : []),
        ]}
      />
      <div>{children}</div>
    </div>
  );
}
