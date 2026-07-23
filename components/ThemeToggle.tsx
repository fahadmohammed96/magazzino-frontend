"use client";

import { useEffect, useState } from "react";
import {
  applyTheme,
  resolveInitialTheme,
  setTheme,
  type Theme,
} from "@/lib/theme";

/**
 * Interruttore del tema chiaro/scuro.
 *
 * Al mount sincronizza lo stato con la classe già applicata dallo script
 * anti-FOUC (vedi `NO_FLASH_THEME_SCRIPT`), così non c'è discrepanza tra
 * server e client. Il click alterna il tema e lo persiste.
 */
export function ThemeToggle() {
  // `null` finché non siamo sul client: evita mismatch di idratazione.
  const [theme, setThemeState] = useState<Theme | null>(null);

  useEffect(() => {
    setThemeState(resolveInitialTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    setTheme(next);
  }

  // Prima dell'idratazione mostriamo un placeholder neutro delle stesse
  // dimensioni, così il layout non salta.
  const isDark = theme === "dark";
  const label = isDark ? "Attiva tema chiaro" : "Attiva tema scuro";

  useEffect(() => {
    // Difesa in profondità: se lo stato cambia per altra via, riallinea il DOM.
    if (theme) applyTheme(theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      aria-pressed={theme === null ? undefined : isDark}
      className="inline-flex size-9 items-center justify-center rounded-[var(--radius-card)] border border-border text-surface-contrast transition-colors duration-200 hover:bg-surface-muted focus-visible:outline-none"
    >
      <span aria-hidden="true" className="text-base leading-none">
        {theme === null ? "" : isDark ? "☀" : "☾"}
      </span>
    </button>
  );
}
