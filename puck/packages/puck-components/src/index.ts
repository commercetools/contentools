// -----------------------------------------------------------------------------
// @commercetools-demo/puck-components — Nimbus-free "visualize" layer
//
// Component render functions, their prop types, shared render helpers, the i18n
// catalogs, and a render-only Puck config. The editor package composes these
// render functions with its (Nimbus-backed) field widgets; the renderer uses the
// render config directly. Nothing here imports @commercetools/nimbus.
// -----------------------------------------------------------------------------

// i18n message catalogs (keyed by language)
export { catalogs as intlCatalogs } from './intl';

// Rich-text rendering + HTML sanitization
export { sanitizeHtml } from './utils/sanitizeHtml';
export { RichTextContent } from './components/RichTextContent';
export type { RichTextContentProps } from './components/RichTextContent';

// Datasource value types (shared with the editor's DatasourceField widget)
export type { DatasourceType, DatasourceValue } from './datasource.types';

// Shared render helpers, types, and data
export {
  getLocalizedText,
  formatPrice,
  getFirstPrice,
  getProductImage,
  getProductName,
  getProductSlug,
  getProductSku,
  resolveProductLink,
  productLinkDefaults,
  colors,
} from './components/cms/shared';
export type { ProductLinkWith, ProductLinkProps } from './components/cms/shared';

// Component render functions + prop types
export * from './components';

// Render-only Puck config (components' render fns; no fields → no Nimbus)
export { createRenderConfig, defaultRenderConfig } from './renderConfig';
