import type { Metadata } from "next";
import { OrdiniView } from "@/components/OrdiniView";

export const metadata: Metadata = { title: "Ordini — Magazzino" };

/**
 * Sezione Ordini: creazione con totale live, lista filtrabile per stato,
 * dettaglio delle righe e cambio stato lungo le transizioni consentite. La
 * vista è interamente lato client (`OrdiniView`) e consuma il contratto ordini
 * `/v1` via il client API.
 */
export default function OrdiniPage() {
  return <OrdiniView />;
}
