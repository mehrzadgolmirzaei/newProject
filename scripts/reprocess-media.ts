// پردازش دوباره‌ی تصاویری که به‌دلیل راه‌اندازی مجدد سرور نیمه‌کاره مانده‌اند یا خطا داده‌اند
//   npm run media:reprocess            ← فقط PROCESSING و FAILED
import { db } from "@/lib/db";
import { processAsset } from "@/lib/media";

async function main() {
  const rows = await db.mediaAsset.findMany({ where: { status: { in: ["PROCESSING", "FAILED", "UPLOADING"] } }, select: { id: true, status: true } });
  console.log(`${rows.length} فایل برای پردازش.`);
  for (const r of rows) {
    await processAsset(r.id);
    const after = await db.mediaAsset.findUnique({ where: { id: r.id }, select: { status: true, error: true } });
    console.log(`  ${r.id}: ${after?.status}${after?.error ? " — " + after.error : ""}`);
  }
}

main().finally(() => db.$disconnect());
