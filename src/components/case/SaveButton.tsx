"use client";

import { useState, useTransition } from "react";
import { toggleSave } from "@/actions/learn";
import { Icon } from "../Icon";

export function SaveButton({ caseId, initial }: { caseId: string; initial: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn-secondary btn-sm"
      aria-pressed={saved}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setSaved((s) => !s);
          const r = await toggleSave(caseId);
          if (r.ok) setSaved(r.data.saved);
          else setSaved(initial);
        })
      }
    >
      <Icon name={saved ? "bookmarkFill" : "bookmark"} /> {saved ? "نشان‌شده" : "نشان‌کردن"}
    </button>
  );
}
