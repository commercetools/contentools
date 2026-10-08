/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// uuid >= 12 ships ESM only, which jest (CommonJS) cannot load. Tests map `uuid` to this shim.
import { randomUUID } from 'crypto';

export const v4 = (): string => randomUUID();
