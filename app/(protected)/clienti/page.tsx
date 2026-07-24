import type { Metadata } from "next";
import { ClientiView } from "@/components/ClientiView";
import { NAV_SECTIONS } from "@/lib/navigation";

const section = NAV_SECTIONS.find((s) => s.slug === "clienti")!;

export const metadata: Metadata = { title: `${section.label} — Magazzino` };

/**
 * Rotta Clienti: anagrafica con elenco, ricerca e gestione CRUD. Il grosso è
 * interattivo (fetch, form, dialog) e vive nel client component `ClientiView`;
 * la pagina resta un server component che fissa solo il titolo.
 */
export default function ClientiPage() {
  return <ClientiView />;
}
