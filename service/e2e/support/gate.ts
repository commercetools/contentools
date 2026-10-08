/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { e2eEnabled } from './sandbox-guard';

/** `describe` when the sandbox env is complete, `describe.skip` otherwise. */
export const e2e: typeof describe = (e2eEnabled() ? describe : describe.skip) as typeof describe;

if (!e2eEnabled()) console.warn('e2e skipped: set E2E_* (see service/e2e/README.md)');
