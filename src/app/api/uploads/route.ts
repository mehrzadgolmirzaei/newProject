import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { after, NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { canEditCase, getUser } from "@/lib/auth";
import { enqueue, incomingPath, kindForExt } from "@/lib/media";
import { INCOMING_DIR } from "@/lib/storage";

// آپلود یک فایل تصویر/اسلاید به‌صورت جریانی (بدنه‌ی خام، نه multipart)
// تا فایل‌های چندگیگابایتی اسلاید کامل بدون پر کردن حافظه‌ی سرور ذخیره شوند.
//   PUT /api/uploads?caseId=...&ext=.svs

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const err = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export async function PUT(req: NextRequest) {
  // محافظت CSRF: درخواست باید از خود سایت آمده باشد
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) return err("درخواست نامعتبر است.", 403);

  const user = await getUser();
  const caseId = req.nextUrl.searchParams.get("caseId") ?? "";
  const ext = (req.nextUrl.searchParams.get("ext") ?? "").toLowerCase();

  const c = await db.case.findUnique({ where: { id: caseId }, select: { id: true, authorId: true, status: true } });
  if (!c || !canEditCase(user, c)) return err("اجازه‌ی افزودن تصویر به این مورد را ندارید.", 403);

  const kind = /^\.[a-z0-9]{2,8}$/.test(ext) ? kindForExt(ext) : null;
  if (!kind) return err("این نوع فایل پشتیبانی نمی‌شود.", 415);

  const max = env.MAX_UPLOAD_MB * 1024 * 1024;
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > max) return err(`حجم فایل بیش از ${env.MAX_UPLOAD_MB} مگابایت است.`, 413);
  if (!req.body) return err("فایلی دریافت نشد.", 400);

  const count = await db.mediaAsset.count({ where: { caseId: c.id } });
  if (count >= 40) return err("حداکثر ۴۰ تصویر برای هر مورد.", 400);

  const asset = await db.mediaAsset.create({
    data: { caseId: c.id, kind, sourceExt: ext, status: "UPLOADING", order: count, uploadedById: user!.id },
  });

  const dest = incomingPath(asset.id, ext);
  await fsp.mkdir(INCOMING_DIR, { recursive: true });
  let bytes = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      bytes += chunk.length;
      if (bytes > max) cb(new Error("too-large"));
      else cb(null, chunk);
    },
  });

  try {
    await pipeline(Readable.fromWeb(req.body as import("node:stream/web").ReadableStream), limiter, fs.createWriteStream(dest));
  } catch (e) {
    await fsp.rm(dest, { force: true });
    await db.mediaAsset.delete({ where: { id: asset.id } });
    const tooLarge = e instanceof Error && e.message === "too-large";
    return err(tooLarge ? `حجم فایل بیش از ${env.MAX_UPLOAD_MB} مگابایت است.` : "بارگذاری فایل ناتمام ماند.", tooLarge ? 413 : 400);
  }

  await db.mediaAsset.update({
    where: { id: asset.id },
    data: { status: "PROCESSING", sourceKey: path.basename(dest), sourceSize: BigInt(bytes) },
  });
  // پردازش پس از ارسال پاسخ انجام می‌شود؛ کاربر منتظر تبدیل تصویر نمی‌ماند
  after(() => enqueue(asset.id));
  return NextResponse.json({ id: asset.id });
}
