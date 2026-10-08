// Editor-side shared helpers for CMS components.
//
// The render/data helpers (getProductName, resolveProductLink, colors, types,
// productLinkDefaults, …) live in @commercetools-demo/puck-components (Nimbus-free
// render layer) and are re-exported here so existing `./shared` / `./cms/shared`
// imports keep working. This file itself only adds the editor-only field factory.
import type { Fields } from '@measured/puck';
import type { IntlShape } from 'react-intl';
import type { ProductLinkProps } from '@commercetools-demo/puck-components';

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
} from '@commercetools-demo/puck-components';
export type { ProductLinkWith, ProductLinkProps } from '@commercetools-demo/puck-components';

/**
 * Puck field definitions for the shared link props — spread into a component's
 * `fields`. Factory form so the labels resolve through react-intl.
 */
export const createProductLinkFields = (intl: IntlShape): Fields<ProductLinkProps> => ({
  linkWith: {
    type: 'radio',
    label: intl.formatMessage({ id: 'Editor.cfg.shared.field.linkWith' }),
    options: [
      { value: 'slug', label: intl.formatMessage({ id: 'Editor.cfg.shared.linkWith.slug' }) },
      { value: 'sku', label: intl.formatMessage({ id: 'Editor.cfg.shared.linkWith.sku' }) },
    ],
  },
  baseUrl: {
    type: 'text',
    label: intl.formatMessage({ id: 'Editor.cfg.shared.field.baseUrl' }),
  },
});
