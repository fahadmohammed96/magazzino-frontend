import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomerForm } from "./CustomerForm";
import type { Customer } from "@/lib/customers-api";

const SAMPLE: Customer = {
  id: 42,
  ragione_sociale: "Acme S.r.l.",
  piva: "01234567890",
  codice_fiscale: "CMEACM80A01H501X",
  indirizzo_spedizione: "Via Roma 1, Milano",
  contatti: { email: "ordini@acme.test", telefono: "+39 02 1234567" },
};

/** Rende il form con default sensati, sovrascrivibili per il singolo test. */
function renderForm(props: Partial<React.ComponentProps<typeof CustomerForm>> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn();
  const onCancel = props.onCancel ?? vi.fn();
  render(
    <CustomerForm
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitting={props.submitting ?? false}
      submitError={props.submitError ?? null}
      initial={props.initial}
    />,
  );
  return { onSubmit, onCancel };
}

function fill(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("CustomerForm", () => {
  it("blocca l'invio e mostra l'errore se manca la ragione sociale", () => {
    const { onSubmit } = renderForm();

    fill(/indirizzo di spedizione/i, "Via Roma 1");
    fireEvent.click(screen.getByRole("button", { name: /crea cliente/i }));

    expect(
      screen.getByText(/ragione sociale è obbligatoria/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("richiede anche l'indirizzo di spedizione", () => {
    const { onSubmit } = renderForm();

    fill(/ragione sociale/i, "Acme");
    fireEvent.click(screen.getByRole("button", { name: /crea cliente/i }));

    expect(
      screen.getByText(/indirizzo di spedizione è obbligatorio/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("invia i dati obbligatori omettendo gli opzionali vuoti", () => {
    const { onSubmit } = renderForm();

    fill(/ragione sociale/i, "  Acme S.r.l.  ");
    fill(/indirizzo di spedizione/i, " Via Roma 1 ");
    fireEvent.click(screen.getByRole("button", { name: /crea cliente/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      ragione_sociale: "Acme S.r.l.",
      indirizzo_spedizione: "Via Roma 1",
      contatti: {},
    });
  });

  it("include gli opzionali valorizzati (P.IVA, C.F., contatti)", () => {
    const { onSubmit } = renderForm();

    fill(/ragione sociale/i, "Acme");
    fill(/indirizzo di spedizione/i, "Via Roma 1");
    fill(/p\.iva/i, "01234567890");
    fill(/codice fiscale/i, "CMEACM80A01H501X");
    fill(/email/i, "ordini@acme.test");
    fill(/telefono/i, "+39 02 1234567");
    fireEvent.click(screen.getByRole("button", { name: /crea cliente/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      ragione_sociale: "Acme",
      indirizzo_spedizione: "Via Roma 1",
      piva: "01234567890",
      codice_fiscale: "CMEACM80A01H501X",
      contatti: { email: "ordini@acme.test", telefono: "+39 02 1234567" },
    });
  });

  it("precompila i campi in modifica e usa l'etichetta 'Salva modifiche'", () => {
    renderForm({ initial: SAMPLE });

    expect(screen.getByLabelText(/ragione sociale/i)).toHaveValue(
      "Acme S.r.l.",
    );
    expect(screen.getByLabelText(/email/i)).toHaveValue("ordini@acme.test");
    expect(
      screen.getByRole("button", { name: /salva modifiche/i }),
    ).toBeInTheDocument();
  });

  it("mostra l'errore restituito dal backend", () => {
    renderForm({ submitError: "P.IVA già presente." });
    expect(screen.getByRole("alert")).toHaveTextContent(/p\.iva già presente/i);
  });

  it("disabilita i controlli durante l'invio", () => {
    renderForm({ submitting: true });
    expect(screen.getByLabelText(/ragione sociale/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /salvataggio/i })).toBeDisabled();
  });
});
