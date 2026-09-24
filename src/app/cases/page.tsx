import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CaseMode, Difficulty, SpecimenType } from "@prisma/client";
import { canBrowse, getUser } from "@/lib/auth";
import { listCases, subspecialtyCounts, type CaseFilters } from "@/lib/cases";
import { DIFFICULTY, SPECIMEN, SUBSPECIALTIES, subspecialtyFa } from "@/lib/taxonomy";
import { faDigits } from "@/lib/text";
import { num } from "@/lib/format";
import { CaseCard } from "@/components/CaseCard";
import { Pager } from "@/components/Pager";
import { Empty } from "@/components/Empty";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const sub = sp.sub ? subspecialtyFa(sp.sub) : null;
  return { title: sub && sub !== "—" ? `موارد ${sub}` : "اطلس موارد", alternates: { canonical: "/cases" } };
}

const pick = <T extends string>(v: string | undefined, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : undefined);

export default async function Library({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await getUser();
  if (!canBrowse(user)) redirect("/login?next=/cases");

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
    f.sub && { label: subspecialtyFa(f.sub), clear: { sub: undefined } },
    f.difficulty && { label: DIFFICULTY[f.difficulty], clear: { difficulty: undefined } },
    f.mode && { label: f.mode === "UNKNOWN" ? "ناشناس" : "آموزشی", clear: { mode: undefined } },
    f.specimen && { label: SPECIMEN[f.specimen], clear: { specimen: undefined } },
    f.status && { label: f.status === "solved" ? "حل‌شده توسط من" : "حل‌نشده توسط من", clear: { status: undefined } },
  ].filter(Boolean) as { label: string; clear: Record<string, undefined> }[];

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="wrap">
      <div className="page-head">
        <h1>{f.sub ? subspecialtyFa(f.sub) : "اطلس موارد"}</h1>
        <p>موارد ناشناس را حل کنید یا موارد آموزشی را مرور کنید. جست‌وجو در عنوان، اندام، شرح حال و یافته‌ها انجام می‌شود؛ تشخیص موارد ناشناس هرگز در نتایج جست‌وجو اثر ندارد.</p>
      </div>

      <div className="library">
        <aside className="filters" aria-label="پالایش">
          <div className="filter-group">
            <h3>زیرتخصص</h3>
            <div className="filter-list">
              <Link href={href({ sub: undefined })} aria-current={!f.sub}>همه <small>{num(total)}</small></Link>
              {SUBSPECIALTIES.filter((s) => counts[s.key]).map((s) => (
                <Link key={s.key} href={href({ sub: s.key })} aria-current={f.sub === s.key}>
                  {s.fa} <small>{num(counts[s.key])}</small>
                </Link>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <h3>نوع مورد</h3>
            <div className="seg">
              <Link href={href({ mode: undefined })} aria-current={!f.mode}>همه</Link>
              <Link href={href({ mode: "UNKNOWN" })} aria-current={f.mode === "UNKNOWN"}>ناشناس</Link>
              <Link href={href({ mode: "TEACHING" })} aria-current={f.mode === "TEACHING"}>آموزشی</Link>
            </div>
          </div>
          <div className="filter-group">
            <h3>سطح</h3>
            <div className="seg">
              <Link href={href({ difficulty: undefined })} aria-current={!f.difficulty}>همه</Link>
              {(["BASIC", "INTERMEDIATE", "ADVANCED"] as const).map((d) => (
                <Link key={d} href={href({ difficulty: d })} aria-current={f.difficulty === d}>{DIFFICULTY[d]}</Link>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <h3>نوع نمونه</h3>
            <div className="filter-list">
              <Link href={href({ specimen: undefined })} aria-current={!f.specimen}>همه</Link>
              {(Object.keys(SPECIMEN) as SpecimenType[]).map((k) => (
                <Link key={k} href={href({ specimen: k })} aria-current={f.specimen === k}>{SPECIMEN[k]}</Link>
              ))}
            </div>
          </div>
        </aside>

        <div>
          <form className="search-lg" action="/cases" role="search">
            <Icon name="search" />
            {Object.entries(current).map(([k, v]) => (k !== "q" && v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
            <input name="q" defaultValue={f.q} placeholder="مثلاً: توده‌ی پستان، CK7، سلول‌های دوکی…" aria-label="جست‌وجو" />
            <button className="btn btn-primary btn-sm" type="submit">جست‌وجو</button>
          </form>

          {chips.length > 0 && (
            <div className="active-filters">
              {chips.map((c) => (
                <Link key={c.label} href={href(c.clear)} className="badge badge-outline">{c.label} <Icon name="x" /></Link>
              ))}
              <Link href="/cases" className="badge" style={{ background: "none", color: "var(--muted)" }}>پاک‌کردن همه</Link>
            </div>
          )}

          <div className="toolbar">
            <span className="count">{faDigits(res.total)} مورد</span>
            <span className="spacer" />
            {user && (
              <div className="seg">
                <Link href={href({ status: undefined })} aria-current={!f.status}>همه</Link>
                <Link href={href({ status: "unsolved" })} aria-current={f.status === "unsolved"}>حل‌نشده</Link>
                <Link href={href({ status: "solved" })} aria-current={f.status === "solved"}>حل‌شده</Link>
              </div>
            )}
            <div className="seg">
              <Link href={href({ sort: undefined })} aria-current={f.sort === "new"}>جدیدترین</Link>
              <Link href={href({ sort: "attempted" })} aria-current={f.sort === "attempted"}>پرپاسخ‌ترین</Link>
              <Link href={href({ sort: "discussed" })} aria-current={f.sort === "discussed"}>پربحث‌ترین</Link>
            </div>
          </div>

          {res.cases.length === 0 ? (
            <Empty icon="search" title="موردی پیدا نشد" text={chips.length ? "پالایه‌ها را کمتر کنید یا عبارت دیگری جست‌وجو کنید." : "هنوز موردی منتشر نشده است."}>
              {chips.length > 0 && <Link href="/cases" className="btn btn-secondary">نمایش همه‌ی موارد</Link>}
            </Empty>
          ) : (
            <>
              <div className="case-grid">{res.cases.map((c) => <CaseCard key={c.id} c={c} />)}</div>
              <Pager page={res.page} pages={res.pages} href={(p) => href({ page: p > 1 ? String(p) : undefined })} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
