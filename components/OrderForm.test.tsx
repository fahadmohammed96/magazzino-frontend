import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrderForm } from "./OrderForm";
import type { Customer } from "@/lib/customers-api";
import type { Product } from "@/lib/products";

const CUSTOMERS: Customer[] = [
  {
    id: 1,
    ragione_sociale: "Acme S.r.l.",
    indirizzo_spedizione: "Via Roma 1",
    contatti: {},
  },
  {
    id: 2,
    ragione_sociale: "Beta S.p.A.",
    indirizzo_spedizione: "Via Verdi 2",
    contatti: {},
  },
];

const VITE: Product = {
  id: 10,
  sku: "SKU-10",
  name: "Vite M6",
  price: 4.5,
  stock_quantity: 100,
  low_stock_threshold: 10,
  low_stock: false,
};

const BULLONE: Product = {
  id: 20,
  sku: "SKU-20",
  name: "Bullone",
  price: 2,
  stock_quantity: 3,
  low_stock_threshold: 10,
  low_stock: true,
};

function renderForm(overrides: Partial<React.ComponentProps<typeof OrderForm>> = {}) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(
    <OrderForm
      customers={CUSTOMERS}
      products={[VITE, BULLONE]}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitting={false}
      submitError={null}
      {...overrides}
    />,
  );
  return { onSubmit, onCancel };
}

describe("OrderForm", () => {
  it("aggiorna il totale live quando cambiano prodotto e quantità", () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/prodotto/i), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/quantità/i), {
      target: { value: "3" },
    });

    // 3 × 4,50 € = 13,50 €
    expect(screen.getByRole("status")).toHaveTextContent("13,50");

    fireEvent.change(screen.getByLabelText(/quantità/i), {
      target: { value: "2" },
    });
    // 2 × 4,50 € = 9,00 €
    expect(screen.getByRole("status")).toHaveTextContent("9,00");
  });

  it("somma più righe nel totale live", () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/prodotto/i), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/quantità/i), {
      target: { value: "2" },
    });

    fireEvent.click(screen.getByRole("button", { name: /aggiungi riga/i }));

    const productSelects = screen.getAllByLabelText(/prodotto/i);
    const qtyInputs = screen.getAllByLabelText(/quantità/i);
    fireEvent.change(productSelects[1], { target: { value: "20" } });
    fireEvent.change(qtyInputs[1], { target: { value: "5" } });

    // 2×4,50 + 5×2,00 = 9,00 + 10,00 = 19,00 €
    expect(screen.getByRole("status")).toHaveTextContent("19,00");
  });

  it("mostra il badge sotto-scorta quando la riga seleziona un prodotto sotto soglia", () => {
    renderForm();

    expect(screen.queryByText(/sotto scorta/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/prodotto/i), {
      target: { value: "20" },
    });
    expect(screen.getByText(/sotto scorta/i)).toBeInTheDocument();
  });

  it("aggiunge e rimuove righe", () => {
    renderForm();
    expect(screen.getAllByLabelText(/prodotto/i)).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /aggiungi riga/i }));
    expect(screen.getAllByLabelText(/prodotto/i)).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /rimuovi riga 2/i }));
    expect(screen.getAllByLabelText(/prodotto/i)).toHaveLength(1);
  });

  it("invia customer_id e righe preservando il tipo degli id", () => {
    const { onSubmit } = renderForm();

    fireEvent.change(screen.getByLabelText(/cliente/i), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText(/prodotto/i), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/quantità/i), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crea ordine/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      customer_id: 2,
      lines: [{ product_id: 10, quantity: 4 }],
    });
  });

  it("blocca l'invio senza cliente e lo segnala", () => {
    const { onSubmit } = renderForm();

    fireEvent.change(screen.getByLabelText(/prodotto/i), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crea ordine/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    // "Seleziona un cliente" è anche il placeholder dell'option: si verifica
    // l'errore tramite il suo role alert.
    expect(screen.getByRole("alert")).toHaveTextContent(/seleziona un cliente/i);
  });

  it("blocca l'invio senza righe prodotto e lo segnala", () => {
    const { onSubmit } = renderForm();

    fireEvent.change(screen.getByLabelText(/cliente/i), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crea ordine/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText(/aggiungi almeno una riga con un prodotto/i),
    ).toBeInTheDocument();
  });

  it("mostra l'errore del backend passato dal contenitore", () => {
    renderForm({ submitError: "Scorte insufficienti per «Vite M6»." });
    expect(screen.getByRole("alert")).toHaveTextContent(/scorte insufficienti/i);
  });

  it("avvisa e disabilita l'invio quando non ci sono clienti", () => {
    renderForm({ customers: [] });
    expect(
      screen.getByText(/non ci sono clienti in anagrafica/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crea ordine/i })).toBeDisabled();
  });
});
