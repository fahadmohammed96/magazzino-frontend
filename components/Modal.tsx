"use client";

import { useEffect, useId, useRef } from "react";

/**
 * Finestra modale accessibile riusabile.
 *
 * Semantica `role="dialog"` + `aria-modal`: al montaggio sposta il focus al
 * suo interno, lo intrappola (Tab/Shift+Tab in ciclo), chiude con Esc o con il
 * click sullo sfondo e, alla chiusura, restituisce il focus all'elemento che
 * la aveva aperta. Rispetta `prefers-reduced-motion` tramite le transizioni
 * globali di `globals.css`.
 *
 * Renderizzata solo quando montata dal chiamante (montaggio condizionale): non
 * gestisce internamente il flag `open`, così lo stato resta nel contenitore.
 */
export function Modal({
  title,
  onClose,
  children,
  describedById,
}: {
  /** Titolo del dialog, usato come etichetta accessibile. */
  title: string;
  /** Richiesta di chiusura (Esc, click sullo sfondo, pulsante chiudi). */
  onClose: () => void;
  children: React.ReactNode;
  /** Id opzionale dell'elemento che descrive il dialog (`aria-describedby`). */
  describedById?: string;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Elemento con focus prima dell'apertura: da ripristinare alla chiusura.
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusables = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

    // Porta il focus sul primo elemento interattivo del dialog.
    focusables()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
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
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-surface-contrast/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedById}
        className="relative z-10 my-8 w-full max-w-lg rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2
            id={titleId}
            className="font-display text-lg font-semibold tracking-tight text-surface-contrast"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-card)] border border-border text-surface-contrast transition-colors duration-200 hover:bg-surface-muted"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ×
            </span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
