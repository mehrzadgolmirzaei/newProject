"use client";

import { useState, useTransition } from "react";
import { changePassword } from "@/actions/auth";
import { Icon } from "@/components/Icon";

export function ChangePassword() {
  const [f, setF] = useState({ current: "", next: "", repeat: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="stack gap-12"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        if (f.next !== f.repeat) return setMsg({ ok: false, text: "تکرار رمز عبور با رمز جدید یکسان نیست." });
        start(async () => {
          const r = await changePassword({ current: f.current, next: f.next });
          if (!r.ok) return setMsg({ ok: false, text: r.error });
          setF({ current: "", next: "", repeat: "" });
          setMsg({ ok: true, text: "رمز عبور با موفقیت تغییر کرد." });
        });
      }}
    >
      <h2 style={{ fontSize: 17, margin: 0 }}>تغییر رمز عبور</h2>
      <input type="text" name="username" autoComplete="username" hidden readOnly />
      <div className="grid-3">
        <div className="field">
          <label htmlFor="pc">رمز فعلی</label>
          <input id="pc" type="password" className="input input-ltr" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="pn">رمز جدید</label>
          <input id="pn" type="password" className="input input-ltr" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="pr">تکرار رمز جدید</label>
          <input id="pr" type="password" className="input input-ltr" autoComplete="new-password" value={f.repeat} onChange={(e) => setF({ ...f, repeat: e.target.value })} />
        </div>
      </div>
      {msg && <div className={`alert ${msg.ok ? "alert-ok" : "alert-danger"}`}><Icon name={msg.ok ? "check" : "alert"} />{msg.text}</div>}
      <div><button className="btn btn-secondary" disabled={pending || !f.current || !f.next}>{pending ? "در حال ذخیره…" : "ذخیره‌ی رمز جدید"}</button></div>
    </form>
  );
}
