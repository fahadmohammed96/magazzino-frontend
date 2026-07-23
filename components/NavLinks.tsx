"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sectionHref, visibleSections } from "@/lib/navigation";
import type { Role } from "@/lib/auth";

interface NavLinksProps {
  /** Ruolo dell'utente corrente: filtra le voci riservate. */
  role?: Role;
  /** Chiamata al click di un link: usata dal drawer mobile per richiudersi. */
  onNavigate?: () => void;
}

interface NavItem {
  href: string;
  label: string;
}

/** Voci di navigazione visibili al ruolo: Panoramica + sezioni consentite. */
function itemsForRole(role: Role | undefined): readonly NavItem[] {
  return [
    { href: "/", label: "Panoramica" },
    ...visibleSections(role).map((section) => ({
      href: sectionHref(section),
      label: section.label,
    })),
  ];
}

/** Un link è attivo se è la home esatta o un prefisso della rotta corrente. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Elenco dei link di navigazione della shell, con evidenziazione della
 * sezione attiva. Condiviso tra sidebar desktop e drawer mobile.
 */
export function NavLinks({ role, onNavigate }: NavLinksProps) {
  const pathname = usePathname();
  const items = itemsForRole(role);

  return (
    <nav aria-label="Sezioni principali">
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
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
