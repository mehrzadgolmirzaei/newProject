"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveCase, featureCase, publishCase } from "@/actions/admin";
import { Icon } from "../Icon";
import { useI18n } from "../LocaleProvider";

export function AdminCaseTools({ caseId, status, featured }: { caseId: string; status: string; featured: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? ok : r.error ?? t("خطا"));
      router.refresh();
    });

  return (
    <div className="row gap-8" style={{ flexWrap: "wrap" }}>
      {status === "IN_REVIEW" && (
        <button className="btn btn-ok btn-sm" disabled={pending} onClick={() => run(() => publishCase(caseId), t("منتشر شد."))}>
          <Icon name="check" /> {t("انتشار")}
        </button>
      )}
      {status === "PUBLISHED" && !featured && (
        <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run(() => featureCase(caseId), t("به‌عنوان مورد هفته انتخاب شد."))}>
          <Icon name="star" /> {t("مورد هفته")}
        </button>
      )}
      {status === "PUBLISHED" && (
        <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => confirm(t("این مورد از کتابخانه خارج شود؟")) && run(() => archiveCase(caseId, true), t("بایگانی شد."))}>
          {t("بایگانی|فعل")}
        </button>
      )}
      {status === "ARCHIVED" && (
        <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run(() => archiveCase(caseId, false), t("بازگردانده شد."))}>
          {t("خروج از بایگانی")}
        </button>
      )}
      {msg && <span className="muted" style={{ fontSize: 13 }}>{msg}</span>}
    </div>
  );
}
