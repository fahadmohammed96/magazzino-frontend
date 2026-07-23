import type { Metadata } from "next";
import { ProductsView } from "@/components/ProductsView";

export const metadata: Metadata = { title: "Catalogo — Magazzino" };

/**
 * Sezione Catalogo: lista prodotti con badge sotto-scorta, filtro e — per il
 * solo Admin — CRUD e import/export CSV. La vista è interamente lato client
 * (`ProductsView`) e consuma il contratto catalogo `/v1` via il client API.
 */
export default function CatalogoPage() {
  return <ProductsView />;
}
