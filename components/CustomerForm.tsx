"use client";

import { useId, useState } from "react";
import type { Customer, CustomerInput } from "@/lib/customers-api";

/** Classi condivise dai controlli di input del form (coerenti col login). */
const FIELD_CLASS =
  "rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2 text-sm text-surface-contrast transition-colors duration-200 focus-visible:border-accent disabled:opacity-60";

/** Costruisce l'input API a partire dai campi, omettendo gli opzionali vuoti. */
function toInput(fields: {
  ragioneSociale: string;
  piva: string;
  codiceFiscale: string;
  indirizzo: string;
  email: string;
  telefono: string;
}): CustomerInput {
  const contatti: CustomerInput["contatti"] = {};
  if (fields.email.trim()) contatti.email = fields.email.trim();
  if (fields.telefono.trim()) contatti.telefono = fields.telefono.trim();

  const input: CustomerInput = {
    ragione_sociale: fields.ragioneSociale.trim(),
    indirizzo_spedizione: fields.indirizzo.trim(),
    contatti,
  };
  if (fields.piva.trim()) input.piva = fields.piva.trim();
  if (fields.codiceFiscale.trim()) input.codice_fiscale = fields.codiceFiscale.trim();
  return input;
}

/**
 * Form di creazione/modifica cliente. Presentazionale: lo stato di rete (invio,
 * errore del backend) è del contenitore, passato via props. Valida in locale i
 * campi obbligatori — `ragione_sociale` e `indirizzo_spedizione`, per contratto
 * non opzionali — mostrando l'errore accanto al campo senza far partire la
 * richiesta.
 */
export function CustomerForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  submitError,
}: {
  /** Cliente da modificare; assente in creazione. */
  initial?: Customer;
  /** Invocata coi dati validati quando il form è valido. */
  onSubmit: (input: CustomerInput) => void;
  onCancel: () => void;
  /** `true` mentre la richiesta di rete è in corso: disabilita i controlli. */
  submitting: boolean;
  /** Messaggio d'errore del backend da mostrare in cima al form. */
  submitError: string | null;
}) {
  const ragioneId = useId();
  const pivaId = useId();
  const cfId = useId();
  const indirizzoId = useId();
  const emailId = useId();
  const telefonoId = useId();
  const ragioneErrId = useId();
  const indirizzoErrId = useId();
  const submitErrId = useId();

  const [ragioneSociale, setRagioneSociale] = useState(
    initial?.ragione_sociale ?? "",
  );
  const [piva, setPiva] = useState(initial?.piva ?? "");
  const [codiceFiscale, setCodiceFiscale] = useState(
    initial?.codice_fiscale ?? "",
  );
  const [indirizzo, setIndirizzo] = useState(
    initial?.indirizzo_spedizione ?? "",
  );
  const [email, setEmail] = useState(initial?.contatti.email ?? "");
  const [telefono, setTelefono] = useState(initial?.contatti.telefono ?? "");

  const [errors, setErrors] = useState<{
    ragione_sociale?: string;
    indirizzo_spedizione?: string;
  }>({});

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors: typeof errors = {};
    if (ragioneSociale.trim() === "") {
      nextErrors.ragione_sociale = "La ragione sociale è obbligatoria.";
    }
    if (indirizzo.trim() === "") {
      nextErrors.indirizzo_spedizione =
        "L'indirizzo di spedizione è obbligatorio.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit(
      toInput({ ragioneSociale, piva, codiceFiscale, indirizzo, email, telefono }),
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {submitError && (
        <p
          id={submitErrId}
          role="alert"
          className="rounded-[var(--radius-card)] border border-border bg-surface-muted px-3 py-2 text-sm text-surface-contrast"
        >
          {submitError}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={ragioneId} className="text-sm font-medium">
          Ragione sociale <span aria-hidden="true">*</span>
        </label>
        <input
          id={ragioneId}
          name="ragione_sociale"
          type="text"
          required
          value={ragioneSociale}
          onChange={(e) => setRagioneSociale(e.target.value)}
          aria-invalid={errors.ragione_sociale !== undefined}
          aria-describedby={
            errors.ragione_sociale ? ragioneErrId : undefined
          }
          disabled={submitting}
          className={FIELD_CLASS}
        />
        {errors.ragione_sociale && (
          <p id={ragioneErrId} role="alert" className="text-sm text-surface-contrast">
            {errors.ragione_sociale}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={pivaId} className="text-sm font-medium">
            P.IVA
          </label>
          <input
            id={pivaId}
            name="piva"
            type="text"
            inputMode="numeric"
            value={piva}
            onChange={(e) => setPiva(e.target.value)}
            disabled={submitting}
            className={FIELD_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={cfId} className="text-sm font-medium">
            Codice fiscale
          </label>
          <input
            id={cfId}
            name="codice_fiscale"
            type="text"
            value={codiceFiscale}
            onChange={(e) => setCodiceFiscale(e.target.value)}
            disabled={submitting}
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={indirizzoId} className="text-sm font-medium">
          Indirizzo di spedizione <span aria-hidden="true">*</span>
        </label>
        <textarea
          id={indirizzoId}
          name="indirizzo_spedizione"
          required
          rows={2}
          value={indirizzo}
          onChange={(e) => setIndirizzo(e.target.value)}
          aria-invalid={errors.indirizzo_spedizione !== undefined}
          aria-describedby={
            errors.indirizzo_spedizione ? indirizzoErrId : undefined
          }
          disabled={submitting}
          className={`${FIELD_CLASS} resize-y`}
        />
        {errors.indirizzo_spedizione && (
          <p
            id={indirizzoErrId}
            role="alert"
            className="text-sm text-surface-contrast"
          >
            {errors.indirizzo_spedizione}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={emailId} className="text-sm font-medium">
            Email
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className={FIELD_CLASS}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={telefonoId} className="text-sm font-medium">
            Telefono
          </label>
          <input
            id={telefonoId}
            name="telefono"
            type="tel"
            autoComplete="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            disabled={submitting}
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div className="mt-2 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-card)] border border-border px-4 text-sm font-medium text-surface-contrast transition-colors duration-200 hover:bg-surface-muted disabled:opacity-60"
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-card)] bg-primary px-4 text-sm font-medium text-primary-contrast transition-colors duration-200 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? "Salvataggio…"
            : initial
              ? "Salva modifiche"
              : "Crea cliente"}
        </button>
      </div>
    </form>
  );
}
