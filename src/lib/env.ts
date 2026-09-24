import "server-only";
import { z } from "zod";

// همه‌ی تنظیمات یک‌جا و با اعتبارسنجی. اگر مقداری در production اشتباه باشد،
// برنامه همان ابتدا با پیام روشن متوقف می‌شود — نه اینکه بی‌صدا با مقدار ناامن ادامه دهد.

const isProd = process.env.NODE_ENV === "production";
// هنگام build مقادیر واقعی production در دسترس نیستند؛ بررسی سخت‌گیرانه فقط در زمان اجرا
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

const schema = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL تنظیم نشده است"),
    SITE_URL: z.string().url().default("http://localhost:3000"),
    ATLAS_VISIBILITY: z.enum(["public", "members"]).default("public"),
    AUTH_SECRET: z.string().default("dev-only-secret-do-not-use-in-production"),

    SMS_DRIVER: z.enum(["console", "kavenegar", "smsir"]).default("console"),
    SMS_API_KEY: z.string().default(""),
    SMS_TEMPLATE: z.string().default(""),

    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    STORAGE_DIR: z.string().default("./storage"),
    S3_ENDPOINT: z.string().default(""),
    S3_REGION: z.string().default("default"),
    S3_BUCKET: z.string().default(""),
    S3_ACCESS_KEY: z.string().default(""),
    S3_SECRET_KEY: z.string().default(""),
    MEDIA_PUBLIC_URL: z.string().default(""),

    MAX_UPLOAD_MB: z.coerce.number().int().positive().default(4096),
    VIPS_BIN: z.string().default(""),
  })
  .superRefine((e, ctx) => {
    if (isProd && !isBuild) {
      if (e.AUTH_SECRET.length < 32 || e.AUTH_SECRET.startsWith("dev-only") || e.AUTH_SECRET.startsWith("replace-"))
        ctx.addIssue({ code: "custom", path: ["AUTH_SECRET"], message: "در production یک رشته‌ی تصادفی ۳۲+ نویسه لازم است" });
      if (e.SMS_DRIVER === "console")
        ctx.addIssue({ code: "custom", path: ["SMS_DRIVER"], message: "در production باید kavenegar یا smsir باشد" });
      if (e.SMS_DRIVER !== "console" && (!e.SMS_API_KEY || !e.SMS_TEMPLATE))
        ctx.addIssue({ code: "custom", path: ["SMS_API_KEY"], message: "کلید و الگوی پیامک لازم است" });
    }
    if (e.STORAGE_DRIVER === "s3") {
      for (const k of ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY", "S3_SECRET_KEY", "MEDIA_PUBLIC_URL"] as const)
        if (!e[k]) ctx.addIssue({ code: "custom", path: [k], message: "برای STORAGE_DRIVER=s3 لازم است" });
    }
  });

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`تنظیمات .env نامعتبر است:\n${lines}`);
  }
  return parsed.data;
}

export const env = load();
export const isProduction = isProd;
