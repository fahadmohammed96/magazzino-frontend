/**
 * Sezioni della shell dashboard. Fonte unica per la navigazione e per la
 * generazione delle rotte placeholder. Le feature di dominio (Catalogo,
 * Clienti, Ordini) vivranno dentro queste rotte nelle issue di Fase 2.
 */

import type { Role } from "@/lib/auth";

export interface NavSection {
  /** Slug della rotta, es. `catalogo` → `/catalogo`. */
  readonly slug: string;
  /** Etichetta mostrata nella navigazione. */
  readonly label: string;
  /** Descrizione breve dello stato vuoto della sezione. */
  readonly description: string;
  /**
   * Ruoli a cui la voce è riservata. Se assente, la voce è visibile a tutti.
   * Mappatura provvisoria di questa fetta auth: la matrice ruolo↔sezione
   * definitiva si fisserà con le issue di dominio (lettura vs scrittura).
   */
  readonly roles?: readonly Role[];
}

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    slug: "catalogo",
    label: "Catalogo",
    description:
      "Prodotti e giacenze del magazzino. La gestione arriverà con le issue di dominio.",
    // Gestione prodotti/prezzi: riservata all'Admin (cfr. contratto BE auth).
    roles: ["admin"],
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

/**
 * Verifica se una sezione è visibile al ruolo dato. Le sezioni senza `roles`
 * sono pubbliche a ogni utente autenticato; quelle con `roles` compaiono solo
 * se il ruolo è incluso (ruolo assente ⇒ voce riservata nascosta).
 */
export function isSectionVisible(
  section: NavSection,
  role: Role | undefined,
): boolean {
  if (!section.roles) return true;
  return role !== undefined && section.roles.includes(role);
}

/** Sezioni visibili al ruolo dato, nell'ordine di definizione. */
export function visibleSections(role: Role | undefined): readonly NavSection[] {
  return NAV_SECTIONS.filter((section) => isSectionVisible(section, role));
}
