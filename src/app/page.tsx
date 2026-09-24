import Link from "next/link";
import { getUser, canBrowse } from "@/lib/auth";
import { contributors, featuredCase, latestCases, siteStats, subspecialtyCounts } from "@/lib/cases";
import { SUBSPECIALTIES, DIFFICULTY, subspecialtyFa } from "@/lib/taxonomy";
import { faDigits, initials } from "@/lib/text";
import { num } from "@/lib/format";
import { CaseCard } from "@/components/CaseCard";
import { Icon } from "@/components/Icon";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getUser();
  const browse = canBrowse(user);
  const [feat, stats, counts, people] = await Promise.all([
    browse ? featuredCase(user) : null,
    siteStats(),
    subspecialtyCounts(),
    contributors(6),
  ]);
  const latest = browse ? await latestCases(user, 6, feat?.id) : [];
  const activeSubs = SUBSPECIALTIES.filter((s) => counts[s.key]).sort((a, b) => (counts[b.key] ?? 0) - (counts[a.key] ?? 0));

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">{SITE.lab} · اطلس آموزشی</div>
            <h1 style={{ marginTop: 12 }}>
              موارد دشوار پاتولوژی،
              <br />
              <em>پیش از آنکه پاسخ را ببینید.</em>
            </h1>
            <p className="hero-lead">
              پاتولوژیست‌های تأییدشده موارد چالش‌برانگیز خود را با شرح حال، تصاویر میکروسکوپی با زوم کامل و نتایج
              ایمونوهیستوشیمی ثبت می‌کنند. شما تشخیص خود را می‌نویسید، سپس پاسخ نهایی، تشخیص‌های افتراقی و نظرات همکاران را مشاهده می‌کنید.
            </p>
            <div className="hero-actions">
              <Link href={user ? "/cases?mode=UNKNOWN&status=unsolved" : "/cases"} className="btn btn-primary btn-lg">
                {user ? "یک مورد حل‌نشده" : "مرور اطلس"} <Icon name="arrowLeft" />
              </Link>
              {!user && (
                <Link href="/login" className="btn btn-secondary btn-lg">عضویت پزشکان</Link>
              )}
            </div>
            {stats.cases > 0 && (
              <div className="hero-stats">
                <div><b>{num(stats.cases)}</b><span>مورد منتشرشده</span></div>
                <div><b>{num(stats.contributors)}</b><span>پاتولوژیست ارائه‌دهنده</span></div>
                <div><b>{num(stats.attempts)}</b><span>پاسخ ثبت‌شده</span></div>
              </div>
            )}
          </div>

          {feat ? (
            <Link href={`/cases/${feat.number}`} className="feature">
              <div className="feature-img">
                {feat.preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={feat.preview} alt="" fetchPriority="high" />
                )}
                <span className="feature-label"><span className="dot" /> مورد هفته</span>
              </div>
              <div className="feature-body">
                <div className="case-meta">
                  <span>{subspecialtyFa(feat.subspecialty)}</span>
                  <span className="sep" />
                  <span>{DIFFICULTY[feat.difficulty]}</span>
                  {feat.stain && <><span className="sep" /><span className="en">{feat.stain}</span></>}
                </div>
                <h3>{feat.title}</h3>
                <div className="row" style={{ fontSize: 13.5, color: "var(--muted)" }}>
                  <span className="avatar avatar-sm">{initials(feat.author)}</span>
                  {feat.author}
                  <span className="spacer" />
                  <span className="link">{feat.solved ? "مرور پاسخ" : "تشخیص شما؟"}</span>
                </div>
              </div>
            </Link>
          ) : (
            <div className="feature" style={{ minHeight: 320, display: "grid", placeItems: "center", color: "var(--muted)" }}>
              <div style={{ textAlign: "center", padding: 24 }}>
                <Icon name="microscope" size={40} />
                <p style={{ marginTop: 10 }}>{browse ? "نخستین موارد به‌زودی منتشر می‌شوند." : "اطلس فقط برای اعضای تأییدشده قابل مشاهده است."}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="wrap">
        <section className="section" style={{ paddingTop: 48 }}>
          <div className="steps">
            <div className="step">
              <div className="step-n">۱</div>
              <h3>مورد را بررسی کنید</h3>
              <p>شرح حال، یافته‌های ماکروسکوپی و تصاویر را با بزرگ‌نمایی کامل، همانند مشاهده با میکروسکوپ، بررسی کنید.</p>
            </div>
            <div className="step">
              <div className="step-n">۲</div>
              <h3>تشخیص خود را ثبت کنید</h3>
              <p>پاسخ نهایی تا پیش از ثبت تشخیص شما پنهان است؛ حتی در کد صفحه. سپس پاسخ‌های همکاران را مشاهده کنید.</p>
            </div>
            <div className="step">
              <div className="step-n">۳</div>
              <h3>در بحث شرکت کنید</h3>
              <p>تشخیص‌های افتراقی، نکات آموزشی و نظر ارائه‌دهنده را بخوانید و پرسش یا تجربه‌ی خود را بنویسید.</p>
            </div>
          </div>
        </section>

        {latest.length > 0 && (
          <section className="section">
            <div className="section-head">
              <div>
                <h2>تازه‌ترین موارد</h2>
                <p>آخرین موارد منتشرشده از سوی ارائه‌دهندگان</p>
              </div>
              <div className="spacer" />
              <Link href="/cases" className="link">همه‌ی موارد</Link>
            </div>
            <div className="case-grid">
              {latest.map((c) => <CaseCard key={c.id} c={c} />)}
            </div>
          </section>
        )}

        {activeSubs.length > 0 && (
          <section className="section">
            <div className="section-head">
              <div>
                <h2>مرور بر اساس زیرتخصص</h2>
                <p>{faDigits(activeSubs.length)} زیرتخصص با مورد منتشرشده</p>
              </div>
              <div className="spacer" />
              <Link href="/subspecialties" className="link">همه‌ی زیرتخصص‌ها</Link>
            </div>
            <div className="sub-grid">
              {activeSubs.slice(0, 12).map((s) => (
                <Link key={s.key} href={`/cases?sub=${s.key}`} className="sub-item">
                  <span>{s.fa}<small className="en">{s.en}</small></span>
                  <span className="count">{num(counts[s.key] ?? 0)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {people.length > 0 && (
          <section className="section">
            <div className="section-head">
              <div>
                <h2>ارائه‌دهندگان</h2>
                <p>پاتولوژیست‌هایی که موارد خود را در اختیار همکاران گذاشته‌اند</p>
              </div>
              <div className="spacer" />
              <Link href="/contributors" className="link">همه</Link>
            </div>
            <div className="people">
              {people.map((p) => (
                <div key={p.id} className="person">
                  <span className="avatar avatar-lg">{initials(p.name)}</span>
                  <div>
                    <b>{p.name}</b>
                    <span>{[p.specialty, p.institution].filter(Boolean).join(" · ")}</span>
                    <div className="muted" style={{ fontSize: 12.5 }}>{faDigits(p.cases)} مورد</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
