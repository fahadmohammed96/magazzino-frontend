import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OverviewCards } from "./OverviewCards";
import type { Role } from "@/lib/auth";

let mockRole: Role | undefined = "admin";
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({ user: mockRole ? { role: mockRole } : null }),
}));

describe("OverviewCards", () => {
  afterEach(() => {
    mockRole = "admin";
  });

  it("all'Admin mostra tutte le sezioni", () => {
    mockRole = "admin";
    render(<OverviewCards />);
    expect(screen.getByRole("link", { name: /catalogo/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /clienti/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ordini/i })).toBeInTheDocument();
  });

  it("all'Operatore nasconde le sezioni riservate all'Admin", () => {
    mockRole = "operator";
    render(<OverviewCards />);
    expect(
      screen.queryByRole("link", { name: /catalogo/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /clienti/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ordini/i })).toBeInTheDocument();
  });
});
