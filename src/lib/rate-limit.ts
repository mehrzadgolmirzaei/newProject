import "server-only";
import { db } from "./db";

/**
 * محدودیت نرخ با پنجره‌ی ثابت، ذخیره در Postgres (بدون نیاز به Redis).
 * برمی‌گرداند: ok=false یعنی سقف پر شده، retryAfter ثانیه تا باز شدن.
 * یک کوئری اتمیک — در درخواست‌های هم‌زمان هم دقیق شمارش می‌کند.
 */
export async function hit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; retryAfter: number }> {
  const rows = await db.$queryRaw<{ count: number; windowStart: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSec}) THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSec}) THEN now() ELSE "RateLimit"."windowStart" END
    RETURNING "count", "windowStart"`;
  const { count, windowStart } = rows[0];
  const retryAfter = Math.max(0, Math.ceil((new Date(windowStart).getTime() + windowSec * 1000 - Date.now()) / 1000));
  return { ok: count <= limit, retryAfter };
}

/** پاک‌سازی دوره‌ای رکوردهای قدیمی (از اسکریپت یا هنگام ورود صدا زده می‌شود) */
export async function sweep() {
  await db.$executeRaw`DELETE FROM "RateLimit" WHERE "windowStart" < now() - interval '1 day'`;
}
