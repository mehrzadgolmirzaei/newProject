import "server-only";
import fsp from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import type { MediaKind } from "@prisma/client";
import { db } from "./db";
import { env } from "./env";
import { INCOMING_DIR, WORK_DIR, putDir, deletePrefix } from "./storage";

const run = promisify(execFile);

// ─── انواع فایل پذیرفته‌شده ─────────────────────────────────────────────────

export const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"];
export const WSI_EXT = [".svs", ".ndpi", ".mrxs", ".scn", ".vms", ".vmu", ".bif", ".svslide"];
export const VIDEO_EXT = [".mp4", ".webm"];

export function kindForExt(ext: string): MediaKind | null {
  const e = ext.toLowerCase();
  if (IMAGE_EXT.includes(e)) return "IMAGE";
  if (WSI_EXT.includes(e)) return env.VIPS_BIN ? "WSI" : null;
  if (VIDEO_EXT.includes(e)) return "VIDEO";
  return null;
}

export const acceptedExtensions = () => [...IMAGE_EXT, ...(env.VIPS_BIN ? WSI_EXT : []), ...VIDEO_EXT];

export const incomingPath = (id: string, ext: string) => path.join(INCOMING_DIR, `${id}${ext}`);

// ─── صف پردازش ─────────────────────────────────────────────────────────────
// پردازش تصویر سنگین است (یک اسلاید کامل ممکن است چند دقیقه طول بکشد)؛
// برای اینکه سرور زیر بار نرود، در هر لحظه فقط یک فایل پردازش می‌شود.

const g = globalThis as unknown as { __mediaQueue?: Promise<void> };

export function enqueue(assetId: string) {
  const prev = g.__mediaQueue ?? Promise.resolve();
  g.__mediaQueue = prev.then(() => processAsset(assetId)).catch((e) => console.error("[media]", e));
  return g.__mediaQueue;
}

// ─── پردازش ───────────────────────────────────────────────────────────────

const TILE = { size: 256, overlap: 1 };

export async function processAsset(assetId: string) {
  const asset = await db.mediaAsset.findUnique({ where: { id: assetId } });
  if (!asset || !asset.sourceExt) return;
  const input = incomingPath(asset.id, asset.sourceExt);
  const work = path.join(WORK_DIR, asset.id);
  const prefix = asset.kind === "VIDEO" ? `videos/${asset.id}` : `slides/${asset.id}`;

  await db.mediaAsset.update({ where: { id: asset.id }, data: { status: "PROCESSING", error: null } });
  try {
    await fsp.access(input);
    await fsp.rm(work, { recursive: true, force: true });
    await fsp.mkdir(work, { recursive: true });

    let result: { width?: number; height?: number; dziKey?: string; thumbKey?: string; previewKey?: string; videoKey?: string };

    if (asset.kind === "IMAGE") result = await processImage(input, work, prefix);
    else if (asset.kind === "WSI") result = await processWsi(input, work, prefix);
    else result = await processVideo(input, work, prefix, asset.sourceExt);

    await putDir(prefix, work);
    await db.mediaAsset.update({
      where: { id: asset.id },
      data: { ...result, status: "READY", sourceKey: null },
    });
    // فایل خام حذف می‌شود — ممکن است برچسب لام یا متادیتای بیمار داشته باشد
    await fsp.rm(input, { force: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[media] ${asset.id} failed:`, msg);
    await fsp.rm(work, { recursive: true, force: true }).catch(() => {});
    await db.mediaAsset.update({ where: { id: asset.id }, data: { status: "FAILED", error: msg.slice(0, 500) } });
  }
}

/** عکس میکروسکوپی ← هرم کاشی Deep Zoom + بندانگشتی. متادیتا (EXIF، GPS، نام دستگاه) حذف می‌شود. */
async function processImage(input: string, work: string, prefix: string) {
  const base = sharp(input, { limitInputPixels: false, failOn: "none" }).rotate(); // اصلاح جهت EXIF
  const info = await base
    .clone()
    .jpeg({ quality: 90 })
    .tile({ ...TILE, layout: "dz", container: "fs" })
    .toFile(path.join(work, "slide.dz"));
  await makeThumbs(base.clone(), work);
  await fsp.rm(path.join(work, "slide_files", "vips-properties.xml"), { force: true });
  return {
    width: info.width,
    height: info.height,
    dziKey: `${prefix}/slide.dzi`,
    thumbKey: `${prefix}/thumb.webp`,
    previewKey: `${prefix}/preview.webp`,
  };
}

/**
 * اسلاید دیجیتال کامل (SVS، NDPI، MRXS…) ← کاشی با vips + OpenSlide.
 * فقط تصویر اصلی خوانده می‌شود؛ «برچسب» و «ماکرو» لام (که اغلب نام یا شماره‌ی
 * پرونده‌ی بیمار دارند) هرگز استخراج نمی‌شوند و متادیتای اسکنر هم حذف می‌شود.
 */
async function processWsi(input: string, work: string, prefix: string) {
  const out = path.join(work, "slide");
  const args = ["dzsave", input, out, "--tile-size", String(TILE.size), "--overlap", String(TILE.overlap), "--suffix", ".jpg[Q=88]"];
  try {
    await run(env.VIPS_BIN, [...args, "--keep", "none"], { maxBuffer: 1 << 24 });
  } catch {
    await run(env.VIPS_BIN, [...args, "--strip"], { maxBuffer: 1 << 24 }); // vips قدیمی‌تر از 8.15
  }
  await fsp.rm(path.join(work, "slide_files", "vips-properties.xml"), { force: true });

  const preview = path.join(work, "_preview.png");
  await run(env.VIPS_BIN, ["thumbnail", input, preview, "1600"], { maxBuffer: 1 << 24 });
  await makeThumbs(sharp(preview), work);
  await fsp.rm(preview, { force: true });

  const xml = await fsp.readFile(path.join(work, "slide.dzi"), "utf8");
  const width = Number(/Width="(\d+)"/.exec(xml)?.[1]) || undefined;
  const height = Number(/Height="(\d+)"/.exec(xml)?.[1]) || undefined;
  return { width, height, dziKey: `${prefix}/slide.dzi`, thumbKey: `${prefix}/thumb.webp`, previewKey: `${prefix}/preview.webp` };
}

async function processVideo(input: string, work: string, prefix: string, ext: string) {
  await fsp.copyFile(input, path.join(work, `video${ext}`));
  return { videoKey: `${prefix}/video${ext}` };
}

async function makeThumbs(img: ReturnType<typeof sharp>, work: string) {
  await img.clone().resize(640, 480, { fit: "cover", position: "attention" }).webp({ quality: 80 }).toFile(path.join(work, "thumb.webp"));
  await img.clone().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toFile(path.join(work, "preview.webp"));
}

/** حذف کامل یک تصویر (کاشی‌ها و فایل خام) */
export async function removeAssetFiles(asset: { id: string; kind: MediaKind; sourceExt: string | null }) {
  await deletePrefix(asset.kind === "VIDEO" ? `videos/${asset.id}` : `slides/${asset.id}`);
  if (asset.sourceExt) await fsp.rm(incomingPath(asset.id, asset.sourceExt), { force: true });
}
