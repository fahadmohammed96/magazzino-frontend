import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductsView } from "./ProductsView";
import { ApiError } from "@/lib/api-client";
import type { Product } from "@/lib/products";

// --- Mock del layer di rete del catalogo -----------------------------------
const listProducts = vi.fn();
const createProduct = vi.fn();
const updateProduct = vi.fn();
const deleteProduct = vi.fn();
const importProducts = vi.fn();
const exportProductsCsv = vi.fn();
vi.mock("@/lib/products", () => ({
  listProducts: (...args: unknown[]) => listProducts(...args),
  createProduct: (...args: unknown[]) => createProduct(...args),
  updateProduct: (...args: unknown[]) => updateProduct(...args),
  deleteProduct: (...args: unknown[]) => deleteProduct(...args),
  importProducts: (...args: unknown[]) => importProducts(...args),
  exportProductsCsv: (...args: unknown[]) => exportProductsCsv(...args),
}));

// --- Mock dell'auth: il ruolo pilota il gating -----------------------------
let mockRole: "admin" | "operator" = "admin";
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({ user: { id: 1, username: "u", role: mockRole } }),
}));

const PRODOTTI: Product[] = [
  {
    id: 1,
    sku: "SKU-1",
    name: "Vite M6",
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

describe("ProductsView", () => {
  beforeEach(() => {
    mockRole = "admin";
    listProducts.mockReset().mockResolvedValue(PRODOTTI);
    createProduct.mockReset().mockResolvedValue(PRODOTTI[0]);
    updateProduct.mockReset().mockResolvedValue(PRODOTTI[0]);
    deleteProduct.mockReset().mockResolvedValue(undefined);
    importProducts.mockReset();
    exportProductsCsv.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("carica ed elenca i prodotti con il badge sotto-scorta", async () => {
    render(<ProductsView />);
    expect(await screen.findByText("Vite M6")).toBeInTheDocument();
    expect(screen.getByText("Dado M6")).toBeInTheDocument();
    // Solo la riga low_stock porta il badge (il filtro in testata ha un testo
    // simile: restringiamo la ricerca alla tabella).
    const tabella = screen.getByRole("table");
    expect(within(tabella).getAllByText(/sotto scorta/i)).toHaveLength(1);
  });

  it("all'Operatore non mostra alcun comando di scrittura", async () => {
    mockRole = "operator";
    render(<ProductsView />);
    await screen.findByText("Vite M6");
    expect(
      screen.queryByRole("button", { name: /nuovo prodotto/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /importa csv/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /esporta csv/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /modifica/i }),
    ).not.toBeInTheDocument();
  });

  it("all'Admin mostra i comandi di scrittura", async () => {
    render(<ProductsView />);
    await screen.findByText("Vite M6");
    expect(
      screen.getByRole("button", { name: /nuovo prodotto/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /importa csv/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /esporta csv/i }),
    ).toBeInTheDocument();
  });

  it("il filtro sotto-scorta richiede al backend il solo sottoinsieme", async () => {
    render(<ProductsView />);
    await screen.findByText("Vite M6");
    expect(listProducts).toHaveBeenLastCalledWith({ lowStockOnly: false });

    fireEvent.click(screen.getByLabelText(/solo prodotti sotto scorta/i));

    await waitFor(() =>
      expect(listProducts).toHaveBeenLastCalledWith({ lowStockOnly: true }),
    );
  });

  it("crea un prodotto e ricarica la lista", async () => {
    render(<ProductsView />);
    await screen.findByText("Vite M6");

    fireEvent.click(screen.getByRole("button", { name: /nuovo prodotto/i }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/^sku$/i), {
      target: { value: "SKU-9" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^nome$/i), {
      target: { value: "Bullone" },
    });
    fireEvent.change(within(dialog).getByLabelText(/prezzo/i), {
      target: { value: "3" },
    });
    fireEvent.change(within(dialog).getByLabelText(/giacenza/i), {
      target: { value: "10" },
    });
    fireEvent.change(within(dialog).getByLabelText(/soglia/i), {
      target: { value: "2" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^salva$/i }));

    await waitFor(() =>
      expect(createProduct).toHaveBeenCalledWith({
        sku: "SKU-9",
        name: "Bullone",
        description: undefined,
        price: 3,
        stock_quantity: 10,
        low_stock_threshold: 2,
      }),
    );
    // Lista ricaricata: chiamata iniziale + dopo la creazione.
    expect(listProducts).toHaveBeenCalledTimes(2);
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("mostra l'errore del backend nel form e non chiude il dialog", async () => {
    createProduct.mockRejectedValue(
      new ApiError("conflict", "SKU già esistente.", 409),
    );
    render(<ProductsView />);
    await screen.findByText("Vite M6");

    fireEvent.click(screen.getByRole("button", { name: /nuovo prodotto/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/^sku$/i), {
      target: { value: "SKU-1" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^nome$/i), {
      target: { value: "Vite" },
    });
    fireEvent.change(within(dialog).getByLabelText(/prezzo/i), {
      target: { value: "1" },
    });
    fireEvent.change(within(dialog).getByLabelText(/giacenza/i), {
      target: { value: "1" },
    });
    fireEvent.change(within(dialog).getByLabelText(/soglia/i), {
      target: { value: "1" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^salva$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "SKU già esistente.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("elimina un prodotto previa conferma", async () => {
    render(<ProductsView />);
    await screen.findByText("Vite M6");

    const riga = screen.getByText("Vite M6").closest("tr")!;
    fireEvent.click(within(riga).getByRole("button", { name: /elimina/i }));

    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^elimina$/i }));

    await waitFor(() => expect(deleteProduct).toHaveBeenCalledWith(1));
    expect(listProducts).toHaveBeenCalledTimes(2);
  });

  it("importa un CSV e mostra il riepilogo con gli errori riga", async () => {
    importProducts.mockResolvedValue({
      created: 2,
      updated: 1,
      errors: [{ row: 3, message: "SKU mancante" }],
    });
    render(<ProductsView />);
    await screen.findByText("Vite M6");

    const file = new File(["sku,name\n"], "prodotti.csv", { type: "text/csv" });
    fireEvent.change(screen.getByLabelText(/file csv da importare/i), {
      target: { files: [file] },
    });

    await waitFor(() => expect(importProducts).toHaveBeenCalledWith(file));
    expect(await screen.findByText(/import completato/i)).toHaveTextContent(
      "2 creati, 1 aggiornati, 1 errori",
    );
    expect(screen.getByText(/riga 3: sku mancante/i)).toBeInTheDocument();
  });

  it("esporta il CSV scaricando il blob", async () => {
    const blob = new Blob(["sku,name\n"], { type: "text/csv" });
    exportProductsCsv.mockResolvedValue(blob);
    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    } as unknown as typeof URL);
    // jsdom non implementa la navigazione dell'anchor: neutralizziamo il click
    // reale (il download è un effetto del browser, non la logica sotto test).
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(<ProductsView />);
    await screen.findByText("Vite M6");

    fireEvent.click(screen.getByRole("button", { name: /esporta csv/i }));

    await waitFor(() => expect(exportProductsCsv).toHaveBeenCalledTimes(1));
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });

  it("mostra lo stato d'errore con possibilità di riprovare", async () => {
    listProducts.mockReset().mockRejectedValueOnce(
      new ApiError("network_error", "Backend irraggiungibile.", undefined),
    );
    listProducts.mockResolvedValue(PRODOTTI);

    render(<ProductsView />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Backend irraggiungibile.",
    );
    fireEvent.click(screen.getByRole("button", { name: /riprova/i }));
    expect(await screen.findByText("Vite M6")).toBeInTheDocument();
  });

  it("mostra lo stato vuoto quando non ci sono prodotti", async () => {
    listProducts.mockReset().mockResolvedValue([]);
    render(<ProductsView />);
    expect(
      await screen.findByText(/nessun prodotto nel catalogo/i),
    ).toBeInTheDocument();
  });
});
