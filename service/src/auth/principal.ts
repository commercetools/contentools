/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

export type Principal =
  | {
      kind: 'merchant-center';
      userId: string;
      projectKey: string;
      permissions: string[];
    }
  | { kind: 'service-token' };
