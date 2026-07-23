import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "../page";
import { NAV_SECTIONS } from "@/lib/navigation";

// La panoramica filtra le card per ruolo: mockiamo un Admin, che vede tutte
// le sezioni. Il gating per ruolo è verificato nei test di NavLinks/OverviewCards.
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: { id: 1, username: "admin", role: "admin" },
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe("Home (Panoramica)", () => {
  it("mostra il titolo Panoramica", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: /panoramica/i }),
    ).toBeInTheDocument();
  });

  it("elenca le sezioni visibili con link alla rispettiva rotta", () => {
    render(<Home />);
    for (const section of NAV_SECTIONS) {
      const link = screen.getByRole("link", {
        name: new RegExp(section.label, "i"),
      });
      expect(link).toHaveAttribute("href", `/${section.slug}`);
    }
  });
});
