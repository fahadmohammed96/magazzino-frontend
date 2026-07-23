import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
  type CustomerInput,
} from "./customers-api";
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

const SAMPLE: CustomerInput = {
  ragione_sociale: "Acme S.r.l.",
  piva: "01234567890",
  codice_fiscale: "CMEACM80A01H501X",
  indirizzo_spedizione: "Via Roma 1, 20100 Milano",
  contatti: { email: "ordini@acme.test", telefono: "+39 02 1234567" },
};

describe("customers-api", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    resetApiAuth();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetApiAuth();
  });

  describe("listCustomers", () => {
    it("chiama l'endpoint senza query quando `q` è assente", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
      vi.stubGlobal("fetch", fetchMock);

      const result = await listCustomers();

      expect(result).toEqual([]);
      expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/v1/customers`);
    });

    it("accoda `?q=` codificato quando la ricerca è valorizzata", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
      vi.stubGlobal("fetch", fetchMock);

      await listCustomers("  Acme & Figli  ");

      expect(fetchMock.mock.calls[0][0]).toBe(
        `${BASE}/v1/customers?q=Acme%20%26%20Figli`,
      );
    });

    it("ignora una query composta solo da spazi", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
      vi.stubGlobal("fetch", fetchMock);

      await listCustomers("   ");

      expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/v1/customers`);
    });
  });

  describe("getCustomer", () => {
    it("legge un cliente per id codificando il segmento", async () => {
      const customer = { id: "a/b", ...SAMPLE };
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(customer));
      vi.stubGlobal("fetch", fetchMock);

      const result = await getCustomer("a/b");

      expect(result).toEqual(customer);
      expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/v1/customers/a%2Fb`);
    });
  });

  describe("createCustomer", () => {
    it("invia i dati in POST e restituisce il cliente creato", async () => {
      const created = { id: 7, ...SAMPLE };
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(created));
      vi.stubGlobal("fetch", fetchMock);

      const result = await createCustomer(SAMPLE);

      expect(result).toEqual(created);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE}/v1/customers`);
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual(SAMPLE);
    });

    it("propaga l'ApiError di validazione (422) del backend", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            {
              error: {
                code: "validation_error",
                message: "La ragione sociale è obbligatoria.",
              },
            },
            { status: 422 },
          ),
        ),
      );

      const error = await createCustomer({
        ...SAMPLE,
        ragione_sociale: "",
      }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("validation_error");
      expect((error as ApiError).status).toBe(422);
    });
  });

  describe("updateCustomer", () => {
    it("invia i dati in PUT sull'id indicato", async () => {
      const updated = { id: 7, ...SAMPLE };
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(updated));
      vi.stubGlobal("fetch", fetchMock);

      const result = await updateCustomer(7, SAMPLE);

      expect(result).toEqual(updated);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE}/v1/customers/7`);
      expect(init.method).toBe("PUT");
      expect(JSON.parse(init.body)).toEqual(SAMPLE);
    });
  });

  describe("deleteCustomer", () => {
    it("invia DELETE sull'id e risolve su 204", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse(undefined, { status: 204 }));
      vi.stubGlobal("fetch", fetchMock);

      await expect(deleteCustomer(7)).resolves.toBeUndefined();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE}/v1/customers/7`);
      expect(init.method).toBe("DELETE");
    });
  });
});
