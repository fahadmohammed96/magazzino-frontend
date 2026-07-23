/**
 * Chiamate di rete e modello del catalogo prodotti verso `magazzino-backend`.
 *
 * Sottile strato tipizzato sopra {@link apiFetch}/{@link apiFetchBlob} che
 * incapsula il contratto catalogo `/v1` (issue BE Catalogo). Non gestisce
 * stato né UI: quelli vivono nei componenti del catalogo. Le scritture
 * (POST/PUT/DELETE/import) sono ammesse dal backend solo all'Admin; il
 * frontend nasconde comunque i comandi all'Operatore (gating lato UI), ma la
 * verità di autorizzazione resta sul backend.
 */

import { apiFetch, apiFetchBlob } from "@/lib/api-client";

/**
 * Prodotto del catalogo, come restituito dagli endpoint `/v1/products`.
 * `low_stock` è calcolato dal backend (`stock_quantity <= low_stock_threshold`)
 * ed è la fonte di verità per il badge sotto-scorta.
 */
export interface Product {
  /** Identificativo (il backend può emetterlo come numero o stringa). */
  readonly id: string | number;
  readonly sku: string;
  readonly name: string;
  readonly description?: string;
  readonly price: number;
  readonly stock_quantity: number;
  readonly low_stock_threshold: number;
  readonly low_stock: boolean;
}

/**
 * Campi editabili di un prodotto, inviati in creazione (POST) e modifica (PUT).
 * `low_stock` e `id` sono derivati/assegnati dal backend e non fanno parte
 * dell'input.
 */
export interface ProductInput {
  sku: string;
  name: string;
  description?: string;
  price: number;
  stock_quantity: number;
  low_stock_threshold: number;
}

/** Errore di una singola riga del CSV di import. */
export interface ImportRowError {
  /** Numero di riga (1-based) nel file caricato. */
  readonly row: number;
  readonly message: string;
}

/** Riepilogo restituito da `POST /v1/products/import`. */
export interface ImportSummary {
  readonly created: number;
  readonly updated: number;
  readonly errors: readonly ImportRowError[];
}

/** Opzioni di {@link listProducts}. */
export interface ListProductsOptions {
  /** Se `true` richiede al backend i soli prodotti sotto-scorta (`?low_stock=true`). */
  lowStockOnly?: boolean;
}

/**
 * Elenca i prodotti del catalogo. Con `lowStockOnly` chiede al backend il solo
 * sottoinsieme sotto-scorta tramite il filtro concordato `?low_stock=true`.
 *
 * @throws {import("@/lib/api-client").ApiError} su errore di rete/backend.
 */
export function listProducts(
  options: ListProductsOptions = {},
): Promise<Product[]> {
  const query = options.lowStockOnly ? "?low_stock=true" : "";
  return apiFetch<Product[]>(`/v1/products${query}`);
}

/**
 * Recupera un singolo prodotto.
 * @throws {import("@/lib/api-client").ApiError} se assente (404) o su altro errore.
 */
export function getProduct(id: Product["id"]): Promise<Product> {
  return apiFetch<Product>(`/v1/products/${encodeURIComponent(String(id))}`);
}

/**
 * Crea un prodotto (solo Admin lato backend).
 * @throws {import("@/lib/api-client").ApiError} su validazione/permessi/rete.
 */
export function createProduct(input: ProductInput): Promise<Product> {
  return apiFetch<Product>("/v1/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/**
 * Aggiorna un prodotto esistente (solo Admin lato backend).
 * @throws {import("@/lib/api-client").ApiError} su validazione/permessi/rete.
 */
export function updateProduct(
  id: Product["id"],
  input: ProductInput,
): Promise<Product> {
  return apiFetch<Product>(`/v1/products/${encodeURIComponent(String(id))}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/**
 * Elimina un prodotto (solo Admin lato backend).
 * @throws {import("@/lib/api-client").ApiError} su permessi/rete.
 */
export function deleteProduct(id: Product["id"]): Promise<void> {
  return apiFetch<void>(`/v1/products/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  });
}

/**
 * Importa un CSV di prodotti (multipart, solo Admin lato backend) e restituisce
 * il riepilogo `created/updated/errors`. Non imposta manualmente il
 * `Content-Type`: il browser aggiunge da solo il boundary del multipart.
 *
 * @throws {import("@/lib/api-client").ApiError} su permessi/formato/rete. Gli
 *   errori di singole righe NON sollevano: tornano in `errors` del riepilogo.
 */
export function importProducts(file: File): Promise<ImportSummary> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<ImportSummary>("/v1/products/import", {
    method: "POST",
    body: form,
  });
}

/**
 * Scarica l'export CSV del catalogo come {@link Blob} (`GET /v1/products/export`).
 * La logica di download (creazione del link e click) sta nel componente, così
 * questa funzione resta testabile senza DOM.
 *
 * @throws {import("@/lib/api-client").ApiError} su permessi/rete.
 */
export function exportProductsCsv(): Promise<Blob> {
  return apiFetchBlob("/v1/products/export");
}
