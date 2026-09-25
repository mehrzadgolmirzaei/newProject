"use client";
import Link from "@/components/Link";
import { usePathname } from "next/navigation";
import { splitLocale } from "@/lib/i18n/config";
import { useI18n } from "./LocaleProvider";
import { Icon, type IconName } from "./Icon";

export type SideLink = { href: string; label: string; icon: IconName; badge?: number; exact?: boolean };

export function SideNav({ title, links }: { title: string; links: SideLink[] }) {
  const path = splitLocale(usePathname()).path;
  const { f } = useI18n();
  return (
    <nav className="side-nav" aria-label={title}>
      <div className="title">{title}</div>
      {links.map((l) => {
        const active = l.exact ? path === l.href : path === l.href || path.startsWith(l.href + "/");
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
            <Icon name={l.icon} /> {l.label}
            {!!l.badge && <span className="pill">{f.num(l.badge)}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
