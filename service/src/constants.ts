import * as dotenv from 'dotenv';
dotenv.config();

export const CORS_ALLOWED_ORIGINS =
  process.env.CORS_ALLOWED_ORIGINS ||
  'localhost:5173,localhost:3000,localhost:3001,commercetools.com,frontend.site,ct-poc.net,localhost:5174';

export const MAX_VERSIONS = parseInt(process.env.MAX_VERSIONS || '5', 10);

export const CONTENT_ITEM_CONTAINER =
  process.env.CONTENT_ITEM_CONTAINER || 'content-item';

export const CONTENT_ITEM_STATE_CONTAINER =
  process.env.CONTENT_ITEM_STATE_CONTAINER || 'content-item-state';

export const CONTENT_ITEM_VERSION_CONTAINER =
  process.env.CONTENT_ITEM_VERSION_CONTAINER || 'content-item-version';

export const CONTENT_TYPE_CONTAINER =
  process.env.CONTENT_TYPE_CONTAINER || 'content-type';

export const CONFIGURATION_CONTAINER =
  process.env.CONFIGURATION_CONTAINER || 'configuration';

export const JWT_TOKEN_KEY =
  process.env.JWT_TOKEN_KEY || 'contentools-jwt-token';

export const CONFIGURATION_THEME_KEY =
  process.env.CONFIGURATION_THEME_KEY || 'theme';

export const CONFIGURATION_HEADER_KEY =
  process.env.CONFIGURATION_HEADER_KEY || 'header';

export const CONFIGURATION_FACET_KEY =
  process.env.CONFIGURATION_FACET_KEY || 'facet';
export const CONFIGURATION_FOOTER_KEY =
  process.env.CONFIGURATION_FOOTER_KEY || 'footer';
export const CONFIGURATION_SITE_METADATA_KEY =
  process.env.CONFIGURATION_SITE_METADATA_KEY || 'site-metadata';
export const CONFIGURATION_CATEGORY_LISTING_KEY =
  process.env.CONFIGURATION_CATEGORY_LISTING_KEY || 'category-listing';
export const CONFIGURATION_TRANSLATIONS_KEY =
  process.env.CONFIGURATION_TRANSLATIONS_KEY || 'translations';
export const CONFIGURATION_CONTENTOOLS_BASE_URL_KEY =
  process.env.CONFIGURATION_CONTENTOOLS_BASE_URL_KEY || 'contentools-base-url';
export const CONFIGURATION_B2B_ACCOUNT_MENU_LINKS_KEY =
  process.env.CONFIGURATION_B2B_ACCOUNT_MENU_LINKS_KEY || 'b2b-account-menu-links';

export const DATASOURCES = [
  {
    key: 'product-by-sku',
    value: {
      name: 'Get Product by SKU',
      key: 'product-by-sku',
      params: [{ key: 'sku', type: 'string', required: true }],
    },
  },
  {
    key: 'products-by-sku',
    value: {
      name: 'Get Products by SKU',
      key: 'products-by-sku',
      params: [{ key: 'skus', type: 'string', required: true }],
    },
  },
];

export const SHARED_CONTAINER = 'shared-sellertools-container';
export const CMS_DEPLOYED_URL_KEY = 'cms-app-deployed-url';

export const PAGE_VERSION_CONTAINER =
  process.env.PAGE_VERSION_CONTAINER || 'page-version';

export const PAGE_STATE_CONTAINER =
  process.env.PAGE_STATE_CONTAINER || 'page-state';

export const CONTENT_PAGE_CONTAINER =
  process.env.CONTENT_PAGE_CONTAINER || 'content-page';

export const PAGE_CONTENT_ITEMS_CONTAINER =
  process.env.PAGE_CONTENT_ITEMS_CONTAINER || 'page-content-items';
export const PAGE_CONTENT_ITEM_STATE_CONTAINER =
  process.env.PAGE_CONTENT_ITEM_STATE_CONTAINER || 'page-content-item-state';
export const PAGE_CONTENT_ITEM_VERSION_CONTAINER =
  process.env.PAGE_CONTENT_ITEM_VERSION_CONTAINER ||
  'page-content-item-version';

export const NUMBER_OF_COLUMNS = parseInt(
  process.env.NUMBER_OF_COLUMNS || '12',
  10
);

export const PUCK_PAGE_CONTAINER =
  process.env.PUCK_PAGE_CONTAINER || 'puck-page';

export const PUCK_PAGE_STATE_CONTAINER =
  process.env.PUCK_PAGE_STATE_CONTAINER || 'puck-page-state';

export const PUCK_PAGE_VERSION_CONTAINER =
  process.env.PUCK_PAGE_VERSION_CONTAINER || 'puck-page-version';

export const PUCK_CONTENT_CONTAINER =
  process.env.PUCK_CONTENT_CONTAINER || 'puck-content';

export const PUCK_CONTENT_STATE_CONTAINER =
  process.env.PUCK_CONTENT_STATE_CONTAINER || 'puck-content-state';

export const PUCK_CONTENT_VERSION_CONTAINER =
  process.env.PUCK_CONTENT_VERSION_CONTAINER || 'puck-content-version';

export const PUCK_TEMPLATE_CONTAINER =
  process.env.PUCK_TEMPLATE_CONTAINER || 'puck-template';
