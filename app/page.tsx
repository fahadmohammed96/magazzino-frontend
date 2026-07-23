import Link from "next/link";
import { NAV_SECTIONS, sectionHref } from "@/lib/navigation";

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

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NAV_SECTIONS.map((section) => (
          <li key={section.slug}>
            <Link
              href={sectionHref(section)}
              className="flex h-full flex-col gap-2 rounded-[var(--radius-card)] border border-border p-5 transition-colors duration-200 hover:bg-surface-muted"
            >
              <span className="font-display text-lg font-semibold text-surface-contrast">
                {section.label}
              </span>
              <span className="text-sm text-muted">{section.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
