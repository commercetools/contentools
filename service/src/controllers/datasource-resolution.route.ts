import { AuthenticatedRequest } from '../types/service.types';
import { logger } from '../utils/logger.utils';
import {
  getProductBySkuController,
  getProductsBySkuController,
} from './product.controller';

/**
 * Datasource keys that have a built-in resolver here and therefore don't need a
 * registered Firestore datasource document to resolve. Keep in sync with the
 * `switch` in resolveDatasource below.
 */
export const BUILT_IN_DATASOURCE_KEYS = ['product-by-sku', 'products-by-sku'];

export const isBuiltInDatasource = (key: string): boolean =>
  BUILT_IN_DATASOURCE_KEYS.includes(key);

export const resolveDatasource = async (
  req: AuthenticatedRequest,
  datasourceKey: string,
  params: Record<string, any>
) => {
  try {
    switch (datasourceKey) {
      case 'product-by-sku':
        return getProductBySkuController(req, params.sku);
      case 'products-by-sku':
        return getProductsBySkuController(req, params.skus);
    }
  } catch (error) {
    logger.error('Failed to resolve datasource:', error);
    return null;
  }
};
