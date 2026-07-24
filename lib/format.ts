/**
 * Formattatori condivisi per la UI. Locale fissa `it-IT` (dashboard interna
 * italiana) e valuta EUR — assunzione dichiarata nella nota di consegna finché
 * il backend non espone la valuta nel contratto.
 */

const priceFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

/**
 * Formatta un prezzo in euro (`it-IT`), es. `12.5` → `12,50 €`. Un valore non
 * finito (NaN/Infinity, es. dato malformato) rende un trattino, così la tabella
 * non mostra `NaN`.
 */
export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return priceFormatter.format(value);
}
