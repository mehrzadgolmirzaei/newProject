"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser } from "@/actions/admin";
import { ROLE } from "@/lib/taxonomy";
import { Icon } from "../Icon";
import { useI18n } from "../LocaleProvider";

type Role = "ADMIN" | "CONTRIBUTOR" | "MEMBER";

/** ساخت حساب پزشک توسط مدیر (مثلاً برای ارائه‌دهندگان) */
export function CreateUser() {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ username: "", password: "", role: "CONTRIBUTOR" as Role });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  if (!open)
    return (
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}><Icon name="plus" /> {t("ایجاد حساب جدید")}</button>
        {msg?.ok && <span style={{ color: "var(--ok)", fontSize: 13.5, marginInlineStart: 12 }}>{msg.text}</span>}
      </div>
    );

  return (
    <form
      className="panel panel-pad stack gap-12"
      style={{ marginBottom: 16 }}
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await createUser(f);
          if (!r.ok) return setMsg({ ok: false, text: r.error });
          setMsg({ ok: true, text: t("حساب {u} ایجاد شد. نام کاربری و رمز عبور را به پزشک اطلاع دهید.", { u: f.username }) });
          setF({ username: "", password: "", role: "CONTRIBUTOR" });
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <b>{t("ایجاد حساب جدید")}</b>
      <div className="grid-3">
        <div className="field">
          <label htmlFor="nu">{t("نام کاربری")}</label>
          <input id="nu" className="input input-ltr" autoComplete="off" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="np">{t("رمز عبور اولیه")}</label>
          <input id="np" className="input input-ltr" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="nr">{t("نقش")}</label>
          <select id="nr" className="select" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
            {(Object.keys(ROLE) as Role[]).map((r) => <option key={r} value={r}>{t(ROLE[r])}</option>)}
          </select>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>{t("حساب بلافاصله فعال می‌شود. پزشک در نخستین ورود، مشخصات پزشکی خود را تکمیل می‌کند و می‌تواند رمز عبور را تغییر دهد.")}</p>
      {msg && !msg.ok && <div className="alert alert-danger"><Icon name="alert" />{msg.text}</div>}
      <div className="row gap-8">
        <button className="btn btn-primary btn-sm" disabled={pending || !f.username || !f.password}>{pending ? t("در حال ایجاد…") : t("ایجاد حساب")}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); setMsg(null); }}>{t("انصراف")}</button>
      </div>
    </form>
  );
}
