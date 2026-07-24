/**
 * Chiamate di rete e modello degli ordini verso `magazzino-backend`.
 *
 * Sottile strato tipizzato sopra {@link apiFetch} che incapsula il contratto
 * ordini `/v1` (definito con la issue BE Ordini). Non gestisce stato né UI:
 * quelli vivono nei componenti degli ordini.
 *
 * Contratto:
 *   Order `{ id, customer_id, status, lines: [{ product_id, product_name,
 *     quantity, unit_price, line_total }], total }`
 *   Stati: `in_attesa` → `in_lavorazione` → `evaso`; `annullato` da
 *     `in_attesa`/`in_lavorazione`.
 *   - `POST  /v1/orders`            crea un ordine
 *   - `GET   /v1/orders` (+ `?status=`)
 *   - `GET   /v1/orders/{id}`
 *   - `PATCH /v1/orders/{id}/status`  cambia lo stato
 *
 * In creazione il frontend invia solo `customer_id` e le righe come
 * `{ product_id, quantity }`: prezzi unitari, totali di riga, nome prodotto e
 * totale d'ordine sono calcolati e restituiti dal backend (fonte di verità).
 */

import { apiFetch } from "@/lib/api-client";
import type { Customer } from "@/lib/customers-api";
import type { Product } from "@/lib/products";

/** Stati possibili di un ordine, come da contratto backend. */
export type OrderStatus =
  | "in_attesa"
  | "in_lavorazione"
  | "evaso"
  | "annullato";

/** Elenco ordinato degli stati (usato per il filtro della lista). */
export const ORDER_STATUSES: readonly OrderStatus[] = [
  "in_attesa",
  "in_lavorazione",
  "evaso",
  "annullato",
] as const;

/** Etichette leggibili degli stati (italiano, dashboard interna). */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  in_attesa: "In attesa",
  in_lavorazione: "In lavorazione",
  evaso: "Evaso",
  annullato: "Annullato",
};

/**
 * Transizioni di stato consentite dal contratto, per stato corrente:
 *   `in_attesa`     → `in_lavorazione`, `annullato`
 *   `in_lavorazione`→ `evaso`, `annullato`
 *   `evaso`         → (terminale)
 *   `annullato`     → (terminale)
 *
 * È la stessa matrice applicata dal backend; qui pilota quali comandi di
 * cambio stato mostrare. La verità di autorizzazione resta sul backend, che
 * può comunque rifiutare (es. 409 per scorte insufficienti).
 */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  in_attesa: ["in_lavorazione", "annullato"],
  in_lavorazione: ["evaso", "annullato"],
  evaso: [],
  annullato: [],
};

/** Transizioni di stato consentite a partire dallo stato dato. */
export function allowedTransitions(
  status: OrderStatus,
): readonly OrderStatus[] {
  return TRANSITIONS[status] ?? [];
}

/** Riga di un ordine come restituita dal backend. */
export interface OrderLine {
  readonly product_id: Product["id"];
  readonly product_name: string;
  readonly quantity: number;
  readonly unit_price: number;
  readonly line_total: number;
}

/** Ordine come restituito dagli endpoint `/v1/orders`. */
export interface Order {
  /** Identificativo (il backend può emetterlo come numero o stringa). */
  readonly id: string | number;
  readonly customer_id: Customer["id"];
  readonly status: OrderStatus;
  readonly lines: readonly OrderLine[];
  readonly total: number;
}

/** Riga inviata in creazione: prezzo e totale li calcola il backend. */
export interface OrderLineInput {
  product_id: Product["id"];
  quantity: number;
}

/** Corpo inviato a `POST /v1/orders`. */
export interface CreateOrderInput {
  customer_id: Customer["id"];
  lines: OrderLineInput[];
}

/** Segmento URL sicuro per un id (numero o stringa) dell'ordine. */
function idSegment(id: Order["id"]): string {
  return encodeURIComponent(String(id));
}

/**
 * Elenca gli ordini. Con `status` filtra lato backend (`?status=`) per il solo
 * stato indicato; senza filtro restituisce tutti gli ordini.
 *
 * @throws {import("@/lib/api-client").ApiError} su errore di rete/backend.
 */
export function listOrders(status?: OrderStatus): Promise<Order[]> {
  const path = status
    ? `/v1/orders?status=${encodeURIComponent(status)}`
    : "/v1/orders";
  return apiFetch<Order[]>(path);
}

/**
 * Recupera un singolo ordine con le sue righe.
 *
 * @throws {import("@/lib/api-client").ApiError} se assente (404) o su errore.
 */
export function getOrder(id: Order["id"]): Promise<Order> {
  return apiFetch<Order>(`/v1/orders/${idSegment(id)}`);
}

/**
 * Crea un ordine per un cliente con le righe indicate. Il backend valida
 * disponibilità e prezzi e restituisce l'ordine completo (righe valorizzate e
 * totale).
 *
 * @throws {import("@/lib/api-client").ApiError} su validazione (422), scorte
 *   insufficienti (409) o errore di rete.
 */
export function createOrder(input: CreateOrderInput): Promise<Order> {
  return apiFetch<Order>("/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/**
 * Cambia lo stato di un ordine (`PATCH /v1/orders/{id}/status`). Il backend
 * applica la stessa matrice di transizioni ed è l'autorità finale: una
 * transizione non valida o scorte insufficienti tornano come `ApiError`
 * (tipicamente 409) da mostrare all'utente.
 *
 * @throws {import("@/lib/api-client").ApiError} su transizione non valida /
 *   scorte insufficienti (409), assenza (404) o errore di rete.
 */
export function updateOrderStatus(
  id: Order["id"],
  status: OrderStatus,
): Promise<Order> {
  return apiFetch<Order>(`/v1/orders/${idSegment(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}
