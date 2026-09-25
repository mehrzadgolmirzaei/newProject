"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/Link";
import { submitAttempt } from "@/actions/learn";
import { Icon } from "../Icon";
import { useI18n } from "../LocaleProvider";

type Props = {
  caseId: string;
  question: string;
  state: "can" | "guest" | "pending" | "incomplete";
  nextUrl: string;
};

export function QuizBox({ caseId, question, state, nextUrl }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const [answer, setAnswer] = useState("");
  const [confidence, setConfidence] = useState<"LOW" | "MEDIUM" | "HIGH" | null>(null);
  const [error, setError] = useState("");
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const [pending, start] = useTransition();

  function send(gaveUp: boolean) {
    setError("");
    start(async () => {
      const r = await submitAttempt({ caseId, answer, confidence, gaveUp });
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <section className="doc-section quiz" id="quiz">
      <h2><Icon name="flask" /> {t("پرسش")}</h2>
      <p className="quiz-q">{question}</p>

      {state === "can" ? (
        <>
          <input
            className="input quiz-input"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && answer.trim().length >= 3 && !pending) send(false); }}
            placeholder={t("تشخیص خود را بنویسید (ترجیحاً به انگلیسی)…")}
            aria-label={t("تشخیص شما")}
            maxLength={300}
            dir="auto"
            autoComplete="off"
          />
          <div className="conf">
            <span>{t("اطمینان شما:")}</span>
            <div className="seg">
              {(["LOW", "MEDIUM", "HIGH"] as const).map((c) => (
                <button key={c} type="button" aria-pressed={confidence === c} onClick={() => setConfidence(confidence === c ? null : c)}>
                  {{ LOW: t("کم|اطمینان"), MEDIUM: t("متوسط|اطمینان"), HIGH: t("زیاد|اطمینان") }[c]}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="alert alert-danger" style={{ marginTop: 12 }}><Icon name="alert" />{error}</div>}
          <div className="quiz-actions">
            <button className="btn btn-primary" disabled={pending || answer.trim().length < 3} onClick={() => send(false)}>
              {pending ? t("در حال ثبت…") : t("ثبت تشخیص و مشاهده‌ی پاسخ")}
            </button>
            <span className="spacer" />
            {confirmGiveUp ? (
              <span className="row" style={{ fontSize: 13.5 }}>
                {t("بدون پاسخ ادامه می‌دهید؟")}
                <button className="btn btn-ghost btn-sm" onClick={() => send(true)} disabled={pending}>{t("بله، پاسخ نمایش داده شود")}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmGiveUp(false)}>{t("انصراف")}</button>
              </span>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmGiveUp(true)}>{t("مشاهده‌ی پاسخ بدون ثبت تشخیص")}</button>
            )}
          </div>
          <p className="quiz-note"><Icon name="lock" /> {t("پاسخ ثبت‌شده قابل تغییر نیست. نام شما کنار پاسخ نمایش داده نمی‌شود؛ فقط در آمار کلی می‌آید.")}</p>
        </>
      ) : state === "guest" ? (
        <div className="locked">
          <Icon name="lock" />
          <span style={{ flex: 1 }}>{t("برای ثبت تشخیص و مشاهده‌ی پاسخ، وارد حساب کاربری خود شوید. عضویت برای پزشکان رایگان است.")}</span>
          <Link href={`/login?next=${encodeURIComponent(nextUrl)}`} className="btn btn-primary btn-sm">{t("ورود")}</Link>
        </div>
      ) : state === "incomplete" ? (
        <div className="locked">
          <Icon name="user" />
          <span style={{ flex: 1 }}>{t("برای شرکت، ابتدا پروفایل پزشکی خود را تکمیل کنید.")}</span>
          <Link href="/onboarding" className="btn btn-primary btn-sm">{t("تکمیل پروفایل")}</Link>
        </div>
      ) : (
        <div className="locked">
          <Icon name="clock" />
          <span>{t("حساب شما در انتظار تأیید شماره‌ی نظام پزشکی است. پس از تأیید مدیر می‌توانید پاسخ ثبت کنید و در بحث شرکت کنید.")}</span>
        </div>
      )}
    </section>
  );
}
