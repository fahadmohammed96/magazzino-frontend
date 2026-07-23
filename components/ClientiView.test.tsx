import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientiView } from "./ClientiView";
import { ApiError } from "@/lib/api-client";
import type { Customer } from "@/lib/customers-api";

vi.mock("@/lib/customers-api", () => ({
  listCustomers: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
}));

import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from "@/lib/customers-api";

const mockList = vi.mocked(listCustomers);
const mockCreate = vi.mocked(createCustomer);
const mockUpdate = vi.mocked(updateCustomer);
const mockDelete = vi.mocked(deleteCustomer);

const ACME: Customer = {
  id: 1,
  ragione_sociale: "Acme S.r.l.",
  piva: "01234567890",
  indirizzo_spedizione: "Via Roma 1, Milano",
  contatti: { email: "ordini@acme.test" },
};

const BETA: Customer = {
  id: 2,
  ragione_sociale: "Beta S.p.A.",
  codice_fiscale: "BTASPA80A01H501X",
  indirizzo_spedizione: "Via Verdi 2, Torino",
  contatti: { telefono: "+39 011 222333" },
};

describe("ClientiView", () => {
  beforeEach(() => {
    mockList.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockDelete.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mostra i clienti restituiti dal backend", async () => {
    mockList.mockResolvedValue([ACME, BETA]);
    render(<ClientiView />);

    expect(await screen.findByText("Acme S.r.l.")).toBeInTheDocument();
    expect(screen.getByText("Beta S.p.A.")).toBeInTheDocument();
    // Contatti sintetizzati per riga.
    expect(screen.getByText("ordini@acme.test")).toBeInTheDocument();
    expect(screen.getByText("+39 011 222333")).toBeInTheDocument();
  });

  it("filtra passando la query `q` al backend", async () => {
    mockList.mockResolvedValue([ACME]);
    render(<ClientiView />);
    await screen.findByText("Acme S.r.l.");

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "acme" },
    });

    await waitFor(() => expect(mockList).toHaveBeenCalledWith("acme"));
  });

  it("mostra lo stato vuoto quando non ci sono clienti", async () => {
    mockList.mockResolvedValue([]);
    render(<ClientiView />);

    expect(await screen.findByText(/nessun cliente/i)).toBeInTheDocument();
  });

  it("mostra un errore con possibilità di riprova", async () => {
    mockList
      .mockRejectedValueOnce(new ApiError("network_error", "Rete assente."))
      .mockResolvedValueOnce([ACME]);
    render(<ClientiView />);

    expect(
      await screen.findByText(/impossibile caricare i clienti/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Rete assente.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /riprova/i }));

    expect(await screen.findByText("Acme S.r.l.")).toBeInTheDocument();
  });

  it("crea un nuovo cliente e ricarica l'elenco", async () => {
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue({ ...ACME, id: 99 });
    render(<ClientiView />);
    await screen.findByText(/nessun cliente/i);

    fireEvent.click(screen.getByRole("button", { name: /nuovo cliente/i }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/ragione sociale/i), {
      target: { value: "Nuova Ditta" },
    });
    fireEvent.change(
      within(dialog).getByLabelText(/indirizzo di spedizione/i),
      { target: { value: "Via Nuova 10" } },
    );
    fireEvent.click(within(dialog).getByRole("button", { name: /crea cliente/i }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        ragione_sociale: "Nuova Ditta",
        indirizzo_spedizione: "Via Nuova 10",
        contatti: {},
      }),
    );
    // Dialog chiuso e lista ricaricata dopo il successo.
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(mockList.mock.calls.length).toBeGreaterThan(1);
  });

  it("modifica un cliente esistente", async () => {
    mockList.mockResolvedValue([ACME]);
    mockUpdate.mockResolvedValue({ ...ACME, ragione_sociale: "Acme 2" });
    render(<ClientiView />);
    await screen.findByText("Acme S.r.l.");

    fireEvent.click(screen.getByRole("button", { name: /modifica/i }));

    const dialog = await screen.findByRole("dialog");
    const nameField = within(dialog).getByLabelText(/ragione sociale/i);
    expect(nameField).toHaveValue("Acme S.r.l.");
    fireEvent.change(nameField, { target: { value: "Acme 2" } });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /salva modifiche/i }),
    );

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ ragione_sociale: "Acme 2" }),
      ),
    );
    // Attende la chiusura del dialog: garantisce che il reload post-successo
    // sia completato dentro l'ambito del test.
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("elimina un cliente previa conferma", async () => {
    mockList.mockResolvedValue([ACME]);
    mockDelete.mockResolvedValue(undefined);
    render(<ClientiView />);
    await screen.findByText("Acme S.r.l.");

    fireEvent.click(screen.getByRole("button", { name: /elimina/i }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/non è reversibile/i);
    fireEvent.click(within(dialog).getByRole("button", { name: /^elimina$/i }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("mostra l'errore del backend senza chiudere il form in creazione", async () => {
    mockList.mockResolvedValue([]);
    mockCreate.mockRejectedValue(
      new ApiError("validation_error", "P.IVA duplicata.", 422),
    );
    render(<ClientiView />);
    await screen.findByText(/nessun cliente/i);

    fireEvent.click(screen.getByRole("button", { name: /nuovo cliente/i }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/ragione sociale/i), {
      target: { value: "Ditta" },
    });
    fireEvent.change(
      within(dialog).getByLabelText(/indirizzo di spedizione/i),
      { target: { value: "Via 1" } },
    );
    fireEvent.click(within(dialog).getByRole("button", { name: /crea cliente/i }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      /p\.iva duplicata/i,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
