import { useEffect, type RefObject } from "react";

/** Opzioni di {@link useModalDialog}. */
export interface UseModalDialogOptions {
  /**
   * Elemento su cui portare il focus all'apertura. Se assente, il focus va al
   * primo elemento focusable del dialog (es. il primo campo di un form).
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/** Selettore degli elementi focusable interni a un dialog. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Comportamento modale condiviso dai dialog dell'app (form prodotto, conferma
 * eliminazione). Al montaggio: sposta il focus dentro il dialog (sull'elemento
 * iniziale indicato o sul primo focusable), lo **intrappola** (Tab/Shift+Tab in
 * ciclo), chiude con **Esc**, **blocca lo scroll** della pagina retrostante e,
 * alla chiusura, **ripristina il focus** al controllo che aveva aperto il
 * dialog. Estratto in un hook per non duplicare la logica tra i dialog.
 *
 * Il dialog è montato una sola volta per apertura: l'effetto gira al mount e
 * cattura l'`onClose` corrente (stabile per la durata del dialog).
 *
 * @param dialogRef - ref all'elemento contenitore del dialog.
 * @param onClose - invocata quando l'utente chiude con Esc.
 */
export function useModalDialog(
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  options: UseModalDialogOptions = {},
): void {
  const { initialFocusRef } = options;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    (initialFocusRef?.current ?? focusables()[0])?.focus();

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
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
