"use client";

import Link from "@/components/Link";
import type { CaseCard as Card } from "@/lib/cases";
import { DIFFICULTY, subspecialtyLabel } from "@/lib/taxonomy";
import { initials } from "@/lib/text";
import { Icon } from "./Icon";
import { useI18n } from "./LocaleProvider";

export function CaseCard({ c }: { c: Card }) {
  const { t, f, locale } = useI18n();
  return (
    <Link href={`/cases/${c.number}`} className="case-card">
      <div className="case-thumb">
        {c.thumb ? (
          // تصاویر از پیش در سرور به WebP با اندازه‌ی مناسب تبدیل شده‌اند
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.thumb} alt={`${c.title}${c.stain ? ` — ${c.stain}` : ""}`} loading="lazy" decoding="async" />
        ) : (
          <div className="ph"><Icon name="microscope" /></div>
        )}
        <div className="thumb-tags">
          <span className="thumb-tag">
            {c.mode === "UNKNOWN" ? (c.solved ? <><Icon name="check" /> {t("حل‌شده")}</> : <><Icon name="lock" /> {t("چالشی")}</>) : <><Icon name="book" /> {t("آموزشی")}</>}
          </span>
          {c.images > 1 && <span className="thumb-tag"><Icon name="layers" /> {f.digits(c.images)}</span>}
        </div>
      </div>
      <div className="case-body">
        <div className="case-meta">
          <span>{subspecialtyLabel(c.subspecialty, locale)}</span>
          {c.organ && <><span className="sep" /><span dir="auto">{c.organ}</span></>}
          <span className="sep" />
          <span>{t(DIFFICULTY[c.difficulty])}</span>
          {c.isDemo && <span className="demo-flag">{t("نمایشی")}</span>}
        </div>
        <h3 className="case-title" dir="auto">{c.title}</h3>
        {c.diagnosis && <div className="case-dx">{c.diagnosis}</div>}
        <div className="case-foot">
          <span className="avatar avatar-sm">{initials(c.author)}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} dir="auto">{c.author}</span>
          <span className="spacer" />
          <span className="stat" title={t("پاسخ‌ها")}><Icon name="checkCircle" /> {f.digits(c.attempts)}</span>
          <span className="stat" title={t("نظرها")}><Icon name="message" /> {f.digits(c.comments)}</span>
        </div>
      </div>
    </Link>
  );
}
