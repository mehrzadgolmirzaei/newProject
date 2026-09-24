// حذف همه‌ی داده‌های نمایشی (موارد isDemo و حساب‌های نمونه‌ی seed) پیش از راه‌اندازی واقعی
import { db } from "@/lib/db";
import { removeAssetFiles } from "@/lib/media";

const DEMO_PHONES = ["09120000000", "09121111111", "09122222222", "09123333333", "09124444444", "09125555555"];

async function main() {
  const cases = await db.case.findMany({ where: { isDemo: true }, include: { media: true } });
  for (const c of cases) for (const m of c.media) await removeAssetFiles(m).catch(() => {});
  const r = await db.case.deleteMany({ where: { isDemo: true } });
  console.log(`✓ ${r.count} مورد نمایشی حذف شد.`);
  if (process.argv.includes("--users")) {
    await db.comment.deleteMany({ where: { author: { phone: { in: DEMO_PHONES } } } });
    const u = await db.user.deleteMany({ where: { phone: { in: DEMO_PHONES }, cases: { none: {} } } });
    console.log(`✓ ${u.count} حساب نمونه حذف شد.`);
  } else {
    console.log("برای حذف حساب‌های نمونه هم: npm run demo:clear -- --users");
  }
}

main().finally(() => db.$disconnect());
