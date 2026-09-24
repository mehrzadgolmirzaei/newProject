import fs from "node:fs";
import fsp from "node:fs/promises";
import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { canBrowse, getUser } from "@/lib/auth";
import { contentTypeFor, localFile } from "@/lib/storage";

// سرو فایل‌های رسانه برای درایور local (در درایور s3 فایل‌ها مستقیم از باکت سرو می‌شوند)
export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  if (env.STORAGE_DRIVER !== "local") return new Response("Not found", { status: 404 });
  const { key } = await ctx.params;
  const file = localFile(key.join("/"));
  if (!file) return new Response("Not found", { status: 404 });

  // در حالت «فقط اعضا»، تصاویر هم فقط برای اعضای تأییدشده سرو می‌شوند
  if (env.ATLAS_VISIBILITY === "members" && !canBrowse(await getUser())) return new Response("Forbidden", { status: 403 });

  let stat;
  try {
    stat = await fsp.stat(file);
    if (!stat.isFile()) throw new Error();
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const type = contentTypeFor(file);
  const cache = env.ATLAS_VISIBILITY === "members" ? "private, max-age=86400" : "public, max-age=31536000, immutable";
  const range = req.headers.get("range");

  // پشتیبانی از Range برای پخش و جلو/عقب کردن ویدیو
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m?.[1] ? Number(m[1]) : 0;
    const end = m?.[2] ? Math.min(Number(m[2]), stat.size - 1) : stat.size - 1;
    if (start >= stat.size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
    }
    const stream = Readable.toWeb(fs.createReadStream(file, { start, end })) as unknown as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: {
        "Content-Type": type,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": cache,
      },
    });
  }

  const stream = Readable.toWeb(fs.createReadStream(file)) as unknown as ReadableStream;
  return new Response(stream, {
    headers: { "Content-Type": type, "Content-Length": String(stat.size), "Accept-Ranges": "bytes", "Cache-Control": cache },
  });
}
