import "server-only";
import { env } from "./env";

// ارسال کد تأیید با «الگو»ی پنل پیامک (سریع‌ترین مسیر، بدون نیاز به خط اختصاصی).
// در پنل کاوه‌نگار یا sms.ir یک الگو با متغیر کد بسازید و نام/شناسه‌اش را در SMS_TEMPLATE بگذارید.

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  switch (env.SMS_DRIVER) {
    case "console":
      console.info(`\n[SMS:dev] کد ورود برای ${phone}: ${code}\n`);
      return;

    case "kavenegar": {
      // https://kavenegar.com/rest.html#sms-Lookup
      const url = new URL(`https://api.kavenegar.com/v1/${encodeURIComponent(env.SMS_API_KEY)}/verify/lookup.json`);
      url.searchParams.set("receptor", phone);
      url.searchParams.set("token", code);
      url.searchParams.set("template", env.SMS_TEMPLATE);
      const res = await fetch(url, { method: "POST", signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`kavenegar ${res.status}: ${await res.text().catch(() => "")}`);
      return;
    }

    case "smsir": {
      // https://app.sms.ir/developer/help/verify
      const res = await fetch("https://api.sms.ir/v1/send/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/plain", "x-api-key": env.SMS_API_KEY },
        body: JSON.stringify({
          mobile: phone,
          templateId: Number(env.SMS_TEMPLATE),
          parameters: [{ name: "CODE", value: code }],
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const data = (await res.json().catch(() => ({}))) as { status?: number; message?: string };
      if (!res.ok || data.status !== 1) throw new Error(`sms.ir ${res.status}: ${data.message ?? ""}`);
      return;
    }
  }
}
