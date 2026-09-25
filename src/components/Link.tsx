"use client";

import NextLink from "next/link";
import { useI18n } from "./LocaleProvider";

/** Link با پیشوند زبان جاری: مسیرهای داخلی بدون پیشوند نوشته می‌شوند و /en در صورت نیاز اضافه می‌شود */
export default function Link(props: React.ComponentProps<typeof NextLink>) {
  const { lp } = useI18n();
  const href = typeof props.href === "string" ? lp(props.href) : props.href;
  return <NextLink {...props} href={href} />;
}
