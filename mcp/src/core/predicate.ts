/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/;

export class ToolInputError extends Error {}

/** Quotes a value for the service query grammar: backslash first, then the double quote. */
export function quote(value: string): string {
  if (value.length === 0 || value.length > 200) {
    throw new ToolInputError('value must be 1-200 characters');
  }
  if (CONTROL.test(value)) {
    throw new ToolInputError('value must not contain control characters');
  }
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export const buildEqualsPredicate = (field: string, value: string): string =>
  `${field} = ${quote(value)}`;
