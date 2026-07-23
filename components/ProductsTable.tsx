import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/format";
import { LowStockBadge } from "@/components/LowStockBadge";

interface ProductsTableProps {
  products: readonly Product[];
  /** Se `true` mostra la colonna azioni (modifica/elimina): solo per l'Admin. */
  canWrite: boolean;
  /** Invocata sul comando "Modifica" di una riga. */
  onEdit?: (product: Product) => void;
  /** Invocata sul comando "Elimina" di una riga. */
  onDelete?: (product: Product) => void;
}

/**
 * Tabella del catalogo prodotti: colonne chiave (SKU, nome, prezzo, giacenza)
 * con badge sotto-scorta quando `low_stock`. La colonna azioni compare solo
 * per l'Admin (`canWrite`); l'Operatore vede la stessa tabella in sola lettura.
 * Presentazionale e priva di stato: i dati e i comandi arrivano dal chiamante.
 */
export function ProductsTable({
  products,
  canWrite,
  onEdit,
  onDelete,
}: ProductsTableProps) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Elenco dei prodotti del catalogo</caption>
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th scope="col" className="px-4 py-3 font-medium">
              SKU
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Nome
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Prezzo
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Giacenza
            </th>
            {canWrite && (
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Azioni
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className="border-b border-border last:border-0"
            >
              <td className="px-4 py-3 font-mono text-xs text-surface-contrast">
                {product.sku}
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-surface-contrast">
                  {product.name}
                </span>
                {product.description && (
                  <span className="mt-0.5 block max-w-prose truncate text-xs text-muted">
                    {product.description}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-surface-contrast">
                {formatPrice(product.price)}
              </td>
              <td className="px-4 py-3 text-right">
                <span className="inline-flex items-center justify-end gap-2">
                  <span className="tabular-nums text-surface-contrast">
                    {product.stock_quantity}
                  </span>
                  {product.low_stock && <LowStockBadge />}
                </span>
              </td>
              {canWrite && (
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit?.(product)}
                      className="inline-flex h-8 items-center rounded-[var(--radius-card)] border border-border px-3 text-xs font-medium text-surface-contrast transition-colors duration-200 hover:bg-surface-muted"
                    >
                      Modifica
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(product)}
                      className="inline-flex h-8 items-center rounded-[var(--radius-card)] border border-border px-3 text-xs font-medium text-danger transition-colors duration-200 hover:bg-surface-muted"
                    >
                      Elimina
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
