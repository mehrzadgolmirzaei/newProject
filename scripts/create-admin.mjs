// ساخت یا ارتقای حساب مدیر از خط فرمان (بدون وابستگی به TypeScript؛ داخل ایمیج production هم کار می‌کند)
//   npm run admin:create -- --phone 09121234567 --name "دکتر …"
//   docker compose exec web node scripts/create-admin.mjs --phone 09121234567 --name "دکتر …"
import { PrismaClient } from "@prisma/client";

const arg = (k) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

function normalizePhone(input = "") {
  let s = input.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[\s\-()]/g, "");
  if (s.startsWith("+98")) s = "0" + s.slice(3);
  else if (s.startsWith("0098")) s = "0" + s.slice(4);
  else if (s.startsWith("9") && s.length === 10) s = "0" + s;
  return /^09\d{9}$/.test(s) ? s : null;
}

const db = new PrismaClient();
const phone = normalizePhone(arg("phone"));
const name = arg("name");
if (!phone) {
  console.error('استفاده: --phone 09121234567 --name "نام"');
  process.exit(1);
}
try {
  const u = await db.user.upsert({
    where: { phone },
    update: { role: "ADMIN", status: "ACTIVE", approvedAt: new Date(), ...(name ? { name, profileComplete: true } : {}) },
    create: { phone, name: name ?? null, role: "ADMIN", status: "ACTIVE", approvedAt: new Date(), profileComplete: !!name },
  });
  console.log(`✓ ${u.phone} اکنون مدیر است.${u.profileComplete ? "" : " پس از نخستین ورود، پروفایل را تکمیل کنید."}`);
} finally {
  await db.$disconnect();
}
