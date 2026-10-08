/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type {
  ProductPagedSearchResponse,
  ProductSearchRequest,
} from '@commercetools/platform-sdk';
import { getApiRoot } from '../ct/client';
import { toCustomError, upstreamStatus } from '../ct/errors';
import CustomError from '../errors/custom.error';

export async function searchProductProjections(
  body: ProductSearchRequest
): Promise<ProductPagedSearchResponse> {
  try {
    return (await getApiRoot().products().search().post({ body }).execute())
      .body;
  } catch (error) {
    if (upstreamStatus(error) === 400) {
      // The Product Search API answers 400 when it is not activated for the project.
      throw new CustomError(
        502,
        'Product search is not available for this project'
      );
    }
    throw toCustomError(error, 'products.search');
  }
}
