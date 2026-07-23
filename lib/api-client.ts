/**
 * Client API centralizzato del frontend.
 *
 * Unico punto d'ingresso verso `magazzino-backend`. Legge la base URL da
 * `NEXT_PUBLIC_API_BASE_URL` e normalizza il formato d'errore concordato
 * col backend:
 *
 *     { "error": { "code": "...", "message": "..." } }
 *
 * NB: qui NON vive alcuna chiamata di dominio (catalogo, clienti, ordini).
 * Gli endpoint specifici si aggiungeranno nelle issue di Fase 2, sopra
 * questo layer, una volta fissati i contratti nell'OpenAPI del backend.
 */

/** Corpo d'errore concordato col backend. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

/** Codice usato quando la causa dell'errore non è un payload del backend. */
export const UNKNOWN_ERROR_CODE = "unknown";

/**
 * Errore normalizzato sollevato da {@link apiFetch} per qualsiasi esito non
 * riuscito (HTTP non-2xx, errore di rete, risposta non interpretabile).
 * Espone sempre un `code` e un `message` stabili per la UI.
 */
export class ApiError extends Error {
  /** Codice macchina (`error.code` del backend, o `UNKNOWN_ERROR_CODE`). */
  readonly code: string;
  /** Status HTTP, se la richiesta ha raggiunto il server. */
  readonly status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/** Type guard: verifica che un valore rispetti la forma `ApiErrorBody`. */
export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return false;
  }
  const { error } = value as Record<"error", unknown>;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as Record<string, unknown>).code === "string" &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

/**
 * Base URL del backend, presa da `NEXT_PUBLIC_API_BASE_URL`.
 * @throws {ApiError} se la variabile non è configurata.
 */
export function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new ApiError(
      "config_missing",
      "NEXT_PUBLIC_API_BASE_URL non è configurata: impossibile contattare il backend.",
    );
  }
  return baseUrl.replace(/\/+$/, "");
}

function buildUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl}/${path.replace(/^\/+/, "")}`;
}

/**
 * Configurazione dell'autenticazione del client API. È registrata una sola
 * volta dallo strato applicativo (`AuthProvider`) e permette a `apiFetch` di
 * restare disaccoppiato da React: legge il token corrente e notifica la
 * scadenza della sessione (401) senza conoscere il router né lo store.
 */
interface ApiAuthConfig {
  /** Restituisce il token Bearer corrente, o `null` se non autenticato. */
  getToken: () => string | null;
  /** Invocata quando una richiesta autenticata riceve 401 (sessione scaduta). */
  onUnauthorized: () => void;
}

let authTokenProvider: () => string | null = () => null;
let unauthorizedHandler: (() => void) | null = null;

/**
 * Registra la sorgente del token e l'handler di sessione scaduta.
 * Chiamata dall'`AuthProvider` al mount; sostituisce eventuali registrazioni
 * precedenti (l'app ha un solo provider attivo).
 */
export function configureApiAuth(config: ApiAuthConfig): void {
  authTokenProvider = config.getToken;
  unauthorizedHandler = config.onUnauthorized;
}

/** Ripristina lo stato di default (nessun token, nessun handler). */
export function resetApiAuth(): void {
  authTokenProvider = () => null;
  unauthorizedHandler = null;
}

/** Opzioni di {@link apiFetch}: quelle di `fetch` più il controllo dell'auth. */
export interface ApiFetchOptions extends RequestInit {
  /**
   * Se `true` (default) allega `Authorization: Bearer <token>` quando un token
   * è disponibile e, su 401, invoca l'handler di sessione scaduta. Le
   * richieste pubbliche (es. il login stesso) passano `auth: false`, così un
   * 401 di credenziali errate resta un errore locale da mostrare in pagina.
   */
  auth?: boolean;
}

/**
 * Esegue una richiesta verso il backend e restituisce il corpo JSON tipizzato.
 *
 * - Antepone la base URL e imposta `Accept: application/json`.
 * - In caso di risposta non-2xx prova a leggere il formato d'errore
 *   concordato e solleva un {@link ApiError} con `code`/`message` del backend;
 *   se il corpo non è interpretabile, usa un messaggio di fallback.
 * - Gli errori di rete diventano un {@link ApiError} con code `network_error`.
 * - `204 No Content` (o corpo vuoto) restituisce `undefined`.
 *
 * @typeParam T - forma attesa del corpo di risposta.
 * @throws {ApiError} per ogni esito non riuscito.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { auth = true, ...init } = options;
  const url = buildUrl(getApiBaseUrl(), path);

  const token = auth ? authTokenProvider() : null;

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(
      "network_error",
      "Impossibile raggiungere il backend. Verifica la connessione e riprova.",
      undefined,
    );
  }

  if (!response.ok) {
    // Una richiesta autenticata che riceve 401 significa sessione scaduta o
    // token invalido: notifica lo strato applicativo (logout + redirect).
    if (response.status === 401 && auth && unauthorizedHandler) {
      unauthorizedHandler();
    }
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (text.length === 0) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(
      "invalid_response",
      "Risposta del backend non valida (JSON non interpretabile).",
      response.status,
    );
  }
}

/** Converte una risposta non-2xx nel corrispondente {@link ApiError}. */
async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (isApiErrorBody(body)) {
    return new ApiError(body.error.code, body.error.message, response.status);
  }

  return new ApiError(
    UNKNOWN_ERROR_CODE,
    `Richiesta fallita (HTTP ${response.status}).`,
    response.status,
  );
}
