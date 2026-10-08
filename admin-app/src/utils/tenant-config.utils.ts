import type { CommerceConfig, CommerceFormValues } from '../types/tenant-config';

export const COMMERCE_FORM_DEFAULTS: CommerceFormValues = {
  projectKey: '',
  region: '',
  scopes: [],
  productIdField: 'key',
  storeRefField: 'key',
  categoryIdField: 'key',
  defaultAssociateRoleKeys: [],
  defaultStoreKey: '',
  checkoutKeysArray: [],
};

/** Convert tenant commerce to form values (checkoutKeys Record → checkoutKeysArray) */
export function commerceToFormValues(commerce: CommerceConfig | undefined): CommerceFormValues {
  if (!commerce) return { ...COMMERCE_FORM_DEFAULTS };
  return {
    projectKey: commerce.projectKey,
    region: commerce.region,
    scopes: commerce.scopes ?? [],
    productIdField: (commerce.productIdField ?? 'key') === 'id' ? 'id' : 'key',
    storeRefField: (commerce.storeRefField ?? 'key') === 'id' ? 'id' : 'key',
    categoryIdField: (commerce.categoryIdField ?? 'key') === 'id' ? 'id' : 'key',
    defaultAssociateRoleKeys: commerce.defaultAssociateRoleKeys ?? [],
    defaultStoreKey: commerce.defaultStoreKey ?? '',
    checkoutKeysArray: commerce.checkoutKeys
      ? Object.entries(commerce.checkoutKeys).map(([language, applicationKey]) => ({
          language,
          applicationKey,
        }))
      : [],
  };
}

/** Convert commerce form values to CommerceConfig for API (checkoutKeysArray → checkoutKeys Record) */
export function commerceFormValuesToConfig(
  form: CommerceFormValues,
  existingCommerce: Pick<CommerceConfig, 'clientId' | 'clientSecret'>
): CommerceConfig {
  const checkoutKeys =
    form.checkoutKeysArray.length > 0
      ? form.checkoutKeysArray.reduce<Record<string, string>>(
          (acc, { language, applicationKey }) => {
            if (language && applicationKey) acc[language] = applicationKey;
            return acc;
          },
          {}
        )
      : undefined;
  return {
    ...existingCommerce,
    projectKey: form.projectKey,
    region: form.region,
    scopes: form.scopes,
    productIdField: form.productIdField,
    storeRefField: form.storeRefField,
    categoryIdField: form.categoryIdField,
    defaultAssociateRoleKeys:
      form.defaultAssociateRoleKeys.length > 0 ? form.defaultAssociateRoleKeys : undefined,
    defaultStoreKey: form.defaultStoreKey || undefined,
    checkoutKeys,
  };
}

/**
 * Build commerce patch for PUT update (editable fields only; omit clientId/clientSecret so merge keeps them).
 */
export function commerceFormValuesToPatch(form: CommerceFormValues): Partial<CommerceConfig> {
  const checkoutKeys =
    form.checkoutKeysArray.length > 0
      ? form.checkoutKeysArray.reduce<Record<string, string>>(
          (acc, { language, applicationKey }) => {
            if (language && applicationKey) acc[language] = applicationKey;
            return acc;
          },
          {}
        )
      : undefined;
  return {
    projectKey: form.projectKey,
    region: form.region,
    scopes: form.scopes,
    productIdField: form.productIdField,
    storeRefField: form.storeRefField,
    categoryIdField: form.categoryIdField,
    defaultAssociateRoleKeys:
      form.defaultAssociateRoleKeys.length > 0 ? form.defaultAssociateRoleKeys : undefined,
    defaultStoreKey: form.defaultStoreKey || undefined,
    checkoutKeys,
  };
}
