import Link from "next/link";
import type { CaseCard as Card } from "@/lib/cases";
import { DIFFICULTY, subspecialtyFa } from "@/lib/taxonomy";
import { faDigits, initials } from "@/lib/text";
import { Icon } from "./Icon";

export function CaseCard({ c }: { c: Card }) {
  return (
    <Link href={`/cases/${c.number}`} className="case-card">
      <div className="case-thumb">
        {c.thumb ? (
          // تصاویر از پیش در سرور به WebP با اندازه‌ی مناسب تبدیل شده‌اند
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.thumb} alt="" loading="lazy" decoding="async" />
        ) : (
          <div className="ph"><Icon name="microscope" /></div>
        )}
        <div className="thumb-tags">
          <span className="thumb-tag">
            {c.mode === "UNKNOWN" ? (c.solved ? <><Icon name="check" /> حل‌شده</> : <><Icon name="lock" /> چالشی</>) : <><Icon name="book" /> آموزشی</>}
          </span>
          {c.images > 1 && <span className="thumb-tag"><Icon name="layers" /> {faDigits(c.images)}</span>}
        </div>
      </div>
      <div className="case-body">
        <div className="case-meta">
          <span>{subspecialtyFa(c.subspecialty)}</span>
          {c.organ && <><span className="sep" /><span>{c.organ}</span></>}
          <span className="sep" />
          <span>{DIFFICULTY[c.difficulty]}</span>
          {c.isDemo && <span className="demo-flag">نمایشی</span>}
        </div>
        <h3 className="case-title">{c.title}</h3>
        {c.diagnosis && <div className="case-dx">{c.diagnosis}</div>}
        <div className="case-foot">
          <span className="avatar avatar-sm">{initials(c.author)}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.author}</span>
          <span className="spacer" />
          <span className="stat" title="پاسخ‌ها"><Icon name="checkCircle" /> {faDigits(c.attempts)}</span>
          <span className="stat" title="نظرها"><Icon name="message" /> {faDigits(c.comments)}</span>
        </div>
      </div>
    </Link>
  );
}
