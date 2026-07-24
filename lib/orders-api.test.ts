import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  allowedTransitions,
  createOrder,
  getOrder,
  listOrders,
  updateOrderStatus,
  ORDER_STATUSES,
  STATUS_LABELS,
  type CreateOrderInput,
  type Order,
} from "./orders-api";
import { ApiError, resetApiAuth } from "./api-client";

const BASE = "https://api.example.test";

/** Response fittizia per il mock di fetch. */
function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200;
  const text = body === undefined ? "" : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
    json: () =>
      text.length === 0
        ? Promise.reject(new SyntaxError("empty"))
        : Promise.resolve(JSON.parse(text)),
  } as unknown as Response;
}

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

describe("orders-api", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    resetApiAuth();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetApiAuth();
  });

  describe("allowedTransitions", () => {
    it("da in_attesa consente lavorazione e annullamento", () => {
      expect(allowedTransitions("in_attesa")).toEqual([
        "in_lavorazione",
        "annullato",
      ]);
    });

    it("da in_lavorazione consente evasione e annullamento", () => {
      expect(allowedTransitions("in_lavorazione")).toEqual([
        "evaso",
        "annullato",
      ]);
    });

    it("gli stati terminali non hanno transizioni", () => {
      expect(allowedTransitions("evaso")).toEqual([]);
      expect(allowedTransitions("annullato")).toEqual([]);
    });
  });

  describe("metadati stati", () => {
    it("espone un'etichetta per ogni stato dell'elenco", () => {
      for (const status of ORDER_STATUSES) {
        expect(STATUS_LABELS[status]).toBeTruthy();
      }
    });
  });

  describe("listOrders", () => {
    it("chiama l'endpoint senza query quando lo stato è assente", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse([ORDER]));
      vi.stubGlobal("fetch", fetchMock);

      const result = await listOrders();

      expect(result).toEqual([ORDER]);
      expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/v1/orders`);
    });

    it("accoda `?status=` quando il filtro è valorizzato", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
      vi.stubGlobal("fetch", fetchMock);

      await listOrders("in_lavorazione");

      expect(fetchMock.mock.calls[0][0]).toBe(
        `${BASE}/v1/orders?status=in_lavorazione`,
      );
    });
  });

  describe("getOrder", () => {
    it("legge un ordine per id codificando il segmento", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(ORDER));
      vi.stubGlobal("fetch", fetchMock);

      const result = await getOrder("a/b");

      expect(result).toEqual(ORDER);
      expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/v1/orders/a%2Fb`);
    });
  });

  describe("createOrder", () => {
    it("invia customer_id e righe (product_id + quantity) in POST", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(ORDER));
      vi.stubGlobal("fetch", fetchMock);

      const input: CreateOrderInput = {
        customer_id: 1,
        lines: [{ product_id: 10, quantity: 3 }],
      };
      const result = await createOrder(input);

      expect(result).toEqual(ORDER);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE}/v1/orders`);
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual(input);
    });

    it("propaga il 409 (scorte insufficienti) come ApiError", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            {
              error: {
                code: "insufficient_stock",
                message: "Scorte insufficienti per «Vite M6».",
              },
            },
            { status: 409 },
          ),
        ),
      );

      const error = await createOrder({
        customer_id: 1,
        lines: [{ product_id: 10, quantity: 999 }],
      }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("insufficient_stock");
      expect((error as ApiError).status).toBe(409);
    });
  });

  describe("updateOrderStatus", () => {
    it("invia PATCH sull'endpoint status con il nuovo stato", async () => {
      const patched = { ...ORDER, status: "in_lavorazione" as const };
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(patched));
      vi.stubGlobal("fetch", fetchMock);

      const result = await updateOrderStatus(7, "in_lavorazione");

      expect(result).toEqual(patched);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE}/v1/orders/7/status`);
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body)).toEqual({ status: "in_lavorazione" });
    });

    it("propaga il 409 (transizione non valida) come ApiError", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            {
              error: {
                code: "invalid_transition",
                message: "Transizione non consentita.",
              },
            },
            { status: 409 },
          ),
        ),
      );

      const error = await updateOrderStatus(7, "evaso").catch(
        (e: unknown) => e,
      );

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(409);
    });
  });
});
