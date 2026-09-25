import Link from "@/components/Link";
import type { CaseStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { createDraft } from "@/actions/studio";
import { mediaUrl } from "@/lib/storage";
import { caseCode } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { privateMeta } from "@/lib/seo";
import { CASE_STATUS, CASE_MODE, subspecialtyLabel } from "@/lib/taxonomy";
import { Icon } from "@/components/Icon";
import { Empty } from "@/components/Empty";

export const generateMetadata = () => privateMeta("استودیوی موارد");
export const dynamic = "force-dynamic";

const TONE: Record<CaseStatus, string> = { DRAFT: "", IN_REVIEW: "badge-warn", PUBLISHED: "badge-ok", ARCHIVED: "badge-outline" };

export default async function Studio({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const u = await requireRole(["CONTRIBUTOR", "ADMIN"], "/studio");
  const { s } = await searchParams;
  const { t, f, locale } = await getI18n();
  const { num } = f;
  const filter = (["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"] as const).find((x) => x === s);
  const [rows, groups] = await Promise.all([
    db.case.findMany({
      where: { authorId: u.id, ...(filter ? { status: filter } : {}) },
      orderBy: { updatedAt: "desc" },
      include: {
        media: { where: { status: "READY" }, orderBy: { order: "asc" }, take: 1, select: { thumbKey: true } },
        _count: { select: { attempts: true, comments: { where: { status: "VISIBLE" } } } },
      },
    }),
    db.case.groupBy({ by: ["status"], where: { authorId: u.id }, _count: { _all: true } }),
  ]);
  const count = Object.fromEntries(groups.map((g) => [g.status, g._count._all])) as Partial<Record<CaseStatus, number>>;
  const total = Object.values(count).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="wrap" style={{ paddingTop: 32 }}>
      <div className="dash-head">
        <div>
          <h1>{t("استودیوی موارد")}</h1>
          <p>{u.trusted || u.role === "ADMIN" ? t("موارد شما پس از ارسال مستقیم منتشر می‌شوند.") : t("موارد شما پس از ارسال، توسط مدیر بازبینی و منتشر می‌شوند.")}</p>
        </div>
        <span className="spacer" />
        <form action={createDraft}><button className="btn btn-primary"><Icon name="plus" /> {t("مورد جدید")}</button></form>
      </div>

      <ol className="studio-guide">
        <li><span>{f.digits(1)}</span><div><b>{t("مورد جدید بسازید")}</b><small>{t("نوع مورد (چالشی یا آموزشی) و باز یا بسته بودن گفت‌وگو را انتخاب کنید.")}</small></div></li>
        <li><span>{f.digits(2)}</span><div><b>{t("اطلاعات و تصاویر را وارد کنید")}</b><small>{t("بخش‌های ضروری علامت دارند؛ همه‌چیز خودکار ذخیره می‌شود.")}</small></div></li>
        <li><span>{f.digits(3)}</span><div><b>{u.trusted || u.role === "ADMIN" ? t("منتشر کنید") : t("برای بازبینی بفرستید")}</b><small>{u.trusted || u.role === "ADMIN" ? t("مورد بلافاصله برای پزشکان نمایش داده می‌شود.") : t("پس از تأیید مدیر، مورد برای پزشکان نمایش داده می‌شود.")}</small></div></li>
      </ol>

      <div className="seg" style={{ marginBottom: 16 }}>
        <Link href="/studio" aria-current={!filter}>{t("همه ({n})", { n: num(total) })}</Link>
        {(["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"] as const).map((st) => (
          <Link key={st} href={`/studio?s=${st}`} aria-current={filter === st}>{t("{s} ({n})", { s: t(CASE_STATUS[st]), n: num(count[st] ?? 0) })}</Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty icon="microscope" title={filter ? t("موردی در این وضعیت نیست") : t("هنوز موردی ثبت نکرده‌اید")} text={t("هر مورد با شرح حال، تصاویر، یافته‌ها و تشخیص نهایی ثبت می‌شود. پیش‌نویس‌ها خودکار ذخیره می‌شوند.")} />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t("مورد")}</th><th>{t("وضعیت")}</th><th>{t("نوع")}</th><th>{t("پاسخ / نظر")}</th><th>{t("آخرین تغییر")}</th><th /></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="row gap-12">
                      {c.media[0]?.thumbKey
                        ? <img className="mini-thumb" src={mediaUrl(c.media[0].thumbKey)!} alt="" />  // eslint-disable-line @next/next/no-img-element
                        : <span className="mini-thumb" />}
                      <div>
                        <Link href={`/studio/cases/${c.id}`} className="cell-title">{c.title || t("بدون عنوان")}</Link>
                        <div className="cell-sub">{caseCode(c.number)} · {subspecialtyLabel(c.subspecialty, locale)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${TONE[c.status]}`}>{t(CASE_STATUS[c.status])}</span>
                    {c.status === "DRAFT" && c.reviewNote && <div className="cell-sub" style={{ color: "var(--warn)" }}>{t("بازگشت از بازبینی")}</div>}
                  </td>
                  <td className="muted">{t(CASE_MODE[c.mode].fa)}</td>
                  <td className="muted">{num(c._count.attempts)} / {num(c._count.comments)}</td>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>{f.date(c.updatedAt)}</td>
                  <td>
                    <div className="actions">
                      <Link href={`/studio/cases/${c.id}`} className="btn btn-ghost btn-sm"><Icon name="pencil" /> {t("ویرایش")}</Link>
                      <Link href={`/cases/${c.number}`} className="btn btn-ghost btn-sm"><Icon name="eye" /> {c.status === "PUBLISHED" ? t("مشاهده") : t("پیش‌نمایش")}</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
