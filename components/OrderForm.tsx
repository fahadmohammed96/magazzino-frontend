"use client";

import { useId, useMemo, useState } from "react";
import type { Customer } from "@/lib/customers-api";
import type { Product } from "@/lib/products";
import type { CreateOrderInput } from "@/lib/orders-api";
import { formatPrice } from "@/lib/format";
import { LowStockBadge } from "@/components/LowStockBadge";

/** Classi condivise dai controlli del form (coerenti con gli altri form). */
const FIELD_CLASS =
  "rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2 text-sm text-surface-contrast transition-colors duration-200 focus-visible:border-accent disabled:opacity-60";

/** Riga in editing nel form: identità stabile + selezione prodotto e quantità. */
interface DraftLine {
  /** Chiave stabile per il rendering, indipendente dal prodotto scelto. */
  readonly key: string;
  /** Id del prodotto selezionato come stringa (`""` = nessuna selezione). */
  productId: string;
  quantity: number;
}

/** Crea una riga vuota con chiave stabile derivata da un contatore monotono. */
function emptyLine(seq: number): DraftLine {
  return { key: `line-${seq}`, productId: "", quantity: 1 };
}

/**
 * Form di creazione ordine. Presentazionale: riceve clienti e prodotti già
 * caricati e delega al contenitore lo stato di rete (invio, errore backend).
 *
 * Selezione del cliente, aggiunta/rimozione di righe prodotto con quantità e
 * **totale calcolato live** (somma di `quantità × prezzo di catalogo`) man mano
 * che le righe cambiano. I prezzi mostrati sono quelli del catalogo: il totale
 * definitivo è ricalcolato e restituito dal backend alla creazione.
 */
export function OrderForm({
  customers,
  products,
  onSubmit,
  onCancel,
  submitting,
  submitError,
}: {
  customers: readonly Customer[];
  products: readonly Product[];
  onSubmit: (input: CreateOrderInput) => void;
  onCancel: () => void;
  /** `true` mentre la richiesta è in corso: disabilita i controlli. */
  submitting: boolean;
  /** Messaggio d'errore del backend da mostrare in cima al form. */
  submitError: string | null;
}) {
  const customerId = useId();
  const customerErrId = useId();
  const linesErrId = useId();
  const submitErrId = useId();
  const totalId = useId();

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [nextSeq, setNextSeq] = useState(1);
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(0)]);
  const [errors, setErrors] = useState<{
    customer?: string;
    lines?: string;
  }>({});

  // Prezzo per id-prodotto, per il calcolo del totale live e del totale riga.
  const priceById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of products) map.set(String(product.id), product);
    return map;
  }, [products]);

  /** Totale di una riga: `quantità × prezzo di catalogo` (0 se non risolta). */
  function lineTotal(line: DraftLine): number {
    const product = priceById.get(line.productId);
    if (!product) return 0;
    return product.price * line.quantity;
  }

  const total = lines.reduce((sum, line) => sum + lineTotal(line), 0);

  function addLine() {
    setLines((current) => [...current, emptyLine(nextSeq)]);
    setNextSeq((seq) => seq + 1);
  }

  function removeLine(key: string) {
    setLines((current) =>
      current.length === 1 ? current : current.filter((l) => l.key !== key),
    );
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) =>
      current.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const filled = lines.filter((l) => l.productId !== "");
    const nextErrors: typeof errors = {};
    if (selectedCustomer === "") {
      nextErrors.customer = "Seleziona un cliente.";
    }
    if (filled.length === 0) {
      nextErrors.lines = "Aggiungi almeno una riga con un prodotto.";
    } else if (filled.some((l) => !Number.isInteger(l.quantity) || l.quantity < 1)) {
      nextErrors.lines = "Le quantità devono essere numeri interi maggiori di zero.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Risolvi gli id originali (numero o stringa) preservandone il tipo.
    const customer = customers.find(
      (c) => String(c.id) === selectedCustomer,
    );
    if (!customer) {
      setErrors({ customer: "Seleziona un cliente." });
      return;
    }

    onSubmit({
      customer_id: customer.id,
      lines: filled.map((l) => ({
        product_id: priceById.get(l.productId)!.id,
        quantity: l.quantity,
      })),
    });
  }

  const noCustomers = customers.length === 0;
  const noProducts = products.length === 0;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {submitError && (
        <p
          id={submitErrId}
          role="alert"
          className="rounded-[var(--radius-card)] border border-border bg-surface-muted px-3 py-2 text-sm text-danger-fg"
        >
          {submitError}
        </p>
      )}

      {(noCustomers || noProducts) && (
        <p className="rounded-[var(--radius-card)] border border-dashed border-border px-3 py-2 text-sm text-muted">
          {noCustomers
            ? "Non ci sono clienti in anagrafica: creane uno nella sezione Clienti prima di aprire un ordine."
            : "Il catalogo è vuoto: aggiungi prodotti prima di creare un ordine."}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={customerId} className="text-sm font-medium">
          Cliente <span aria-hidden="true">*</span>
        </label>
        <select
          id={customerId}
          required
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
          aria-invalid={errors.customer !== undefined}
          aria-describedby={errors.customer ? customerErrId : undefined}
          disabled={submitting || noCustomers}
          className={FIELD_CLASS}
        >
          <option value="">— Seleziona un cliente —</option>
          {customers.map((customer) => (
            <option key={customer.id} value={String(customer.id)}>
              {customer.ragione_sociale}
            </option>
          ))}
        </select>
        {errors.customer && (
          <p id={customerErrId} role="alert" className="text-sm text-danger-fg">
            {errors.customer}
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-3 border-0 p-0">
        <legend className="text-sm font-medium">Righe dell&apos;ordine</legend>

        <ul className="flex flex-col gap-3">
          {lines.map((line, index) => {
            const product = priceById.get(line.productId);
            return (
              <li
                key={line.key}
                className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border p-3 sm:flex-row sm:items-end"
              >
                <div className="flex flex-1 flex-col gap-1.5">
                  <label
                    htmlFor={`${line.key}-product`}
                    className="text-xs font-medium text-muted"
                  >
                    Prodotto
                  </label>
                  <select
                    id={`${line.key}-product`}
                    value={line.productId}
                    onChange={(e) =>
                      updateLine(line.key, { productId: e.target.value })
                    }
                    disabled={submitting || noProducts}
                    className={FIELD_CLASS}
                  >
                    <option value="">— Seleziona un prodotto —</option>
                    {products.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name} · {formatPrice(p.price)}
                      </option>
                    ))}
                  </select>
                  {product?.low_stock && (
                    <span className="mt-0.5">
                      <LowStockBadge />
                    </span>
                  )}
                </div>

                <div className="flex w-full flex-col gap-1.5 sm:w-24">
                  <label
                    htmlFor={`${line.key}-qty`}
                    className="text-xs font-medium text-muted"
                  >
                    Quantità
                  </label>
                  <input
                    id={`${line.key}-qty`}
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(line.key, {
                        quantity: Number.parseInt(e.target.value, 10) || 0,
                      })
                    }
                    disabled={submitting}
                    className={`${FIELD_CLASS} tabular-nums`}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <span
                    className="text-sm tabular-nums text-surface-contrast"
                    aria-label={`Totale riga ${index + 1}`}
                  >
                    {formatPrice(lineTotal(line))}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    disabled={submitting || lines.length === 1}
                    aria-label={`Rimuovi riga ${index + 1}`}
                    className="inline-flex h-8 items-center rounded-[var(--radius-card)] border border-border px-2 text-xs font-medium text-danger-fg transition-colors duration-200 hover:bg-surface-muted disabled:opacity-40"
                  >
                    Rimuovi
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {errors.lines && (
          <p id={linesErrId} role="alert" className="text-sm text-danger-fg">
            {errors.lines}
          </p>
        )}

        <div>
          <button
            type="button"
            onClick={addLine}
            disabled={submitting || noProducts}
            className="inline-flex h-9 items-center rounded-[var(--radius-card)] border border-border px-3 text-sm font-medium text-surface-contrast transition-colors duration-200 hover:bg-surface-muted disabled:opacity-60"
          >
            + Aggiungi riga
          </button>
        </div>
      </fieldset>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm font-medium text-muted">Totale ordine</span>
        <span
          id={totalId}
          role="status"
          aria-live="polite"
          className="text-lg font-semibold tabular-nums text-surface-contrast"
        >
          {formatPrice(total)}
        </span>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-card)] border border-border px-4 text-sm font-medium text-surface-contrast transition-colors duration-200 hover:bg-surface-muted disabled:opacity-60"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={submitting || noCustomers || noProducts}
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-card)] bg-primary px-4 text-sm font-medium text-primary-contrast transition-colors duration-200 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creazione…" : "Crea ordine"}
        </button>
      </div>
    </form>
  );
}
