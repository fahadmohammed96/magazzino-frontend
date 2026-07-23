/**
 * Sezioni della shell dashboard. Fonte unica per la navigazione e per la
 * generazione delle rotte placeholder. Le feature di dominio (Catalogo,
 * Clienti, Ordini) vivranno dentro queste rotte nelle issue di Fase 2.
 */

export interface NavSection {
  /** Slug della rotta, es. `catalogo` → `/catalogo`. */
  readonly slug: string;
  /** Etichetta mostrata nella navigazione. */
  readonly label: string;
  /** Descrizione breve dello stato vuoto della sezione. */
  readonly description: string;
}

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    slug: "catalogo",
    label: "Catalogo",
    description:
      "Prodotti e giacenze del magazzino. La gestione arriverà con le issue di dominio.",
  },
  {
    slug: "clienti",
    label: "Clienti",
    description:
      "Anagrafica clienti. L'elenco e la scheda dettaglio arriveranno con le issue di dominio.",
  },
  {
    slug: "ordini",
    label: "Ordini",
    description:
      "Ordini di magazzino e relativo stato. Il flusso completo arriverà con le issue di dominio.",
  },
] as const;

/** Percorso assoluto di una sezione, es. `/catalogo`. */
export function sectionHref(section: NavSection): string {
  return `/${section.slug}`;
}
