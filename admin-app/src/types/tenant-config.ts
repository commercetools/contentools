/**
 * Tenant configuration types (no zod).
 * CommerceConfig aligns with frontend-app commerce-cms.ts (projectKey, clientId, clientSecret, region, scopes + optional fields).
 */

const SUBDOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export interface FeatureFlags {
  bopis: boolean;
  superuser: boolean;
  quickOrder: boolean;
  wishlist: boolean;
  multipleWishlists: boolean;
  [key: string]: boolean;
}

export interface CommerceConfig {
  projectKey: string;
  clientId: string;
  clientSecret: string;
  region: string;
  scopes: string[];
  productIdField?: 'key' | 'id';
  storeRefField?: 'key' | 'id';
  categoryIdField?: 'key' | 'id';
  defaultAssociateRoleKeys?: string[];
  defaultStoreKey?: string;
  sessionUrl?: string;
  checkoutKeys?: Record<string, string>;
}

export interface CmsConfig {
  provider: 'contentstack' | 'contentful';
  apiKey: string;
  environment: string;
}

export interface TenantConfigCreate {
  id: string;
  name: string;
  type: 'b2b' | 'b2c';
  features: FeatureFlags;
  commerce: CommerceConfig;
  cms?: CmsConfig;
  createGitBranch?: boolean;
}

/** API GET response: tenant with server id */
export interface Tenant {
  id: string;
  name: string;
  type: 'b2b' | 'b2c';
  features: FeatureFlags;
  commerce?: CommerceConfig;
  cms?: CmsConfig;
}

/** Commerce form slice: checkoutKeys as array for Formik; no clientId/clientSecret/sessionUrl in form */
export interface CommerceFormValues {
  projectKey: string;
  region: string;
  scopes: string[];
  productIdField: 'key' | 'id';
  storeRefField: 'key' | 'id';
  categoryIdField: 'key' | 'id';
  defaultAssociateRoleKeys: string[];
  defaultStoreKey: string;
  checkoutKeysArray: Array<{ language: string; applicationKey: string }>;
}

/** Form values for create: no commerce (filled on submit from createApiClient); cms optional */
export interface TenantConfigCreateFormValues {
  id: string;
  name: string;
  type: 'b2b' | 'b2c';
  features: FeatureFlags;
  cms?: CmsConfig;
  commerce?: CommerceFormValues;
  createGitBranch?: boolean;
}

export interface TenantConfigFormErrors {
  id?: string;
  name?: string;
  type?: string;
  features?: string | Record<string, string>;
  cms?: { provider?: string; apiKey?: string; environment?: string };
}

/**
 * Validation for create form (id, name, type, features, cms only).
 * Returns Formik-compatible errors object.
 */
export function validateTenantConfigCreate(
  values: Partial<TenantConfigCreateFormValues>
): TenantConfigFormErrors {
  const errors: TenantConfigFormErrors = {};

  if (!values.id || typeof values.id !== 'string') {
    errors.id = 'Required';
  } else {
    if (values.id.length < 2 || values.id.length > 63) {
      errors.id = 'Must be between 2 and 63 characters';
    } else if (!SUBDOMAIN_REGEX.test(values.id)) {
      errors.id =
        'Must be a valid subdomain (lowercase alphanumeric + hyphens)';
    }
  }

  if (!values.name || typeof values.name !== 'string') {
    errors.name = 'Required';
  } else if (values.name.length < 1 || values.name.length > 200) {
    errors.name = 'Must be between 1 and 200 characters';
  }

  if (!values.type) {
    errors.type = 'Required';
  } else if (values.type !== 'b2b' && values.type !== 'b2c') {
    errors.type = 'Must be b2b or b2c';
  }


  return errors;
}
