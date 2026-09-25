import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import "@fontsource-variable/vazirmatn";
import "@fontsource-variable/inter";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Motion } from "@/components/Motion";
import { LocaleProvider } from "@/components/LocaleProvider";
import { SITE } from "@/lib/site";
import { env } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";
import { htmlLang, isRtl } from "@/lib/i18n/config";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  const name = t(SITE.name);
  const verification: Metadata["verification"] = {
    ...(env.GOOGLE_SITE_VERIFICATION ? { google: env.GOOGLE_SITE_VERIFICATION } : {}),
    ...(env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": env.BING_SITE_VERIFICATION } } : {}),
  };
  return {
    metadataBase: new URL(env.SITE_URL),
    ...pageMeta({ locale, path: "/" }),
    title: { default: `${name} — ${t(SITE.tagline)}`, template: `%s · ${name}` },
    applicationName: name,
    icons: {
      icon: [{ url: "/favicon-48.png", sizes: "48x48", type: "image/png" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      apple: "/apple-icon.png",
    },
    formatDetection: { telephone: false },
    verification,
    category: "medical education",
  };
}

async function currentTheme() {
  return parseTheme((await cookies()).get(THEME_COOKIE)?.value);
}

export async function generateViewport(): Promise<Viewport> {
  return { themeColor: (await currentTheme()) === "dark" ? "#0a0d18" : "#ffffff" };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await currentTheme();
  const { locale, t } = await getI18n();
  return (
    <html lang={htmlLang(locale)} dir={isRtl(locale) ? "rtl" : "ltr"} data-theme={theme}>
      <body>
        <LocaleProvider locale={locale}>
          <Motion />
          <a href="#main" className="sr-only">{t("رفتن به محتوای اصلی")}</a>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </LocaleProvider>
      </body>
    </html>
  );
}
