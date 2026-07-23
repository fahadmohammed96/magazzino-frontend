import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";

let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// La shell consuma la sessione: qui mockiamo un utente Admin autenticato, così
// i test restano focalizzati sul comportamento del drawer modale.
const mockLogout = vi.fn();
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: { id: 1, username: "admin", role: "admin" },
    login: vi.fn(),
    logout: mockLogout,
  }),
}));

function renderShell() {
  return render(
    <AppShell>
      <h1>Contenuto</h1>
    </AppShell>,
  );
}

describe("AppShell — sessione utente", () => {
  afterEach(() => {
    mockPathname = "/";
    mockLogout.mockClear();
  });

  it("mostra l'utente e il suo ruolo nell'header", () => {
    renderShell();
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText(/amministratore/i)).toBeInTheDocument();
  });

  it("il pulsante Esci invoca il logout", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Esci" }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});

describe("AppShell — drawer mobile modale", () => {
  afterEach(() => {
    mockPathname = "/";
  });

  it("all'avvio il drawer è chiuso e l'hamburger non è espanso", () => {
    renderShell();
    expect(screen.getByRole("button", { name: "Apri il menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.querySelector("[inert]")).toBeNull();
  });

  it("apre un dialog modale, sposta il focus dentro e rende inerte lo sfondo", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Apri il menu" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Navigazione");
    expect(screen.getByRole("button", { name: "Chiudi il menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    // Il focus è entrato nel drawer (primo link).
    const firstLink = within(dialog).getByRole("link", { name: "Panoramica" });
    expect(firstLink).toHaveFocus();

    // Lo sfondo è inerte.
    expect(document.querySelector("[inert]")).not.toBeNull();
  });

  it("chiude con Esc e restituisce il focus all'hamburger", () => {
    renderShell();
    const hamburger = screen.getByRole("button", { name: "Apri il menu" });
    fireEvent.click(hamburger);

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apri il menu" })).toHaveFocus();
    expect(document.querySelector("[inert]")).toBeNull();
  });

  it("intrappola il focus: Shift+Tab dal primo link va all'ultimo", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Apri il menu" }));

    const dialog = screen.getByRole("dialog");
    const links = within(dialog).getAllByRole("link");
    const first = links[0];
    const last = links[links.length - 1];

    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });
});
