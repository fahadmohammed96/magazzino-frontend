import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

/** Rende un modale minimo con un pulsante interno per i test sul focus. */
function renderModal(onClose = vi.fn()) {
  render(
    <Modal title="Titolo dialog" onClose={onClose}>
      <button type="button">Azione interna</button>
    </Modal>,
  );
  return { onClose };
}

describe("Modal", () => {
  it("espone un dialog modale etichettato dal titolo", () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Titolo dialog");
  });

  it("porta il focus sul primo elemento interattivo all'apertura", () => {
    renderModal();
    // Il primo focusable in ordine DOM è il pulsante di chiusura (×).
    expect(screen.getByRole("button", { name: /chiudi/i })).toHaveFocus();
  });

  it("non resetta il focus quando il contenitore ri-renderizza con un onClose instabile", () => {
    const { rerender } = render(
      <Modal title="X" onClose={() => {}}>
        <button type="button">interno</button>
      </Modal>,
    );
    const inner = screen.getByRole("button", { name: "interno" });
    inner.focus();
    expect(inner).toHaveFocus();

    // Nuova identità di onClose (handler non memoizzato del genitore): il
    // focus-trap non deve rimontarsi e riportare il focus sul primo elemento.
    rerender(
      <Modal title="X" onClose={() => {}}>
        <button type="button">interno</button>
      </Modal>,
    );
    expect(inner).toHaveFocus();
  });

  it("chiude con il tasto Esc con l'ultimo onClose fornito", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(
      <Modal title="X" onClose={first}>
        <button type="button">interno</button>
      </Modal>,
    );
    rerender(
      <Modal title="X" onClose={second}>
        <button type="button">interno</button>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it("chiude con il tasto Esc", () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("chiude dal pulsante di chiusura", () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /chiudi/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("chiude al click sullo sfondo", () => {
    const { onClose } = renderModal();
    // Lo sfondo è l'unico elemento aria-hidden cliccabile del dialog.
    const backdrop = screen
      .getByRole("dialog")
      .parentElement!.querySelector('[aria-hidden="true"]')!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ripristina il focus sull'elemento che l'ha aperto alla chiusura", () => {
    // Un opener con focus prima dell'apertura, poi montaggio/smontaggio.
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    expect(opener).toHaveFocus();

    const { unmount } = render(
      <Modal title="X" onClose={vi.fn()}>
        <button type="button">interno</button>
      </Modal>,
    );
    expect(opener).not.toHaveFocus();

    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });
});
