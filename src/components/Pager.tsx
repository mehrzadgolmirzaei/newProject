import Link from "@/components/Link";
import { getI18n } from "@/lib/i18n/server";

export async function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const { t, f } = await getI18n();
  const nums: (number | "…")[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  return (
    <nav className="pager" aria-label={t("صفحه‌بندی")}>
      {page > 1 && <Link href={href(page - 1)} style={{ paddingInline: 14 }}>{t("قبلی")}</Link>}
      {nums.map((n, i) =>
        n === "…" ? <span key={`e${i}`} style={{ border: 0, background: "none" }}>…</span>
        : <Link key={n} href={href(n)} aria-current={n === page ? "page" : undefined}>{f.digits(n)}</Link>,
      )}
      {page < pages && <Link href={href(page + 1)} style={{ paddingInline: 14 }}>{t("بعدی")}</Link>}
    </nav>
  );
}
