"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/components/AuthProvider";
import type { Role } from "@/lib/auth";

const APP_NAME = "Magazzino";

/** Etichetta leggibile del ruolo mostrata nell'header. */
const ROLE_LABEL: Record<Role, string> = {
  admin: "Amministratore",
  operator: "Operatore",
};

/**
 * Cornice dell'area interna: header con marchio e toggle tema, navigazione
 * laterale su desktop e drawer modale su mobile, area contenuto per le rotte.
 * È solo la shell: nessuna feature di dominio.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const role = user?.role;
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  // Cambio rotta ⇒ chiudi il drawer mobile.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Semantica modale del drawer: quando è aperto sposta il focus al suo
  // interno, lo intrappola (Tab/Shift+Tab in ciclo), chiude con Esc e al
  // termine restituisce il focus all'hamburger che lo ha aperto. Lo sfondo è
  // reso `inert` nel markup, così non è né focusabile né esplorabile.
  useEffect(() => {
    if (!menuOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Nodo che ha aperto il drawer: è persistente, lo catturiamo ora per
    // ripristinargli il focus alla chiusura (evita ref.current nel cleanup).
    const opener = hamburgerRef.current;

    const focusables = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

    // Porta il focus sul primo elemento interattivo del drawer.
    focusables()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (active && !dialog!.contains(active)) {
        // Il focus è sfuggito fuori dal drawer: riportalo dentro.
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Ripristina il focus sul controllo che ha aperto il drawer.
      opener?.focus();
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen">
      <a
        href="#contenuto-principale"
        className="sr-only rounded-[var(--radius-card)] bg-primary px-4 py-2 text-primary-contrast focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Salta al contenuto
      </a>

      {/* Contenuto dell'app: reso inerte quando il drawer modale è aperto. */}
      <div inert={menuOpen || undefined}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface-muted px-4">
          <button
            ref={hamburgerRef}
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

          <div className="ml-auto flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-muted sm:inline">
                <span className="font-medium text-surface-contrast">
                  {user.username}
                </span>
                <span aria-hidden="true"> · </span>
                {ROLE_LABEL[user.role]}
              </span>
            )}
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-9 items-center rounded-[var(--radius-card)] border border-border px-3 text-sm font-medium text-surface-contrast transition-colors duration-200 hover:bg-surface"
            >
              Esci
            </button>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-7xl">
          {/* Sidebar desktop */}
          <aside className="hidden w-60 shrink-0 border-r border-border p-4 md:block">
            <NavLinks role={role} />
          </aside>

          <main
            id="contenuto-principale"
            className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8"
          >
            {children}
          </main>
        </div>
      </div>

      {/* Drawer mobile — modale: fuori dal contenitore inerte. */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-surface-contrast/40"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <aside
            ref={dialogRef}
            id="navigazione-mobile"
            role="dialog"
            aria-modal="true"
            aria-label="Navigazione"
            className="absolute left-0 top-0 h-full w-64 border-r border-border bg-surface-muted p-4 shadow-lg"
          >
            <NavLinks role={role} onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}
