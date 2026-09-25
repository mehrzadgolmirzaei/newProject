import Link from "@/components/Link";
import { Empty } from "@/components/Empty";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="wrap" style={{ paddingBlock: 80 }}>
      <Empty icon="search" title={t("صفحه پیدا نشد")} text={t("ممکن است این مورد حذف یا بایگانی شده باشد، یا نشانی اشتباه باشد.")}>
        <Link href="/cases" className="btn btn-primary">{t("کتابخانه‌ی موارد")}</Link>
      </Empty>
    </div>
  );
}
