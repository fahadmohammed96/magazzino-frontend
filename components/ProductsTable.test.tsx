import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductsTable } from "./ProductsTable";
import type { Product } from "@/lib/products";

const PRODOTTI: Product[] = [
  {
    id: 1,
    sku: "SKU-1",
    name: "Vite M6",
    description: "Confezione da 100",
    price: 4.5,
    stock_quantity: 3,
    low_stock_threshold: 5,
    low_stock: true,
  },
  {
    id: 2,
    sku: "SKU-2",
    name: "Dado M6",
    price: 2,
    stock_quantity: 200,
    low_stock_threshold: 20,
    low_stock: false,
  },
];

describe("ProductsTable", () => {
  it("mostra le colonne chiave e i dati dei prodotti", () => {
    render(<ProductsTable products={PRODOTTI} canWrite={false} />);
    expect(screen.getByRole("columnheader", { name: /sku/i })).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /prezzo/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("SKU-1")).toBeInTheDocument();
    expect(screen.getByText("Vite M6")).toBeInTheDocument();
  });

  it("mostra il badge sotto-scorta solo sulle righe low_stock", () => {
    render(<ProductsTable products={PRODOTTI} canWrite={false} />);
    const badges = screen.getAllByText(/sotto scorta/i);
    expect(badges).toHaveLength(1);
    // Il badge è nella riga di SKU-1 (low_stock: true).
    const rigaViteM6 = screen.getByText("Vite M6").closest("tr")!;
    expect(within(rigaViteM6).getByText(/sotto scorta/i)).toBeInTheDocument();
  });

  it("in sola lettura non mostra la colonna né i comandi di scrittura", () => {
    render(<ProductsTable products={PRODOTTI} canWrite={false} />);
    expect(
      screen.queryByRole("columnheader", { name: /azioni/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /modifica/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /elimina/i }),
    ).not.toBeInTheDocument();
  });

  it("con permessi di scrittura mostra i comandi e li invoca col prodotto", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <ProductsTable
        products={PRODOTTI}
        canWrite
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    const rigaViteM6 = screen.getByText("Vite M6").closest("tr")!;
    fireEvent.click(within(rigaViteM6).getByRole("button", { name: /modifica/i }));
    fireEvent.click(within(rigaViteM6).getByRole("button", { name: /elimina/i }));

    expect(onEdit).toHaveBeenCalledWith(PRODOTTI[0]);
    expect(onDelete).toHaveBeenCalledWith(PRODOTTI[0]);
  });
});
