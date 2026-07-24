/**
 * Chiamate di rete dell'anagrafica clienti verso `magazzino-backend`.
 *
 * Sottile strato tipizzato sopra {@link apiFetch} che incapsula il contratto
 * clienti `/v1` (definito con la issue BE clienti). Non gestisce stato né
 * storage: quelli vivono nei componenti che consumano questo layer.
 *
 * Contratto:
 *   Customer `{ id, ragione_sociale, piva?, codice_fiscale?,
 *     indirizzo_spedizione, contatti: { email?, telefono? } }`
 *   - `GET    /v1/customers` (+ `?q=`)
 *   - `GET    /v1/customers/{id}`
 *   - `POST   /v1/customers`
 *   - `PUT    /v1/customers/{id}`
 *   - `DELETE /v1/customers/{id}`
 */

import { apiFetch } from "@/lib/api-client";

/** Recapiti di un cliente; entrambi i campi sono opzionali nel contratto. */
export interface CustomerContacts {
  email?: string;
  telefono?: string;
}

/** Cliente come restituito dal backend. */
export interface Customer {
  /** Identificativo del cliente (il backend può emetterlo numero o stringa). */
  readonly id: string | number;
  readonly ragione_sociale: string;
  readonly piva?: string;
  readonly codice_fiscale?: string;
  readonly indirizzo_spedizione: string;
  readonly contatti: CustomerContacts;
}

/**
 * Dati inviati in creazione (`POST`) e modifica (`PUT`). Coincide col
 * {@link Customer} senza `id`: l'identificativo lo assegna/riconosce il
 * backend, non è mai inviato nel corpo.
 */
export interface CustomerInput {
  ragione_sociale: string;
  piva?: string;
  codice_fiscale?: string;
  indirizzo_spedizione: string;
  contatti: CustomerContacts;
}

/** Segmento URL sicuro per un id (numero o stringa) del cliente. */
function idSegment(id: Customer["id"]): string {
  return encodeURIComponent(String(id));
}

/**
 * Elenca i clienti. Con `q` non vuoto filtra per ragione sociale lato backend
 * (`?q=`); la stringa viene ripulita e codificata.
 *
 * @throws {import("@/lib/api-client").ApiError} su errore di rete/backend.
 */
export function listCustomers(q?: string): Promise<Customer[]> {
  const query = q?.trim();
  const path = query
    ? `/v1/customers?q=${encodeURIComponent(query)}`
    : "/v1/customers";
  return apiFetch<Customer[]>(path);
}

/**
 * Legge un singolo cliente per id.
 *
 * @throws {import("@/lib/api-client").ApiError} se assente (404) o su errore.
 */
export function getCustomer(id: Customer["id"]): Promise<Customer> {
  return apiFetch<Customer>(`/v1/customers/${idSegment(id)}`);
}

/**
 * Crea un cliente.
 *
 * @throws {import("@/lib/api-client").ApiError} su validazione backend (422) o
 *   errore di rete.
 */
export function createCustomer(input: CustomerInput): Promise<Customer> {
  return apiFetch<Customer>("/v1/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/**
 * Aggiorna un cliente esistente.
 *
 * @throws {import("@/lib/api-client").ApiError} se assente (404), su
 *   validazione backend (422) o errore di rete.
 */
export function updateCustomer(
  id: Customer["id"],
  input: CustomerInput,
): Promise<Customer> {
  return apiFetch<Customer>(`/v1/customers/${idSegment(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/**
 * Elimina un cliente. Il backend risponde `204 No Content`.
 *
 * @throws {import("@/lib/api-client").ApiError} se assente (404) o su errore.
 */
export async function deleteCustomer(id: Customer["id"]): Promise<void> {
  await apiFetch<void>(`/v1/customers/${idSegment(id)}`, { method: "DELETE" });
}
