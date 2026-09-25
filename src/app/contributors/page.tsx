import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getI18n } from "@/lib/i18n/server";
import { contributors } from "@/lib/cases";
import { initials } from "@/lib/text";
import { Empty } from "@/components/Empty";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return pageMeta({ locale, path: "/contributors", title: t("ارائه‌دهندگان"), description: t("پاتولوژیست‌هایی که موارد دشوار خود را برای آموزش همکاران در این سامانه ثبت کرده‌اند. ارائه‌دهندگان توسط مدیر سامانه تعیین می‌شوند.") });
}
export const dynamic = "force-dynamic";

export default async function Contributors() {
  const people = await contributors(100);
  const { t, f } = await getI18n();
  return (
    <div className="wrap">
      <div className="page-head">
        <h1>{t("ارائه‌دهندگان")}</h1>
        <p>{t("پاتولوژیست‌هایی که موارد دشوار خود را برای آموزش همکاران در این سامانه ثبت کرده‌اند. ارائه‌دهندگان توسط مدیر سامانه تعیین می‌شوند.")}</p>
      </div>
      {people.length === 0 ? (
        <Empty icon="users" title={t("هنوز موردی منتشر نشده است")} />
      ) : (
        <div className="people">
          {people.map((p) => (
            <div key={p.id} className="person">
              <span className="avatar avatar-lg">{initials(p.name)}</span>
              <div>
                <b>{p.name}</b>
                <span>{[p.specialty, p.institution].filter(Boolean).join(" · ")}</span>
                <div className="muted" style={{ fontSize: 12.5 }}>{t("{n} مورد منتشرشده", { n: f.digits(p.cases) })}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
