import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { env } from "./env";

// ─── فضای ذخیره‌سازی ───────────────────────────────────────────────────────
// دو درایور با یک رابط:
//   local ← پوشه‌ی STORAGE_DIR، سرو از مسیر /media/...
//   s3    ← فضای ابری سازگار با S3 (لیارا، آروان، MinIO)، سرو مستقیم از MEDIA_PUBLIC_URL
// کد برنامه فقط «کلید» ذخیره می‌کند (مثلاً slides/abc/slide.dzi)، نه آدرس کامل؛
// پس جابه‌جایی بین درایورها داده‌ای را خراب نمی‌کند.

export const STORAGE_ROOT = path.resolve(/*turbopackIgnore: true*/ env.STORAGE_DIR);
/** فایل‌های خام آپلودی، همیشه روی دیسک محلی تا پردازش شوند */
export const INCOMING_DIR = path.join(STORAGE_ROOT, "_incoming");
/** پوشه‌ی کار موقت پردازش */
export const WORK_DIR = path.join(STORAGE_ROOT, "_work");

const CONTENT_TYPES: Record<string, string> = {
  ".dzi": "application/xml",
  ".xml": "application/xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};
export const contentTypeFor = (key: string) => CONTENT_TYPES[path.extname(key).toLowerCase()] ?? "application/octet-stream";

/** کلید معتبر: فقط حروف لاتین، عدد، / _ - . و بدون «..» */
export function safeKey(key: string): string | null {
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(key) || key.includes("..") || key.startsWith("/") || key.startsWith("_")) return null;
  return key;
}

export function mediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (env.STORAGE_DRIVER === "s3") return `${env.MEDIA_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  return `/media/${key}`;
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await fsp.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

async function pool<T>(items: T[], size: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

// ─── S3 ───────────────────────────────────────────────────────────────────

type S3Mod = typeof import("@aws-sdk/client-s3");
let s3cache: { mod: S3Mod; client: InstanceType<S3Mod["S3Client"]> } | null = null;
async function s3() {
  if (s3cache) return s3cache;
  const mod = await import("@aws-sdk/client-s3");
  const client = new mod.S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: true,
    credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
  });
  s3cache = { mod, client };
  return s3cache;
}

// ─── رابط عمومی ───────────────────────────────────────────────────────────

/** بارگذاری همه‌ی فایل‌های یک پوشه‌ی محلی زیر پیشوند prefix (مثلاً کاشی‌های اسلاید) */
export async function putDir(prefix: string, localDir: string) {
  const files = await walk(localDir);
  if (env.STORAGE_DRIVER === "local") {
    const dest = path.join(STORAGE_ROOT, prefix);
    await fsp.rm(dest, { recursive: true, force: true });
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    try {
      await fsp.rename(localDir, dest); // هم‌دیسک ← جابه‌جایی آنی
    } catch {
      await fsp.cp(localDir, dest, { recursive: true });
      await fsp.rm(localDir, { recursive: true, force: true });
    }
    return;
  }
  const { mod, client } = await s3();
  await pool(files, 24, async (file) => {
    const key = `${prefix}/${path.relative(localDir, file).split(path.sep).join("/")}`;
    await client.send(
      new mod.PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: fs.createReadStream(file),
        ContentType: contentTypeFor(key),
        // نام فایل‌ها شامل شناسه‌ی یکتاست و هرگز بازنویسی نمی‌شوند
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  });
  await fsp.rm(localDir, { recursive: true, force: true });
}

export async function deletePrefix(prefix: string) {
  if (!safeKey(prefix)) return;
  if (env.STORAGE_DRIVER === "local") {
    await fsp.rm(path.join(STORAGE_ROOT, prefix), { recursive: true, force: true });
    return;
  }
  const { mod, client } = await s3();
  let token: string | undefined;
  do {
    const list = await client.send(
      new mod.ListObjectsV2Command({ Bucket: env.S3_BUCKET, Prefix: prefix + "/", ContinuationToken: token }),
    );
    const keys = (list.Contents ?? []).map((o) => ({ Key: o.Key! }));
    for (let i = 0; i < keys.length; i += 1000) {
      await client.send(
        new mod.DeleteObjectsCommand({ Bucket: env.S3_BUCKET, Delete: { Objects: keys.slice(i, i + 1000), Quiet: true } }),
      );
    }
    token = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (token);
}

/** مسیر فایل روی دیسک برای درایور local (برای مسیر /media) */
export function localFile(key: string): string | null {
  const k = safeKey(key);
  if (!k) return null;
  const p = path.join(/*turbopackIgnore: true*/ STORAGE_ROOT, k);
  return p.startsWith(STORAGE_ROOT + path.sep) ? p : null;
}
