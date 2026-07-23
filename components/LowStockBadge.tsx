/**
 * Badge "sotto-scorta": segnala che la giacenza di un prodotto è al di sotto
 * della soglia. Colore dal token semantico `danger` (rosso pieno, testo
 * `danger-contrast`) — nessun colore hardcoded. Il significato è veicolato dal
 * testo, non dal solo colore (requisito WCAG: non affidarsi al colore da solo).
 */
export function LowStockBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-danger-contrast">
      <span aria-hidden="true">●</span>
      Sotto scorta
    </span>
  );
}
