import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, UserStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { normalizeFa, toLatinDigits } from "@/lib/text";
import { num } from "@/lib/format";
import { UsersTable } from "@/components/admin/UsersTable";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "کاربران", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Users({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const me = await getUser();
  const status = (["PENDING", "ACTIVE", "SUSPENDED"] as const).find((s) => s === sp.status);
  const q = sp.q ? normalizeFa(sp.q) : "";
  const where: Prisma.UserWhereInput = {
    ...(status ? { status } : {}),
    ...(status === "PENDING" ? { profileComplete: true } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: toLatinDigits(q) } }, { medicalNumber: { contains: toLatinDigits(q) } }] } : {}),
  };
  const [users, groups, pendingReady] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      include: { _count: { select: { cases: true, attempts: true, comments: true } } },
    }),
    db.user.groupBy({ by: ["status"], _count: { _all: true } }),
    db.user.count({ where: { status: "PENDING", profileComplete: true } }),
  ]);
  const c = Object.fromEntries(groups.map((g) => [g.status, g._count._all])) as Partial<Record<UserStatus, number>>;

  return (
    <>
      <div className="dash-head">
        <div>
          <h1>کاربران</h1>
          <p>شماره‌ی نظام پزشکی را در سامانه‌ی نظام پزشکی بررسی کنید و سپس حساب را تأیید کنید. برای اجازه‌ی ثبت مورد، نقش «ارائه‌دهنده» بدهید.</p>
        </div>
      </div>
      <div className="toolbar">
        <div className="seg">
          <Link href="/admin/users" aria-current={!status}>همه</Link>
          <Link href="/admin/users?status=PENDING" aria-current={status === "PENDING"}>در انتظار ({num(pendingReady)})</Link>
          <Link href="/admin/users?status=ACTIVE" aria-current={status === "ACTIVE"}>فعال ({num(c.ACTIVE ?? 0)})</Link>
          <Link href="/admin/users?status=SUSPENDED" aria-current={status === "SUSPENDED"}>معلق ({num(c.SUSPENDED ?? 0)})</Link>
        </div>
        <span className="spacer" />
        <form className="header-search" style={{ display: "flex" }}>
          <Icon name="search" size={16} />
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={sp.q} placeholder="نام، موبایل یا شماره‌ی نظام" />
        </form>
      </div>
      <UsersTable
        meId={me!.id}
        users={users.map((u) => ({
          id: u.id, name: u.name, phone: u.phone, medicalNumber: u.medicalNumber, specialty: u.specialty, institution: u.institution, city: u.city,
          role: u.role, status: u.status, trusted: u.trusted, profileComplete: u.profileComplete, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
          cases: u._count.cases, attempts: u._count.attempts, comments: u._count.comments,
        }))}
      />
    </>
  );
}
