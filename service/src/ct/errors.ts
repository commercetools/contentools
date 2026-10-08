/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import CustomError from '../errors/custom.error';
import { getLogger } from '../utils/logger.utils';

export const upstreamStatus = (error: unknown): number | undefined => {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const value = (error as { statusCode: unknown }).statusCode;
    return typeof value === 'number' ? value : undefined;
  }
  return undefined;
};

export function toCustomError(error: unknown, action: string): CustomError {
  if (error instanceof CustomError) {
    return error;
  }
  const status = upstreamStatus(error);
  if (status === 404) {
    return new CustomError(404, 'Not found');
  }
  if (status === 409) {
    return new CustomError(
      409,
      'Conflict: the object was modified concurrently'
    );
  }
  if (status === 429 || (status !== undefined && status >= 500)) {
    return new CustomError(503, 'Upstream service unavailable');
  }
  if (status === 401 || status === 403) {
    getLogger().error('upstream authorization failed', {
      action,
      upstreamStatus: status,
    });
    return new CustomError(502, 'Upstream authorization failed');
  }
  return new CustomError(500, 'Internal server error');
}
