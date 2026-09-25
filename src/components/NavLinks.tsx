"use client";
import Link from "@/components/Link";
import { usePathname } from "next/navigation";
import { splitLocale } from "@/lib/i18n/config";
import { useI18n } from "./LocaleProvider";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const { t } = useI18n();
  const path = splitLocale(usePathname()).path;
  const active = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
  return (
    <nav className="nav" aria-label={t("منوی اصلی")}>
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
