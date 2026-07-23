import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthGuard } from "./AuthGuard";
import type { AuthStatus } from "./AuthProvider";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

let mockStatus: AuthStatus = "loading";
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({ status: mockStatus }),
}));

function renderGuard() {
  return render(
    <AuthGuard>
      <p>Contenuto protetto</p>
    </AuthGuard>,
  );
}

describe("AuthGuard", () => {
  afterEach(() => {
    replace.mockClear();
    mockStatus = "loading";
  });

  it("in caricamento mostra l'indicatore e non il contenuto", () => {
    mockStatus = "loading";
    renderGuard();
    expect(screen.getByRole("status")).toHaveTextContent(/verifica della sessione/i);
    expect(screen.queryByText("Contenuto protetto")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("se non autenticato reindirizza al login senza mostrare il contenuto", () => {
    mockStatus = "unauthenticated";
    renderGuard();
    expect(replace).toHaveBeenCalledWith("/login");
    expect(screen.queryByText("Contenuto protetto")).not.toBeInTheDocument();
  });

  it("se autenticato mostra il contenuto protetto", () => {
    mockStatus = "authenticated";
    renderGuard();
    expect(screen.getByText("Contenuto protetto")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
