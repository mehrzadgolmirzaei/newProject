"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveCase, featureCase, publishCase } from "@/actions/admin";
import { Icon } from "../Icon";

export function AdminCaseTools({ caseId, status, featured }: { caseId: string; status: string; featured: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? ok : r.error ?? "خطا");
      router.refresh();
    });

  return (
    <div className="row gap-8" style={{ flexWrap: "wrap" }}>
      {status === "IN_REVIEW" && (
        <button className="btn btn-ok btn-sm" disabled={pending} onClick={() => run(() => publishCase(caseId), "منتشر شد.")}>
          <Icon name="check" /> انتشار
        </button>
      )}
      {status === "PUBLISHED" && !featured && (
        <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run(() => featureCase(caseId), "به‌عنوان مورد هفته انتخاب شد.")}>
          <Icon name="star" /> مورد هفته
        </button>
      )}
      {status === "PUBLISHED" && (
        <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => confirm("این مورد از کتابخانه خارج شود؟") && run(() => archiveCase(caseId, true), "بایگانی شد.")}>
          بایگانی
        </button>
      )}
      {status === "ARCHIVED" && (
        <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run(() => archiveCase(caseId, false), "بازگردانده شد.")}>
          خروج از بایگانی
        </button>
      )}
      {msg && <span className="muted" style={{ fontSize: 13 }}>{msg}</span>}
    </div>
  );
}
