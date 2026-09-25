import { NextResponse, type NextRequest } from "next/server";

// ─── زبان و دامنه‌ی اصلی ────────────────────────────────────────────────
// /en/...  ← همان صفحه‌ها با زبان انگلیسی (rewrite به مسیر بدون پیشوند + هدر x-locale)
// /fa/...  ← ریدایرکت دائمی به نسخه‌ی بدون پیشوند (فارسی پیش‌فرض است)
// در production، دسترسی از آدرس‌های فرعی (مثل *.liara.run یا www) به دامنه‌ی اصلی SITE_URL منتقل می‌شود
// تا گوگل فقط یک نسخه از هر صفحه را ببیند.

function canonicalHost(): string | null {
  try {
    return process.env.SITE_URL ? new URL(process.env.SITE_URL).host : null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (process.env.NODE_ENV === "production") {
    const canonical = canonicalHost();
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
    if (canonical && host && host !== canonical && (host.endsWith(".liara.run") || host === `www.${canonical}`)) {
      return NextResponse.redirect(`https://${canonical}${pathname}${search}`, 301);
    }
  }

  if (pathname === "/fa" || pathname.startsWith("/fa/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  const headers = new Headers(request.headers);
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    headers.set("x-locale", "en");
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.rewrite(url, { request: { headers } });
  }
  headers.set("x-locale", "fa");
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // فایل‌های ایستا، تصاویر، API و فایل‌های دارای پسوند (sitemap.xml، robots.txt، …) از proxy عبور نمی‌کنند
  matcher: ["/((?!_next/|media/|api/|images/|.*\\.[a-zA-Z0-9]+$).*)"],
};
