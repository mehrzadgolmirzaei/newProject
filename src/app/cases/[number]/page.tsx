import type { Metadata } from "next";
import Link from "@/components/Link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { canParticipate, getUser, isAdmin } from "@/lib/auth";
import { attemptStats, getCaseView, getThread, latestCases } from "@/lib/cases";
import { CASE_MODE, CASE_STATUS, DIFFICULTY, IHC_OUTCOME, SEX, SPECIMEN, subspecialtyLabel, DEFAULT_QUESTION, CONFIDENCE } from "@/lib/taxonomy";
import { caseCode } from "@/lib/format";
import { initials } from "@/lib/text";
import { getI18n, lredirect } from "@/lib/i18n/server";
import { localePath } from "@/lib/i18n/config";
import { absUrl, pageMeta, snippet } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { SITE } from "@/lib/site";
import { Icon } from "@/components/Icon";
import { Prose } from "@/components/Prose";
import { CaseCard } from "@/components/CaseCard";
import { SlideViewer } from "@/components/viewer/SlideViewer";
import { QuizBox } from "@/components/case/QuizBox";
import { Discussion, type CommentNode } from "@/components/case/Discussion";
import { SaveButton } from "@/components/case/SaveButton";
import { ShareButton } from "@/components/case/ShareButton";
import { AdminCaseTools } from "@/components/case/AdminCaseTools";
import { AttemptsReview } from "@/components/case/AttemptsReview";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ number: string }> };

const parseNum = (s: string) => (/^\d{1,9}$/.test(s) ? Number(s) : /^vp-?\d+$/i.test(s) ? Number(s.replace(/\D/g, "")) : null);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const n = parseNum((await params).number);
  if (!n) return {};
  const { locale, t } = await getI18n();
  const c = await db.case.findUnique({
    where: { number: n },
    select: {
      title: true, status: true, subspecialty: true, clinicalHistory: true, mode: true, finalDiagnosis: true,
      media: { where: { status: "READY" }, orderBy: { order: "asc" }, take: 1, select: { previewKey: true } },
    },
  });
  if (!c || c.status !== "PUBLISHED") return { title: t("مورد"), robots: { index: false } };
  const { mediaUrl } = await import("@/lib/storage");
  const sub = subspecialtyLabel(c.subspecialty, locale);
  // در مورد چالشی تشخیص هرگز در عنوان یا توضیح نمی‌آید
  const dx = c.mode === "TEACHING" && c.finalDiagnosis ? ` — ${c.finalDiagnosis}` : "";
  return pageMeta({
    locale,
    path: `/cases/${n}`,
    title: `${c.title}${dx} · ${t("پاتولوژی {sub}", { sub })} (${caseCode(n)})`,
    description: snippet(`${t(c.mode === "UNKNOWN" ? "مورد چالشی" : "مورد آموزشی")} ${t("پاتولوژی {sub}", { sub })}: ${c.clinicalHistory}`),
    image: mediaUrl(c.media[0]?.previewKey),
    type: "article",
  });
}

export default async function CasePage({ params }: Params) {
  const raw = (await params).number;
  const n = parseNum(raw);
  if (!n) notFound();
  if (String(n) !== raw) return lredirect(`/cases/${n}`);
  const { t, f, locale } = await getI18n();

  const user = await getUser();
  const c = await getCaseView(n, user);
  if (!c) notFound();
  if (c.gated) return lredirect(`/login?next=/cases/${n}`);

  const v = c.viewer;
  const participate = canParticipate(user);
  const quizState = !user ? "guest" : !user.profileComplete ? "incomplete" : participate ? "can" : "pending";

  if (c.status === "PUBLISHED" && !v.isOwner) {
    // شمارش بازدید (بدون انتظار برای نتیجه)
    db.case.update({ where: { id: c.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  }

  const [stats, thread, attemptsForAuthor, more] = await Promise.all([
    v.revealed && c.mode === "UNKNOWN" ? attemptStats(c.id) : null,
    v.revealed ? getThread(c.id, v.moderator) : [],
    v.moderator && c.mode === "UNKNOWN"
      ? db.attempt.findMany({
          where: { caseId: c.id },
          orderBy: { createdAt: "desc" },
          take: 100,
          include: { user: { select: { name: true, specialty: true } } },
        })
      : [],
    latestCases(user, 3, c.id),
  ]);

  const attempt = v.attempt;
  const correct = attempt ? (attempt.gradedCorrect ?? attempt.autoCorrect) : null;
  const sub = subspecialtyLabel(c.subspecialty, locale);
  const url = absUrl(localePath(locale, `/cases/${c.number}`));
  const cover = c.media[0]?.preview;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      "@id": url,
      url,
      name: c.title,
      headline: c.title,
      learningResourceType: "Case study",
      educationalLevel: t(DIFFICULTY[c.difficulty]),
      educationalUse: c.mode === "UNKNOWN" ? "Self assessment" : "Instruction",
      audience: { "@type": "MedicalAudience", audienceType: "Pathologists, pathology residents" },
      about: [
        { "@type": "MedicalSpecialty", name: `${sub} pathology` },
        ...(c.mode === "TEACHING" && c.answer?.finalDiagnosis ? [{ "@type": "MedicalCondition", name: c.answer.finalDiagnosis }] : []),
      ],
      keywords: [sub, ...(c.organ ? [c.organ] : []), "pathology case", "histopathology"].join(", "),
      inLanguage: "fa",
      isAccessibleForFree: true,
      ...(cover ? { image: absUrl(cover) } : {}),
      author: { "@type": "Person", name: c.author.name },
      publisher: { "@type": "Organization", name: t(SITE.lab), url: absUrl("/") },
      datePublished: c.publishedAt?.toISOString(),
      dateModified: c.updatedAt.toISOString(),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: t("کتابخانه"), item: absUrl(localePath(locale, "/cases")) },
        { "@type": "ListItem", position: 2, name: sub, item: absUrl(localePath(locale, `/cases?sub=${c.subspecialty}`)) },
        { "@type": "ListItem", position: 3, name: c.title, item: url },
      ],
    },
  ];

  return (
    <div className="wrap">
      {c.status === "PUBLISHED" && <JsonLd data={jsonLd} />}

      {c.status !== "PUBLISHED" && (
        <div className="alert alert-warn" style={{ marginTop: 20 }}>
          <Icon name="eye" />
          <div style={{ flex: 1 }}>
            <b>{t("پیش‌نمایش")} — {t(CASE_STATUS[c.status])}.</b> {v.isOwner ? t("این صفحه فقط برای شما قابل مشاهده است.") : t("این صفحه فقط برای شما و نویسنده قابل مشاهده است.")}
            {c.reviewNote && <div style={{ marginTop: 4 }}>{t("یادداشت بازبین")}: {c.reviewNote}</div>}
          </div>
          {v.isOwner && <Link href={`/studio/cases/${c.id}`} className="btn btn-secondary btn-sm">{t("ویرایش")}</Link>}
        </div>
      )}

      <header className="case-head">
        <nav className="crumbs" aria-label={t("مسیر")}>
          <Link href="/cases">{t("کتابخانه")}</Link>
          <Icon name="chevronLeft" />
          <Link href={`/cases?sub=${c.subspecialty}`}>{sub}</Link>
          <Icon name="chevronLeft" />
          <span className="case-code">{caseCode(c.number)}</span>
        </nav>
        <div className="badges">
          <span className={`badge ${c.mode === "UNKNOWN" ? "badge-unknown" : "badge-teaching"}`}>
            <Icon name={c.mode === "UNKNOWN" ? "lock" : "book"} /> {t(CASE_MODE[c.mode].fa)}
          </span>
          <span className="badge">{t(DIFFICULTY[c.difficulty])}</span>
          {c.featuredAt && <span className="badge badge-accent"><Icon name="star" /> {t("مورد هفته")}</span>}
          {c.isDemo && <span className="badge badge-warn">{t("داده‌ی نمایشی")}</span>}
          {attempt && <span className={`badge ${attempt.gaveUp ? "" : correct ? "badge-ok" : "badge-warn"}`}>{attempt.gaveUp ? t("مرور شده") : correct ? t("پاسخ صحیح") : t("حل شده")}</span>}
        </div>
        <h1 dir="auto">{c.title}</h1>
        <div className="case-byline">
          <span className="avatar">{initials(c.author.name)}</span>
          <span dir="auto">
            <b>{c.author.name}</b>
            {c.author.specialty && <> · {c.author.specialty}</>}
            {c.author.institution && <> · {c.author.institution}</>}
          </span>
          {c.publishedAt && <span className="muted">· {f.date(c.publishedAt)}</span>}
          <span className="spacer" />
          <div className="case-actions">
            {user && <SaveButton caseId={c.id} initial={v.saved} />}
            <ShareButton title={c.title} />
            {v.isOwner && c.status === "PUBLISHED" && <Link href={`/studio/cases/${c.id}`} className="btn btn-ghost btn-sm"><Icon name="pencil" /> {t("ویرایش")}</Link>}
          </div>
        </div>
        {isAdmin(user) && (
          <div style={{ marginTop: 14 }}>
            <AdminCaseTools caseId={c.id} status={c.status} featured={!!c.featuredAt} />
          </div>
        )}
      </header>

      <div className="case-layout">
        <div className="case-media">
          <SlideViewer media={c.media} />
        </div>

        <div className="case-doc">
          <dl className="facts">
            <div className="fact"><dt>{t("بیمار")}</dt><dd>{[SEX[c.patientSex] !== "—" ? t(SEX[c.patientSex]) : null, c.patientAge != null ? f.age(c.patientAge) : null].filter(Boolean).join(locale === "en" ? ", " : "، ") || "—"}</dd></div>
            <div className="fact"><dt>{t("اندام / محل")}</dt><dd dir="auto">{c.organ || "—"}</dd></div>
            <div className="fact"><dt>{t("نوع نمونه")}</dt><dd>{c.specimenType ? t(SPECIMEN[c.specimenType]) : "—"}</dd></div>
            <div className="fact"><dt>{t("زیرتخصص")}</dt><dd>{sub}</dd></div>
          </dl>

          <section className="doc-section">
            <h2><Icon name="user" /> {t("شرح حال بالینی")}</h2>
            <Prose text={c.clinicalHistory} />
          </section>

          {c.imaging && (
            <section className="doc-section">
              <h2><Icon name="scan" /> {t("تصویربرداری و آزمایش‌ها")}</h2>
              <Prose text={c.imaging} />
            </section>
          )}

          {c.gross && (
            <section className="doc-section">
              <h2><Icon name="flask" /> {t("نمای ماکروسکوپی")}</h2>
              <Prose text={c.gross} />
            </section>
          )}

          <section className="doc-section">
            <h2><Icon name="microscope" /> {t("یافته‌های میکروسکوپی")}</h2>
            <Prose text={c.microscopic} />
          </section>

          {(c.ihc.length > 0 || c.ihcHidden) && (
            <section className="doc-section">
              <h2><Icon name="grid" /> {t("ایمونوهیستوشیمی و رنگ‌آمیزی‌های ویژه")}</h2>
              {c.ihcHidden ? (
                <div className="locked"><Icon name="lock" /> {t("نتایج ایمونوهیستوشیمی پس از ثبت تشخیص نمایش داده می‌شود.")}</div>
              ) : (
                <table className="ihc-table">
                  <thead><tr><th>{t("مارکر")}</th><th>{t("نتیجه")}</th><th>{t("الگو")}</th><th>{t("توضیح")}</th></tr></thead>
                  <tbody>
                    {c.ihc.map((r) => {
                      const o = IHC_OUTCOME[r.outcome];
                      return (
                        <tr key={r.id}>
                          <td className="marker">{r.marker}</td>
                          <td><span className={`ihc-res ${o.tone}`}>{t(o.fa)}</span></td>
                          <td dir="auto">{r.pattern || "—"}</td>
                          <td dir="auto" className="muted">{r.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          )}

          {c.molecular && (
            <section className="doc-section">
              <h2><Icon name="dna" /> {t("یافته‌های مولکولی")}</h2>
              <Prose text={c.molecular} />
            </section>
          )}

          {!v.revealed && c.mode === "UNKNOWN" && c.status === "PUBLISHED" && (
            <QuizBox caseId={c.id} question={c.question || t(DEFAULT_QUESTION)} state={quizState} nextUrl={`/cases/${c.number}#quiz`} />
          )}

          {c.answer && (
            <section className="doc-section answer" id="answer">
              <h2><Icon name="checkCircle" /> {t("تشخیص نهایی")}</h2>
              {attempt && (
                <div className={`verdict ${attempt.gaveUp ? "neutral" : correct ? "ok" : "no"}`}>
                  <Icon name={attempt.gaveUp ? "info" : correct ? "checkCircle" : "info"} />
                  <div>
                    <b>{attempt.gaveUp ? t("شما پاسخی ثبت نکردید.") : correct ? t("پاسخ شما با تشخیص نهایی مطابقت دارد.") : t("پاسخ شما با تشخیص نهایی متفاوت است.")}</b>
                    {!attempt.gaveUp && (
                      <span>{t("پاسخ شما")}: <span className="yours" dir="auto">{attempt.answer}</span>{attempt.confidence && <> · {t("اطمینان")} {t(CONFIDENCE[attempt.confidence] + "|اطمینان")}</>}</span>
                    )}
                  </div>
                </div>
              )}
              <div className="answer-dx">{c.answer.finalDiagnosis}</div>

              {stats && stats.total > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div className="row" style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 8 }}>
                    <span>{t("پاسخ همکاران")}</span>
                    <span className="spacer" />
                    <span>{t("{n} پاسخ · {p} درست", { n: f.digits(stats.answered), p: f.percent(stats.correct, stats.answered) })}</span>
                  </div>
                  <div className="bars">
                    {stats.top.map((b) => (
                      <div key={b.answer} className={`bar${b.correct ? " correct" : ""}`}>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${Math.max(4, (b.count / Math.max(1, stats.answered)) * 100)}%` }} />
                          <div className="bar-label" dir="auto">{b.answer}</div>
                        </div>
                        <div className="bar-n">{f.percent(b.count, stats.answered)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {c.answer && c.answer.differentials.length > 0 && (
            <section className="doc-section">
              <h2><Icon name="layers" /> {t("تشخیص‌های افتراقی")}</h2>
              <div className="ddx">
                {c.answer.differentials.map((d, i) => (
                  <div key={d.id} className="ddx-item">
                    <span className="n">{f.digits(i + 1)}</span>
                    <div><b>{d.name}</b>{d.note && <p dir="auto">{d.note}</p>}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {c.answer?.discussion && (
            <section className="doc-section">
              <h2><Icon name="book" /> {t("بحث")}</h2>
              <Prose text={c.answer.discussion} />
            </section>
          )}

          {c.answer && c.answer.teachingPoints.length > 0 && (
            <section className="doc-section">
              <h2><Icon name="sparkle" /> {t("نکات کلیدی")}</h2>
              <ul className="points">
                {c.answer.teachingPoints.map((p, i) => <li key={i}><Icon name="check" /><span dir="auto">{p}</span></li>)}
              </ul>
            </section>
          )}

          {c.answer && c.answer.references.length > 0 && (
            <section className="doc-section">
              <h2><Icon name="book" /> {t("منابع")}</h2>
              <ol className="refs">{c.answer.references.map((r, i) => <li key={i}>{r}</li>)}</ol>
            </section>
          )}

          {c.status === "PUBLISHED" && (c.commentsEnabled || thread.length > 0 || v.moderator) && (
            <Discussion
              nodes={thread as unknown as CommentNode[]}
              ctx={{ caseId: c.id, meId: user?.id ?? null, canPost: participate && v.revealed && (c.commentsEnabled || v.moderator), canModerate: v.moderator, caseAuthorId: c.author.id }}
              blocked={!v.revealed ? t("نظرات همکاران پس از ثبت تشخیص شما نمایش داده می‌شود تا پاسخ پیش از موعد آشکار نشود.") : undefined}
              closed={!c.commentsEnabled}
            />
          )}

          {v.moderator && c.mode === "UNKNOWN" && c.status === "PUBLISHED" && (
            <section className="doc-section">
              <h2><Icon name="users" /> {t("پاسخ‌های ثبت‌شده")} <span className="badge">{t("فقط برای ارائه‌دهنده و مدیر")}</span></h2>
              <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
                {t("ارزیابی خودکار بر اساس تشخیص نهایی و معادل‌های آن انجام می‌شود. در صورت نادرست بودن ارزیابی خودکار، آن را به‌صورت دستی اصلاح کنید.")}
              </p>
              <AttemptsReview rows={attemptsForAuthor} />
            </section>
          )}
        </div>
      </div>

      {more.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div><h2>{t("موارد دیگر")}</h2></div>
            <div className="spacer" />
            <Link href="/cases" className="link">{t("کتابخانه‌ی موارد")}</Link>
          </div>
          <div className="case-grid">{more.map((m, i) => <div key={m.id} data-reveal style={{ "--i": i % 3 } as React.CSSProperties}><CaseCard c={m} /></div>)}</div>
        </section>
      )}
    </div>
  );
}
