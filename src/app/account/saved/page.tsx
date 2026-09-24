import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cardsByIds } from "@/lib/cases";
import { CaseCard } from "@/components/CaseCard";
import { Empty } from "@/components/Empty";

export const metadata: Metadata = { title: "موارد نشان‌شده", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Saved() {
  const u = await requireUser("/account/saved");
  const saved = await db.savedCase.findMany({ where: { userId: u.id, case: { status: "PUBLISHED" } }, orderBy: { createdAt: "desc" }, select: { caseId: true } });
  const cards = await cardsByIds(saved.map((s) => s.caseId), u);
  return (
    <>
      <div className="dash-head"><div><h1>موارد نشان‌شده</h1><p>مواردی که برای مرور دوباره نگه داشته‌اید</p></div></div>
      {cards.length === 0 ? (
        <Empty icon="bookmark" title="موردی نشان نکرده‌اید" text="در صفحه‌ی هر مورد، دکمه‌ی «نشان‌کردن» را بزنید.">
          <Link href="/cases" className="btn btn-secondary">مرور اطلس</Link>
        </Empty>
      ) : (
        <div className="case-grid">{cards.map((c) => <CaseCard key={c.id} c={c} />)}</div>
      )}
    </>
  );
}
