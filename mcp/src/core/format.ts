/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
export function formatToolOutput(result: unknown): string {
  if (result === undefined) return 'OK (no content)';
  return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
}
