/**
 * Chiamate di rete dell'autenticazione verso `magazzino-backend`.
 *
 * Sottile strato tipizzato sopra {@link apiFetch} che incapsula il contratto
 * auth `/v1` concordato col backend. Non gestisce stato né storage: quelli
 * vivono in `components/AuthProvider.tsx`.
 */

import { apiFetch } from "@/lib/api-client";
import type { AuthUser } from "@/lib/auth";

/** Credenziali inviate a `POST /v1/auth/login`. */
export interface Credentials {
  username: string;
  password: string;
}

/** Risposta 200 di `POST /v1/auth/login`. */
export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  user: AuthUser;
}

/**
 * Autentica l'utente. Richiesta pubblica (`auth: false`): un 401 di
 * credenziali errate va mostrato nella pagina di login, non trattato come
 * scadenza di sessione.
 *
 * @throws {import("@/lib/api-client").ApiError} su credenziali errate (401) o
 *   errore di rete/backend.
 */
export function login(credentials: Credentials): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/v1/auth/login", {
    method: "POST",
    auth: false,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
}

/**
 * Risolve l'utente corrente dal token Bearer via `GET /v1/auth/me`.
 * Richiesta autenticata: un 401 innesca il logout automatico gestito dal
 * client API.
 *
 * @throws {import("@/lib/api-client").ApiError} se il token è assente/invalido.
 */
export function fetchMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/v1/auth/me");
}
