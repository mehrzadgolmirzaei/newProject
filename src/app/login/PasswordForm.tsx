"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginWithPassword, register } from "@/actions/auth";
import { Icon } from "@/components/Icon";

export function PasswordForm({ next, allowRegister }: { next: string; allowRegister: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "register" && password !== repeat) return setError({ text: "تکرار رمز عبور با رمز عبور یکسان نیست.", field: "repeat" });
    start(async () => {
      const r = mode === "login" ? await loginWithPassword({ username, password, next }) : await register({ username, password, next });
      if (!r.ok) return setError({ text: r.error, field: r.field });
      router.replace(r.data.to);
      router.refresh();
    });
  }

  const switchTo = (m: "login" | "register") => { setMode(m); setError(null); setRepeat(""); };

  return (
    <form onSubmit={submit} className="stack gap-16 auth-form">
      <div>
        <h1>{mode === "login" ? "ورود پزشکان" : "ثبت‌نام پزشکان"}</h1>
        <p className="sub">
          {mode === "login"
            ? "برای ثبت تشخیص، شرکت در گفت‌وگوی علمی و پیگیری پیشرفت خود وارد شوید."
            : "حساب کاربری ایجاد کنید. پس از تکمیل مشخصات پزشکی، حساب شما توسط مدیر سامانه تأیید می‌شود."}
        </p>
      </div>

      {allowRegister && (
        <div className="seg" role="tablist" aria-label="نوع ورود">
          <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => switchTo("login")}>ورود</button>
          <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => switchTo("register")}>ثبت‌نام</button>
        </div>
      )}

      <div className="field">
        <label htmlFor="username">نام کاربری</label>
        <input
          id="username" className="input input-ltr" autoComplete="username" autoCapitalize="none" spellCheck={false}
          value={username} onChange={(e) => setUsername(e.target.value)} autoFocus aria-invalid={error?.field === "username"}
         
        />
        {mode === "register" && <span className="hint">حروف لاتین کوچک، عدد، نقطه یا زیرخط؛ با حرف شروع شود.</span>}
      </div>

      <div className="field">
        <label htmlFor="password">رمز عبور</label>
        <div className="input-group">
          <input
            id="password" className="input input-ltr" type={show ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={error?.field === "password"}
          />
          <button type="button" className="input-addon" onClick={() => setShow((s) => !s)} aria-label={show ? "پنهان‌کردن رمز" : "نمایش رمز"}>
            <Icon name="eye" />
          </button>
        </div>
        {mode === "register" && <span className="hint">دست‌کم ۸ نویسه.</span>}
      </div>

      {mode === "register" && (
        <div className="field">
          <label htmlFor="repeat">تکرار رمز عبور</label>
          <input
            id="repeat" className="input input-ltr" type={show ? "text" : "password"} autoComplete="new-password"
            value={repeat} onChange={(e) => setRepeat(e.target.value)} aria-invalid={error?.field === "repeat"}
          />
        </div>
      )}

      {error && <div className="alert alert-danger"><Icon name="alert" />{error.text}</div>}

      <button className="btn btn-primary btn-lg btn-block" disabled={pending || !username || !password}>
        {pending ? "لطفاً صبر کنید…" : mode === "login" ? "ورود" : "ایجاد حساب"}
      </button>

      {mode === "login" && (
        <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.9 }}>
          در صورت فراموشی رمز عبور، با مدیر سامانه تماس بگیرید تا رمز جدیدی برای شما تعیین شود.
        </p>
      )}
    </form>
  );
}
