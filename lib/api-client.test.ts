import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  apiFetch,
  getApiBaseUrl,
  isApiErrorBody,
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
});
