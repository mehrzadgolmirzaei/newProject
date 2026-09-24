import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canBrowse, getUser } from "@/lib/auth";
import { featuredCase } from "@/lib/cases";
import { env } from "@/lib/env";
import { Icon } from "@/components/Icon";
import { LoginForm } from "./LoginForm";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "ورود پزشکان", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const user = await getUser();
  if (user) redirect(user.profileComplete ? safeNext : "/onboarding");
  // تصویر تزئینی فقط وقتی محتوای موارد برای مهمان عمومی است
  const feat = canBrowse(null) ? await featuredCase(null) : null;

  return (
    <div className="wrap auth">
      <div className="auth-split">
        <div className="panel auth-card">
          {env.AUTH_METHOD === "password" ? <PasswordForm next={safeNext} allowRegister /> : <LoginForm next={safeNext} />}
        </div>
        <aside className="auth-visual" aria-hidden="true">
          <span className="blob blob-1" />
          <span className="blob blob-2" />
          {feat?.preview && (
            <div className="mini-lens">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={feat.preview} alt="" />
            </div>
          )}
          <h2>آموزش پاتولوژی بر پایه‌ی موارد واقعی و دشوار</h2>
          <p>تشخیص خود را ثبت کنید، با پاسخ ارائه‌دهنده مقایسه کنید و از تجربه‌ی همکاران بیاموزید.</p>
          <ul>
            <li><Icon name="check" size={16} /> تصاویر با بزرگ‌نمایی عمیق</li>
            <li><Icon name="check" size={16} /> پاسخ پنهان تا ثبت تشخیص شما</li>
            <li><Icon name="check" size={16} /> گفت‌وگوی علمی با پاتولوژیست‌ها</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
