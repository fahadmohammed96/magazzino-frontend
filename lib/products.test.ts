import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch, apiFetchBlob } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  apiFetchBlob: vi.fn(),
}));
vi.mock("@/lib/api-client", () => ({ apiFetch, apiFetchBlob }));

import {
  createProduct,
  deleteProduct,
  exportProductsCsv,
  getProduct,
  importProducts,
  listProducts,
  updateProduct,
  type ProductInput,
} from "./products";

const INPUT: ProductInput = {
  sku: "SKU-1",
  name: "Vite M6",
  description: "Confezione da 100",
  price: 4.5,
  stock_quantity: 12,
  low_stock_threshold: 5,
};

describe("lib/products", () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetchBlob.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("listProducts senza filtro chiama GET /v1/products", async () => {
    apiFetch.mockResolvedValue([]);
    await listProducts();
    expect(apiFetch).toHaveBeenCalledWith("/v1/products");
  });

  it("listProducts con lowStockOnly aggiunge ?low_stock=true", async () => {
    apiFetch.mockResolvedValue([]);
    await listProducts({ lowStockOnly: true });
    expect(apiFetch).toHaveBeenCalledWith("/v1/products?low_stock=true");
  });

  it("getProduct codifica l'id nel path", async () => {
    apiFetch.mockResolvedValue({});
    await getProduct("a/b");
    expect(apiFetch).toHaveBeenCalledWith("/v1/products/a%2Fb");
  });

  it("createProduct invia POST con il corpo JSON", async () => {
    apiFetch.mockResolvedValue({ id: 1 });
    await createProduct(INPUT);
    expect(apiFetch).toHaveBeenCalledWith("/v1/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(INPUT),
    });
  });

  it("updateProduct invia PUT sull'id", async () => {
    apiFetch.mockResolvedValue({ id: 7 });
    await updateProduct(7, INPUT);
    expect(apiFetch).toHaveBeenCalledWith("/v1/products/7", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(INPUT),
    });
  });

  it("deleteProduct invia DELETE sull'id", async () => {
    apiFetch.mockResolvedValue(undefined);
    await deleteProduct(7);
    expect(apiFetch).toHaveBeenCalledWith("/v1/products/7", {
      method: "DELETE",
    });
  });

  it("importProducts invia il file come multipart senza Content-Type manuale", async () => {
    apiFetch.mockResolvedValue({ created: 1, updated: 0, errors: [] });
    const file = new File(["sku,name\n"], "prodotti.csv", { type: "text/csv" });

    const summary = await importProducts(file);

    expect(summary).toEqual({ created: 1, updated: 0, errors: [] });
    const [path, options] = apiFetch.mock.calls[0];
    expect(path).toBe("/v1/products/import");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
    expect((options.body as FormData).get("file")).toBe(file);
    // Nessun Content-Type manuale: lo imposta il browser col boundary.
    expect(options.headers).toBeUndefined();
  });

  it("exportProductsCsv scarica il blob via apiFetchBlob", async () => {
    const blob = new Blob(["sku,name\n"], { type: "text/csv" });
    apiFetchBlob.mockResolvedValue(blob);

    const result = await exportProductsCsv();

    expect(apiFetchBlob).toHaveBeenCalledWith("/v1/products/export");
    expect(result).toBe(blob);
  });
});
