import type { Metadata } from "next";
import Link from "next/link";
import { subspecialtyCounts } from "@/lib/cases";
import { SUBSPECIALTIES } from "@/lib/taxonomy";
import { num } from "@/lib/format";

export const metadata: Metadata = { title: "زیرتخصص‌ها" };
export const dynamic = "force-dynamic";

export default async function Subspecialties() {
  const counts = await subspecialtyCounts();
  const sorted = [...SUBSPECIALTIES].sort((a, b) => (counts[b.key] ?? 0) - (counts[a.key] ?? 0));
  return (
    <div className="wrap">
      <div className="page-head">
        <h1>زیرتخصص‌ها</h1>
        <p>موارد اطلس بر اساس زیرتخصص‌های پاتولوژی جراحی، سیتوپاتولوژی و هماتوپاتولوژی دسته‌بندی شده‌اند.</p>
      </div>
      <div className="sub-grid">
        {sorted.map((s) => (
          <Link key={s.key} href={`/cases?sub=${s.key}`} className={`sub-item${counts[s.key] ? "" : " empty"}`}>
            <span>{s.fa}<small className="en">{s.en}</small></span>
            <span className="count">{counts[s.key] ? num(counts[s.key]) : "—"}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
