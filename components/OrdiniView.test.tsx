import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrdiniView } from "./OrdiniView";
import { ApiError } from "@/lib/api-client";
import type { Order } from "@/lib/orders-api";
import type { Customer } from "@/lib/customers-api";
import type { Product } from "@/lib/products";

// Manteniamo helper e costanti reali (allowedTransitions, STATUS_LABELS…) e
// mockiamo solo il layer di rete.
vi.mock("@/lib/orders-api", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/orders-api")>();
  return {
    ...actual,
    listOrders: vi.fn(),
    getOrder: vi.fn(),
    createOrder: vi.fn(),
    updateOrderStatus: vi.fn(),
  };
});
vi.mock("@/lib/customers-api", () => ({ listCustomers: vi.fn() }));
vi.mock("@/lib/products", () => ({ listProducts: vi.fn() }));

import { createOrder, listOrders, updateOrderStatus } from "@/lib/orders-api";
import { listCustomers } from "@/lib/customers-api";
import { listProducts } from "@/lib/products";

const mockListOrders = vi.mocked(listOrders);
const mockCreateOrder = vi.mocked(createOrder);
const mockUpdateStatus = vi.mocked(updateOrderStatus);
const mockListCustomers = vi.mocked(listCustomers);
const mockListProducts = vi.mocked(listProducts);

const ORDER: Order = {
  id: 7,
  customer_id: 1,
  status: "in_attesa",
  lines: [
    {
      product_id: 10,
      product_name: "Vite M6",
      quantity: 3,
      unit_price: 4.5,
      line_total: 13.5,
    },
  ],
  total: 13.5,
};

const CUSTOMER: Customer = {
  id: 1,
  ragione_sociale: "Acme S.r.l.",
  indirizzo_spedizione: "Via Roma 1",
  contatti: {},
};

const PRODUCT: Product = {
  id: 10,
  sku: "SKU-10",
  name: "Vite M6",
  price: 4.5,
  stock_quantity: 100,
  low_stock_threshold: 10,
  low_stock: false,
};

describe("OrdiniView", () => {
  beforeEach(() => {
    mockListOrders.mockReset();
    mockCreateOrder.mockReset();
    mockUpdateStatus.mockReset();
    mockListCustomers.mockReset();
    mockListProducts.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mostra gli ordini con stato e totale per riga", async () => {
    mockListOrders.mockResolvedValue([ORDER]);
    render(<OrdiniView />);

    // "In attesa"/"13,50 €" appaiono anche fra le opzioni del filtro: si
    // verificano dentro la region della lista.
    expect(await screen.findByText("#7")).toBeInTheDocument();
    const region = screen.getByRole("region", { name: /elenco degli ordini/i });
    expect(within(region).getByText("In attesa")).toBeInTheDocument();
    expect(within(region).getByText("13,50 €")).toBeInTheDocument();
  });

  it("filtra per stato passando `status` al backend", async () => {
    mockListOrders.mockResolvedValue([ORDER]);
    render(<OrdiniView />);
    await screen.findByText("#7");

    fireEvent.change(screen.getByLabelText(/filtra per stato/i), {
      target: { value: "in_lavorazione" },
    });

    await waitFor(() =>
      expect(mockListOrders).toHaveBeenCalledWith("in_lavorazione"),
    );
  });

  it("mostra solo le transizioni consentite e le esegue via PATCH", async () => {
    mockListOrders.mockResolvedValue([ORDER]);
    mockUpdateStatus.mockResolvedValue({ ...ORDER, status: "in_lavorazione" });
    render(<OrdiniView />);
    await screen.findByText("#7");

    // Da `in_attesa`: avvio e annullamento, MAI evasione diretta.
    expect(
      screen.getByRole("button", { name: /avvia lavorazione/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /annulla ordine/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /segna come evaso/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /avvia lavorazione/i }));

    await waitFor(() =>
      expect(mockUpdateStatus).toHaveBeenCalledWith(7, "in_lavorazione"),
    );
    // Ricarica dopo il successo (mount + dopo l'azione).
    await waitFor(() =>
      expect(mockListOrders.mock.calls.length).toBeGreaterThan(1),
    );
  });

  it("comunica un 409 sul cambio di stato senza perdere la lista", async () => {
    mockListOrders.mockResolvedValue([ORDER]);
    mockUpdateStatus.mockRejectedValue(
      new ApiError("insufficient_stock", "Scorte insufficienti.", 409),
    );
    render(<OrdiniView />);
    await screen.findByText("#7");

    fireEvent.click(screen.getByRole("button", { name: /avvia lavorazione/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /scorte insufficienti/i,
    );
    // La riga resta visibile.
    expect(screen.getByText("#7")).toBeInTheDocument();
  });

  it("apre il dettaglio con le righe dell'ordine", async () => {
    mockListOrders.mockResolvedValue([ORDER]);
    render(<OrdiniView />);
    await screen.findByText("#7");

    fireEvent.click(
      screen.getByRole("button", { name: /dettaglio ordine #7/i }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Vite M6")).toBeInTheDocument();
    expect(within(dialog).getByText("4,50 €")).toBeInTheDocument();
    // Il "13,50 €" compare due volte: totale della riga e totale dell'ordine.
    expect(within(dialog).getAllByText("13,50 €")).toHaveLength(2);
  });

  it("mostra lo stato vuoto quando non ci sono ordini", async () => {
    mockListOrders.mockResolvedValue([]);
    render(<OrdiniView />);

    expect(await screen.findByText(/nessun ordine\.?$/i)).toBeInTheDocument();
  });

  it("crea un ordine e ricarica la lista", async () => {
    mockListOrders.mockResolvedValue([]);
    mockListCustomers.mockResolvedValue([CUSTOMER]);
    mockListProducts.mockResolvedValue([PRODUCT]);
    mockCreateOrder.mockResolvedValue(ORDER);
    render(<OrdiniView />);
    await screen.findByText(/nessun ordine/i);

    fireEvent.click(screen.getByRole("button", { name: /nuovo ordine/i }));

    const dialog = await screen.findByRole("dialog");
    // Il form appare dopo il caricamento di clienti e prodotti.
    const customerSelect = await within(dialog).findByLabelText(/cliente/i);
    fireEvent.change(customerSelect, { target: { value: "1" } });
    fireEvent.change(within(dialog).getByLabelText(/prodotto/i), {
      target: { value: "10" },
    });
    fireEvent.change(within(dialog).getByLabelText(/quantità/i), {
      target: { value: "2" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /crea ordine/i }));

    await waitFor(() =>
      expect(mockCreateOrder).toHaveBeenCalledWith({
        customer_id: 1,
        lines: [{ product_id: 10, quantity: 2 }],
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(mockListOrders.mock.calls.length).toBeGreaterThan(1);
  });

  it("mostra un errore di caricamento con possibilità di riprova", async () => {
    mockListOrders
      .mockRejectedValueOnce(new ApiError("network_error", "Rete assente."))
      .mockResolvedValueOnce([ORDER]);
    render(<OrdiniView />);

    // Con un ApiError la UI mostra il messaggio del backend.
    expect(await screen.findByText(/rete assente/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /riprova/i }));

    expect(await screen.findByText("#7")).toBeInTheDocument();
  });
});
