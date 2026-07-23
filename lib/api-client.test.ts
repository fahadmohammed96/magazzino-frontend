import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  apiFetch,
  apiFetchBlob,
  configureApiAuth,
  getApiBaseUrl,
  isApiErrorBody,
  resetApiAuth,
  UNKNOWN_ERROR_CODE,
} from "./api-client";

const BASE = "https://api.example.test";

/** Costruisce una Response fittizia per il mock di fetch. */
function jsonResponse(
  body: unknown,
  init: { status?: number; ok?: boolean } = {},
): Response {
  const status = init.status ?? 200;
  const text = body === undefined ? "" : JSON.stringify(body);
  return {
    ok: init.ok ?? (status >= 200 && status < 300),
    status,
    text: () => Promise.resolve(text),
    json: () =>
      text.length === 0
        ? Promise.reject(new SyntaxError("empty"))
        : Promise.resolve(JSON.parse(text)),
  } as unknown as Response;
}

describe("api-client", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetApiAuth();
  });

  describe("getApiBaseUrl", () => {
    it("legge la base URL dall'ambiente e rimuove lo slash finale", () => {
      vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", `${BASE}/`);
      expect(getApiBaseUrl()).toBe(BASE);
    });

    it("solleva ApiError config_missing se la variabile manca", () => {
      vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
      expect(() => getApiBaseUrl()).toThrowError(
        expect.objectContaining({ code: "config_missing" }),
      );
    });
  });

  describe("isApiErrorBody", () => {
    it("riconosce il formato concordato", () => {
      expect(isApiErrorBody({ error: { code: "x", message: "y" } })).toBe(true);
    });

    it("rifiuta forme non conformi", () => {
      expect(isApiErrorBody({ error: { code: 1 } })).toBe(false);
      expect(isApiErrorBody(null)).toBe(false);
      expect(isApiErrorBody("boom")).toBe(false);
    });
  });

  describe("apiFetch", () => {
    it("compone l'URL e restituisce il JSON su risposta ok", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(jsonResponse({ hello: "world" }));
      vi.stubGlobal("fetch", fetchMock);

      const data = await apiFetch<{ hello: string }>("/ping");

      expect(data).toEqual({ hello: "world" });
      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE}/ping`,
        expect.objectContaining({
          headers: expect.objectContaining({ Accept: "application/json" }),
        }),
      );
    });

    it("mappa il formato d'errore concordato su ApiError", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            { error: { code: "not_found", message: "Risorsa assente" } },
            { status: 404 },
          ),
        ),
      );

      await expect(apiFetch("/x")).rejects.toMatchObject({
        code: "not_found",
        message: "Risorsa assente",
        status: 404,
      });
    });

    it("usa un fallback quando l'errore non rispetta il formato", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse({ oops: true }, { status: 500 })),
      );

      const error = await apiFetch("/x").catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe(UNKNOWN_ERROR_CODE);
      expect((error as ApiError).status).toBe(500);
    });

    it("trasforma gli errori di rete in ApiError network_error", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new TypeError("failed to fetch")),
      );

      await expect(apiFetch("/x")).rejects.toMatchObject({
        code: "network_error",
      });
    });

    it("restituisce undefined su 204 No Content", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(jsonResponse(undefined, { status: 204 })),
      );

      await expect(apiFetch("/x")).resolves.toBeUndefined();
    });

    it("solleva invalid_response su JSON non interpretabile", async () => {
      const bad = {
        ok: true,
        status: 200,
        text: () => Promise.resolve("{not json"),
        json: () => Promise.reject(new SyntaxError("bad")),
      } as unknown as Response;
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(bad));

      await expect(apiFetch("/x")).rejects.toMatchObject({
        code: "invalid_response",
      });
    });
  });

  describe("autenticazione", () => {
    it("allega Authorization: Bearer quando c'è un token", async () => {
      configureApiAuth({ getToken: () => "tok", onUnauthorized: vi.fn() });
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
      vi.stubGlobal("fetch", fetchMock);

      await apiFetch("/protetta");

      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE}/protetta`,
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer tok" }),
        }),
      );
    });

    it("non allega il token quando auth: false", async () => {
      configureApiAuth({ getToken: () => "tok", onUnauthorized: vi.fn() });
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
      vi.stubGlobal("fetch", fetchMock);

      await apiFetch("/pubblica", { auth: false });

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers).not.toHaveProperty("Authorization");
    });

    it("su 401 di una richiesta autenticata invoca onUnauthorized", async () => {
      const onUnauthorized = vi.fn();
      configureApiAuth({ getToken: () => "tok", onUnauthorized });
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            { error: { code: "unauthorized", message: "scaduto" } },
            { status: 401 },
          ),
        ),
      );

      await expect(apiFetch("/protetta")).rejects.toBeInstanceOf(ApiError);
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it("su 401 di una richiesta pubblica NON invoca onUnauthorized", async () => {
      const onUnauthorized = vi.fn();
      configureApiAuth({ getToken: () => null, onUnauthorized });
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            { error: { code: "invalid_credentials", message: "no" } },
            { status: 401 },
          ),
        ),
      );

      await expect(
        apiFetch("/pubblica", { auth: false }),
      ).rejects.toBeInstanceOf(ApiError);
      expect(onUnauthorized).not.toHaveBeenCalled();
    });
  });

  describe("apiFetchBlob", () => {
    /** Response fittizia con corpo Blob per l'export CSV. */
    function blobResponse(
      blob: Blob,
      init: { status?: number; ok?: boolean } = {},
    ): Response {
      const status = init.status ?? 200;
      return {
        ok: init.ok ?? (status >= 200 && status < 300),
        status,
        blob: () => Promise.resolve(blob),
        json: () => Promise.reject(new SyntaxError("no json")),
        text: () => Promise.resolve(""),
      } as unknown as Response;
    }

    it("restituisce il blob e allega il token Bearer", async () => {
      const blob = new Blob(["sku,name\n"], { type: "text/csv" });
      const fetchMock = vi.fn().mockResolvedValue(blobResponse(blob));
      vi.stubGlobal("fetch", fetchMock);
      configureApiAuth({ getToken: () => "tok", onUnauthorized: vi.fn() });

      const result = await apiFetchBlob("/v1/products/export");

      expect(result).toBe(blob);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE}/v1/products/export`);
      expect(init.headers).toMatchObject({ Authorization: "Bearer tok" });
    });

    it("su 401 invoca onUnauthorized e solleva ApiError", async () => {
      const onUnauthorized = vi.fn();
      configureApiAuth({ getToken: () => "tok", onUnauthorized });
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            { error: { code: "unauthorized", message: "scaduto" } },
            { status: 401 },
          ),
        ),
      );

      await expect(apiFetchBlob("/v1/products/export")).rejects.toBeInstanceOf(
        ApiError,
      );
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });
  });
});
