/**
 * Modello e persistenza dell'autenticazione lato client.
 *
 * La dashboard è un'app interna interamente renderizzata al client che
 * consuma il backend `magazzino-backend`: il token Bearer emesso dal login
 * viene conservato in `localStorage` (come la scelta del tema) e riletto a
 * ogni avvio per ripristinare la sessione. Qui vivono SOLO il modello utente
 * e le primitive di storage del token; le chiamate di rete stanno in
 * `lib/auth-api.ts` e lo stato applicativo in `components/AuthProvider.tsx`.
 */

/** Ruoli previsti dal contratto auth del backend. */
export type Role = "admin" | "operator";

/** Utente autenticato, come restituito da `/v1/auth/login` e `/v1/auth/me`. */
export interface AuthUser {
  /** Identificativo dell'utente (il backend può emetterlo come numero o stringa). */
  readonly id: string | number;
  readonly username: string;
  readonly role: Role;
}

/** Chiave di `localStorage` in cui è salvato il token Bearer di sessione. */
export const AUTH_TOKEN_KEY = "magazzino-auth-token";

/**
 * Token Bearer salvato, oppure `null` se non c'è sessione (o `localStorage`
 * non è disponibile — es. modalità privata / SSR).
 */
export function getStoredToken(): string | null {
  try {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    return token && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

/** Persiste il token Bearer di sessione (best-effort). */
export function setStoredToken(token: string): void {
  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // Persistenza best-effort: senza storage la sessione resta comunque
    // valida in memoria fino al reload.
  }
}

/** Rimuove il token Bearer di sessione (logout). */
export function clearStoredToken(): void {
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Nessuna azione: se lo storage non è disponibile non c'è nulla da pulire.
  }
}
