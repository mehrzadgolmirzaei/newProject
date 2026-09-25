import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getI18n, lredirect } from "@/lib/i18n/server";
import { privateMeta } from "@/lib/seo";
import { ProfileForm } from "./ProfileForm";
import { ChangePassword } from "./ChangePassword";

export const generateMetadata = () => privateMeta("تکمیل پروفایل");

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const u = await getUser();
  if (!u) return lredirect("/login");
  const { t } = await getI18n();
  const { next } = await searchParams;
  const full = await db.user.findUniqueOrThrow({ where: { id: u.id }, select: { name: true, medicalNumber: true, specialty: true, institution: true, city: true, passwordHash: true } });
  return (
    <div className="wrap auth">
      <div className="panel panel-pad auth-card" style={{ maxWidth: 560 }}>
        <h1>{u.profileComplete ? t("ویرایش پروفایل") : t("مشخصات پزشکی")}</h1>
        <p className="sub">
          {t("این اطلاعات برای تأیید عضویت شما توسط مدیر سامانه است. نام و رشته‌ی شما کنار نظرهایتان نمایش داده می‌شود؛ شماره‌ی نظام پزشکی هرگز نمایش داده نمی‌شود.")}
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
