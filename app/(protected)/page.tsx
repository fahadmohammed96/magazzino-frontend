import { OverviewCards } from "@/components/OverviewCards";

/** Home della shell: panoramica con accesso alle sezioni. Nessun dato reale. */
export default function Home() {
  return (
    <section aria-labelledby="titolo-panoramica" className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1
          id="titolo-panoramica"
          className="font-display text-2xl font-semibold tracking-tight"
        >
          Panoramica
        </h1>
        <p className="max-w-prose text-sm text-muted">
          Shell del gestionale di magazzino. Le sezioni qui sotto sono
          segnaposto: catalogo, clienti e ordini arriveranno con le issue di
          dominio.
        </p>
      </header>

      <OverviewCards />
    </section>
  );
}
