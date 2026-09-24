"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteDraft, getReadiness, saveCase, submitCase, withdrawCase, type StudioMedia } from "@/actions/studio";
import { SUBSPECIALTIES, SPECIMEN, DIFFICULTY, IHC_OUTCOME, CASE_STATUS, SEX } from "@/lib/taxonomy";
import { caseCode } from "@/lib/format";
import { Icon } from "../Icon";
import { MediaManager } from "./MediaManager";
import { ListEditor } from "./ListEditor";

type Outcome = keyof typeof IHC_OUTCOME;
type Specimen = keyof typeof SPECIMEN;

export type EditorForm = {
  title: string;
  subspecialty: string;
  organ: string;
  specimenType: Specimen | null;
  difficulty: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  mode: "UNKNOWN" | "TEACHING";
  patientAge: number | null;
  patientSex: "FEMALE" | "MALE" | "UNSPECIFIED";
  keywords: string[];
  clinicalHistory: string;
  imaging: string;
  gross: string;
  microscopic: string;
  molecular: string;
  question: string;
  finalDiagnosis: string;
  diagnosisAliases: string[];
  showIhcBeforeAnswer: boolean;
  commentsEnabled: boolean;
  discussion: string;
  teachingPoints: string[];
  references: string[];
  ihc: { marker: string; outcome: Outcome; pattern: string; note: string }[];
  differentials: { name: string; note: string }[];
  deidConfirmed: boolean;
};

type Props = {
  caseId: string;
  number: number;
  status: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";
  reviewNote: string | null;
  directPublish: boolean;
  initial: EditorForm;
  media: StudioMedia[];
  missing: string[];
  accept: string[];
  maxMb: number;
  wsiEnabled: boolean;
};

const SECTIONS = [
  ["setup", "نوع مورد و گفت‌وگو"],
  ["info", "مشخصات مورد"],
  ["images", "تصاویر و اسلایدها"],
  ["clinical", "شرح حال بالینی"],
  ["findings", "یافته‌های پاتولوژی"],
  ["ihc", "IHC و مولکولی"],
  ["dx", "تشخیص"],
  ["teaching", "بحث و آموزش"],
  ["submit", "حریم خصوصی و ارسال"],
] as const;
const OPTIONAL = new Set(["ihc", "teaching"]);
const REQUIRED = ["info", "images", "clinical", "findings", "dx", "submit"] as const;

const DEID = [
  "نام، شماره‌ی پرونده، کد ملی و شماره‌ی پذیرش بیمار در هیچ متن یا تصویری نیست.",
  "برچسب لام، بارکد و دست‌نوشته‌ها در تصاویر دیده نمی‌شوند (یا بریده شده‌اند).",
  "تاریخ دقیق نمونه‌برداری، نام بیمارستان ارجاع‌دهنده و نام پزشک معالج ذکر نشده است.",
  "جزئیات نادر بالینی که بیمار را شناسایی‌پذیر کند (شغل خاص، محل زندگی، رویداد خبری) حذف شده است.",
];

export function CaseEditor(p: Props) {
  const router = useRouter();
  const [f, setF] = useState<EditorForm>(p.initial);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveErr, setSaveErr] = useState("");
  const [missing, setMissing] = useState(p.missing);
  const [deid, setDeid] = useState<boolean[]>(DEID.map(() => p.initial.deidConfirmed));
  const [submitMsg, setSubmitMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSave] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const latest = useRef(f);
  latest.current = f;

  const set = <K extends keyof EditorForm>(k: K, v: EditorForm[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setDirty(true);
  };
  const bind = (k: keyof EditorForm) => ({
    value: (f[k] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never),
  });

  const save = useCallback(async () => {
    const r = await saveCase(p.caseId, latest.current);
    if (!r.ok) {
      setSaveErr(r.error);
      return false;
    }
    setSaveErr("");
    setDirty(false);
    setSavedAt(new Date());
    setMissing(await getReadiness(p.caseId));
    return true;
  }, [p.caseId]);

  // ذخیره‌ی خودکار ۳ ثانیه پس از آخرین تغییر
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => startSave(async () => { await save(); }), 3000);
    return () => clearTimeout(t);
  }, [f, dirty, save]);

  // Ctrl/Cmd+S و هشدار ترک صفحه با تغییرات ذخیره‌نشده
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        startSave(async () => { await save(); });
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [dirty, save]);

  useEffect(() => {
    const all = deid.every(Boolean);
    if (all !== f.deidConfirmed) set("deidConfirmed", all);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deid]);

  function submit() {
    setSubmitMsg(null);
    startSubmit(async () => {
      if (!(await save())) return;
      const r = await submitCase(p.caseId);
      if (!r.ok) return setSubmitMsg({ ok: false, text: r.error });
      setSubmitMsg({ ok: true, text: r.data.status === "PUBLISHED" ? "مورد منتشر شد." : "برای بازبینی ارسال شد. پس از تأیید مدیر منتشر می‌شود." });
      router.refresh();
    });
  }

  const doneSections: Record<string, boolean> = {
    setup: true,
    info: f.title.length >= 8 && !!f.subspecialty,
    images: !missing.some((m) => m.includes("تصویر")),
    clinical: f.clinicalHistory.length >= 20,
    findings: f.microscopic.length >= 20,
    ihc: f.ihc.length > 0 || !!f.molecular,
    dx: !!f.finalDiagnosis,
    teaching: !!f.discussion || f.teachingPoints.length > 0,
    submit: f.deidConfirmed,
  };
  const locked = p.status === "IN_REVIEW" && !p.directPublish;
  const challenge = f.mode === "UNKNOWN";
  const doneCount = REQUIRED.filter((k) => doneSections[k]).length;

  return (
    <>
      <div className="editor-bar">
        <div className="wrap">
          <Link href="/studio" className="btn btn-ghost btn-sm btn-icon" aria-label="بازگشت"><Icon name="arrowRight" /></Link>
          <div style={{ minWidth: 0 }}>
            <h1>{f.title || "مورد بدون عنوان"}</h1>
            <div className="row gap-8" style={{ fontSize: 12.5 }}>
              <span className="case-code">{caseCode(p.number)}</span>
              <span className="badge" style={{ height: 20 }}>{CASE_STATUS[p.status]}</span>
            </div>
          </div>
          <span className="spacer" />
          <div className="editor-progress" title="بخش‌های ضروری تکمیل‌شده">
            <div className="bar"><span style={{ width: `${(doneCount / REQUIRED.length) * 100}%` }} /></div>
            <small>{doneCount.toLocaleString("fa-IR")} از {REQUIRED.length.toLocaleString("fa-IR")} بخش ضروری</small>
          </div>
          <span className={`save-state${dirty ? " dirty" : ""}`}>
            {saving ? "در حال ذخیره…" : saveErr ? <span style={{ color: "var(--danger)" }}>{saveErr}</span> : dirty ? "تغییرات ذخیره نشده" : savedAt ? `ذخیره شد · ${savedAt.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}` : "همه‌ی تغییرات ذخیره است"}
          </span>
          <button className="btn btn-secondary btn-sm" disabled={saving || !dirty} onClick={() => startSave(async () => { await save(); })}>ذخیره</button>
          <Link href={`/cases/${p.number}`} className="btn btn-ghost btn-sm" target="_blank"><Icon name="eye" /> پیش‌نمایش</Link>
        </div>
      </div>

      <div className="wrap editor">
        <nav className="editor-nav" aria-label="بخش‌های فرم">
          {SECTIONS.map(([id, label], i) => (
            <a key={id} href={`#${id}`} className={doneSections[id] ? "done" : ""}>
              <span className="n">{doneSections[id] ? <Icon name="check" size={12} /> : (i + 1).toLocaleString("fa-IR")}</span>
              {id === "dx" ? (challenge ? "پرسش و پاسخ" : "تشخیص") : label}
              {OPTIONAL.has(id) && <em className="opt">اختیاری</em>}
            </a>
          ))}
        </nav>

        <div className="editor-sections">
          {p.reviewNote && p.status === "DRAFT" && (
            <div className="alert alert-warn"><Icon name="info" /><div><b>یادداشت بازبین:</b> {p.reviewNote}</div></div>
          )}
          {locked && (
            <div className="alert alert-info"><Icon name="clock" /><div style={{ flex: 1 }}>این مورد در صف بازبینی است. برای ویرایش، آن را از صف خارج کنید.</div>
              <button className="btn btn-secondary btn-sm" onClick={() => startSubmit(async () => { await withdrawCase(p.caseId); router.refresh(); })}>خروج از صف</button>
            </div>
          )}

          <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 0, display: "contents" }}>
            {/* ۰ نوع مورد و گفت‌وگو */}
            <section className="editor-section" id="setup">
              <header><h2>این مورد را چگونه ارائه می‌کنید؟</h2><p>هر زمان تا پیش از انتشار می‌توانید این انتخاب‌ها را تغییر دهید.</p></header>
              <div className="body">
                <div className="mode-cards" role="radiogroup" aria-label="نوع مورد">
                  <button type="button" role="radio" aria-checked={challenge} className="mode-card" onClick={() => set("mode", "UNKNOWN")}>
                    <span className="mc-icon"><Icon name="lock" size={22} /></span>
                    <b>مورد چالشی</b>
                    <span>پزشکان ابتدا تصاویر و یافته‌ها را بررسی و تشخیص خود را ثبت می‌کنند؛ سپس پاسخ شما و آمار پاسخ همکاران را می‌بینند.</span>
                    <span className="mc-flow"><em>بررسی</em><Icon name="chevronLeft" size={14} /><em>ثبت تشخیص</em><Icon name="chevronLeft" size={14} /><em>نمایش پاسخ</em></span>
                  </button>
                  <button type="button" role="radio" aria-checked={!challenge} className="mode-card" onClick={() => set("mode", "TEACHING")}>
                    <span className="mc-icon"><Icon name="book" size={22} /></span>
                    <b>مورد آموزشی</b>
                    <span>تشخیص و توضیحات شما از ابتدا نمایش داده می‌شود؛ مناسب مرور یک موجودیت یا یک نکته‌ی ریخت‌شناسی.</span>
                    <span className="mc-flow"><em>مشاهده‌ی مورد و پاسخ</em></span>
                  </button>
                </div>
                <label className="switch-row">
                  <span className="switch"><input type="checkbox" checked={f.commentsEnabled} onChange={(e) => set("commentsEnabled", e.target.checked)} /><span /></span>
                  <span>
                    <b>گفت‌وگوی پزشکان {f.commentsEnabled ? "باز است" : "بسته است"}</b>
                    <small>
                      {f.commentsEnabled
                        ? challenge
                          ? "پزشکان پس از ثبت تشخیص می‌توانند نظر، پرسش یا تشخیص افتراقی خود را بنویسند."
                          : "پزشکان می‌توانند زیر این مورد نظر و پرسش خود را بنویسند."
                        : "فقط محتوای مورد نمایش داده می‌شود و کسی نمی‌تواند نظر بنویسد."}
                    </small>
                  </span>
                </label>
                {challenge && (
                  <label className="switch-row">
                    <span className="switch"><input type="checkbox" checked={f.showIhcBeforeAnswer} onChange={(e) => set("showIhcBeforeAnswer", e.target.checked)} /><span /></span>
                    <span>
                      <b>نتایج IHC و مولکولی پیش از پاسخ {f.showIhcBeforeAnswer ? "نمایش داده می‌شود" : "پنهان است"}</b>
                      <small>اگر پنل IHC تشخیص را آشکار می‌کند، این گزینه را خاموش کنید تا نتایج پس از ثبت تشخیص نمایش داده شوند.</small>
                    </span>
                  </label>
                )}
              </div>
            </section>

            {/* ۱ مشخصات */}
            <section className="editor-section" id="info">
              <header><h2>مشخصات مورد</h2><p>اطلاعاتی که در فهرست موارد و بالای صفحه‌ی مورد نمایش داده می‌شود.</p></header>
              <div className="body">
                <div className="field">
                  <label className="req" htmlFor="title">عنوان</label>
                  <input id="title" className="input" {...bind("title")} placeholder="مثلاً: توده‌ی بدون درد زیر فک در مرد ۵۲ ساله" maxLength={160} />
                  <span className="hint">{challenge ? "نحوه‌ی مراجعه‌ی بیمار را بنویسید، نه تشخیص را؛ عنوان پیش از ثبت پاسخ دیده می‌شود." : "یک عنوان کوتاه و گویا؛ مثلاً نحوه‌ی مراجعه یا نام موجودیت."}</span>
                </div>
                <div className="grid-3">
                  <div className="field">
                    <label className="req" htmlFor="sub">زیرتخصص</label>
                    <select id="sub" className="select" {...bind("subspecialty")}>
                      <option value="">انتخاب کنید…</option>
                      {SUBSPECIALTIES.map((s) => <option key={s.key} value={s.key}>{s.fa}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="organ">اندام / محل</label>
                    <input id="organ" className="input" {...bind("organ")} placeholder="مثلاً: غده‌ی زیرفکی" />
                  </div>
                  <div className="field">
                    <label htmlFor="spec">نوع نمونه</label>
                    <select id="spec" className="select" value={f.specimenType ?? ""} onChange={(e) => set("specimenType", (e.target.value || null) as Specimen | null)}>
                      <option value="">—</option>
                      {(Object.keys(SPECIMEN) as Specimen[]).map((k) => <option key={k} value={k}>{SPECIMEN[k]}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid-3">
                  <div className="field">
                    <label htmlFor="diff">سطح دشواری</label>
                    <select id="diff" className="select" {...bind("difficulty")}>
                      {(Object.keys(DIFFICULTY) as (keyof typeof DIFFICULTY)[]).map((k) => <option key={k} value={k}>{DIFFICULTY[k]}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="age">سن بیمار</label>
                    <input id="age" className="input input-ltr" inputMode="numeric" value={f.patientAge ?? ""} onChange={(e) => {
                      const n = parseInt(e.target.value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))), 10);
                      set("patientAge", Number.isFinite(n) ? Math.min(120, Math.max(0, n)) : null);
                    }} />
                    <span className="hint">بالای ۸۹ سال به‌صورت «۹۰+» نمایش داده می‌شود.</span>
                  </div>
                  <div className="field">
                    <label htmlFor="sex">جنس</label>
                    <select id="sex" className="select" {...bind("patientSex")}>
                      {(Object.keys(SEX) as (keyof typeof SEX)[]).map((k) => <option key={k} value={k}>{k === "UNSPECIFIED" ? "ذکر نشده" : SEX[k]}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <span className="label">کلیدواژه‌ها</span>
                  <ListEditor items={f.keywords} onChange={(v) => set("keywords", v)} placeholder="مثلاً: spindle cell" addLabel="افزودن کلیدواژه" inline />
                  <span className="hint">برای یافتن مورد در جست‌وجو{challenge ? "؛ کلیدواژه نباید تشخیص را آشکار کند." : "."}</span>
                </div>
              </div>
            </section>

            {/* ۲ تصاویر */}
            <section className="editor-section" id="images">
              <header><h2>تصاویر و اسلایدها</h2><p>عکس‌های میکروسکوپی با کیفیت کامل بارگذاری کنید؛ سامانه آن‌ها را برای زوم عمیق آماده می‌کند و متادیتای فایل را پاک می‌کند.</p></header>
              <div className="body">
                <MediaManager caseId={p.caseId} initial={p.media} accept={p.accept} maxMb={p.maxMb} wsiEnabled={p.wsiEnabled} onChange={async () => setMissing(await getReadiness(p.caseId))} />
              </div>
            </section>

            {/* ۳ بالینی */}
            <section className="editor-section" id="clinical">
              <header><h2>شرح حال بالینی</h2><p>آنچه پاتولوژیست هنگام دریافت نمونه می‌داند.</p></header>
              <div className="body">
                <div className="field">
                  <label className="req" htmlFor="hx">شرح حال و یافته‌های بالینی</label>
                  <textarea id="hx" className="textarea tall" {...bind("clinicalHistory")} placeholder="سن، جنس، شکایت اصلی، سیر بیماری، سابقه‌ی مرتبط…" />
                  <span className="hint">برای فهرست، هر خط را با «-» شروع کنید.</span>
                </div>
                <div className="field">
                  <label htmlFor="img">تصویربرداری و آزمایش‌ها</label>
                  <textarea id="img" className="textarea" {...bind("imaging")} placeholder="یافته‌های CT/MRI/سونوگرافی، آزمایش‌های مرتبط…" />
                </div>
              </div>
            </section>

            {/* ۴ یافته‌ها */}
            <section className="editor-section" id="findings">
              <header><h2>یافته‌های پاتولوژی</h2></header>
              <div className="body">
                <div className="field">
                  <label htmlFor="gross">نمای ماکروسکوپی</label>
                  <textarea id="gross" className="textarea" {...bind("gross")} />
                </div>
                <div className="field">
                  <label className="req" htmlFor="micro">یافته‌های میکروسکوپی</label>
                  <textarea id="micro" className="textarea tall" {...bind("microscopic")} />
                  {challenge && <span className="hint">یافته‌ها را توصیف کنید بی‌آنکه نام موجودیت را بیاورید.</span>}
                </div>
              </div>
            </section>

            {/* ۵ IHC */}
            <section className="editor-section" id="ihc">
              <header><h2>ایمونوهیستوشیمی و مولکولی</h2><p>نتایج به‌صورت جدول ساختاریافته ذخیره می‌شوند تا بتوان موارد را بر اساس مارکر جست‌وجو و مقایسه کرد.</p></header>
              <div className="body">
                <div className="rows">
                  {f.ihc.map((r, i) => (
                    <div key={i} className="row-edit ihc">
                      <input className="input input-ltr" placeholder="Marker" value={r.marker} onChange={(e) => set("ihc", f.ihc.map((x, j) => (j === i ? { ...x, marker: e.target.value } : x)))} />
                      <select className="select" value={r.outcome} onChange={(e) => set("ihc", f.ihc.map((x, j) => (j === i ? { ...x, outcome: e.target.value as Outcome } : x)))}>
                        {(Object.keys(IHC_OUTCOME) as Outcome[]).map((k) => <option key={k} value={k}>{IHC_OUTCOME[k].fa}</option>)}
                      </select>
                      <input className="input" placeholder="الگو (هسته‌ای، منتشر…)" value={r.pattern} onChange={(e) => set("ihc", f.ihc.map((x, j) => (j === i ? { ...x, pattern: e.target.value } : x)))} />
                      <input className="input" placeholder="توضیح" value={r.note} onChange={(e) => set("ihc", f.ihc.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} />
                      <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="حذف" onClick={() => set("ihc", f.ihc.filter((_, j) => j !== i))}><Icon name="trash" /></button>
                    </div>
                  ))}
                  <div><button type="button" className="btn btn-secondary btn-sm" onClick={() => set("ihc", [...f.ihc, { marker: "", outcome: "POSITIVE", pattern: "", note: "" }])}><Icon name="plus" /> افزودن مارکر</button></div>
                </div>
                <div className="field">
                  <label htmlFor="mol">یافته‌های مولکولی / سیتوژنتیک</label>
                  <textarea id="mol" className="textarea" {...bind("molecular")} placeholder="FISH، NGS، PCR…" />
                </div>
              </div>
            </section>

            {/* ۶ تشخیص */}
            <section className="editor-section" id="dx">
              <header>
                <h2>{challenge ? "پرسش و پاسخ" : "تشخیص"}</h2>
                <p>{challenge ? "تشخیص و تشخیص‌های افتراقی فقط پس از ثبت پاسخ پزشک به مرورگر او فرستاده می‌شوند." : "تشخیص نهایی و تشخیص‌های افتراقی مورد."}</p>
              </header>
              <div className="body">
{challenge && (
<>
                <div className="field">
                  <label htmlFor="q">پرسش</label>
                  <input id="q" className="input" {...bind("question")} placeholder="تشخیص شما چیست؟" />
                  <span className="hint">اختیاری؛ مثلاً «مهم‌ترین تشخیص افتراقی کدام است؟»</span>
                </div>
</>
)}
                <div className="field">
                  <label className="req" htmlFor="fdx">تشخیص نهایی</label>
                  <input id="fdx" className="input input-ltr" {...bind("finalDiagnosis")} placeholder="Invasive lobular carcinoma, classic type" />
                  <span className="hint">ترجیحاً به انگلیسی و مطابق طبقه‌بندی WHO.</span>
                </div>
{challenge && (
<>
                <div className="field">
                  <span className="label">معادل‌های قابل‌قبول</span>
                  <ListEditor items={f.diagnosisAliases} onChange={(v) => set("diagnosisAliases", v)} placeholder="ILC" addLabel="افزودن معادل" ltr />
                  <span className="hint">پاسخ‌هایی که باید صحیح شناخته شوند (مخفف، نام قدیمی، معادل فارسی). سامانه ترتیب واژه‌ها، املای بریتانیایی و مخفف‌های رایج را به‌طور خودکار تشخیص می‌دهد.</span>
                </div>
</>
)}
                <div className="field">
                  <span className="label">تشخیص‌های افتراقی</span>
                  <div className="rows">
                    {f.differentials.map((d, i) => (
                      <div key={i} className="row-edit ddx">
                        <input className="input input-ltr" placeholder="Differential diagnosis" value={d.name} onChange={(e) => set("differentials", f.differentials.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                        <input className="input" placeholder="چه چیزی به نفع یا علیه آن است" value={d.note} onChange={(e) => set("differentials", f.differentials.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} />
                        <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="حذف" onClick={() => set("differentials", f.differentials.filter((_, j) => j !== i))}><Icon name="trash" /></button>
                      </div>
                    ))}
                    <div><button type="button" className="btn btn-secondary btn-sm" onClick={() => set("differentials", [...f.differentials, { name: "", note: "" }])}><Icon name="plus" /> افزودن تشخیص افتراقی</button></div>
                  </div>
                </div>
              </div>
            </section>

            {/* ۷ آموزش */}
            <section className="editor-section" id="teaching">
              <header><h2>بحث و آموزش</h2></header>
              <div className="body">
                <div className="field">
                  <label htmlFor="disc">بحث</label>
                  <textarea id="disc" className="textarea tall" {...bind("discussion")} placeholder="چرا این تشخیص؟ دام‌های تشخیصی، نکات ریخت‌شناسی، اهمیت بالینی…" />
                </div>
                <div className="field">
                  <span className="label">نکات کلیدی</span>
                  <ListEditor items={f.teachingPoints} onChange={(v) => set("teachingPoints", v)} placeholder="یک نکته‌ی کوتاه و کاربردی" addLabel="افزودن نکته" />
                </div>
                <div className="field">
                  <span className="label">منابع</span>
                  <ListEditor items={f.references} onChange={(v) => set("references", v)} placeholder="WHO Classification of Tumours, 5th ed. …" addLabel="افزودن منبع" ltr />
                </div>
              </div>
            </section>
          </fieldset>

          {/* ۸ ارسال */}
          <section className="editor-section" id="submit">
            <header><h2>حریم خصوصی و ارسال</h2><p>مسئولیت حذف اطلاعات هویتی بیمار با ارائه‌دهنده است. سامانه متادیتای فایل‌ها را پاک می‌کند، ولی محتوای تصویر را نمی‌تواند بررسی کند.</p></header>
            <div className="body">
              <div className="checklist">
                {DEID.map((t, i) => (
                  <label key={i} className="check">
                    <input type="checkbox" checked={deid[i]} disabled={locked} onChange={(e) => setDeid(deid.map((x, j) => (j === i ? e.target.checked : x)))} />
                    <span>{t}</span>
                  </label>
                ))}
              </div>

              {missing.length > 0 && p.status !== "PUBLISHED" && (
                <div className="alert alert-warn">
                  <Icon name="alert" />
                  <div>
                    <b>پیش از ارسال:</b>
                    <div className="missing">{missing.map((m) => <span key={m}>• {m}</span>)}</div>
                  </div>
                </div>
              )}
              {submitMsg && <div className={`alert ${submitMsg.ok ? "alert-ok" : "alert-danger"}`}><Icon name={submitMsg.ok ? "check" : "alert"} />{submitMsg.text}</div>}

              <div className="row gap-12" style={{ flexWrap: "wrap" }}>
                {p.status === "DRAFT" && (
                  <button className="btn btn-primary btn-lg" disabled={submitting || (missing.length > 0 && !dirty)} onClick={submit}>
                    <Icon name="send" /> {submitting ? "در حال ارسال…" : p.directPublish ? "انتشار مورد" : "ارسال برای بازبینی"}
                  </button>
                )}
                {p.status === "PUBLISHED" && <span className="badge badge-ok">منتشرشده — تغییرات شما بلافاصله روی سایت اعمال می‌شود.</span>}
                <span className="spacer" />
                {p.status === "DRAFT" && (
                  <form action={deleteDraft.bind(null, p.caseId)} onSubmit={(e) => { if (!confirm("این پیش‌نویس و همه‌ی تصاویرش برای همیشه حذف شود؟")) e.preventDefault(); }}>
                    <button className="btn btn-danger btn-sm"><Icon name="trash" /> حذف پیش‌نویس</button>
                  </form>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
