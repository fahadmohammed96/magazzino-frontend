"use client";

import { useEffect, useId, useState } from "react";
import { ApiError } from "@/lib/api-client";
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
  type Customer,
  type CustomerInput,
} from "@/lib/customers-api";
import { CustomerForm } from "@/components/CustomerForm";
import { Modal } from "@/components/Modal";

/** Ritardo (ms) del debounce sulla ricerca: evita una richiesta per tasto. */
const SEARCH_DEBOUNCE_MS = 250;

/** Stato del caricamento dell'elenco. */
type ListState = "loading" | "ready" | "error";

/** Dialog attualmente aperto sopra l'elenco (nessuno se `null`). */
type Dialog =
  | { kind: "create" }
  | { kind: "edit"; customer: Customer }
  | { kind: "delete"; customer: Customer };

/** Messaggio leggibile da un errore, con fallback generico. */
function errorMessage(cause: unknown): string {
  return cause instanceof ApiError
    ? cause.message
    : "Si è verificato un errore. Riprova.";
}

/** Riepilogo dei recapiti per la cella contatti (o trattino se assenti). */
function contactSummary(customer: Customer): string {
  const parts = [customer.contatti.email, customer.contatti.telefono].filter(
    (v): v is string => Boolean(v && v.trim()),
  );
  return parts.length > 0 ? parts.join(" · ") : "—";
}

/**
 * Anagrafica clienti: elenco con ricerca per ragione sociale e gestione
 * completa (crea/modifica/elimina) via dialog modale. Consuma `customers-api`
 * sopra il client API centralizzato; il 401 (sessione scaduta) è gestito a
 * monte con logout/redirect. Gestisce esplicitamente gli stati di
 * caricamento, errore ed elenco vuoto.
 */
export function ClientiView() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [listState, setListState] = useState<ListState>("loading");
  const [listError, setListError] = useState<string | null>(null);

  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const searchId = useId();
  const deleteDescId = useId();

  // Debounce della ricerca: la query effettiva insegue quella digitata.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Carica l'elenco a ogni cambio di query effettiva o richiesta di reload.
  useEffect(() => {
    let active = true;
    setListState("loading");
    setListError(null);
    listCustomers(debouncedQuery)
      .then((data) => {
        if (!active) return;
        setCustomers(data);
        setListState("ready");
      })
      .catch((cause) => {
        if (!active) return;
        setListError(errorMessage(cause));
        setListState("error");
      });
    return () => {
      active = false;
    };
  }, [debouncedQuery, reloadKey]);

  /** Forza un nuovo caricamento dell'elenco (retry o refresh post-mutazione). */
  function reload() {
    setReloadKey((key) => key + 1);
  }

  function openCreate() {
    setSaveError(null);
    setDialog({ kind: "create" });
  }

  function openEdit(customer: Customer) {
    setSaveError(null);
    setDialog({ kind: "edit", customer });
  }

  function openDelete(customer: Customer) {
    setDeleteError(null);
    setDialog({ kind: "delete", customer });
  }

  function closeDialog() {
    if (saving || deleting) return;
    setDialog(null);
  }

  async function handleSubmit(input: CustomerInput) {
    if (!dialog || dialog.kind === "delete") return;
    setSaving(true);
    setSaveError(null);
    try {
      if (dialog.kind === "edit") {
        await updateCustomer(dialog.customer.id, input);
      } else {
        await createCustomer(input);
      }
      setDialog(null);
      reload();
    } catch (cause) {
      setSaveError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (dialog?.kind !== "delete") return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCustomer(dialog.customer.id);
      setDialog(null);
      reload();
    } catch (cause) {
      setDeleteError(errorMessage(cause));
    } finally {
      setDeleting(false);
    }
  }

  const trimmedQuery = debouncedQuery.trim();

  return (
    <section aria-labelledby="titolo-clienti" className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1
            id="titolo-clienti"
            className="font-display text-2xl font-semibold tracking-tight"
          >
            Clienti
          </h1>
          <p className="max-w-prose text-sm text-muted">
            Anagrafica dei clienti selezionabili nella creazione degli ordini.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-card)] bg-primary px-4 text-sm font-medium text-primary-contrast transition-colors duration-200 hover:bg-accent"
        >
          Nuovo cliente
        </button>
      </header>

      <search>
        <label htmlFor={searchId} className="sr-only">
          Cerca per ragione sociale
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per ragione sociale…"
          className="w-full max-w-sm rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2 text-sm text-surface-contrast transition-colors duration-200 focus-visible:border-accent"
        />
      </search>

      <div aria-live="polite" className="min-h-24">
        {listState === "loading" && <CustomersSkeleton />}

        {listState === "error" && (
          <div className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-dashed border-border p-6">
            <p className="text-sm font-medium text-surface-contrast">
              Impossibile caricare i clienti
            </p>
            <p className="max-w-prose text-sm text-muted">{listError}</p>
            <button
              type="button"
              onClick={reload}
              className="inline-flex h-9 items-center rounded-[var(--radius-card)] border border-border px-3 text-sm font-medium text-surface-contrast transition-colors duration-200 hover:bg-surface-muted"
            >
              Riprova
            </button>
          </div>
        )}

        {listState === "ready" && customers.length === 0 && (
          <div className="flex flex-col items-start gap-2 rounded-[var(--radius-card)] border border-dashed border-border p-8">
            <p className="text-sm font-medium text-surface-contrast">
              {trimmedQuery
                ? `Nessun cliente corrisponde a «${trimmedQuery}»`
                : "Nessun cliente"}
            </p>
            <p className="max-w-prose text-sm text-muted">
              {trimmedQuery
                ? "Modifica la ricerca oppure crea un nuovo cliente."
                : "Crea il primo cliente per iniziare a popolare l'anagrafica."}
            </p>
          </div>
        )}

        {listState === "ready" && customers.length > 0 && (
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">Elenco dei clienti</caption>
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Ragione sociale
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    P.IVA / C.F.
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Contatti
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium text-surface-contrast">
                      {customer.ragione_sociale}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {customer.piva || customer.codice_fiscale || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {contactSummary(customer)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(customer)}
                          aria-label={`Modifica ${customer.ragione_sociale}`}
                          className="inline-flex h-8 items-center rounded-[var(--radius-card)] border border-border px-3 text-sm font-medium text-surface-contrast transition-colors duration-200 hover:bg-surface-muted"
                        >
                          Modifica
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(customer)}
                          aria-label={`Elimina ${customer.ragione_sociale}`}
                          className="inline-flex h-8 items-center rounded-[var(--radius-card)] border border-border px-3 text-sm font-medium text-surface-contrast transition-colors duration-200 hover:bg-surface-muted"
                        >
                          Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(dialog?.kind === "create" || dialog?.kind === "edit") && (
        <Modal
          title={dialog.kind === "edit" ? "Modifica cliente" : "Nuovo cliente"}
          onClose={closeDialog}
        >
          <CustomerForm
            initial={dialog.kind === "edit" ? dialog.customer : undefined}
            onSubmit={handleSubmit}
            onCancel={closeDialog}
            submitting={saving}
            submitError={saveError}
          />
        </Modal>
      )}

      {dialog?.kind === "delete" && (
        <Modal
          title="Elimina cliente"
          onClose={closeDialog}
          describedById={deleteDescId}
        >
          <div className="flex flex-col gap-4">
            <p id={deleteDescId} className="text-sm text-surface-contrast">
              Vuoi eliminare{" "}
              <span className="font-medium">
                {dialog.customer.ragione_sociale}
              </span>
              ? L&apos;operazione non è reversibile.
            </p>

            {deleteError && (
              <p
                role="alert"
                className="rounded-[var(--radius-card)] border border-border bg-surface-muted px-3 py-2 text-sm text-surface-contrast"
              >
                {deleteError}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDialog}
                disabled={deleting}
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-card)] border border-border px-4 text-sm font-medium text-surface-contrast transition-colors duration-200 hover:bg-surface-muted disabled:opacity-60"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-card)] bg-primary px-4 text-sm font-medium text-primary-contrast transition-colors duration-200 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Eliminazione…" : "Elimina"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

/** Placeholder animato mostrato mentre l'elenco carica. */
function CustomersSkeleton() {
  return (
    <>
      <div
        className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border p-4"
        aria-hidden="true"
      >
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="h-10 animate-pulse rounded-[var(--radius-card)] bg-surface-muted"
          />
        ))}
      </div>
      <span className="sr-only">Caricamento dei clienti…</span>
    </>
  );
}
