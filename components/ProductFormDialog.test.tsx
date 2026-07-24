import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductFormDialog } from "./ProductFormDialog";
import type { Product } from "@/lib/products";

const PRODUCT: Product = {
  id: 7,
  sku: "SKU-7",
  name: "Rondella",
  description: "Acciaio zincato",
  price: 0.9,
  stock_quantity: 40,
  low_stock_threshold: 10,
  low_stock: false,
};

/** Compila i campi numerici e testuali obbligatori con valori validi. */
function fillValid() {
  fireEvent.change(screen.getByLabelText(/^sku$/i), {
    target: { value: "SKU-9" },
  });
  fireEvent.change(screen.getByLabelText(/^nome$/i), {
    target: { value: "Bullone" },
  });
  fireEvent.change(screen.getByLabelText(/prezzo/i), {
    target: { value: "3.25" },
  });
  fireEvent.change(screen.getByLabelText(/giacenza/i), {
    target: { value: "50" },
  });
  fireEvent.change(screen.getByLabelText(/soglia/i), {
    target: { value: "8" },
  });
}

describe("ProductFormDialog", () => {
  it("in creazione mostra il titolo e campi vuoti", () => {
    render(
      <ProductFormDialog
        mode="create"
        submitting={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /nuovo prodotto/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^sku$/i)).toHaveValue("");
  });

  it("in modifica precompila i campi dal prodotto", () => {
    render(
      <ProductFormDialog
        mode="edit"
        initial={PRODUCT}
        submitting={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: /modifica prodotto/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^sku$/i)).toHaveValue("SKU-7");
    expect(screen.getByLabelText(/^nome$/i)).toHaveValue("Rondella");
    expect(screen.getByLabelText(/giacenza/i)).toHaveValue(40);
  });

  it("blocca il submit a campi obbligatori mancanti e mostra gli errori", () => {
    const onSubmit = vi.fn();
    render(
      <ProductFormDialog
        mode="create"
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^salva$/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/lo sku è obbligatorio/i)).toBeInTheDocument();
    expect(screen.getByText(/il nome è obbligatorio/i)).toBeInTheDocument();
  });

  it("rifiuta valori numerici negativi o non interi dove richiesto", () => {
    const onSubmit = vi.fn();
    render(
      <ProductFormDialog
        mode="create"
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^sku$/i), {
      target: { value: "SKU-1" },
    });
    fireEvent.change(screen.getByLabelText(/^nome$/i), {
      target: { value: "X" },
    });
    fireEvent.change(screen.getByLabelText(/prezzo/i), {
      target: { value: "-1" },
    });
    fireEvent.change(screen.getByLabelText(/giacenza/i), {
      target: { value: "2.5" },
    });
    fireEvent.change(screen.getByLabelText(/soglia/i), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^salva$/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/prezzo valido/i)).toBeInTheDocument();
    expect(screen.getByText(/giacenza intera/i)).toBeInTheDocument();
  });

  it("con dati validi invoca onSubmit con l'input tipizzato", () => {
    const onSubmit = vi.fn();
    render(
      <ProductFormDialog
        mode="create"
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    fillValid();
    fireEvent.click(screen.getByRole("button", { name: /^salva$/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      sku: "SKU-9",
      name: "Bullone",
      description: undefined,
      price: 3.25,
      stock_quantity: 50,
      low_stock_threshold: 8,
    });
  });

  it("accetta la virgola come separatore decimale nel prezzo", () => {
    const onSubmit = vi.fn();
    render(
      <ProductFormDialog
        mode="create"
        submitting={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^sku$/i), {
      target: { value: "SKU-9" },
    });
    fireEvent.change(screen.getByLabelText(/^nome$/i), {
      target: { value: "Bullone" },
    });
    fireEvent.change(screen.getByLabelText(/prezzo/i), {
      target: { value: "1,50" },
    });
    fireEvent.change(screen.getByLabelText(/giacenza/i), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/soglia/i), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^salva$/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ price: 1.5 }),
    );
  });

  it("mostra il messaggio d'errore del backend", () => {
    render(
      <ProductFormDialog
        mode="create"
        submitting={false}
        errorMessage="SKU già esistente."
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("SKU già esistente.");
  });

  it("chiude con Esc invocando onCancel", () => {
    const onCancel = vi.fn();
    render(
      <ProductFormDialog
        mode="create"
        submitting={false}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
