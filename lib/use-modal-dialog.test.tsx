import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useModalDialog } from "./use-modal-dialog";

/** Harness minimale: un dialog con due pulsanti che monta l'hook. */
function Harness({
  onClose,
  focusCancel = false,
}: {
  onClose: () => void;
  focusCancel?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useModalDialog(dialogRef, onClose, {
    initialFocusRef: focusCancel ? cancelRef : undefined,
  });
  return (
    <div ref={dialogRef} role="dialog" aria-modal="true">
      <button ref={cancelRef} type="button">
        Annulla
      </button>
      <button type="button">Conferma</button>
    </div>
  );
}

describe("useModalDialog", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("porta il focus sul primo focusable e blocca lo scroll di sfondo", () => {
    render(<Harness onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Annulla" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("con initialFocusRef porta il focus sull'elemento indicato", () => {
    render(<Harness onClose={vi.fn()} focusCancel />);
    expect(screen.getByRole("button", { name: "Annulla" })).toHaveFocus();
  });

  it("chiude su Esc", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("intrappola il Tab in ciclo tra il primo e l'ultimo focusable", () => {
    render(<Harness onClose={vi.fn()} />);
    const annulla = screen.getByRole("button", { name: "Annulla" });
    const conferma = screen.getByRole("button", { name: "Conferma" });

    // Shift+Tab dal primo va all'ultimo.
    expect(annulla).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(conferma).toHaveFocus();
    // Tab dall'ultimo torna al primo.
    fireEvent.keyDown(document, { key: "Tab" });
    expect(annulla).toHaveFocus();
  });

  it("ripristina lo scroll di sfondo allo smontaggio", () => {
    const { unmount } = render(<Harness onClose={vi.fn()} />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });
});
