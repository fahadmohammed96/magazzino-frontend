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

  it("mostra Panoramica e le tre sezioni con gli href corretti", () => {
    render(<NavLinks />);
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

  it("segna la sezione attiva con aria-current=page", () => {
    mockPathname = "/ordini";
    render(<NavLinks />);
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
    render(<NavLinks />);
    expect(screen.getByRole("link", { name: "Panoramica" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
