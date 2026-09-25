"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestOtp, verifyOtp } from "@/actions/auth";
import { Icon } from "@/components/Icon";
import { toLatinDigits } from "@/lib/text";
import { useI18n } from "@/components/LocaleProvider";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { t, f, lp } = useI18n();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [masked, setMasked] = useState("");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [left, setLeft] = useState(0);
  const [pending, start] = useTransition();
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  function send() {
    setError("");
    start(async () => {
      const r = await requestOtp({ phone });
      if (!r.ok) return setError(r.error);
      setMasked(r.data.masked);
      setDevCode(r.data.devCode);
      setStep("code");
      setLeft(60);
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputs.current[0]?.focus(), 50);
    });
  }

  function verify(code: string) {
    setError("");
    start(async () => {
      const r = await verifyOtp({ phone, code, next });
      if (!r.ok) {
        setError(r.error);
        setDigits(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();
        return;
      }
      router.replace(lp(r.data.to));
      router.refresh();
    });
  }

  function setDigit(i: number, raw: string) {
    const v = toLatinDigits(raw).replace(/\D/g, "");
    if (v.length > 1) {
      // چسباندن کل کد یا پر شدن خودکار از پیامک
      const all = v.slice(0, 6).split("");
      const d = ["", "", "", "", "", ""].map((_, k) => all[k] ?? "");
      setDigits(d);
      if (all.length === 6) verify(all.join(""));
      else inputs.current[Math.min(all.length, 5)]?.focus();
      return;
    }
    const d = [...digits];
    d[i] = v;
    setDigits(d);
    if (v && i < 5) inputs.current[i + 1]?.focus();
    if (d.every(Boolean)) verify(d.join(""));
  }

  if (step === "phone") {
    return (
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="stack gap-16">
        <div>
          <h1>{t("ورود پزشکان")}</h1>
          <p className="sub">{t("با شماره‌ی تلفن همراه وارد شوید یا حساب کاربری ایجاد کنید. کد تأیید از طریق پیامک ارسال می‌شود.")}</p>
        </div>
        <div className="field">
          <label htmlFor="phone">{t("شماره‌ی موبایل")}</label>
          <input
            id="phone"
            className="input input-ltr"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="0912 345 6789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoFocus
            aria-invalid={!!error}
          />
        </div>
        {error && <div className="alert alert-danger"><Icon name="alert" />{error}</div>}
        <button className="btn btn-primary btn-lg btn-block" disabled={pending || phone.replace(/\D/g, "").length < 10}>
          {pending ? t("در حال ارسال…") : t("دریافت کد تأیید")}
        </button>
        <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.9 }}>
          {t("پس از ورود نخست، مشخصات پزشکی و شماره‌ی نظام خود را وارد می‌کنید. مدیر سامانه پس از بررسی، حساب را برای ثبت پاسخ و شرکت در بحث فعال می‌کند.")}
        </p>
      </form>
    );
  }

  return (
    <div className="stack gap-16">
      <div>
        <h1>{t("کد تأیید")}</h1>
        <p className="sub">{t("کد ۶ رقمی ارسال‌شده به {phone} را وارد کنید.", { phone: masked })}</p>
      </div>
      {devCode && <div className="dev-code">{t("حالت توسعه — کد:")} <b>{f.digits(devCode)}</b></div>}
      <div className="otp" onPaste={(e) => { e.preventDefault(); setDigit(0, e.clipboardData.getData("text")); }}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            value={d}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={i === 0 ? 6 : 1}
            aria-label={t("رقم {n}", { n: i + 1 })}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => { if (e.key === "Backspace" && !d && i > 0) inputs.current[i - 1]?.focus(); }}
            disabled={pending}
          />
        ))}
      </div>
      {error && <div className="alert alert-danger"><Icon name="alert" />{error}</div>}
      {pending && <p className="muted" style={{ textAlign: "center", fontSize: 14 }}>{t("در حال بررسی…")}</p>}
      <div className="row" style={{ justifyContent: "space-between", fontSize: 14 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => { setStep("phone"); setError(""); }}>{t("تغییر شماره")}</button>
        {left > 0 ? (
          <span className="muted">{t("ارسال دوباره تا {n} ثانیه", { n: f.digits(left) })}</span>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={send} disabled={pending}>{t("ارسال دوباره‌ی کد")}</button>
        )}
      </div>
    </div>
  );
}
