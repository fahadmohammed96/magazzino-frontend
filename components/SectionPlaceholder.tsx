/**
 * Contenuto placeholder di una sezione della shell: intestazione + stato
 * vuoto. Nessun dato reale — le feature di dominio popoleranno quest'area
 * nelle issue di Fase 2.
 */
export function SectionPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section aria-labelledby="titolo-sezione" className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1
          id="titolo-sezione"
          className="font-display text-2xl font-semibold tracking-tight"
        >
          {title}
        </h1>
        <p className="max-w-prose text-sm text-muted">{description}</p>
      </header>

      <div className="flex flex-col items-start gap-2 rounded-[var(--radius-card)] border border-dashed border-border p-8">
        <p className="text-sm font-medium text-surface-contrast">
          Nessun dato da mostrare
        </p>
        <p className="max-w-prose text-sm text-muted">
          Questa è una sezione segnaposto della shell. I contenuti reali
          arriveranno con le issue di dominio, che consumeranno il client API
          centralizzato.
        </p>
      </div>
    </section>
  );
}
