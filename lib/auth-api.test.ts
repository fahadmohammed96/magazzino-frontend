import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchMe, login } from "./auth-api";
import { ApiError, resetApiAuth } from "./api-client";

const BASE = "https://api.example.test";

/** Response fittizia per il mock di fetch. */
function jsonResponse(
  body: unknown,
  init: { status?: number } = {},
): Response {
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

describe("auth-api", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE);
    resetApiAuth();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetApiAuth();
  });

  describe("login", () => {
    it("invia le credenziali in POST e restituisce token e utente", async () => {
      const payload = {
        access_token: "tok",
        token_type: "bearer",
        user: { id: 1, username: "mario", role: "operator" },
      };
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload));
      vi.stubGlobal("fetch", fetchMock);

      const result = await login({ username: "mario", password: "segreta" });

      expect(result).toEqual(payload);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE}/v1/auth/login`);
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({
        username: "mario",
        password: "segreta",
      });
      // Richiesta pubblica: nessun header Authorization.
      expect(init.headers).not.toHaveProperty("Authorization");
    });

    it("propaga l'ApiError 401 su credenziali errate senza logout globale", async () => {
      const onUnauthorized = vi.fn();
      // Anche con un handler registrato, il 401 del login non deve innescarlo.
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(
            {
              error: {
                code: "invalid_credentials",
                message: "Credenziali non valide.",
              },
            },
            { status: 401 },
          ),
        ),
      );
      // resetApiAuth in beforeEach lascia l'handler nullo; lo simuliamo qui.
      const { configureApiAuth } = await import("./api-client");
      configureApiAuth({ getToken: () => null, onUnauthorized });

      const error = await login({ username: "x", password: "y" }).catch(
        (e: unknown) => e,
      );

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("invalid_credentials");
      expect(onUnauthorized).not.toHaveBeenCalled();
    });
  });

  describe("fetchMe", () => {
    it("allega il token e restituisce l'utente", async () => {
      const { configureApiAuth } = await import("./api-client");
      configureApiAuth({ getToken: () => "tok", onUnauthorized: vi.fn() });

      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ id: 2, username: "anna", role: "admin" }),
        );
      vi.stubGlobal("fetch", fetchMock);

      const me = await fetchMe();

      expect(me).toEqual({ id: 2, username: "anna", role: "admin" });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE}/v1/auth/me`);
      expect(init.headers.Authorization).toBe("Bearer tok");
    });
  });
});
