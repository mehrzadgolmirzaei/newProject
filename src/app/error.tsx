"use client";

import { Empty } from "@/components/Empty";
import { useI18n } from "@/components/LocaleProvider";

export default function ErrorPage({ reset, error }: { reset: () => void; error: Error & { digest?: string } }) {
  const { t } = useI18n();
  return (
    <div className="wrap" style={{ paddingBlock: 80 }}>
      <Empty icon="alert" title={t("خطایی رخ داد")} text={t("لطفاً دوباره تلاش کنید. اگر مشکل ادامه داشت، این کد را به مدیر سامانه بدهید: {code}", { code: error.digest ?? "—" })}>
        <button className="btn btn-primary" onClick={reset}>{t("تلاش دوباره")}</button>
      </Empty>
    </div>
  );
}
