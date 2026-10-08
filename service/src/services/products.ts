/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import {
  ProductPagedSearchResponse,
  ProductSearchRequest,
  ProductType,
} from '@commercetools/platform-sdk';
import { createApiRoot } from '../client/create.client';
import { logger } from '../utils/logger.utils';
import { AuthenticatedRequest } from '../types/service.types';
export const searchProducts = async (
  req: AuthenticatedRequest,
  searchParams: ProductSearchRequest
): Promise<ProductPagedSearchResponse> => {
  try {
    logger.info('Searching products with params:', searchParams);
    const apiRoot = createApiRoot(req)();

    const response = await apiRoot
      .products()
      .search()
      .post({
        body: searchParams,
      })
      .execute();

    return response.body;
  } catch (error) {
    logger.error('Error searching products:', error);
    throw error;
  }
};

export const getProductTypeById = async (
  req: AuthenticatedRequest,
  id: string
): Promise<ProductType> => {
  try {
    logger.info(`Fetching product type with ID: ${id}`);
    const apiRoot = createApiRoot(req)();

    const response = await apiRoot
      .productTypes()
      .withId({ ID: id })
      .get()
      .execute();

    return response.body;
  } catch (error) {
    logger.error('Error fetching product type by ID:', error);
    throw error;
  }
};
