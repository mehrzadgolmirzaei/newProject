import "server-only";
import crypto from "node:crypto";
import { promisify } from "node:util";

// رمز عبور با scrypt (بدون وابستگی خارجی) هش می‌شود. قالب ذخیره: scrypt$N$r$p$salt$hash
const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, len: number, opts: crypto.ScryptOptions) => Promise<Buffer>;
const PARAMS = { N: 16384, r: 8, p: 1 };
const KEYLEN = 64;

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEYLEN, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) {
    // زمان پاسخ برای نام کاربری ناموجود هم مشابه بماند
    await scrypt(password, crypto.randomBytes(16), KEYLEN, PARAMS);
    return false;
  }
  const [alg, N, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt") return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length, { N: +N, r: +r, p: +p });
  return crypto.timingSafeEqual(actual, expected);
}

/** نام کاربری: حروف لاتین کوچک، عدد، نقطه و زیرخط؛ ۳ تا ۳۲ نویسه */
export function normalizeUsername(input: string) {
  const s = (input ?? "").trim().toLowerCase();
  return /^[a-z][a-z0-9._]{2,31}$/.test(s) ? s : null;
}

export const PASSWORD_MIN = 8;
