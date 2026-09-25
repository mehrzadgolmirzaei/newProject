import Link from "@/components/Link";
import { getUser, isAdmin, isContributor } from "@/lib/auth";
import { db } from "@/lib/db";
import { initials } from "@/lib/text";
import { ROLE, USER_STATUS } from "@/lib/taxonomy";
import { logout } from "@/actions/auth";
import { Icon } from "./Icon";
import { NavLinks } from "./NavLinks";
import { Dropdown } from "./Dropdown";
import { SITE } from "@/lib/site";
import { cookies } from "next/headers";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { ThemeToggle } from "./ThemeToggle";
import { LangSwitch } from "./LangSwitch";
import { Suspense } from "react";
import { getI18n } from "@/lib/i18n/server";

export async function SiteHeader() {
  const user = await getUser();
  const { t, lp } = await getI18n();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const pendingReview = isAdmin(user)
    ? (await db.case.count({ where: { status: "IN_REVIEW" } })) + (await db.user.count({ where: { status: "PENDING", profileComplete: true } }))
    : 0;

  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="brand" aria-label={t(SITE.name)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.png" alt="" className="logo-light" width={107} height={30} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="logo-dark" width={107} height={30} />
        </Link>

        <NavLinks
          links={[
            { href: "/", label: t("خانه") },
            { href: "/cases", label: t("کتابخانه‌ی موارد") },
            { href: "/subspecialties", label: t("زیرتخصص‌ها") },
            { href: "/contributors", label: t("ارائه‌دهندگان") },
            { href: "/about", label: t("درباره") },
          ]}
        />

        <div className="spacer" />

        <form action={lp("/cases")} className="header-search" role="search">
          <Icon name="search" size={17} />
          <input name="q" type="search" placeholder={t("جست‌وجو در موارد، اندام، یافته‌ها…")} aria-label={t("جست‌وجو")} />
        </form>
        <Link href="/cases" className="btn btn-ghost btn-icon mobile-only" aria-label={t("جست‌وجو")}>
          <Icon name="search" />
        </Link>
        <div className="mobile-only">
          <Dropdown summary={<span className="btn btn-ghost btn-icon" aria-label={t("منو")}><Icon name="menu" /></span>}>
            <Link href="/"><Icon name="home" size={17} /> {t("خانه")}</Link>
            <Link href="/cases"><Icon name="microscope" size={17} /> {t("کتابخانه‌ی موارد")}</Link>
            <Link href="/subspecialties"><Icon name="grid" size={17} /> {t("زیرتخصص‌ها")}</Link>
            <Link href="/contributors"><Icon name="users" size={17} /> {t("ارائه‌دهندگان")}</Link>
            <Link href="/about"><Icon name="info" size={17} /> {t("درباره")}</Link>
          </Dropdown>
        </div>

        <Suspense fallback={null}><LangSwitch /></Suspense>
        <ThemeToggle initial={theme} />

        {user ? (
          <Dropdown
            summary={
              <span className="user-chip">
                <span className="mobile-hide">{user.name || t("حساب من")}</span>
                <span className="avatar">{initials(user.name)}</span>
                {pendingReview > 0 && <span className="badge badge-unknown" style={{ height: 20, paddingInline: 7 }}>{pendingReview}</span>}
              </span>
            }
          >
            <div className="menu-head">
              <b style={{ fontSize: 14 }}>{user.name || t("کاربر جدید")}</b>
              <div className="muted" style={{ fontSize: 12.5 }}>
                {t(ROLE[user.role])} · {t(USER_STATUS[user.status])}
              </div>
            </div>
            <Link href="/account"><Icon name="user" size={17} /> {t("حساب و پیشرفت من")}</Link>
            <Link href="/account/saved"><Icon name="bookmark" size={17} /> {t("موارد نشان‌شده")}</Link>
            {isContributor(user) && (
              <>
                <hr />
                <Link href="/studio"><Icon name="microscope" size={17} /> {t("استودیوی موارد من")}</Link>
              </>
            )}
            {isAdmin(user) && (
              <Link href="/admin"><Icon name="shield" size={17} /> {t("مدیریت")} {pendingReview > 0 && <span className="badge badge-unknown" style={{ marginInlineStart: "auto", height: 20 }}>{pendingReview}</span>}</Link>
            )}
            <hr />
            <form action={logout}>
              <button type="submit"><Icon name="logout" size={17} /> {t("خروج")}</button>
            </form>
          </Dropdown>
        ) : (
          <Link href="/login" className="btn btn-primary btn-sm"><span className="lbl-long">{t("ورود پزشکان")}</span><span className="lbl-short">{t("ورود")}</span></Link>
        )}
      </div>
    </header>
  );
}
