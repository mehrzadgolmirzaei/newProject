import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileForm } from "./ProfileForm";
import { ChangePassword } from "./ChangePassword";

export const metadata: Metadata = { title: "تکمیل پروفایل", robots: { index: false } };

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const u = await getUser();
  if (!u) redirect("/login");
  const { next } = await searchParams;
  const full = await db.user.findUniqueOrThrow({ where: { id: u.id }, select: { name: true, medicalNumber: true, specialty: true, institution: true, city: true, passwordHash: true } });
  return (
    <div className="wrap auth">
      <div className="panel panel-pad auth-card" style={{ maxWidth: 560 }}>
        <h1>{u.profileComplete ? "ویرایش پروفایل" : "مشخصات پزشکی"}</h1>
        <p className="sub">
          این اطلاعات برای تأیید عضویت شما توسط مدیر سامانه است. نام و رشته‌ی شما کنار نظرهایتان نمایش داده می‌شود؛ شماره‌ی نظام پزشکی هرگز نمایش داده نمی‌شود.
        </p>
        <ProfileForm
          initial={{
            name: full.name ?? "",
            medicalNumber: full.medicalNumber ?? "",
            specialty: full.specialty ?? "",
            institution: full.institution ?? "",
            city: full.city ?? "",
          }}
          next={next && next.startsWith("/") && !next.startsWith("//") ? next : "/account"}
          editing={u.profileComplete}
        />
        {u.profileComplete && full.passwordHash && (
          <>
            <hr className="sep" />
            <ChangePassword />
          </>
        )}
      </div>
    </div>
  );
}
