"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishCase, returnCase } from "@/actions/admin";
import { Icon } from "../Icon";

export function ReviewActions({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) setErr(r.error ?? "خطا");
      else router.refresh();
    });

  return (
    <div className="stack gap-8">
      <div className="row gap-8">
        <button className="btn btn-ok btn-sm" disabled={pending} onClick={() => run(() => publishCase(caseId))}><Icon name="check" /> تأیید و انتشار</button>
        <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => setOpen((o) => !o)}>بازگرداندن برای اصلاح</button>
      </div>
      {open && (
        <div className="stack gap-8">
          <textarea className="textarea" style={{ minHeight: 80 }} placeholder="چه چیزی باید اصلاح شود؟ (برای نویسنده نمایش داده می‌شود)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div><button className="btn btn-primary btn-sm" disabled={pending || note.trim().length < 5} onClick={() => run(() => returnCase(caseId, note))}>ارسال یادداشت و بازگرداندن</button></div>
        </div>
      )}
      {err && <div className="alert alert-danger">{err}</div>}
    </div>
  );
}
