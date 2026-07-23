import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";
import { ApiError } from "@/lib/api-client";
import type { AuthStatus } from "./AuthProvider";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

let mockStatus: AuthStatus = "unauthenticated";
const loginMock = vi.fn();
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({ status: mockStatus, login: loginMock }),
}));

/** Compila e invia il form con le credenziali date. */
function submit(username: string, password: string) {
  fireEvent.change(screen.getByLabelText(/nome utente/i), {
    target: { value: username },
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: /accedi/i }));
}

describe("LoginForm", () => {
  beforeEach(() => {
    mockStatus = "unauthenticated";
    replace.mockClear();
    loginMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mostra i campi credenziali e il pulsante di accesso", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/nome utente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accedi/i })).toBeInTheDocument();
  });

  it("su credenziali valide autentica e reindirizza alla dashboard", async () => {
    loginMock.mockResolvedValue(undefined);
    render(<LoginForm />);

    submit("mario", "segreta");

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith("mario", "segreta"),
    );
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("su 401 mostra il messaggio d'errore e non reindirizza", async () => {
    loginMock.mockRejectedValue(
      new ApiError("invalid_credentials", "Credenziali non valide.", 401),
    );
    render(<LoginForm />);

    submit("mario", "sbagliata");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Credenziali non valide.");
    expect(replace).not.toHaveBeenCalled();
    // L'input non viene perso.
    expect(screen.getByLabelText(/nome utente/i)).toHaveValue("mario");
  });

  it("a campi vuoti mostra la validazione e non chiama il backend", async () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByRole("button", { name: /accedi/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/inserisci nome utente e password/i);
    expect(loginMock).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("se già autenticato reindirizza alla dashboard", () => {
    mockStatus = "authenticated";
    render(<LoginForm />);
    expect(replace).toHaveBeenCalledWith("/");
  });
});
