import Link from "next/link";
import { faDigits } from "@/lib/text";

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const nums: (number | "…")[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  return (
    <nav className="pager" aria-label="صفحه‌بندی">
      {page > 1 && <Link href={href(page - 1)} style={{ paddingInline: 14 }}>قبلی</Link>}
      {nums.map((n, i) =>
        n === "…" ? <span key={`e${i}`} style={{ border: 0, background: "none" }}>…</span>
        : <Link key={n} href={href(n)} aria-current={n === page ? "page" : undefined}>{faDigits(n)}</Link>,
      )}
      {page < pages && <Link href={href(page + 1)} style={{ paddingInline: 14 }}>بعدی</Link>}
    </nav>
  );
}
