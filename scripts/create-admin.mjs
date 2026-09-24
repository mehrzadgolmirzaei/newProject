// ساخت یا ارتقای حساب مدیر از خط فرمان (بدون وابستگی به TypeScript؛ داخل ایمیج production هم کار می‌کند)
//   npm run admin:create -- --username admin --password "رمز-قوی" --name "دکتر …"
//   npm run admin:create -- --phone 09121234567 --name "دکتر …"          (برای AUTH_METHOD=otp)
//   docker compose exec web node scripts/create-admin.mjs --username admin --password "…"
import crypto from "node:crypto";
import { promisify } from "node:util";
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

// همان قالب src/lib/password.ts
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = await promisify(crypto.scrypt)(password.normalize("NFKC"), salt, 64, { N: 16384, r: 8, p: 1 });
  return ["scrypt", 16384, 8, 1, salt.toString("base64"), hash.toString("base64")].join("$");
}

const username = arg("username")?.trim().toLowerCase();
const password = arg("password");
const phone = arg("phone") ? normalizePhone(arg("phone")) : null;
const name = arg("name");

const usage = 'استفاده: --username admin --password "رمز" [--name "نام"]   یا   --phone 09121234567 [--name "نام"]';
if (username && !/^[a-z][a-z0-9._]{2,31}$/.test(username)) {
  console.error("نام کاربری نامعتبر است (حروف لاتین کوچک، عدد، نقطه یا زیرخط؛ با حرف شروع شود).");
  process.exit(1);
}
if (username && (!password || password.length < 8)) {
  console.error("رمز عبور دست‌کم ۸ نویسه لازم است.\n" + usage);
  process.exit(1);
}
if (!username && !phone) {
  console.error(usage);
  process.exit(1);
}

const db = new PrismaClient();
try {
  const where = username ? { username } : { phone };
  const base = { role: "ADMIN", status: "ACTIVE", approvedAt: new Date() };
  const creds = username ? { passwordHash: await hashPassword(password) } : {};
  const u = await db.user.upsert({
    where,
    update: { ...base, ...creds, ...(name ? { name, profileComplete: true } : {}) },
    create: { ...where, ...base, ...creds, name: name ?? null, profileComplete: !!name },
  });
  console.log(`✓ ${u.username ?? u.phone} اکنون مدیر است.${u.profileComplete ? "" : " پس از نخستین ورود، پروفایل را تکمیل کنید."}`);
} finally {
  await db.$disconnect();
}
