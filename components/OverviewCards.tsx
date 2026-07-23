"use client";

import Link from "next/link";
import { sectionHref, visibleSections } from "@/lib/navigation";
import { useAuth } from "@/components/AuthProvider";

/**
 * Griglia di accesso alle sezioni nella panoramica. Rende solo le sezioni
 * visibili al ruolo dell'utente corrente, coerentemente con la navigazione
 * laterale: un Operatore non vede le voci riservate all'Admin.
 */
export function OverviewCards() {
  const { user } = useAuth();
  const sections = visibleSections(user?.role);

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sections.map((section) => (
        <li key={section.slug}>
          <Link
            href={sectionHref(section)}
            className="flex h-full flex-col gap-2 rounded-[var(--radius-card)] border border-border p-5 transition-colors duration-200 hover:bg-surface-muted"
          >
            <span className="font-display text-lg font-semibold text-surface-contrast">
              {section.label}
            </span>
            <span className="text-sm text-muted">{section.description}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
