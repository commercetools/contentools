/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import CustomError from '../errors/custom.error';

const CLAUSE = /^\s*(\w+)\s*=\s*"((?:[^"\\]|\\.)*)"\s*(?:AND\s+|$)/i;

export interface Clause {
  field: string;
  value: string;
}

/**
 * Parses `field = "value" [AND field = "value" ...]` against an allow-list of
 * fields. Anything else is a 400, so a client string never reaches a
 * commercetools predicate.
 */
export function parseQuery(query: string, allowed: readonly string[]): Clause[] {
  const clauses: Clause[] = [];
  let rest = query;
  while (rest.trim().length > 0) {
    const match = CLAUSE.exec(rest);
    if (!match) {
      throw new CustomError(400, 'Invalid query');
    }
    const [whole, field, raw] = match as unknown as [string, string, string];
    if (!allowed.includes(field)) {
      throw new CustomError(400, 'Invalid query');
    }
    clauses.push({ field, value: raw.replace(/\\(.)/g, '$1') });
    rest = rest.slice(whole.length);
  }
  if (clauses.length === 0) {
    throw new CustomError(400, 'Invalid query');
  }
  return clauses;
}
