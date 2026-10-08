import {
  CONFIGURATION_B2B_ACCOUNT_MENU_LINKS_KEY,
  CONFIGURATION_CATEGORY_LISTING_KEY,
  CONFIGURATION_CONTAINER,
  CONFIGURATION_CONTENTOOLS_BASE_URL_KEY,
  CONFIGURATION_FACET_KEY,
  CONFIGURATION_FOOTER_KEY,
  CONFIGURATION_HEADER_KEY,
  CONFIGURATION_SITE_METADATA_KEY,
  CONFIGURATION_THEME_KEY,
  CONFIGURATION_TRANSLATIONS_KEY,
} from '../constants';
import CustomError from '../errors/custom.error';
import { CustomObjectController } from './custom-object.controller';
import { AuthenticatedRequest } from '../types/service.types';

const DEFAULT_BUSINESS_UNIT_KEY = 'default';

/**
 * Build the custom object key for theme scoped by business unit.
 * Data in the configuration container is partitioned by business unit key.
 */
function getThemeKey(businessUnitKey: string): string {
  return `${businessUnitKey}-${CONFIGURATION_THEME_KEY}`;
}

/**
 * Build the custom object key for header scoped by business unit.
 */
function getHeaderKey(businessUnitKey: string): string {
  return `${businessUnitKey}-${CONFIGURATION_HEADER_KEY}`;
}

function getFacetKey(businessUnitKey: string): string {
  return `${businessUnitKey}-${CONFIGURATION_FACET_KEY}`;
}

function getFooterKey(businessUnitKey: string): string {
  return `${businessUnitKey}-${CONFIGURATION_FOOTER_KEY}`;
}

function getSiteMetadataKey(businessUnitKey: string): string {
  return `${businessUnitKey}-${CONFIGURATION_SITE_METADATA_KEY}`;
}

function getCategoryListingKey(businessUnitKey: string): string {
  return `${businessUnitKey}-${CONFIGURATION_CATEGORY_LISTING_KEY}`;
}

function getTranslationsKey(businessUnitKey: string): string {
  return `${businessUnitKey}-${CONFIGURATION_TRANSLATIONS_KEY}`;
}

function getContentoolsBaseUrlKey(businessUnitKey: string): string {
  return `${businessUnitKey}-${CONFIGURATION_CONTENTOOLS_BASE_URL_KEY}`;
}

function getB2bAccountMenuLinksKey(businessUnitKey: string): string {
  return `${businessUnitKey}-${CONFIGURATION_B2B_ACCOUNT_MENU_LINKS_KEY}`;
}

/**
 * Get theme configuration for a business unit.
 * Returns the theme value or null if not found (404 is converted to null).
 * If businessUnitKey is not default and result is empty, returns default BU config.
 */
export const getTheme = async (
  req: AuthenticatedRequest,
  businessUnitKey: string
): Promise<Record<string, unknown> | null> => {
  const controller = new CustomObjectController(req, CONFIGURATION_CONTAINER);
  const key = getThemeKey(businessUnitKey);
  try {
    const object = await controller.getCustomObject(key);
    const value = (object?.value as Record<string, unknown>) ?? null;
    if (value != null || businessUnitKey === DEFAULT_BUSINESS_UNIT_KEY) {
      return value;
    }
    return getTheme(req, DEFAULT_BUSINESS_UNIT_KEY);
  } catch (error) {
    if (error instanceof CustomError && error.statusCode === 404) {
      if (businessUnitKey !== DEFAULT_BUSINESS_UNIT_KEY) {
        return getTheme(req, DEFAULT_BUSINESS_UNIT_KEY);
      }
      return null;
    }
    throw error;
  }
};

/**
 * Create theme configuration for a business unit.
 */
export const createTheme = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  value: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const controller = new CustomObjectController(req, CONFIGURATION_CONTAINER);
  const key = getThemeKey(businessUnitKey);
  const object = await controller.createCustomObject(key, value);
  return (object?.value as Record<string, unknown>) ?? value;
};

/**
 * Update theme configuration for a business unit.
 */
export const updateTheme = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  value: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const controller = new CustomObjectController(req, CONFIGURATION_CONTAINER);
  const key = getThemeKey(businessUnitKey);
  const object = await controller.updateCustomObject(key, value);
  return (object?.value as Record<string, unknown>) ?? value;
};

/**
 * Delete theme configuration for a business unit.
 */
export const deleteTheme = async (
  req: AuthenticatedRequest,
  businessUnitKey: string
): Promise<void> => {
  const controller = new CustomObjectController(req, CONFIGURATION_CONTAINER);
  const key = getThemeKey(businessUnitKey);
  await controller.deleteCustomObject(key);
};

/** Full frontend configuration result; each slice may be null if not stored. */
export interface AllConfigurationsResult {
  theme: Record<string, unknown> | null;
  header: Record<string, unknown> | null;
  facetConfiguration: Record<string, unknown> | null;
  footer: Record<string, unknown> | null;
  siteMetadata: Record<string, unknown> | null;
  categoryListing: Record<string, unknown> | null;
  translations: Record<string, Record<string, unknown>> | null;
  contentoolsBaseUrl: string | null;
  b2bAccountMenuLinks: Record<string, unknown>[] | null;
}

const CONFIG_KEYS = [
  'theme',
  'header',
  'facetConfiguration',
  'footer',
  'siteMetadata',
  'categoryListing',
  'translations',
  'contentoolsBaseUrl',
  'b2bAccountMenuLinks',
] as const;

function getKeyForSlice(
  businessUnitKey: string,
  slice: (typeof CONFIG_KEYS)[number]
): string {
  switch (slice) {
    case 'theme':
      return getThemeKey(businessUnitKey);
    case 'header':
      return getHeaderKey(businessUnitKey);
    case 'facetConfiguration':
      return getFacetKey(businessUnitKey);
    case 'footer':
      return getFooterKey(businessUnitKey);
    case 'siteMetadata':
      return getSiteMetadataKey(businessUnitKey);
    case 'categoryListing':
      return getCategoryListingKey(businessUnitKey);
    case 'translations':
      return getTranslationsKey(businessUnitKey);
    case 'contentoolsBaseUrl':
      return getContentoolsBaseUrlKey(businessUnitKey);
    case 'b2bAccountMenuLinks':
      return getB2bAccountMenuLinksKey(businessUnitKey);
    default:
      return '';
  }
}

/**
 * Get all configuration slices in a single API call.
 * Returns an object matching FrontendConfiguration shape; missing slices are null.
 */
export const getAllConfigurations = async (
  req: AuthenticatedRequest,
  businessUnitKey: string
): Promise<AllConfigurationsResult> => {
  const keys = CONFIG_KEYS.map((slice) =>
    getKeyForSlice(businessUnitKey, slice)
  );
  const where = `key in (${keys.map((k) => `"${k}"`).join(', ')})`;
  const controller = new CustomObjectController(req, CONFIGURATION_CONTAINER);
  const results = await controller.getCustomObjects(where);

  const keyToSlice = new Map<string, (typeof CONFIG_KEYS)[number]>();
  CONFIG_KEYS.forEach((slice) => {
    keyToSlice.set(getKeyForSlice(businessUnitKey, slice), slice);
  });

  const out: AllConfigurationsResult = {
    theme: null,
    header: null,
    facetConfiguration: null,
    footer: null,
    siteMetadata: null,
    categoryListing: null,
    translations: null,
    contentoolsBaseUrl: null,
    b2bAccountMenuLinks: null,
  };

  for (const obj of results) {
    const slice = keyToSlice.get(obj.key);
    if (slice == null || obj.value == null) continue;
    if (slice === 'contentoolsBaseUrl' && typeof obj.value === 'string') {
      out.contentoolsBaseUrl = obj.value;
    } else if (
      slice === 'translations' &&
      typeof obj.value === 'object' &&
      obj.value !== null
    ) {
      out.translations = obj.value as Record<string, Record<string, unknown>>;
    } else if (
      slice === 'b2bAccountMenuLinks' &&
      Array.isArray(obj.value)
    ) {
      out.b2bAccountMenuLinks = obj.value as Record<string, unknown>[];
    } else if (slice !== 'contentoolsBaseUrl' && slice !== 'translations' && slice !== 'b2bAccountMenuLinks') {
      (out as unknown as Record<string, unknown>)[slice] = obj.value as Record<
        string,
        unknown
      >;
    }
  }

  if (businessUnitKey !== DEFAULT_BUSINESS_UNIT_KEY) {
    const defaultResult = await getAllConfigurations(req, DEFAULT_BUSINESS_UNIT_KEY);
    if (out.theme == null && defaultResult.theme != null) out.theme = defaultResult.theme;
    if (out.header == null && defaultResult.header != null) out.header = defaultResult.header;
    if (out.facetConfiguration == null && defaultResult.facetConfiguration != null) out.facetConfiguration = defaultResult.facetConfiguration;
    if (out.footer == null && defaultResult.footer != null) out.footer = defaultResult.footer;
    if (out.siteMetadata == null && defaultResult.siteMetadata != null) out.siteMetadata = defaultResult.siteMetadata;
    if (out.categoryListing == null && defaultResult.categoryListing != null) out.categoryListing = defaultResult.categoryListing;
    if (out.translations == null && defaultResult.translations != null) out.translations = defaultResult.translations;
    if (out.contentoolsBaseUrl == null && defaultResult.contentoolsBaseUrl != null) out.contentoolsBaseUrl = defaultResult.contentoolsBaseUrl;
    if (out.b2bAccountMenuLinks == null && defaultResult.b2bAccountMenuLinks != null) out.b2bAccountMenuLinks = defaultResult.b2bAccountMenuLinks;
  }

  return out;
};

/**
 * Get header configuration for a business unit.
 * Returns the header value or null if not found (404 is converted to null).
 * If businessUnitKey is not default and result is empty, returns default BU config.
 */
export const getHeader = async (
  req: AuthenticatedRequest,
  businessUnitKey: string
): Promise<Record<string, unknown> | null> => {
  const controller = new CustomObjectController(req, CONFIGURATION_CONTAINER);
  const key = getHeaderKey(businessUnitKey);
  try {
    const object = await controller.getCustomObject(key);
    const value = (object?.value as Record<string, unknown>) ?? null;
    if (value != null || businessUnitKey === DEFAULT_BUSINESS_UNIT_KEY) {
      return value;
    }
    return getHeader(req, DEFAULT_BUSINESS_UNIT_KEY);
  } catch (error) {
    if (error instanceof CustomError && error.statusCode === 404) {
      if (businessUnitKey !== DEFAULT_BUSINESS_UNIT_KEY) {
        return getHeader(req, DEFAULT_BUSINESS_UNIT_KEY);
      }
      return null;
    }
    throw error;
  }
};

/**
 * Create header configuration for a business unit.
 */
export const createHeader = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  value: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const controller = new CustomObjectController(req, CONFIGURATION_CONTAINER);
  const key = getHeaderKey(businessUnitKey);
  const object = await controller.createCustomObject(key, value);
  return (object?.value as Record<string, unknown>) ?? value;
};

/**
 * Update header configuration for a business unit.
 */
export const updateHeader = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  value: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const controller = new CustomObjectController(req, CONFIGURATION_CONTAINER);
  const key = getHeaderKey(businessUnitKey);
  const object = await controller.updateCustomObject(key, value);
  return (object?.value as Record<string, unknown>) ?? value;
};

/**
 * Delete header configuration for a business unit.
 */
export const deleteHeader = async (
  req: AuthenticatedRequest,
  businessUnitKey: string
): Promise<void> => {
  const controller = new CustomObjectController(req, CONFIGURATION_CONTAINER);
  const key = getHeaderKey(businessUnitKey);
  await controller.deleteCustomObject(key);
};

// ---------------------------------------------------------------------------
// Generic get/create/update/delete by key (used for facet, footer, etc.)
// ---------------------------------------------------------------------------

async function getConfigByKey(
  req: AuthenticatedRequest,
  key: string
): Promise<Record<string, unknown> | null> {
  const controller = new CustomObjectController(req, CONFIGURATION_CONTAINER);
  try {
    const object = await controller.getCustomObject(key);
    return (object?.value as Record<string, unknown>) ?? null;
  } catch (error) {
    if (error instanceof CustomError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

async function getConfigByKeyWithFallback(
  req: AuthenticatedRequest,
  keyRequested: string,
  keyDefault: string,
  businessUnitKey: string
): Promise<Record<string, unknown> | null> {
  const result = await getConfigByKey(req, keyRequested);
  if (result != null || businessUnitKey === DEFAULT_BUSINESS_UNIT_KEY) {
    return result;
  }
  return getConfigByKey(req, keyDefault);
}

async function getConfigByKeyAsString(
  req: AuthenticatedRequest,
  key: string
): Promise<string | null> {
  const controller = new CustomObjectController(req, CONFIGURATION_CONTAINER);
  try {
    const object = await controller.getCustomObject(key);
    const v = object?.value;
    return typeof v === 'string' ? v : null;
  } catch (error) {
    if (error instanceof CustomError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

async function createConfigByKey(
  req: AuthenticatedRequest,
  key: string,
  value: Record<string, unknown> | Record<string, Record<string, unknown>>
): Promise<Record<string, unknown> | Record<string, Record<string, unknown>>> {
  const controller = new CustomObjectController(req, CONFIGURATION_CONTAINER);
  const created = await controller.createCustomObject(key, value);
  return (created?.value as Record<string, unknown>) ?? value;
}

async function updateConfigByKey(
  req: AuthenticatedRequest,
  key: string,
  value: Record<string, unknown> | Record<string, Record<string, unknown>>
): Promise<Record<string, unknown> | Record<string, Record<string, unknown>>> {
  const controller = new CustomObjectController(req, CONFIGURATION_CONTAINER);
  const updated = await controller.updateCustomObject(key, value);
  return (updated?.value as Record<string, unknown>) ?? value;
}

async function deleteConfigByKey(
  req: AuthenticatedRequest,
  key: string
): Promise<void> {
  const controller = new CustomObjectController(req, CONFIGURATION_CONTAINER);
  await controller.deleteCustomObject(key);
}

// Facet
export const getFacet = (req: AuthenticatedRequest, businessUnitKey: string) =>
  getConfigByKeyWithFallback(req, getFacetKey(businessUnitKey), getFacetKey(DEFAULT_BUSINESS_UNIT_KEY), businessUnitKey);
export const createFacet = (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  value: Record<string, unknown>
) => createConfigByKey(req, getFacetKey(businessUnitKey), value);
export const updateFacet = (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  value: Record<string, unknown>
) => updateConfigByKey(req, getFacetKey(businessUnitKey), value);
export const deleteFacet = (req: AuthenticatedRequest, businessUnitKey: string) =>
  deleteConfigByKey(req, getFacetKey(businessUnitKey));

// Footer
export const getFooter = (req: AuthenticatedRequest, businessUnitKey: string) =>
  getConfigByKeyWithFallback(req, getFooterKey(businessUnitKey), getFooterKey(DEFAULT_BUSINESS_UNIT_KEY), businessUnitKey);
export const createFooter = (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  value: Record<string, unknown>
) => createConfigByKey(req, getFooterKey(businessUnitKey), value);
export const updateFooter = (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  value: Record<string, unknown>
) => updateConfigByKey(req, getFooterKey(businessUnitKey), value);
export const deleteFooter = (req: AuthenticatedRequest, businessUnitKey: string) =>
  deleteConfigByKey(req, getFooterKey(businessUnitKey));

// Site metadata
export const getSiteMetadata = (req: AuthenticatedRequest, businessUnitKey: string) =>
  getConfigByKeyWithFallback(req, getSiteMetadataKey(businessUnitKey), getSiteMetadataKey(DEFAULT_BUSINESS_UNIT_KEY), businessUnitKey);
export const createSiteMetadata = (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  value: Record<string, unknown>
) => createConfigByKey(req, getSiteMetadataKey(businessUnitKey), value);
export const updateSiteMetadata = (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  value: Record<string, unknown>
) => updateConfigByKey(req, getSiteMetadataKey(businessUnitKey), value);
export const deleteSiteMetadata = (req: AuthenticatedRequest, businessUnitKey: string) =>
  deleteConfigByKey(req, getSiteMetadataKey(businessUnitKey));

// Category listing
export const getCategoryListing = (req: AuthenticatedRequest, businessUnitKey: string) =>
  getConfigByKeyWithFallback(req, getCategoryListingKey(businessUnitKey), getCategoryListingKey(DEFAULT_BUSINESS_UNIT_KEY), businessUnitKey);
export const createCategoryListing = (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  value: Record<string, unknown>
) => createConfigByKey(req, getCategoryListingKey(businessUnitKey), value);
export const updateCategoryListing = (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  value: Record<string, unknown>
) => updateConfigByKey(req, getCategoryListingKey(businessUnitKey), value);
export const deleteCategoryListing = (req: AuthenticatedRequest, businessUnitKey: string) =>
  deleteConfigByKey(req, getCategoryListingKey(businessUnitKey));

// Translations
export const getTranslations = (req: AuthenticatedRequest, businessUnitKey: string) =>
  getConfigByKeyWithFallback(req, getTranslationsKey(businessUnitKey), getTranslationsKey(DEFAULT_BUSINESS_UNIT_KEY), businessUnitKey) as Promise<Record<string, Record<string, unknown>> | null>;
export const createTranslations = (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  value: Record<string, Record<string, unknown>>
) => createConfigByKey(req, getTranslationsKey(businessUnitKey), value) as Promise<Record<string, Record<string, unknown>>>;
export const updateTranslations = (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  value: Record<string, Record<string, unknown>>
) => updateConfigByKey(req, getTranslationsKey(businessUnitKey), value) as Promise<Record<string, Record<string, unknown>>>;
export const deleteTranslations = (req: AuthenticatedRequest, businessUnitKey: string) =>
  deleteConfigByKey(req, getTranslationsKey(businessUnitKey));

// Contentools base URL (stored as string in custom object value)
export const getContentoolsBaseUrl = (req: AuthenticatedRequest, businessUnitKey: string) =>
  getConfigByKeyAsString(req, getContentoolsBaseUrlKey(businessUnitKey));
export const createContentoolsBaseUrl = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  value: string
): Promise<string> => {
  const controller = new CustomObjectController(req, CONFIGURATION_CONTAINER);
  const key = getContentoolsBaseUrlKey(businessUnitKey);
  const created = await controller.createCustomObject(key, value as unknown as Record<string, unknown>);
  return (created?.value as string) ?? value;
};
export const updateContentoolsBaseUrl = async (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  value: string
): Promise<string> => {
  const controller = new CustomObjectController(req, CONFIGURATION_CONTAINER);
  const key = getContentoolsBaseUrlKey(businessUnitKey);
  const updated = await controller.updateCustomObject(key, value as unknown as Record<string, unknown>);
  return (updated?.value as string) ?? value;
};
export const deleteContentoolsBaseUrl = (req: AuthenticatedRequest, businessUnitKey: string) =>
  deleteConfigByKey(req, getContentoolsBaseUrlKey(businessUnitKey));

// B2B account menu links
export const getB2bAccountMenuLinks = (req: AuthenticatedRequest, businessUnitKey: string) =>
  getConfigByKeyWithFallback(req, getB2bAccountMenuLinksKey(businessUnitKey), getB2bAccountMenuLinksKey(DEFAULT_BUSINESS_UNIT_KEY), businessUnitKey);
export const createB2bAccountMenuLinks = (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  value: Record<string, unknown>[]
) => createConfigByKey(req, getB2bAccountMenuLinksKey(businessUnitKey), value as unknown as Record<string, unknown>);
export const updateB2bAccountMenuLinks = (
  req: AuthenticatedRequest,
  businessUnitKey: string,
  value: Record<string, unknown>[]
) => updateConfigByKey(req, getB2bAccountMenuLinksKey(businessUnitKey), value as unknown as Record<string, unknown>);
export const deleteB2bAccountMenuLinks = (req: AuthenticatedRequest, businessUnitKey: string) =>
  deleteConfigByKey(req, getB2bAccountMenuLinksKey(businessUnitKey));
