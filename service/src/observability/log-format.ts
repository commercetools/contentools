/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { format } from 'winston';
import { currentCorrelationId } from './request-context';

export const timestampFormat = format.timestamp();

export const correlationFormat = format((info) => {
  const id = currentCorrelationId();
  if (id) {
    info.correlationId = id;
  }
  return info;
})();
