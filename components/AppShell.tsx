"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";

const APP_NAME = "Magazzino";

/**
 * Cornice dell'area interna: header con marchio e toggle tema, navigazione
 * laterale su desktop e drawer su mobile, area contenuto per le rotte.
 * È solo la shell: nessuna feature di dominio.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Cambio rotta ⇒ chiudi il drawer mobile.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Chiusura con Esc quando il drawer è aperto.
  useEffect(() => {
    if (!menuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="min-h-screen">
      <a
        href="#contenuto-principale"
        className="sr-only rounded-[var(--radius-card)] bg-primary px-4 py-2 text-primary-contrast focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Salta al contenuto
      </a>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface-muted px-4">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Chiudi il menu" : "Apri il menu"}
          aria-expanded={menuOpen}
          aria-controls="navigazione-mobile"
          className="inline-flex size-9 items-center justify-center rounded-[var(--radius-card)] border border-border text-surface-contrast transition-colors duration-200 hover:bg-surface md:hidden"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ☰
          </span>
        </button>

        <Link
          href="/"
          className="font-display text-base font-semibold tracking-tight text-surface-contrast"
        >
          {APP_NAME}
        </Link>

        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl">
        {/* Sidebar desktop */}
        <aside className="hidden w-60 shrink-0 border-r border-border p-4 md:block">
          <NavLinks />
        </aside>

        {/* Drawer mobile */}
        {menuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-surface-contrast/40"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <aside
              id="navigazione-mobile"
              className="absolute left-0 top-0 h-full w-64 border-r border-border bg-surface-muted p-4 shadow-lg"
            >
              <NavLinks onNavigate={() => setMenuOpen(false)} />
            </aside>
          </div>
        )}

        <main
          id="contenuto-principale"
          className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
