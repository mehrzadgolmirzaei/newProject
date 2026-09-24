import Link from "next/link";
import { getUser, canBrowse } from "@/lib/auth";
import { contributors, featuredCase, latestCases, siteStats, subspecialtyCounts } from "@/lib/cases";
import { SUBSPECIALTIES, DIFFICULTY, subspecialtyFa } from "@/lib/taxonomy";
import { faDigits, initials } from "@/lib/text";
import { num } from "@/lib/format";
import { CaseCard } from "@/components/CaseCard";
import { Icon, type IconName } from "@/components/Icon";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "microscope", title: "بررسی مورد", text: "شرح حال، یافته‌های ماکروسکوپی و تصاویر را با بزرگ‌نمایی کامل، همانند مشاهده با میکروسکوپ، بررسی کنید." },
  { icon: "lock", title: "ثبت تشخیص", text: "پاسخ نهایی تا پیش از ثبت تشخیص شما پنهان است؛ حتی در کد صفحه. سپس پاسخ‌های همکاران را مشاهده کنید." },
  { icon: "message", title: "گفت‌وگوی علمی", text: "تشخیص‌های افتراقی، نکات آموزشی و نظر ارائه‌دهنده را بخوانید و پرسش یا تجربه‌ی خود را بنویسید." },
];

const PILLARS: { icon: IconName; title: string; text: string }[] = [
  { icon: "zoomIn", title: "بزرگ‌نمایی عمیق", text: "تصاویر و اسلایدهای دیجیتال کامل با قابلیت زوم تا جزئیات سلولی." },
  { icon: "eyeOff", title: "پاسخ پنهان", text: "تشخیص تا ثبت پاسخ شما به مرورگر ارسال نمی‌شود." },
  { icon: "shield", title: "بازبینی تخصصی", text: "هر مورد پیش از انتشار توسط مدیر علمی بازبینی می‌شود." },
  { icon: "user", title: "حریم خصوصی بیمار", text: "حذف متادیتا و اطلاعات هویتی در تمام مراحل بارگذاری." },
];

export default async function Home() {
  const user = await getUser();
  const browse = canBrowse(user);
  const [feat, stats, counts, people] = await Promise.all([
    browse ? featuredCase(user) : null,
    siteStats(),
    subspecialtyCounts(),
    contributors(6),
  ]);
  const recent = browse ? await latestCases(user, 6, feat?.id) : [];
  // شبکه‌ی سه‌ستونی بدون ردیف ناقص
  const latest = recent.length >= 6 ? recent.slice(0, 6) : recent.slice(0, recent.length >= 3 ? 3 : recent.length);
  const activeSubs = SUBSPECIALTIES.filter((s) => counts[s.key]).sort((a, b) => (counts[b.key] ?? 0) - (counts[a.key] ?? 0));

  return (
    <>
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <span className="hero-photo" />
          <span className="hero-shade" />
          <span className="blob blob-1" />
          <span className="blob blob-2" />
          <span className="blob blob-3" />
          <span className="hero-mesh" />
        </div>

        <div className="wrap hero-grid">
          <div className="hero-copy">
            <div className="hero-eyebrow rise" style={{ "--d": "0ms" } as React.CSSProperties}>
              <span className="pulse" /> {SITE.lab}
            </div>
            <h1>
              <span className="rise" style={{ "--d": "80ms" } as React.CSSProperties}>موارد دشوار پاتولوژی،</span>
              <em className="rise" style={{ "--d": "180ms" } as React.CSSProperties}>پیش از آنکه پاسخ را ببینید.</em>
            </h1>
            <p className="hero-lead rise" style={{ "--d": "280ms" } as React.CSSProperties}>
              پاتولوژیست‌های تأییدشده موارد چالش‌برانگیز خود را با شرح حال، تصاویر میکروسکوپی با بزرگ‌نمایی کامل و نتایج
              ایمونوهیستوشیمی ثبت می‌کنند. شما تشخیص خود را ثبت می‌کنید، سپس پاسخ نهایی، تشخیص‌های افتراقی و نظرات همکاران را مشاهده می‌کنید.
            </p>
            <div className="hero-actions rise" style={{ "--d": "380ms" } as React.CSSProperties}>
              <Link href={user ? "/cases?mode=UNKNOWN&status=unsolved" : "/cases"} className="btn btn-light btn-lg">
                {user ? "یک مورد حل‌نشده" : "مرور کتابخانه‌ی موارد"} <Icon name="arrowLeft" />
              </Link>
              {!user && <Link href="/login" className="btn btn-glass btn-lg">عضویت پزشکان</Link>}
            </div>
            {stats.cases > 0 && (
              <div className="hero-stats rise" style={{ "--d": "480ms" } as React.CSSProperties} data-reveal>
                <div><b data-count={stats.cases}>{num(stats.cases)}</b><span>مورد منتشرشده</span></div>
                <div><b data-count={stats.contributors}>{num(stats.contributors)}</b><span>پاتولوژیست ارائه‌دهنده</span></div>
                <div><b data-count={stats.attempts}>{num(stats.attempts)}</b><span>پاسخ ثبت‌شده</span></div>
              </div>
            )}
          </div>

          <div className="lens-stage rise" style={{ "--d": "200ms" } as React.CSSProperties}>
            <svg className="reticle" viewBox="0 0 200 200" aria-hidden="true">
              <circle cx="100" cy="100" r="97" />
              <circle cx="100" cy="100" r="90" className="dash" />
              {Array.from({ length: 36 }, (_, i) => (
                <line key={i} x1="100" y1="3" x2="100" y2={i % 3 === 0 ? 11 : 7} transform={`rotate(${i * 10} 100 100)`} />
              ))}
            </svg>
            {feat ? (
              <Link href={`/cases/${feat.number}`} className="lens" aria-label={feat.title}>
                {feat.preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={feat.preview} alt="" fetchPriority="high" />
                )}
                <span className="scan" />
              </Link>
            ) : (
              <div className="lens lens-empty"><Icon name="microscope" size={48} /></div>
            )}
            {feat?.stain && <span className="float-chip chip-a">رنگ‌آمیزی <span className="en">{feat.stain}</span></span>}
            <span className="float-chip chip-b"><span className="dot" /> مورد هفته</span>

            {feat ? (
              <Link href={`/cases/${feat.number}`} className="lens-card">
                <div className="case-meta">
                  <span>{subspecialtyFa(feat.subspecialty)}</span>
                  <span className="sep" />
                  <span>{DIFFICULTY[feat.difficulty]}</span>
                </div>
                <b>{feat.title}</b>
                <span className="lens-cta">{feat.solved ? "مرور پاسخ" : "تشخیص شما چیست؟"} <Icon name="arrowLeft" size={16} /></span>
              </Link>
            ) : (
              <div className="lens-card">
                <b>{browse ? "نخستین موارد به‌زودی منتشر می‌شوند." : "کتابخانه‌ی موارد فقط برای اعضای تأییدشده قابل مشاهده است."}</b>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="wrap">
        <section className="section">
          <div className="section-head center" data-reveal>
            <div>
              <span className="kicker">روند یادگیری</span>
              <h2>سه گام تا تشخیص دقیق‌تر</h2>
            </div>
          </div>
          <ol className="steps" data-reveal>
            {STEPS.map((s, i) => (
              <li key={s.title} className="step" style={{ "--i": i } as React.CSSProperties}>
                <div className="step-icon"><Icon name={s.icon} size={22} /><span className="step-n">{faDigits(i + 1)}</span></div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {latest.length > 0 && (
          <section className="section">
            <div className="section-head" data-reveal>
              <div>
                <span className="kicker">تازه‌ها</span>
                <h2>تازه‌ترین موارد</h2>
                <p>آخرین موارد منتشرشده از سوی ارائه‌دهندگان</p>
              </div>
              <div className="spacer" />
              <Link href="/cases" className="link-arrow">همه‌ی موارد <Icon name="arrowLeft" size={16} /></Link>
            </div>
            <div className="case-grid case-grid-3">
              {latest.map((c, i) => (
                <div key={c.id} data-reveal style={{ "--i": i % 3 } as React.CSSProperties}>
                  <CaseCard c={c} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <div className="pillars" data-reveal>
            {PILLARS.map((p, i) => (
              <div key={p.title} className="pillar" style={{ "--i": i } as React.CSSProperties}>
                <span className="pillar-icon"><Icon name={p.icon} size={20} /></span>
                <div>
                  <b>{p.title}</b>
                  <p>{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {activeSubs.length > 0 && (
          <section className="section">
            <div className="section-head" data-reveal>
              <div>
                <span className="kicker">زیرتخصص‌ها</span>
                <h2>مرور بر اساس زیرتخصص</h2>
                <p>{faDigits(activeSubs.length)} زیرتخصص با مورد منتشرشده</p>
              </div>
              <div className="spacer" />
              <Link href="/subspecialties" className="link-arrow">همه‌ی زیرتخصص‌ها <Icon name="arrowLeft" size={16} /></Link>
            </div>
            <div className="sub-grid">
              {activeSubs.slice(0, 12).map((s, i) => (
                <Link key={s.key} href={`/cases?sub=${s.key}`} className="sub-item" data-reveal style={{ "--i": i % 4 } as React.CSSProperties}>
                  <span>{s.fa}<small className="en">{s.en}</small></span>
                  <span className="count">{num(counts[s.key] ?? 0)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {people.length > 0 && (
          <section className="section">
            <div className="section-head" data-reveal>
              <div>
                <span className="kicker">ارائه‌دهندگان</span>
                <h2>پاتولوژیست‌های همراه</h2>
                <p>متخصصانی که موارد خود را در اختیار همکاران گذاشته‌اند</p>
              </div>
              <div className="spacer" />
              <Link href="/contributors" className="link-arrow">همه <Icon name="arrowLeft" size={16} /></Link>
            </div>
            <div className="people">
              {people.map((p, i) => (
                <div key={p.id} className="person" data-reveal style={{ "--i": i % 3 } as React.CSSProperties}>
                  <span className="avatar avatar-lg">{initials(p.name)}</span>
                  <div>
                    <b>{p.name}</b>
                    <span>{[p.specialty, p.institution].filter(Boolean).join(" · ")}</span>
                    <div className="muted" style={{ fontSize: 12.5 }}>{faDigits(p.cases)} مورد منتشرشده</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!user && (
          <section className="section">
            <div className="cta-band" data-reveal>
              <div className="cta-glow" aria-hidden="true" />
              <div>
                <h2>به جمع پاتولوژیست‌های ویورا بپیوندید</h2>
                <p>عضویت برای پزشکان رایگان است. پس از تأیید شماره‌ی نظام پزشکی، می‌توانید تشخیص ثبت کنید و در گفت‌وگوی علمی شرکت کنید.</p>
              </div>
              <div className="row gap-8" style={{ flexWrap: "wrap" }}>
                <Link href="/login" className="btn btn-light btn-lg">ایجاد حساب کاربری</Link>
                <Link href="/about" className="btn btn-glass btn-lg">درباره‌ی سامانه</Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
