"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ApiError } from "@/lib/api-client";
import {
  allowedTransitions,
  createOrder,
  listOrders,
  updateOrderStatus,
  ORDER_STATUSES,
  STATUS_LABELS,
  type CreateOrderInput,
  type Order,
  type OrderStatus,
} from "@/lib/orders-api";
import { listCustomers, type Customer } from "@/lib/customers-api";
import { listProducts, type Product } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { Modal } from "@/components/Modal";
import { OrderForm } from "@/components/OrderForm";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

/** Estrae un messaggio leggibile da un errore sconosciuto. */
function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/** Etichetta del comando che porta a uno stato di destinazione. */
const TRANSITION_LABELS: Record<OrderStatus, string> = {
  in_attesa: "Rimetti in attesa",
  in_lavorazione: "Avvia lavorazione",
  evaso: "Segna come evaso",
  annullato: "Annulla ordine",
};

/** Dati necessari al form di creazione (clienti + prodotti del catalogo). */
interface FormData {
  status: "loading" | "ready" | "error";
  customers: readonly Customer[];
  products: readonly Product[];
  error: string | null;
}

const INITIAL_FORM_DATA: FormData = {
  status: "loading",
  customers: [],
  products: [],
  error: null,
};

/**
 * Sezione Ordini: creazione di un ordine con totale live, lista filtrabile per
 * stato con totale per riga, dettaglio delle righe e comandi di cambio stato
 * limitati alle transizioni consentite. Consuma il contratto ordini `/v1` via
 * il client API centralizzato; il 401 (sessione scaduta) è gestito a monte.
 */
export function OrdiniView() {
  const [orders, setOrders] = useState<readonly Order[]>([]);
  const [listStatus, setListStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "">("");

  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [updatingId, setUpdatingId] = useState<Order["id"] | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string>("");

  const [detail, setDetail] = useState<Order | null>(null);

  const filterId = useId();
  const newOrderRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setListStatus("loading");
    setListError(null);
    try {
      const data = await listOrders(filter || undefined);
      setOrders(data);
      setListStatus("ready");
    } catch (error) {
      setListError(messageOf(error, "Impossibile caricare gli ordini. Riprova."));
      setListStatus("error");
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadFormData = useCallback(async () => {
    setFormData({ ...INITIAL_FORM_DATA, status: "loading" });
    try {
      const [customers, products] = await Promise.all([
        listCustomers(),
        listProducts(),
      ]);
      setFormData({ status: "ready", customers, products, error: null });
    } catch (error) {
      setFormData({
        status: "error",
        customers: [],
        products: [],
        error: messageOf(error, "Impossibile caricare clienti e prodotti."),
      });
    }
  }, []);

  function openCreate() {
    setSaveError(null);
    setCreating(true);
    void loadFormData();
  }

  function closeCreate() {
    if (saving) return;
    setCreating(false);
  }

  async function handleCreate(input: CreateOrderInput) {
    setSaving(true);
    setSaveError(null);
    try {
      await createOrder(input);
      setCreating(false);
      setActionNotice("Ordine creato.");
      await load();
    } catch (error) {
      setSaveError(messageOf(error, "Creazione non riuscita. Riprova."));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(order: Order, next: OrderStatus) {
    setUpdatingId(order.id);
    setActionError(null);
    setActionNotice("");
    try {
      await updateOrderStatus(order.id, next);
      setActionNotice(`Ordine aggiornato: ${STATUS_LABELS[next]}.`);
      await load();
    } catch (error) {
      setActionError(
        messageOf(error, "Cambio di stato non riuscito. Riprova."),
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section aria-labelledby="titolo-ordini" className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1
            id="titolo-ordini"
            className="font-display text-2xl font-semibold tracking-tight"
          >
            Ordini
          </h1>
          <p className="max-w-prose text-sm text-muted">
            Crea un ordine scegliendo cliente e prodotti, seguine lo stato e
            falne avanzare la lavorazione.
          </p>
        </div>

        <button
          ref={newOrderRef}
          type="button"
          onClick={openCreate}
          className="inline-flex h-9 items-center rounded-[var(--radius-card)] bg-primary px-3 text-sm font-medium text-primary-contrast transition-colors duration-200 hover:bg-accent"
        >
          Nuovo ordine
        </button>
      </header>

      {/* Live region: annuncia l'esito delle azioni (creazione, cambio stato). */}
      <p role="status" aria-live="polite" className="sr-only">
        {actionNotice}
      </p>

      <div className="flex items-center gap-2">
        <label htmlFor={filterId} className="text-sm text-surface-contrast">
          Filtra per stato
        </label>
        <select
          id={filterId}
          value={filter}
          onChange={(e) => setFilter(e.target.value as OrderStatus | "")}
          className="rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2 text-sm text-surface-contrast transition-colors duration-200 focus-visible:border-accent"
        >
          <option value="">Tutti</option>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {actionError && (
        <p
          role="alert"
          className="rounded-[var(--radius-card)] border border-border bg-surface-muted px-3 py-2 text-sm text-danger-fg"
        >
          {actionError}
        </p>
      )}

      {listStatus === "loading" && (
        <p role="status" aria-live="polite" className="text-sm text-muted">
          Caricamento degli ordini…
        </p>
      )}

      {listStatus === "error" && (
        <div className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-dashed border-border p-8">
          <p role="alert" className="text-sm text-danger-fg">
            {listError}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-9 items-center rounded-[var(--radius-card)] border border-border px-3 text-sm font-medium text-surface-contrast transition-colors duration-200 hover:bg-surface-muted"
          >
            Riprova
          </button>
        </div>
      )}

      {listStatus === "ready" && orders.length === 0 && (
        <div className="flex flex-col items-start gap-2 rounded-[var(--radius-card)] border border-dashed border-border p-8">
          <p className="text-sm font-medium text-surface-contrast">
            {filter
              ? `Nessun ordine nello stato «${STATUS_LABELS[filter]}».`
              : "Nessun ordine."}
          </p>
          <p className="max-w-prose text-sm text-muted">
            {filter
              ? "Cambia il filtro oppure crea un nuovo ordine."
              : "Crea il primo ordine scegliendo un cliente e i prodotti."}
          </p>
        </div>
      )}

      {listStatus === "ready" && orders.length > 0 && (
        <div
          role="region"
          aria-label="Elenco degli ordini"
          tabIndex={0}
          className="overflow-x-auto rounded-[var(--radius-card)] border border-border"
        >
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th scope="col" className="px-4 py-3 font-medium">
                  Ordine
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Cliente
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Stato
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Totale
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-4 py-3 font-mono text-xs text-surface-contrast">
                    #{order.id}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    Cliente #{order.customer_id}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-surface-contrast">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDetail(order)}
                        aria-label={`Dettaglio ordine #${order.id}`}
                        className="inline-flex h-8 items-center rounded-[var(--radius-card)] border border-border px-3 text-xs font-medium text-surface-contrast transition-colors duration-200 hover:bg-surface-muted"
                      >
                        Dettaglio
                      </button>
                      {allowedTransitions(order.status).map((next) => (
                        <button
                          key={next}
                          type="button"
                          onClick={() => void changeStatus(order, next)}
                          disabled={updatingId === order.id}
                          className={`inline-flex h-8 items-center rounded-[var(--radius-card)] px-3 text-xs font-medium transition-colors duration-200 disabled:opacity-60 ${
                            next === "annullato"
                              ? "border border-border text-danger-fg hover:bg-surface-muted"
                              : "bg-primary text-primary-contrast hover:bg-accent"
                          }`}
                        >
                          {updatingId === order.id
                            ? "…"
                            : TRANSITION_LABELS[next]}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <Modal title="Nuovo ordine" onClose={closeCreate}>
          {formData.status === "loading" && (
            <p role="status" aria-live="polite" className="text-sm text-muted">
              Caricamento di clienti e prodotti…
            </p>
          )}

          {formData.status === "error" && (
            <div className="flex flex-col items-start gap-3">
              <p role="alert" className="text-sm text-danger-fg">
                {formData.error}
              </p>
              <button
                type="button"
                onClick={() => void loadFormData()}
                className="inline-flex h-9 items-center rounded-[var(--radius-card)] border border-border px-3 text-sm font-medium text-surface-contrast transition-colors duration-200 hover:bg-surface-muted"
              >
                Riprova
              </button>
            </div>
          )}

          {formData.status === "ready" && (
            <OrderForm
              customers={formData.customers}
              products={formData.products}
              onSubmit={handleCreate}
              onCancel={closeCreate}
              submitting={saving}
              submitError={saveError}
            />
          )}
        </Modal>
      )}

      {detail && (
        <Modal title={`Ordine #${detail.id}`} onClose={() => setDetail(null)}>
          <OrderDetail order={detail} />
        </Modal>
      )}
    </section>
  );
}

/** Dettaglio delle righe di un ordine, mostrato nel dialog di dettaglio. */
function OrderDetail({ order }: { order: Order }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted">Cliente #{order.customer_id}</span>
        <OrderStatusBadge status={order.status} />
      </div>

      {order.lines.length === 0 ? (
        <p className="text-sm text-muted">
          Questo ordine non ha righe.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Righe dell&apos;ordine</caption>
            <thead>
              <tr className="border-b border-border bg-surface-muted text-muted">
                <th scope="col" className="px-3 py-2 font-medium">
                  Prodotto
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Q.tà
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Prezzo
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Totale
                </th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line, index) => (
                <tr
                  key={`${line.product_id}-${index}`}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-3 py-2 text-surface-contrast">
                    {line.product_name}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-surface-contrast">
                    {line.quantity}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">
                    {formatPrice(line.unit_price)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-surface-contrast">
                    {formatPrice(line.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <th scope="row" colSpan={3} className="px-3 py-2 text-right font-medium">
                  Totale ordine
                </th>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-surface-contrast">
                  {formatPrice(order.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
