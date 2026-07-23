"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Product, ProductInput } from "@/lib/products";

interface ProductFormDialogProps {
  /** `create` per un nuovo prodotto, `edit` per modificarne uno esistente. */
  mode: "create" | "edit";
  /** Prodotto da precompilare in modalità `edit`. */
  initial?: Product | null;
  /** `true` mentre la richiesta di salvataggio è in corso: disabilita il form. */
  submitting: boolean;
  /** Messaggio d'errore del backend da mostrare nel dialog (es. SKU duplicato). */
  errorMessage?: string | null;
  /** Invocata con l'input validato alla conferma del form. */
  onSubmit: (input: ProductInput) => void;
  /** Invocata su annulla, Esc o click sullo sfondo. */
  onCancel: () => void;
}

/** Errori di validazione locale, per campo. */
type FieldErrors = Partial<
  Record<"sku" | "name" | "price" | "stock" | "threshold", string>
>;

/** Parsa un numero da input testuale; `null` se vuoto o non numerico. */
function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * Dialog modale per creare o modificare un prodotto. Valida i campi
 * obbligatori e i vincoli numerici lato client (submit a vuoto non parte come
 * richiesta di rete), poi delega il salvataggio al chiamante via `onSubmit`.
 * Semantica modale completa: focus iniziale sul primo campo, focus intrappolato
 * (Tab/Shift+Tab in ciclo), chiusura con Esc e ripristino del focus all'apertura.
 */
export function ProductFormDialog({
  mode,
  initial,
  submitting,
  errorMessage,
  onSubmit,
  onCancel,
}: ProductFormDialogProps) {
  const titleId = useId();
  const skuId = useId();
  const nameId = useId();
  const descId = useId();
  const priceId = useId();
  const stockId = useId();
  const thresholdId = useId();
  const errorId = useId();

  const dialogRef = useRef<HTMLDivElement>(null);

  const [sku, setSku] = useState(initial?.sku ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(
    initial ? String(initial.price) : "",
  );
  const [stock, setStock] = useState(
    initial ? String(initial.stock_quantity) : "",
  );
  const [threshold, setThreshold] = useState(
    initial ? String(initial.low_stock_threshold) : "",
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  // Semantica modale: focus iniziale, trappola del focus, chiusura con Esc e
  // ripristino del focus al controllo che ha aperto il dialog (stesso pattern
  // del drawer della shell). Lo sfondo è reso inerte dall'overlay.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

    focusables()[0]?.focus();

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
      opener?.focus();
    };
    // onCancel è stabile (useCallback nel chiamante); il dialog è montato una
    // sola volta per apertura, quindi l'effetto va eseguito solo al mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validate(): { input: ProductInput; errors: FieldErrors } {
    const nextErrors: FieldErrors = {};

    if (sku.trim() === "") nextErrors.sku = "Lo SKU è obbligatorio.";
    if (name.trim() === "") nextErrors.name = "Il nome è obbligatorio.";

    const priceValue = parseNumber(price);
    if (priceValue === null || priceValue < 0) {
      nextErrors.price = "Inserisci un prezzo valido (≥ 0).";
    }

    const stockValue = parseNumber(stock);
    if (stockValue === null || stockValue < 0 || !Number.isInteger(stockValue)) {
      nextErrors.stock = "Inserisci una giacenza intera (≥ 0).";
    }

    const thresholdValue = parseNumber(threshold);
    if (
      thresholdValue === null ||
      thresholdValue < 0 ||
      !Number.isInteger(thresholdValue)
    ) {
      nextErrors.threshold = "Inserisci una soglia intera (≥ 0).";
    }

    return {
      errors: nextErrors,
      input: {
        sku: sku.trim(),
        name: name.trim(),
        description: description.trim() === "" ? undefined : description.trim(),
        price: priceValue ?? 0,
        stock_quantity: stockValue ?? 0,
        low_stock_threshold: thresholdValue ?? 0,
      },
    };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const { input, errors: nextErrors } = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(input);
  }

  const title = mode === "create" ? "Nuovo prodotto" : "Modifica prodotto";
  const inputClass =
    "rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2 text-sm text-surface-contrast transition-colors duration-200 focus-visible:border-accent disabled:opacity-60";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-surface-contrast/40"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-[var(--radius-card)] border border-border bg-surface-muted p-6 shadow-lg"
      >
        <h2
          id={titleId}
          className="font-display text-lg font-semibold tracking-tight text-surface-contrast"
        >
          {title}
        </h2>

        <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={skuId} className="text-sm font-medium">
              SKU
            </label>
            <input
              id={skuId}
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              disabled={submitting}
              aria-invalid={errors.sku ? true : undefined}
              aria-describedby={errors.sku ? `${skuId}-err` : undefined}
              className={inputClass}
            />
            {errors.sku && (
              <p id={`${skuId}-err`} className="text-xs text-danger">
                {errors.sku}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={nameId} className="text-sm font-medium">
              Nome
            </label>
            <input
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? `${nameId}-err` : undefined}
              className={inputClass}
            />
            {errors.name && (
              <p id={`${nameId}-err`} className="text-xs text-danger">
                {errors.name}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={descId} className="text-sm font-medium">
              Descrizione <span className="text-muted">(facoltativa)</span>
            </label>
            <textarea
              id={descId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              rows={2}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={priceId} className="text-sm font-medium">
                Prezzo (€)
              </label>
              <input
                id={priceId}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={submitting}
                aria-invalid={errors.price ? true : undefined}
                aria-describedby={errors.price ? `${priceId}-err` : undefined}
                className={inputClass}
              />
              {errors.price && (
                <p id={`${priceId}-err`} className="text-xs text-danger">
                  {errors.price}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={stockId} className="text-sm font-medium">
                Giacenza
              </label>
              <input
                id={stockId}
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                disabled={submitting}
                aria-invalid={errors.stock ? true : undefined}
                aria-describedby={errors.stock ? `${stockId}-err` : undefined}
                className={inputClass}
              />
              {errors.stock && (
                <p id={`${stockId}-err`} className="text-xs text-danger">
                  {errors.stock}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={thresholdId} className="text-sm font-medium">
                Soglia scorta
              </label>
              <input
                id={thresholdId}
                type="number"
                inputMode="numeric"
                step="1"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                disabled={submitting}
                aria-invalid={errors.threshold ? true : undefined}
                aria-describedby={
                  errors.threshold ? `${thresholdId}-err` : undefined
                }
                className={inputClass}
              />
              {errors.threshold && (
                <p id={`${thresholdId}-err`} className="text-xs text-danger">
                  {errors.threshold}
                </p>
              )}
            </div>
          </div>

          {errorMessage && (
            <p
              id={errorId}
              role="alert"
              className="rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2 text-sm text-danger"
            >
              {errorMessage}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="inline-flex h-10 items-center rounded-[var(--radius-card)] border border-border px-4 text-sm font-medium text-surface-contrast transition-colors duration-200 hover:bg-surface disabled:opacity-60"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 items-center rounded-[var(--radius-card)] bg-primary px-4 text-sm font-medium text-primary-contrast transition-colors duration-200 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Salvataggio…" : "Salva"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
