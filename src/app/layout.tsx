import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import "@fontsource-variable/vazirmatn";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Motion } from "@/components/Motion";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.shortName}` },
  description: SITE.description,
  applicationName: SITE.name,
  icons: { icon: "/mark.png", apple: "/mark.png" },
  openGraph: { type: "website", locale: "fa_IR", siteName: SITE.name },
  formatDetection: { telephone: false },
};

async function currentTheme() {
  return parseTheme((await cookies()).get(THEME_COOKIE)?.value);
}

export async function generateViewport(): Promise<Viewport> {
  return { themeColor: (await currentTheme()) === "dark" ? "#0a0d18" : "#ffffff" };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await currentTheme();
  return (
    <html lang="fa" dir="rtl" data-theme={theme}>
      <body>
        <Motion />
        <a href="#main" className="sr-only">رفتن به محتوای اصلی</a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
