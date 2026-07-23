"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/components/AuthProvider";
import {
  createProduct,
  deleteProduct,
  exportProductsCsv,
  importProducts,
  listProducts,
  updateProduct,
  type ImportSummary,
  type Product,
  type ProductInput,
} from "@/lib/products";
import { ProductsTable } from "@/components/ProductsTable";
import { ProductFormDialog } from "@/components/ProductFormDialog";

/** Estrae un messaggio leggibile da un errore sconosciuto. */
function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/** Stato del dialog CRUD: chiuso, creazione, o modifica di un prodotto. */
type DialogState =
  | { readonly mode: "closed" }
  | { readonly mode: "create" }
  | { readonly mode: "edit"; readonly product: Product };

/**
 * Vista del catalogo prodotti: lista con badge sotto-scorta e filtro, e — per
 * il solo Admin (`role === "admin"`) — creazione/modifica/eliminazione e
 * import/export CSV. L'Operatore vede la stessa lista in sola lettura: nessun
 * comando di scrittura è reso. Il gating è anche lato backend; qui è UX.
 */
export function ProductsView() {
  const { user } = useAuth();
  const canWrite = user?.role === "admin";

  const [products, setProducts] = useState<readonly Product[]>([]);
  const [listStatus, setListStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [dialog, setDialog] = useState<DialogState>({ mode: "closed" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [importResult, setImportResult] = useState<ImportSummary | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const filterId = useId();

  const load = useCallback(async () => {
    setListStatus("loading");
    setListError(null);
    try {
      const data = await listProducts({ lowStockOnly });
      setProducts(data);
      setListStatus("ready");
    } catch (error) {
      setListError(
        messageOf(error, "Impossibile caricare i prodotti. Riprova."),
      );
      setListStatus("error");
    }
  }, [lowStockOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(input: ProductInput) {
    setSaving(true);
    setSaveError(null);
    try {
      if (dialog.mode === "edit") {
        await updateProduct(dialog.product.id, input);
      } else {
        await createProduct(input);
      }
      setDialog({ mode: "closed" });
      await load();
    } catch (error) {
      setSaveError(messageOf(error, "Salvataggio non riuscito. Riprova."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteProduct(confirmDelete.id);
      setConfirmDelete(null);
      await load();
    } catch (error) {
      setActionError(
        messageOf(error, "Eliminazione non riuscita. Riprova."),
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Consenti di ricaricare lo stesso file due volte di seguito.
    event.target.value = "";
    if (!file) return;

    setImporting(true);
    setActionError(null);
    setImportResult(null);
    try {
      const summary = await importProducts(file);
      setImportResult(summary);
      await load();
    } catch (error) {
      setActionError(messageOf(error, "Import non riuscito. Riprova."));
    } finally {
      setImporting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setActionError(null);
    try {
      const blob = await exportProductsCsv();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "prodotti.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setActionError(messageOf(error, "Export non riuscito. Riprova."));
    } finally {
      setExporting(false);
    }
  }

  return (
    <section aria-labelledby="titolo-catalogo" className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1
            id="titolo-catalogo"
            className="font-display text-2xl font-semibold tracking-tight"
          >
            Catalogo
          </h1>
          <p className="max-w-prose text-sm text-muted">
            Prodotti e giacenze del magazzino. I prodotti sotto la soglia di
            scorta sono evidenziati con un badge.
          </p>
        </div>

        {canWrite && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSaveError(null);
                setDialog({ mode: "create" });
              }}
              className="inline-flex h-9 items-center rounded-[var(--radius-card)] bg-primary px-3 text-sm font-medium text-primary-contrast transition-colors duration-200 hover:bg-accent"
            >
              Nuovo prodotto
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="inline-flex h-9 items-center rounded-[var(--radius-card)] border border-border px-3 text-sm font-medium text-surface-contrast transition-colors duration-200 hover:bg-surface-muted disabled:opacity-60"
            >
              {importing ? "Import in corso…" : "Importa CSV"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleImport}
              aria-label="File CSV da importare"
              className="sr-only"
            />

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex h-9 items-center rounded-[var(--radius-card)] border border-border px-3 text-sm font-medium text-surface-contrast transition-colors duration-200 hover:bg-surface-muted disabled:opacity-60"
            >
              {exporting ? "Export in corso…" : "Esporta CSV"}
            </button>
          </div>
        )}
      </header>

      <div className="flex items-center gap-2">
        <input
          id={filterId}
          type="checkbox"
          checked={lowStockOnly}
          onChange={(e) => setLowStockOnly(e.target.checked)}
          className="size-4 rounded border-border"
        />
        <label htmlFor={filterId} className="text-sm text-surface-contrast">
          Solo prodotti sotto scorta
        </label>
      </div>

      {actionError && (
        <p
          role="alert"
          className="rounded-[var(--radius-card)] border border-border bg-surface-muted px-3 py-2 text-sm text-danger-fg"
        >
          {actionError}
        </p>
      )}

      {importResult && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border bg-surface-muted p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-surface-contrast">
              Import completato: {importResult.created} creati,{" "}
              {importResult.updated} aggiornati, {importResult.errors.length}{" "}
              errori.
            </p>
            <button
              type="button"
              onClick={() => setImportResult(null)}
              className="text-sm font-medium text-muted transition-colors duration-200 hover:text-surface-contrast"
            >
              Chiudi
            </button>
          </div>
          {importResult.errors.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-danger-fg">
              {importResult.errors.map((err) => (
                <li key={`${err.row}-${err.message}`}>
                  Riga {err.row}: {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {listStatus === "loading" && (
        <p role="status" aria-live="polite" className="text-sm text-muted">
          Caricamento dei prodotti…
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

      {listStatus === "ready" && products.length === 0 && (
        <div className="flex flex-col items-start gap-2 rounded-[var(--radius-card)] border border-dashed border-border p-8">
          <p className="text-sm font-medium text-surface-contrast">
            {lowStockOnly
              ? "Nessun prodotto sotto scorta."
              : "Nessun prodotto nel catalogo."}
          </p>
          <p className="max-w-prose text-sm text-muted">
            {canWrite
              ? "Crea un prodotto o importa un CSV per popolare il catalogo."
              : "Il catalogo è vuoto. La gestione dei prodotti è riservata all'amministratore."}
          </p>
        </div>
      )}

      {listStatus === "ready" && products.length > 0 && (
        <ProductsTable
          products={products}
          canWrite={canWrite}
          onEdit={(product) => {
            setSaveError(null);
            setDialog({ mode: "edit", product });
          }}
          onDelete={(product) => {
            setActionError(null);
            setConfirmDelete(product);
          }}
        />
      )}

      {dialog.mode !== "closed" && (
        <ProductFormDialog
          mode={dialog.mode}
          initial={dialog.mode === "edit" ? dialog.product : null}
          submitting={saving}
          errorMessage={saveError}
          onSubmit={handleSubmit}
          onCancel={() => setDialog({ mode: "closed" })}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteDialog
          product={confirmDelete}
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </section>
  );
}

interface ConfirmDeleteDialogProps {
  product: Product;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Conferma modale dell'eliminazione di un prodotto. Focus iniziale sul pulsante
 * di annulla (azione non distruttiva), focus intrappolato (Tab/Shift+Tab in
 * ciclo), chiusura con Esc, blocco dello scroll di sfondo e ripristino del
 * focus. Stesso pattern modale di `ProductFormDialog`: essendo un'azione
 * distruttiva, la trappola del focus qui è necessaria a onorare `aria-modal`.
 */
function ConfirmDeleteDialog({
  product,
  deleting,
  onConfirm,
  onCancel,
}: ConfirmDeleteDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (active && !dialog!.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-surface-contrast/40"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex w-full max-w-md flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-surface-muted p-6 shadow-lg"
      >
        <h2
          id={titleId}
          className="font-display text-lg font-semibold tracking-tight text-surface-contrast"
        >
          Eliminare “{product.name}”?
        </h2>
        <p className="text-sm text-muted">
          L’operazione rimuove il prodotto (SKU {product.sku}) dal catalogo e non
          è reversibile.
        </p>
        <div className="mt-1 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="inline-flex h-10 items-center rounded-[var(--radius-card)] border border-border px-4 text-sm font-medium text-surface-contrast transition-colors duration-200 hover:bg-surface disabled:opacity-60"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex h-10 items-center rounded-[var(--radius-card)] bg-danger px-4 text-sm font-medium text-danger-contrast transition-colors duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "Eliminazione…" : "Elimina"}
          </button>
        </div>
      </div>
    </div>
  );
}
