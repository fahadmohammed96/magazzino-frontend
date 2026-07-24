import type { OrderStatus } from "@/lib/orders-api";
import { STATUS_LABELS } from "@/lib/orders-api";

/**
 * Classi del badge per ogni stato. Solo token del design system; lo stato
 * `annullato` usa il rosso semantico (`danger`) a fondo pieno, gli altri
 * varianti neutre di superficie. Il significato è sempre veicolato dal testo
 * (etichetta leggibile), non dal solo colore (requisito WCAG).
 */
const BADGE_CLASS: Record<OrderStatus, string> = {
  in_attesa: "border border-border bg-surface-muted text-surface-contrast",
  in_lavorazione: "bg-primary text-primary-contrast",
  evaso: "border border-border bg-surface text-muted",
  annullato: "bg-danger text-danger-contrast",
};

/**
 * Badge dello stato di un ordine: etichetta leggibile con colore dal design
 * system. Presentazionale e senza stato.
 */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE_CLASS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
