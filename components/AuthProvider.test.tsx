import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthProvider";
import { AUTH_TOKEN_KEY } from "@/lib/auth";
import { ApiError } from "@/lib/api-client";
import * as authApi from "@/lib/auth-api";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/lib/auth-api", () => ({
  login: vi.fn(),
  fetchMe: vi.fn(),
}));

const loginMock = vi.mocked(authApi.login);
const fetchMeMock = vi.mocked(authApi.fetchMe);

/** Consumer minimale che espone lo stato e le azioni del provider. */
function Consumer() {
  const { status, user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user">{user?.username ?? "none"}</span>
      <button onClick={() => void login("mario", "pw")}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    replace.mockClear();
    loginMock.mockReset();
    fetchMeMock.mockReset();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("senza token salvato risulta non autenticato", async () => {
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"),
    );
    expect(fetchMeMock).not.toHaveBeenCalled();
  });

  it("con token valido ripristina la sessione via /me", async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "tok");
    fetchMeMock.mockResolvedValue({ id: 1, username: "anna", role: "admin" });

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated"),
    );
    expect(screen.getByTestId("user")).toHaveTextContent("anna");
  });

  it("con token invalido (/me 401) pulisce la sessione", async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "scaduto");
    fetchMeMock.mockRejectedValue(new ApiError("unauthorized", "scaduto", 401));

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"),
    );
    expect(window.localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it("login salva token e utente e passa ad authenticated", async () => {
    loginMock.mockResolvedValue({
      access_token: "nuovo-token",
      token_type: "bearer",
      user: { id: 2, username: "mario", role: "operator" },
    });

    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"),
    );

    fireEvent.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated"),
    );
    expect(screen.getByTestId("user")).toHaveTextContent("mario");
    expect(window.localStorage.getItem(AUTH_TOKEN_KEY)).toBe("nuovo-token");
  });

  it("logout pulisce la sessione e reindirizza al login", async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, "tok");
    fetchMeMock.mockResolvedValue({ id: 1, username: "anna", role: "admin" });

    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("authenticated"),
    );

    fireEvent.click(screen.getByRole("button", { name: "logout" }));

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"),
    );
    expect(window.localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(replace).toHaveBeenCalledWith("/login");
  });
});
