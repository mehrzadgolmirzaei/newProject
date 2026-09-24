import Link from "next/link";
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

export async function SiteHeader() {
  const user = await getUser();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const pendingReview = isAdmin(user)
    ? (await db.case.count({ where: { status: "IN_REVIEW" } })) + (await db.user.count({ where: { status: "PENDING", profileComplete: true } }))
    : 0;

  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="brand" aria-label={SITE.name}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.png" alt="" className="logo-light" width={107} height={30} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="logo-dark" width={107} height={30} />
        </Link>

        <NavLinks
          links={[
            { href: "/", label: "خانه" },
            { href: "/cases", label: "کتابخانه‌ی موارد" },
            { href: "/subspecialties", label: "زیرتخصص‌ها" },
            { href: "/contributors", label: "ارائه‌دهندگان" },
            { href: "/about", label: "درباره" },
          ]}
        />

        <div className="spacer" />

        <form action="/cases" className="header-search" role="search">
          <Icon name="search" size={17} />
          <input name="q" type="search" placeholder="جست‌وجو در موارد، اندام، یافته‌ها…" aria-label="جست‌وجو" />
        </form>
        <Link href="/cases" className="btn btn-ghost btn-icon mobile-only" aria-label="جست‌وجو">
          <Icon name="search" />
        </Link>
        <div className="mobile-only">
          <Dropdown summary={<span className="btn btn-ghost btn-icon" aria-label="منو"><Icon name="menu" /></span>}>
            <Link href="/"><Icon name="home" size={17} /> خانه</Link>
            <Link href="/cases"><Icon name="microscope" size={17} /> کتابخانه‌ی موارد</Link>
            <Link href="/subspecialties"><Icon name="grid" size={17} /> زیرتخصص‌ها</Link>
            <Link href="/contributors"><Icon name="users" size={17} /> ارائه‌دهندگان</Link>
            <Link href="/about"><Icon name="info" size={17} /> درباره</Link>
          </Dropdown>
        </div>

        <ThemeToggle initial={theme} />

        {user ? (
          <Dropdown
            summary={
              <span className="user-chip">
                <span className="mobile-hide">{user.name || "حساب من"}</span>
                <span className="avatar">{initials(user.name)}</span>
                {pendingReview > 0 && <span className="badge badge-unknown" style={{ height: 20, paddingInline: 7 }}>{pendingReview}</span>}
              </span>
            }
          >
            <div className="menu-head">
              <b style={{ fontSize: 14 }}>{user.name || "کاربر جدید"}</b>
              <div className="muted" style={{ fontSize: 12.5 }}>
                {ROLE[user.role]} · {USER_STATUS[user.status]}
              </div>
            </div>
            <Link href="/account"><Icon name="user" size={17} /> حساب و پیشرفت من</Link>
            <Link href="/account/saved"><Icon name="bookmark" size={17} /> موارد نشان‌شده</Link>
            {isContributor(user) && (
              <>
                <hr />
                <Link href="/studio"><Icon name="microscope" size={17} /> استودیوی موارد من</Link>
              </>
            )}
            {isAdmin(user) && (
              <Link href="/admin"><Icon name="shield" size={17} /> مدیریت {pendingReview > 0 && <span className="badge badge-unknown" style={{ marginInlineStart: "auto", height: 20 }}>{pendingReview}</span>}</Link>
            )}
            <hr />
            <form action={logout}>
              <button type="submit"><Icon name="logout" size={17} /> خروج</button>
            </form>
          </Dropdown>
        ) : (
          <Link href="/login" className="btn btn-primary btn-sm">ورود پزشکان</Link>
        )}
      </div>
    </header>
  );
}
