import Link from "@/components/Link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { caseCode } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { privateMeta } from "@/lib/seo";
import { subspecialtyLabel, SUBSPECIALTIES } from "@/lib/taxonomy";
import { Icon } from "@/components/Icon";
import { Empty } from "@/components/Empty";

export const generateMetadata = () => privateMeta("پیشرفت من");
export const dynamic = "force-dynamic";

export default async function Account() {
  const u = await requireUser("/account");
  const { t, f, locale } = await getI18n();
  const { num, percent } = f;
  const attempts = await db.attempt.findMany({
    where: { userId: u.id },
    orderBy: { createdAt: "desc" },
    include: { case: { select: { number: true, title: true, subspecialty: true, finalDiagnosis: true, status: true } } },
  });
  const answered = attempts.filter((a) => !a.gaveUp);
  const correct = answered.filter((a) => a.gradedCorrect ?? a.autoCorrect);

  // عملکرد به تفکیک زیرتخصص
  const bySub = new Map<string, { n: number; ok: number }>();
  for (const a of answered) {
    const s = bySub.get(a.case.subspecialty) ?? { n: 0, ok: 0 };
    s.n++;
    if (a.gradedCorrect ?? a.autoCorrect) s.ok++;
    bySub.set(a.case.subspecialty, s);
  }
  const subs = SUBSPECIALTIES.filter((s) => bySub.has(s.key)).map((s) => ({ ...s, ...bySub.get(s.key)! }));

  return (
    <>
      <div className="dash-head">
        <div>
          <h1>{t("سلام، {name}", { name: u.name ?? "" })}</h1>
          <p>{t("خلاصه‌ی موارد حل‌شده و عملکرد شما")}</p>
        </div>
      </div>

      {u.status === "PENDING" && (
        <div className="alert alert-warn" style={{ marginBottom: 20 }}>
          <Icon name="clock" />
          <div>
            <b>{t("حساب شما در انتظار تأیید است.")}</b> {t("مدیر سامانه شماره‌ی نظام پزشکی شما را بررسی می‌کند. تا آن زمان می‌توانید موارد را مرور کنید؛")}
            {t("ثبت پاسخ و شرکت در بحث پس از تأیید فعال می‌شود.")}
          </div>
        </div>
      )}

      <div className="kpis">
        <div className="kpi"><span>{t("موارد حل‌شده")}</span><b>{num(answered.length)}</b></div>
        <div className="kpi hl"><span>{t("پاسخ صحیح")}</span><b>{percent(correct.length, answered.length)}</b><small>{t("{a} از {b}", { a: num(correct.length), b: num(answered.length) })}</small></div>
        <div className="kpi"><span>{t("مرور بدون پاسخ")}</span><b>{num(attempts.length - answered.length)}</b></div>
        <div className="kpi"><span>{t("زیرتخصص‌ها")}</span><b>{num(subs.length)}</b></div>
      </div>

      {subs.length > 0 && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-head"><h2>{t("عملکرد به تفکیک زیرتخصص")}</h2></div>
          <div className="panel-body bars">
            {subs.map((s) => (
              <div key={s.key} className="bar correct">
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.max(4, (s.ok / s.n) * 100)}%` }} />
                  <div className="bar-label" style={{ textAlign: "start" }}>{locale === "en" ? s.en : s.fa} · {t("{a} از {b}", { a: num(s.ok), b: num(s.n) })}</div>
                </div>
                <div className="bar-n">{percent(s.ok, s.n)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {attempts.length === 0 ? (
        <Empty icon="microscope" title={t("هنوز موردی حل نکرده‌اید")} text={t("یک مورد چالشی انتخاب کنید، تشخیص خود را بنویسید و با پاسخ ارائه‌دهنده مقایسه کنید.")}>
          <Link href="/cases?mode=UNKNOWN" className="btn btn-primary">{t("شروع با یک مورد")}</Link>
        </Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t("مورد")}</th><th>{t("پاسخ شما")}</th><th>{t("تشخیص نهایی")}</th><th>{t("نتیجه")}</th><th>{t("تاریخ")}</th></tr></thead>
            <tbody>
              {attempts.map((a) => {
                const ok = a.gradedCorrect ?? a.autoCorrect;
                return (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/cases/${a.case.number}`} className="cell-title">{a.case.title}</Link>
                      <div className="cell-sub">{caseCode(a.case.number)} · {subspecialtyLabel(a.case.subspecialty, locale)}</div>
                    </td>
                    <td className="en" style={{ textAlign: "left" }} dir="ltr">{a.gaveUp ? <span className="muted">—</span> : a.answer}</td>
                    <td className="en" style={{ textAlign: "left" }}>{a.case.finalDiagnosis}</td>
                    <td>{a.gaveUp ? <span className="badge">{t("مرور")}</span> : <span className={`badge ${ok ? "badge-ok" : "badge-warn"}`}>{ok ? t("درست") : t("نادرست")}</span>}</td>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>{f.date(a.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
