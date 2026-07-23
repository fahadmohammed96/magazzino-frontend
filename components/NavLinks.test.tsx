import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NavLinks } from "./NavLinks";

// usepathname mockato: cambia `mockPathname` per simulare la rotta corrente.
let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

describe("NavLinks", () => {
  afterEach(() => {
    mockPathname = "/";
  });

  it("all'Admin mostra Panoramica e tutte le sezioni con gli href corretti", () => {
    render(<NavLinks role="admin" />);
    expect(screen.getByRole("link", { name: "Panoramica" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Catalogo" })).toHaveAttribute(
      "href",
      "/catalogo",
    );
    expect(screen.getByRole("link", { name: "Clienti" })).toHaveAttribute(
      "href",
      "/clienti",
    );
    expect(screen.getByRole("link", { name: "Ordini" })).toHaveAttribute(
      "href",
      "/ordini",
    );
  });

  it("all'Operatore nasconde le voci riservate all'Admin (Catalogo)", () => {
    render(<NavLinks role="operator" />);
    expect(screen.getByRole("link", { name: "Panoramica" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clienti" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ordini" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Catalogo" }),
    ).not.toBeInTheDocument();
  });

  it("senza ruolo noto nasconde comunque le voci riservate", () => {
    render(<NavLinks />);
    expect(
      screen.queryByRole("link", { name: "Catalogo" }),
    ).not.toBeInTheDocument();
  });

  it("segna la sezione attiva con aria-current=page", () => {
    mockPathname = "/ordini";
    render(<NavLinks role="admin" />);
    expect(screen.getByRole("link", { name: "Ordini" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Catalogo" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("non attiva Panoramica su una sotto-rotta", () => {
    mockPathname = "/catalogo";
    render(<NavLinks role="admin" />);
    expect(
      screen.getByRole("link", { name: "Panoramica" }),
    ).not.toHaveAttribute("aria-current");
  });
});
