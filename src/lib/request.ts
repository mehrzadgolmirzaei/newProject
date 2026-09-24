import "server-only";
import { headers } from "next/headers";

/** IP کاربر (پشت پروکسی/CDN از x-forwarded-for) */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") || h.get("ar-real-ip") || "unknown";
}

export async function userAgent(): Promise<string> {
  const h = await headers();
  return (h.get("user-agent") || "").slice(0, 300);
}
