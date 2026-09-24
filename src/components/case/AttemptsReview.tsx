"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { gradeAttempt } from "@/actions/learn";
import { Icon } from "../Icon";
import { CONFIDENCE } from "@/lib/taxonomy";
import { timeAgo } from "@/lib/format";

type Row = {
  id: string;
  answer: string;
  gaveUp: boolean;
  confidence: "LOW" | "MEDIUM" | "HIGH" | null;
  autoCorrect: boolean;
  gradedCorrect: boolean | null;
  createdAt: Date;
  user: { name: string | null; specialty: string | null };
};

/** فهرست پاسخ‌ها برای ارائه‌دهنده — تصحیح دستی وقتی تطبیق خودکار اشتباه کرده */
export function AttemptsReview({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const grade = (id: string, correct: boolean | null) =>
    start(async () => {
      await gradeAttempt({ attemptId: id, correct });
      router.refresh();
    });

  if (rows.length === 0) return <p className="muted" style={{ fontSize: 14 }}>هنوز پاسخی ثبت نشده است.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr><th>پاسخ</th><th>کاربر</th><th>اطمینان</th><th>ارزیابی</th><th /></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const correct = r.gradedCorrect ?? r.autoCorrect;
            return (
              <tr key={r.id}>
                <td className="en" style={{ textAlign: "left" }}>{r.gaveUp ? <span className="muted">— بدون پاسخ —</span> : r.answer}</td>
                <td><div className="cell-title">{r.user.name}</div><div className="cell-sub">{r.user.specialty} · {timeAgo(r.createdAt)}</div></td>
                <td>{r.confidence ? CONFIDENCE[r.confidence] : "—"}</td>
                <td>
                  {r.gaveUp ? "—" : (
                    <span className={`badge ${correct ? "badge-ok" : "badge-warn"}`}>
                      {correct ? "درست" : "نادرست"}{r.gradedCorrect === null ? " (خودکار)" : ""}
                    </span>
                  )}
                </td>
                <td>
                  {!r.gaveUp && (
                    <div className="actions">
                      <button className="btn btn-ghost btn-sm btn-icon" title="درست" disabled={pending} onClick={() => grade(r.id, true)}><Icon name="check" /></button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="نادرست" disabled={pending} onClick={() => grade(r.id, false)}><Icon name="x" /></button>
                      {r.gradedCorrect !== null && (
                        <button className="btn btn-ghost btn-sm btn-icon" title="بازگشت به ارزیابی خودکار" disabled={pending} onClick={() => grade(r.id, null)}><Icon name="refresh" /></button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
