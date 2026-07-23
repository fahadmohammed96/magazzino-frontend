"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS, sectionHref } from "@/lib/navigation";

interface NavLinksProps {
  /** Chiamata al click di un link: usata dal drawer mobile per richiudersi. */
  onNavigate?: () => void;
}

interface NavItem {
  href: string;
  label: string;
}

const ITEMS: readonly NavItem[] = [
  { href: "/", label: "Panoramica" },
  ...NAV_SECTIONS.map((section) => ({
    href: sectionHref(section),
    label: section.label,
  })),
];

/** Un link è attivo se è la home esatta o un prefisso della rotta corrente. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Elenco dei link di navigazione della shell, con evidenziazione della
 * sezione attiva. Condiviso tra sidebar desktop e drawer mobile.
 */
export function NavLinks({ onNavigate }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Sezioni principali">
      <ul className="flex flex-col gap-1">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={[
                  "block rounded-[var(--radius-card)] px-3 py-2 text-sm font-medium transition-colors duration-200",
                  active
                    ? "bg-primary text-primary-contrast"
                    : "text-surface-contrast hover:bg-surface-muted",
                ].join(" ")}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
