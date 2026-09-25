import type { NextConfig } from "next";

const mediaOrigin = (() => {
  try {
    return process.env.MEDIA_PUBLIC_URL ? new URL(process.env.MEDIA_PUBLIC_URL).origin : "";
  } catch {
    return "";
  }
})();

const isProd = process.env.NODE_ENV === "production";

// سیاست امنیت محتوا — فقط منابع خود سایت و فضای رسانه
const csp = [
  "default-src 'self'",
  `img-src 'self' data: blob: ${mediaOrigin}`.trim(),
  `media-src 'self' blob: ${mediaOrigin}`.trim(),
  `connect-src 'self' ${mediaOrigin}`.trim(),
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  // Next.js برای hydration به اسکریپت درون‌خطی نیاز دارد؛ در توسعه eval هم لازم است
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

// ساخت کم‌حافظه برای سرورهای build (مثلاً لیارا): بررسی TypeScript در build انجام نمی‌شود
// (در توسعه با npm run typecheck انجام می‌شود) و تعداد پردازش‌های موازی محدود است.
const lowMemBuild = process.env.LOW_MEMORY_BUILD === "1";

const nextConfig: NextConfig = {
  output: "standalone",
  ...(lowMemBuild ? { typescript: { ignoreBuildErrors: true }, experimental: { cpus: 1 } } : {}),
  poweredByHeader: false,
  serverExternalPackages: ["sharp", "@prisma/client"],
  async headers() {
    const headers = [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
    ];
    if (isProd) headers.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" });
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
