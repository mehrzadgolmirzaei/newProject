"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetPassword, setTrusted, setUserRole, setUserStatus } from "@/actions/admin";
import { ROLE, USER_STATUS } from "@/lib/taxonomy";
import { faDigits, initials } from "@/lib/text";
import { faDate, timeAgo } from "@/lib/format";
import { Icon } from "../Icon";
import { Empty } from "../Empty";

type U = {
  id: string; name: string | null; username: string | null; phone: string | null; medicalNumber: string | null; specialty: string | null; institution: string | null; city: string | null;
  role: "ADMIN" | "CONTRIBUTOR" | "MEMBER"; status: "PENDING" | "ACTIVE" | "SUSPENDED"; trusted: boolean; profileComplete: boolean;
  createdAt: Date; lastLoginAt: Date | null; cases: number; attempts: number; comments: number;
};

const TONE = { PENDING: "badge-warn", ACTIVE: "badge-ok", SUSPENDED: "badge-danger" } as const;

export function UsersTable({ users, meId }: { users: U[]; meId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ id: string; text: string } | null>(null);
  const run = (id: string, fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? null : { id, text: r.error ?? "خطا" });
      router.refresh();
    });

  if (users.length === 0) return <Empty icon="users" title="کاربری پیدا نشد" />;

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr><th>پزشک</th><th>نظام پزشکی</th><th>وضعیت</th><th>نقش</th><th>فعالیت</th><th /></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>
                <div className="row gap-12">
                  <span className="avatar">{initials(u.name)}</span>
                  <div>
                    <div className="cell-title">{u.name ?? <span className="muted">پروفایل تکمیل نشده</span>}</div>
                    <div className="cell-sub">{[u.specialty, u.institution, u.city].filter(Boolean).join(" · ")}</div>
                    <div className="cell-sub ltr" style={{ textAlign: "right" }}>{u.username ? `@${u.username}` : u.phone ? faDigits(u.phone) : ""}</div>
                  </div>
                </div>
              </td>
              <td className="mono">{u.medicalNumber ? faDigits(u.medicalNumber) : "—"}</td>
              <td>
                <span className={`badge ${TONE[u.status]}`}>{USER_STATUS[u.status]}</span>
                <div className="cell-sub">عضویت {faDate(u.createdAt)}</div>
              </td>
              <td>
                {u.id === meId ? <span className="badge">{ROLE[u.role]} (شما)</span> : (
                  <select className="select" style={{ minHeight: 34, paddingBlock: 4, width: 140 }} value={u.role} disabled={pending}
                    onChange={(e) => run(u.id, () => setUserRole(u.id, e.target.value as U["role"]))}>
                    {(Object.keys(ROLE) as U["role"][]).map((r) => <option key={r} value={r}>{ROLE[r]}</option>)}
                  </select>
                )}
                {u.role !== "MEMBER" && u.role !== "ADMIN" && (
                  <label className="check" style={{ fontSize: 12.5, marginTop: 6 }}>
                    <input type="checkbox" checked={u.trusted} disabled={pending} onChange={(e) => run(u.id, () => setTrusted(u.id, e.target.checked))} style={{ marginTop: 3 }} />
                    انتشار بدون بازبینی
                  </label>
                )}
              </td>
              <td className="cell-sub" style={{ whiteSpace: "nowrap" }}>
                {faDigits(u.cases)} مورد · {faDigits(u.attempts)} پاسخ · {faDigits(u.comments)} نظر
                <div>{u.lastLoginAt ? `ورود ${timeAgo(u.lastLoginAt)}` : "—"}</div>
              </td>
              <td>
                {u.id !== meId && (
                  <div className="actions">
                    {u.status !== "ACTIVE" && (
                      <button className="btn btn-ok btn-sm" disabled={pending || !u.profileComplete} onClick={() => run(u.id, () => setUserStatus(u.id, "ACTIVE"))}>
                        <Icon name="check" /> {u.status === "PENDING" ? "تأیید" : "فعال‌سازی"}
                      </button>
                    )}
                    {u.status !== "SUSPENDED" && (
                      <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => confirm(`حساب ${u.name ?? u.username ?? u.phone} معلق شود؟ از همه‌ی دستگاه‌ها خارج می‌شود.`) && run(u.id, () => setUserStatus(u.id, "SUSPENDED"))}>
                        تعلیق
                      </button>
                    )}
                    {u.username && (
                      <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => {
                        const pw = prompt(`رمز عبور جدید برای ${u.name ?? u.username} (دست‌کم ۸ نویسه):`);
                        if (pw) run(u.id, async () => { const r = await resetPassword(u.id, pw); if (r.ok) alert("رمز عبور جدید ثبت شد."); return r; });
                      }}>
                        رمز جدید
                      </button>
                    )}
                  </div>
                )}
                {msg?.id === u.id && <div style={{ color: "var(--danger)", fontSize: 12.5 }}>{msg.text}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
