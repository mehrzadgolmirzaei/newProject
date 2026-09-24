import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canParticipate, getUser, isAdmin } from "@/lib/auth";
import { attemptStats, getCaseView, getThread, latestCases } from "@/lib/cases";
import { CASE_MODE, CASE_STATUS, DIFFICULTY, IHC_OUTCOME, SEX, SPECIMEN, subspecialtyFa, DEFAULT_QUESTION, CONFIDENCE } from "@/lib/taxonomy";
import { ageLabel, caseCode, faDate, percent } from "@/lib/format";
import { faDigits, initials } from "@/lib/text";
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
  const c = await db.case.findUnique({
    where: { number: n },
    select: {
      title: true, status: true, subspecialty: true, clinicalHistory: true,
      media: { where: { status: "READY" }, orderBy: { order: "asc" }, take: 1, select: { previewKey: true } },
    },
  });
  if (!c || c.status !== "PUBLISHED") return { title: "مورد", robots: { index: false } };
  const { mediaUrl } = await import("@/lib/storage");
  const img = mediaUrl(c.media[0]?.previewKey);
  const description = `${subspecialtyFa(c.subspecialty)} — ${c.clinicalHistory.slice(0, 150)}`;
  return {
    title: `${c.title} (${caseCode(n)})`,
    description,
    alternates: { canonical: `/cases/${n}` },
    openGraph: { title: c.title, description, type: "article", images: img ? [{ url: img }] : [] },
  };
}

export default async function CasePage({ params }: Params) {
  const raw = (await params).number;
  const n = parseNum(raw);
  if (!n) notFound();
  if (String(n) !== raw) redirect(`/cases/${n}`);

  const user = await getUser();
  const c = await getCaseView(n, user);
  if (!c) notFound();
  if (c.gated) redirect(`/login?next=/cases/${n}`);

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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: c.title,
    learningResourceType: "Case study",
    educationalLevel: DIFFICULTY[c.difficulty],
    about: subspecialtyFa(c.subspecialty),
    inLanguage: "fa",
    author: { "@type": "Person", name: c.author.name },
    publisher: { "@type": "Organization", name: SITE.lab },
    datePublished: c.publishedAt?.toISOString(),
    dateModified: c.updatedAt.toISOString(),
  };

  return (
    <div className="wrap">
      {c.status === "PUBLISHED" && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      )}

      {c.status !== "PUBLISHED" && (
        <div className="alert alert-warn" style={{ marginTop: 20 }}>
          <Icon name="eye" />
          <div style={{ flex: 1 }}>
            <b>پیش‌نمایش — {CASE_STATUS[c.status]}.</b> این صفحه فقط برای شما {v.isOwner ? "" : "و نویسنده "}قابل مشاهده است.
            {c.reviewNote && <div style={{ marginTop: 4 }}>یادداشت بازبین: {c.reviewNote}</div>}
          </div>
          {v.isOwner && <Link href={`/studio/cases/${c.id}`} className="btn btn-secondary btn-sm">ویرایش</Link>}
        </div>
      )}

      <header className="case-head">
        <nav className="crumbs" aria-label="مسیر">
          <Link href="/cases">اطلس</Link>
          <Icon name="chevronLeft" />
          <Link href={`/cases?sub=${c.subspecialty}`}>{subspecialtyFa(c.subspecialty)}</Link>
          <Icon name="chevronLeft" />
          <span className="case-code">{caseCode(c.number)}</span>
        </nav>
        <div className="badges">
          <span className={`badge ${c.mode === "UNKNOWN" ? "badge-unknown" : "badge-teaching"}`}>
            <Icon name={c.mode === "UNKNOWN" ? "lock" : "book"} /> {CASE_MODE[c.mode].fa}
          </span>
          <span className="badge">{DIFFICULTY[c.difficulty]}</span>
          {c.featuredAt && <span className="badge badge-accent"><Icon name="star" /> مورد هفته</span>}
          {c.isDemo && <span className="badge badge-warn">داده‌ی نمایشی</span>}
          {attempt && <span className={`badge ${attempt.gaveUp ? "" : correct ? "badge-ok" : "badge-warn"}`}>{attempt.gaveUp ? "مرور شده" : correct ? "پاسخ صحیح" : "حل شده"}</span>}
        </div>
        <h1>{c.title}</h1>
        <div className="case-byline">
          <span className="avatar">{initials(c.author.name)}</span>
          <span>
            <b>{c.author.name}</b>
            {c.author.specialty && <> · {c.author.specialty}</>}
            {c.author.institution && <> · {c.author.institution}</>}
          </span>
          {c.publishedAt && <span className="muted">· {faDate(c.publishedAt)}</span>}
          <span className="spacer" />
          <div className="case-actions">
            {user && <SaveButton caseId={c.id} initial={v.saved} />}
            <ShareButton title={c.title} />
            {v.isOwner && c.status === "PUBLISHED" && <Link href={`/studio/cases/${c.id}`} className="btn btn-ghost btn-sm"><Icon name="pencil" /> ویرایش</Link>}
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
            <div className="fact"><dt>بیمار</dt><dd>{[SEX[c.patientSex] !== "—" ? SEX[c.patientSex] : null, c.patientAge != null ? ageLabel(c.patientAge) : null].filter(Boolean).join("، ") || "—"}</dd></div>
            <div className="fact"><dt>اندام / محل</dt><dd>{c.organ || "—"}</dd></div>
            <div className="fact"><dt>نوع نمونه</dt><dd>{c.specimenType ? SPECIMEN[c.specimenType] : "—"}</dd></div>
            <div className="fact"><dt>زیرتخصص</dt><dd>{subspecialtyFa(c.subspecialty)}</dd></div>
          </dl>

          <section className="doc-section">
            <h2><Icon name="user" /> شرح حال بالینی</h2>
            <Prose text={c.clinicalHistory} />
          </section>

          {c.imaging && (
            <section className="doc-section">
              <h2><Icon name="scan" /> تصویربرداری و آزمایش‌ها</h2>
              <Prose text={c.imaging} />
            </section>
          )}

          {c.gross && (
            <section className="doc-section">
              <h2><Icon name="flask" /> نمای ماکروسکوپی</h2>
              <Prose text={c.gross} />
            </section>
          )}

          <section className="doc-section">
            <h2><Icon name="microscope" /> یافته‌های میکروسکوپی</h2>
            <Prose text={c.microscopic} />
          </section>

          {(c.ihc.length > 0 || c.ihcHidden) && (
            <section className="doc-section">
              <h2><Icon name="grid" /> ایمونوهیستوشیمی و رنگ‌آمیزی‌های ویژه</h2>
              {c.ihcHidden ? (
                <div className="locked"><Icon name="lock" /> نتایج ایمونوهیستوشیمی پس از ثبت تشخیص نمایش داده می‌شود.</div>
              ) : (
                <table className="ihc-table">
                  <thead><tr><th>مارکر</th><th>نتیجه</th><th>الگو</th><th>توضیح</th></tr></thead>
                  <tbody>
                    {c.ihc.map((r) => {
                      const o = IHC_OUTCOME[r.outcome];
                      return (
                        <tr key={r.id}>
                          <td className="marker">{r.marker}</td>
                          <td><span className={`ihc-res ${o.tone}`}>{o.fa}</span></td>
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
              <h2><Icon name="dna" /> یافته‌های مولکولی</h2>
              <Prose text={c.molecular} />
            </section>
          )}

          {!v.revealed && c.mode === "UNKNOWN" && c.status === "PUBLISHED" && (
            <QuizBox caseId={c.id} question={c.question || DEFAULT_QUESTION} state={quizState} nextUrl={`/cases/${c.number}#quiz`} />
          )}

          {c.answer && (
            <section className="doc-section answer" id="answer">
              <h2><Icon name="checkCircle" /> تشخیص نهایی</h2>
              {attempt && (
                <div className={`verdict ${attempt.gaveUp ? "neutral" : correct ? "ok" : "no"}`}>
                  <Icon name={attempt.gaveUp ? "info" : correct ? "checkCircle" : "info"} />
                  <div>
                    <b>{attempt.gaveUp ? "شما پاسخی ثبت نکردید." : correct ? "پاسخ شما با تشخیص نهایی مطابقت دارد." : "پاسخ شما با تشخیص نهایی متفاوت است."}</b>
                    {!attempt.gaveUp && (
                      <span>پاسخ شما: <span className="yours">{attempt.answer}</span>{attempt.confidence && <> · اطمینان {CONFIDENCE[attempt.confidence]}</>}</span>
                    )}
                  </div>
                </div>
              )}
              <div className="answer-dx">{c.answer.finalDiagnosis}</div>

              {stats && stats.total > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div className="row" style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 8 }}>
                    <span>پاسخ همکاران</span>
                    <span className="spacer" />
                    <span>{faDigits(stats.answered)} پاسخ · {percent(stats.correct, stats.answered)} درست</span>
                  </div>
                  <div className="bars">
                    {stats.top.map((t) => (
                      <div key={t.answer} className={`bar${t.correct ? " correct" : ""}`}>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${Math.max(4, (t.count / Math.max(1, stats.answered)) * 100)}%` }} />
                          <div className="bar-label">{t.answer}</div>
                        </div>
                        <div className="bar-n">{percent(t.count, stats.answered)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {c.answer && c.answer.differentials.length > 0 && (
            <section className="doc-section">
              <h2><Icon name="layers" /> تشخیص‌های افتراقی</h2>
              <div className="ddx">
                {c.answer.differentials.map((d, i) => (
                  <div key={d.id} className="ddx-item">
                    <span className="n">{faDigits(i + 1)}</span>
                    <div><b>{d.name}</b>{d.note && <p dir="auto">{d.note}</p>}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {c.answer?.discussion && (
            <section className="doc-section">
              <h2><Icon name="book" /> بحث</h2>
              <Prose text={c.answer.discussion} />
            </section>
          )}

          {c.answer && c.answer.teachingPoints.length > 0 && (
            <section className="doc-section">
              <h2><Icon name="sparkle" /> نکات کلیدی</h2>
              <ul className="points">
                {c.answer.teachingPoints.map((p, i) => <li key={i}><Icon name="check" /><span dir="auto">{p}</span></li>)}
              </ul>
            </section>
          )}

          {c.answer && c.answer.references.length > 0 && (
            <section className="doc-section">
              <h2><Icon name="book" /> منابع</h2>
              <ol className="refs">{c.answer.references.map((r, i) => <li key={i}>{r}</li>)}</ol>
            </section>
          )}

          {c.status === "PUBLISHED" && (
            <Discussion
              nodes={thread as unknown as CommentNode[]}
              ctx={{ caseId: c.id, meId: user?.id ?? null, canPost: participate && v.revealed, canModerate: v.moderator, caseAuthorId: c.author.id }}
              blocked={!v.revealed ? "نظرات همکاران پس از ثبت تشخیص شما نمایش داده می‌شود تا پاسخ پیش از موعد آشکار نشود." : undefined}
            />
          )}

          {v.moderator && c.mode === "UNKNOWN" && c.status === "PUBLISHED" && (
            <section className="doc-section">
              <h2><Icon name="users" /> پاسخ‌های ثبت‌شده <span className="badge">فقط برای ارائه‌دهنده و مدیر</span></h2>
              <p className="muted" style={{ fontSize: 13.5, marginBottom: 12 }}>
                ارزیابی خودکار بر اساس تشخیص نهایی و معادل‌های آن انجام می‌شود. در صورت نادرست بودن ارزیابی خودکار، آن را به‌صورت دستی اصلاح کنید.
              </p>
              <AttemptsReview rows={attemptsForAuthor} />
            </section>
          )}
        </div>
      </div>

      {more.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div><h2>موارد دیگر</h2></div>
            <div className="spacer" />
            <Link href="/cases" className="link">اطلس موارد</Link>
          </div>
          <div className="case-grid">{more.map((m) => <CaseCard key={m.id} c={m} />)}</div>
        </section>
      )}
    </div>
  );
}
