/**
 * Datasource value types — Nimbus-free so both the render layer (this package)
 * and the editor's `DatasourceField` widget can share them without the widget's
 * Nimbus deps leaking into the render graph.
 */
export type DatasourceType = 'product-by-sku' | 'products-by-sku';

export interface DatasourceValue {
  type: DatasourceType;
  skus: string[];
  /** Pre-resolved by the server on published/preview endpoints — use directly in render. */
  resolvedData?: unknown;
}
