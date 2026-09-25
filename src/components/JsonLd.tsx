/** داده‌ی ساختاریافته (schema.org) برای موتورهای جست‌وجو */
export function JsonLd({ data }: { data: unknown }) {
  // «<» را escape می‌کنیم تا متن کاربر نتواند تگ script را ببندد
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
