/**
 * Gestione del tema chiaro/scuro della shell.
 *
 * La fonte di verità del colore sono i token in `app/globals.css`: qui si
 * decide soltanto *quale* variante (`light` / `dark`) è attiva, applicando o
 * rimuovendo la classe `.dark` sull'elemento <html>. La scelta è persistita
 * in `localStorage`; in assenza di una scelta esplicita si segue la
 * preferenza di sistema (`prefers-color-scheme`).
 */

export type Theme = "light" | "dark";

/** Chiave di `localStorage` in cui è salvata la scelta esplicita dell'utente. */
export const THEME_STORAGE_KEY = "magazzino-theme";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Restituisce il tema salvato esplicitamente dall'utente, oppure `null` se
 * non è mai stata fatta una scelta (o `localStorage` non è disponibile).
 */
export function getStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    // localStorage può lanciare (modalità privata, storage disabilitato).
    return null;
  }
}

/** Preferenza di tema del sistema operativo/browser. */
export function getSystemTheme(): Theme {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Tema da usare al primo render: scelta esplicita se presente, altrimenti
 * preferenza di sistema.
 */
export function resolveInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

/** Applica il tema al DOM aggiungendo/rimuovendo la classe `.dark` su <html>. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

/** Applica il tema e lo persiste come scelta esplicita dell'utente. */
export function setTheme(theme: Theme): void {
  applyTheme(theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Persistenza best-effort: il tema resta comunque applicato per la sessione.
  }
}

/**
 * Script inline (senza dipendenze) eseguito prima dell'idratazione per
 * applicare il tema corretto ed evitare il flash di tema errato (FOUC).
 * Volutamente una stringa: viene iniettato in `app/layout.tsx`.
 */
export const NO_FLASH_THEME_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var s=localStorage.getItem(k);var d=s==="dark"||(s!=="light"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
