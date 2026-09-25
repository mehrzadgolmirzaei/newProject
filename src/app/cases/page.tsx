import type { Metadata } from "next";
import Link from "@/components/Link";
import type { CaseMode, Difficulty, SpecimenType } from "@prisma/client";
import { canBrowse, getUser } from "@/lib/auth";
import { listCases, subspecialtyCounts, type CaseFilters } from "@/lib/cases";
import { DIFFICULTY, SPECIMEN, SUBSPECIALTIES, subspecialty, subspecialtyLabel } from "@/lib/taxonomy";
import { getI18n, lredirect } from "@/lib/i18n/server";
import { pageMeta } from "@/lib/seo";
import { CaseCard } from "@/components/CaseCard";
import { Pager } from "@/components/Pager";
import { Empty } from "@/components/Empty";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const { locale, t } = await getI18n();
  const sub = sp.sub && subspecialty(sp.sub) ? sp.sub : null;
  const label = sub ? subspecialtyLabel(sub, locale) : null;
  // فقط صفحه‌ی اصلی کتابخانه و صفحه‌ی هر زیرتخصص ایندکس می‌شوند؛ جست‌وجو و پالایه‌های ترکیبی نه
  const filtered = ["q", "difficulty", "mode", "specimen", "status", "sort"].some((k) => sp[k]);
  return pageMeta({
    locale,
    path: sub ? `/cases?sub=${sub}` : "/cases",
    title: label ? t("موارد پاتولوژی {sub}", { sub: label }) : t("کتابخانه‌ی موارد"),
    description: label
      ? t("موارد دشوار و آموزشی پاتولوژی {sub} با شرح حال، تصاویر میکروسکوپی، ایمونوهیستوشیمی و بحث تخصصی.", { sub: label })
      : t("کتابخانه‌ی موارد دشوار پاتولوژی: موارد چالشی برای ثبت تشخیص و موارد آموزشی با تصاویر میکروسکوپی و بحث تخصصی."),
    noindex: filtered,
  });
}

const pick = <T extends string>(v: string | undefined, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);

export default async function Library({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await getUser();
  if (!canBrowse(user)) return lredirect("/login?next=/cases");
  const { t, f: fm, locale, lp } = await getI18n();

  const f: CaseFilters = {
    q: sp.q?.slice(0, 100),
    sub: SUBSPECIALTIES.some((s) => s.key === sp.sub) ? sp.sub : undefined,
    difficulty: pick<Difficulty>(sp.difficulty, ["BASIC", "INTERMEDIATE", "ADVANCED"]),
    mode: pick<CaseMode>(sp.mode, ["UNKNOWN", "TEACHING"]),
    specimen: pick<SpecimenType>(sp.specimen, Object.keys(SPECIMEN) as SpecimenType[]),
    sort: pick(sp.sort, ["new", "discussed", "attempted"] as const) ?? "new",
    status: user ? pick(sp.status, ["unsolved", "solved"] as const) : undefined,
    page: Math.max(1, Number(sp.page) || 1),
  };
  const [res, counts] = await Promise.all([listCases(f, user), subspecialtyCounts()]);

  const current: Record<string, string | undefined> = {
    q: f.q, sub: f.sub, difficulty: f.difficulty, mode: f.mode, specimen: f.specimen, status: f.status,
    sort: f.sort === "new" ? undefined : f.sort,
  };
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...current, page: undefined, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/cases?${s}` : "/cases";
  };
  const chips = [
    f.q && { label: `«${f.q}»`, clear: { q: undefined } },
    f.sub && { label: subspecialtyLabel(f.sub, locale), clear: { sub: undefined } },
    f.difficulty && { label: t(DIFFICULTY[f.difficulty]), clear: { difficulty: undefined } },
    f.mode && { label: f.mode === "UNKNOWN" ? t("چالشی") : t("آموزشی"), clear: { mode: undefined } },
    f.specimen && { label: t(SPECIMEN[f.specimen]), clear: { specimen: undefined } },
    f.status && { label: f.status === "solved" ? t("حل‌شده توسط من") : t("حل‌نشده توسط من"), clear: { status: undefined } },
  ].filter(Boolean) as { label: string; clear: Record<string, undefined> }[];

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="wrap">
      <div className="page-head">
        <h1>{f.sub ? subspecialtyLabel(f.sub, locale) : t("کتابخانه‌ی موارد")}</h1>
        <p>{t("موارد چالشی را حل کنید یا موارد آموزشی را مرور کنید. جست‌وجو در عنوان، اندام، شرح حال و یافته‌ها انجام می‌شود؛ تشخیص موارد چالشی هرگز در نتایج جست‌وجو اثر ندارد.")}</p>
      </div>

      <div className="library">
        <aside className="filters" aria-label={t("پالایش")}>
          <div className="filter-group">
            <h3>{t("زیرتخصص")}</h3>
            <div className="filter-list">
              <Link href={href({ sub: undefined })} aria-current={!f.sub}>{t("همه")} <small>{fm.num(total)}</small></Link>
              {SUBSPECIALTIES.filter((s) => counts[s.key]).map((s) => (
                <Link key={s.key} href={href({ sub: s.key })} aria-current={f.sub === s.key}>
                  {locale === "en" ? s.en : s.fa} <small>{fm.num(counts[s.key])}</small>
                </Link>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <h3>{t("نوع مورد")}</h3>
            <div className="seg">
              <Link href={href({ mode: undefined })} aria-current={!f.mode}>{t("همه")}</Link>
              <Link href={href({ mode: "UNKNOWN" })} aria-current={f.mode === "UNKNOWN"}>{t("چالشی")}</Link>
              <Link href={href({ mode: "TEACHING" })} aria-current={f.mode === "TEACHING"}>{t("آموزشی")}</Link>
            </div>
          </div>
          <div className="filter-group">
            <h3>{t("سطح")}</h3>
            <div className="seg">
              <Link href={href({ difficulty: undefined })} aria-current={!f.difficulty}>{t("همه")}</Link>
              {(["BASIC", "INTERMEDIATE", "ADVANCED"] as const).map((d) => (
                <Link key={d} href={href({ difficulty: d })} aria-current={f.difficulty === d}>{t(DIFFICULTY[d])}</Link>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <h3>{t("نوع نمونه")}</h3>
            <div className="filter-list">
              <Link href={href({ specimen: undefined })} aria-current={!f.specimen}>{t("همه")}</Link>
              {(Object.keys(SPECIMEN) as SpecimenType[]).map((k) => (
                <Link key={k} href={href({ specimen: k })} aria-current={f.specimen === k}>{t(SPECIMEN[k])}</Link>
              ))}
            </div>
          </div>
        </aside>

        <div>
          <form className="search-lg" action={lp("/cases")} role="search">
            <Icon name="search" />
            {Object.entries(current).map(([k, v]) => (k !== "q" && v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
            <input name="q" defaultValue={f.q} placeholder={t("مثلاً: توده‌ی پستان، CK7، سلول‌های دوکی…")} aria-label={t("جست‌وجو")} />
            <button className="btn btn-primary btn-sm" type="submit">{t("جست‌وجو")}</button>
          </form>

          {chips.length > 0 && (
            <div className="active-filters">
              {chips.map((c) => (
                <Link key={c.label} href={href(c.clear)} className="badge badge-outline">{c.label} <Icon name="x" /></Link>
              ))}
              <Link href="/cases" className="badge" style={{ background: "none", color: "var(--muted)" }}>{t("پاک‌کردن همه")}</Link>
            </div>
          )}

          <div className="toolbar">
            <span className="count">{t("{n} مورد", { n: fm.digits(res.total) })}</span>
            <span className="spacer" />
            {user && (
              <div className="seg">
                <Link href={href({ status: undefined })} aria-current={!f.status}>{t("همه")}</Link>
                <Link href={href({ status: "unsolved" })} aria-current={f.status === "unsolved"}>{t("حل‌نشده")}</Link>
                <Link href={href({ status: "solved" })} aria-current={f.status === "solved"}>{t("حل‌شده")}</Link>
              </div>
            )}
            <div className="seg">
              <Link href={href({ sort: undefined })} aria-current={f.sort === "new"}>{t("جدیدترین")}</Link>
              <Link href={href({ sort: "attempted" })} aria-current={f.sort === "attempted"}>{t("پرپاسخ‌ترین")}</Link>
              <Link href={href({ sort: "discussed" })} aria-current={f.sort === "discussed"}>{t("پربحث‌ترین")}</Link>
            </div>
          </div>

          {res.cases.length === 0 ? (
            <Empty icon="search" title={t("موردی پیدا نشد")} text={chips.length ? t("پالایه‌ها را کمتر کنید یا عبارت دیگری جست‌وجو کنید.") : t("هنوز موردی منتشر نشده است.")}>
              {chips.length > 0 && <Link href="/cases" className="btn btn-secondary">{t("نمایش همه‌ی موارد")}</Link>}
            </Empty>
          ) : (
            <>
              <div className="case-grid">{res.cases.map((c, i) => <div key={c.id} data-reveal style={{ "--i": i % 3 } as React.CSSProperties}><CaseCard c={c} /></div>)}</div>
              <Pager page={res.page} pages={res.pages} href={(p) => href({ page: p > 1 ? String(p) : undefined })} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
