"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetPassword, setTrusted, setUserRole, setUserStatus } from "@/actions/admin";
import { ROLE, USER_STATUS } from "@/lib/taxonomy";
import { initials } from "@/lib/text";
import { useI18n } from "../LocaleProvider";
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
  const { t, f } = useI18n();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ id: string; text: string } | null>(null);
  const run = (id: string, fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? null : { id, text: r.error ?? t("خطا") });
      router.refresh();
    });

  if (users.length === 0) return <Empty icon="users" title={t("کاربری پیدا نشد")} />;

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr><th>{t("پزشک")}</th><th>{t("نظام پزشکی")}</th><th>{t("وضعیت")}</th><th>{t("نقش")}</th><th>{t("فعالیت")}</th><th /></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>
                <div className="row gap-12">
                  <span className="avatar">{initials(u.name)}</span>
                  <div>
                    <div className="cell-title">{u.name ?? <span className="muted">{t("پروفایل تکمیل نشده")}</span>}</div>
                    <div className="cell-sub">{[u.specialty, u.institution, u.city].filter(Boolean).join(" · ")}</div>
                    <div className="cell-sub ltr" style={{ textAlign: "start" }}>{u.username ? `@${u.username}` : u.phone ? f.digits(u.phone) : ""}</div>
                  </div>
                </div>
              </td>
              <td className="mono">{u.medicalNumber ? f.digits(u.medicalNumber) : "—"}</td>
              <td>
                <span className={`badge ${TONE[u.status]}`}>{t(USER_STATUS[u.status])}</span>
                <div className="cell-sub">{t("عضویت {d}", { d: f.date(u.createdAt) })}</div>
              </td>
              <td>
                {u.id === meId ? <span className="badge">{t("{r} (شما)", { r: t(ROLE[u.role]) })}</span> : (
                  <select className="select" style={{ minHeight: 34, paddingBlock: 4, width: 140 }} value={u.role} disabled={pending}
                    onChange={(e) => run(u.id, () => setUserRole(u.id, e.target.value as U["role"]))}>
                    {(Object.keys(ROLE) as U["role"][]).map((r) => <option key={r} value={r}>{t(ROLE[r])}</option>)}
                  </select>
                )}
                {u.role !== "MEMBER" && u.role !== "ADMIN" && (
                  <label className="check" style={{ fontSize: 12.5, marginTop: 6 }}>
                    <input type="checkbox" checked={u.trusted} disabled={pending} onChange={(e) => run(u.id, () => setTrusted(u.id, e.target.checked))} style={{ marginTop: 3 }} />
                    {t("انتشار بدون بازبینی")}
                  </label>
                )}
              </td>
              <td className="cell-sub" style={{ whiteSpace: "nowrap" }}>
                {t("{c} مورد · {a} پاسخ · {m} نظر", { c: f.digits(u.cases), a: f.digits(u.attempts), m: f.digits(u.comments) })}
                <div>{u.lastLoginAt ? t("ورود {ago}", { ago: f.ago(u.lastLoginAt) }) : "—"}</div>
              </td>
              <td>
                {u.id !== meId && (
                  <div className="actions">
                    {u.status !== "ACTIVE" && (
                      <button className="btn btn-ok btn-sm" disabled={pending || !u.profileComplete} onClick={() => run(u.id, () => setUserStatus(u.id, "ACTIVE"))}>
                        <Icon name="check" /> {u.status === "PENDING" ? t("تأیید") : t("فعال‌سازی")}
                      </button>
                    )}
                    {u.status !== "SUSPENDED" && (
                      <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => confirm(t("حساب {name} معلق شود؟ از همه‌ی دستگاه‌ها خارج می‌شود.", { name: u.name ?? u.username ?? u.phone ?? "" })) && run(u.id, () => setUserStatus(u.id, "SUSPENDED"))}>
                        {t("تعلیق")}
                      </button>
                    )}
                    {u.username && (
                      <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => {
                        const pw = prompt(t("رمز عبور جدید برای {name} (دست‌کم ۸ نویسه):", { name: u.name ?? u.username ?? "" }));
                        if (pw) run(u.id, async () => { const r = await resetPassword(u.id, pw); if (r.ok) alert("رمز عبور جدید ثبت شد."); return r; });
                      }}>
                        {t("رمز جدید")}
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
